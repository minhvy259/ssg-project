-- ============================================
-- STUDY ROOM CHAT & SHARED TIMER
-- ============================================

-- 1. Table: study_room_messages (chat trong phòng)
CREATE TABLE IF NOT EXISTS public.study_room_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

-- Chỉ cho phép thành viên phòng chèn/xem tin nhắn
CREATE POLICY IF NOT EXISTS "Members can read room messages"
  ON public.study_room_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_room_participants p
      WHERE p.room_id = study_room_messages.room_id
        AND p.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Members can insert room messages"
  ON public.study_room_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_room_participants p
      WHERE p.room_id = room_id
        AND p.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_study_room_messages_room_id_created_at
  ON public.study_room_messages(room_id, created_at DESC);

-- 2. Table: study_room_states (trạng thái Pomodoro chia sẻ)
CREATE TABLE IF NOT EXISTS public.study_room_states (
  room_id UUID PRIMARY KEY REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  current_phase TEXT NOT NULL DEFAULT 'idle' CHECK (current_phase IN ('idle', 'focus', 'break')),
  phase_end_at TIMESTAMPTZ,
  timer_owner_id UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.study_room_states ENABLE ROW LEVEL SECURITY;

-- Thành viên phòng có thể xem trạng thái timer
CREATE POLICY IF NOT EXISTS "Members can read room timer state"
  ON public.study_room_states
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_room_participants p
      WHERE p.room_id = study_room_states.room_id
        AND p.user_id = auth.uid()
    )
  );

-- Chủ phòng hoặc thành viên được phép cập nhật timer
CREATE POLICY IF NOT EXISTS "Members can update room timer state"
  ON public.study_room_states
  FOR INSERT, UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.study_room_participants p
      WHERE p.room_id = study_room_states.room_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.study_room_participants p
      WHERE p.room_id = room_id
        AND p.user_id = auth.uid()
    )
  );

-- 3. FUNCTION: send_room_message
CREATE OR REPLACE FUNCTION public.send_room_message(
  p_room_id UUID,
  p_content TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_CONTENT');
  END IF;

  -- Must be a participant of the room
  IF NOT EXISTS (
    SELECT 1 FROM public.study_room_participants
    WHERE room_id = p_room_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_ROOM');
  END IF;

  SELECT full_name, avatar_url
  INTO v_profile
  FROM public.profiles
  WHERE user_id = v_user_id;

  INSERT INTO public.study_room_messages (room_id, sender_id, sender_name, sender_avatar, content)
  VALUES (
    p_room_id,
    v_user_id,
    COALESCE(v_profile.full_name, 'Ẩn danh'),
    v_profile.avatar_url,
    trim(p_content)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 4. FUNCTION: start_room_timer (Pomodoro chia sẻ)
CREATE OR REPLACE FUNCTION public.start_room_timer(
  p_room_id UUID,
  p_phase TEXT,
  p_duration_seconds INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_phase TEXT;
  v_end_at TIMESTAMPTZ;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_phase NOT IN ('focus', 'break') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_PHASE');
  END IF;

  IF p_duration_seconds IS NULL OR p_duration_seconds <= 0 OR p_duration_seconds > 4 * 60 * 60 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_DURATION');
  END IF;

  -- Must be a participant
  IF NOT EXISTS (
    SELECT 1 FROM public.study_room_participants
    WHERE room_id = p_room_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_ROOM');
  END IF;

  v_phase := p_phase;
  v_end_at := now() + make_interval(secs => p_duration_seconds);

  INSERT INTO public.study_room_states (room_id, current_phase, phase_end_at, timer_owner_id, updated_at)
  VALUES (p_room_id, v_phase, v_end_at, v_user_id, now())
  ON CONFLICT (room_id) DO UPDATE
  SET current_phase = EXCLUDED.current_phase,
      phase_end_at = EXCLUDED.phase_end_at,
      timer_owner_id = EXCLUDED.timer_owner_id,
      updated_at = now();

  -- Log timer change for analytics / realtime
  INSERT INTO public.room_activity_logs (room_id, user_id, action, metadata)
  VALUES (
    p_room_id,
    v_user_id,
    'status_change',
    jsonb_build_object('timer_phase', v_phase, 'phase_end_at', v_end_at)
  );

  RETURN jsonb_build_object('success', true, 'phase', v_phase, 'phase_end_at', v_end_at);
END;
$$;

-- 5. FUNCTION: get_room_timer_state (đọc trạng thái hiện tại)
CREATE OR REPLACE FUNCTION public.get_room_timer_state(p_room_id UUID)
RETURNS TABLE (
  room_id UUID,
  current_phase TEXT,
  phase_end_at TIMESTAMPTZ,
  timer_owner_id UUID
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.room_id,
    s.current_phase,
    s.phase_end_at,
    s.timer_owner_id
  FROM public.study_room_states s
  WHERE s.room_id = p_room_id;
$$;

-- 6. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_states;

