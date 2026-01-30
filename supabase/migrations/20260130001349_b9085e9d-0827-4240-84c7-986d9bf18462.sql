-- ============================================
-- STUDY ROOM BACKEND ENHANCEMENT MIGRATION (FIXED)
-- ============================================

-- 1. Add new columns to study_rooms (không dùng enum cho status cũ)
ALTER TABLE public.study_rooms 
  ADD COLUMN IF NOT EXISTS room_status TEXT NOT NULL DEFAULT 'active' CHECK (room_status IN ('active', 'closed')),
  ADD COLUMN IF NOT EXISTS current_members INTEGER NOT NULL DEFAULT 0;

-- 2. Add role column to study_room_participants
ALTER TABLE public.study_room_participants 
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member'));

-- 3. CREATE room_activity_logs for analytics
CREATE TABLE IF NOT EXISTS public.room_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('join', 'leave', 'status_change', 'room_created', 'room_closed')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on activity logs
ALTER TABLE public.room_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS: Users can view logs for rooms they're in
CREATE POLICY "Users can view logs for their rooms"
  ON public.room_activity_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_room_participants 
      WHERE room_id = room_activity_logs.room_id AND user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.study_rooms 
      WHERE id = room_activity_logs.room_id AND is_public = true
    )
  );

-- 4. FUNCTION: Get current member count
CREATE OR REPLACE FUNCTION public.get_room_member_count(p_room_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.study_room_participants
  WHERE room_id = p_room_id;
$$;

-- 5. FUNCTION: Check if user can join room
CREATE OR REPLACE FUNCTION public.can_user_join_room(p_room_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_room RECORD;
  v_current_count INTEGER;
  v_already_in BOOLEAN;
BEGIN
  SELECT * INTO v_room FROM public.study_rooms WHERE id = p_room_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ROOM_NOT_FOUND');
  END IF;
  
  IF v_room.room_status = 'closed' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ROOM_CLOSED');
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM public.study_room_participants 
    WHERE room_id = p_room_id AND user_id = p_user_id
  ) INTO v_already_in;
  
  IF v_already_in THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ALREADY_IN_ROOM');
  END IF;
  
  SELECT public.get_room_member_count(p_room_id) INTO v_current_count;
  
  IF v_current_count >= v_room.max_participants THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'ROOM_FULL');
  END IF;
  
  RETURN jsonb_build_object('allowed', true, 'reason', null);
END;
$$;

-- 6. FUNCTION: Join room with validation
CREATE OR REPLACE FUNCTION public.join_study_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_check JSONB;
  v_participant_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  v_check := public.can_user_join_room(p_room_id, v_user_id);
  
  IF NOT (v_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', v_check->>'reason');
  END IF;
  
  INSERT INTO public.study_room_participants (room_id, user_id, role, status)
  VALUES (p_room_id, v_user_id, 'member', 'focusing')
  ON CONFLICT (room_id, user_id) DO NOTHING
  RETURNING id INTO v_participant_id;
  
  IF v_participant_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_IN_ROOM');
  END IF;
  
  UPDATE public.study_rooms 
  SET current_members = public.get_room_member_count(p_room_id)
  WHERE id = p_room_id;
  
  INSERT INTO public.room_activity_logs (room_id, user_id, action)
  VALUES (p_room_id, v_user_id, 'join');
  
  RETURN jsonb_build_object('success', true, 'participant_id', v_participant_id);
END;
$$;

-- 7. FUNCTION: Leave room with owner transfer logic
CREATE OR REPLACE FUNCTION public.leave_study_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_participant RECORD;
  v_new_owner_id UUID;
  v_remaining_count INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  SELECT * INTO v_participant 
  FROM public.study_room_participants 
  WHERE room_id = p_room_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_ROOM');
  END IF;
  
  IF v_participant.role = 'owner' THEN
    SELECT user_id INTO v_new_owner_id
    FROM public.study_room_participants
    WHERE room_id = p_room_id AND user_id != v_user_id
    ORDER BY joined_at ASC
    LIMIT 1;
    
    IF v_new_owner_id IS NOT NULL THEN
      UPDATE public.study_room_participants 
      SET role = 'owner' 
      WHERE room_id = p_room_id AND user_id = v_new_owner_id;
      
      UPDATE public.study_rooms 
      SET created_by = v_new_owner_id 
      WHERE id = p_room_id;
    END IF;
  END IF;
  
  DELETE FROM public.study_room_participants 
  WHERE room_id = p_room_id AND user_id = v_user_id;
  
  v_remaining_count := public.get_room_member_count(p_room_id);
  
  IF v_remaining_count = 0 THEN
    UPDATE public.study_rooms 
    SET room_status = 'closed', current_members = 0 
    WHERE id = p_room_id;
    
    INSERT INTO public.room_activity_logs (room_id, user_id, action)
    VALUES (p_room_id, v_user_id, 'room_closed');
  ELSE
    UPDATE public.study_rooms 
    SET current_members = v_remaining_count 
    WHERE id = p_room_id;
  END IF;
  
  INSERT INTO public.room_activity_logs (room_id, user_id, action)
  VALUES (p_room_id, v_user_id, 'leave');
  
  RETURN jsonb_build_object(
    'success', true, 
    'room_closed', v_remaining_count = 0,
    'new_owner_id', v_new_owner_id
  );
END;
$$;

-- 8. FUNCTION: Create room (owner automatically joins)
CREATE OR REPLACE FUNCTION public.create_study_room(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT true,
  p_max_participants INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_room_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
  END IF;
  
  IF p_max_participants < 2 OR p_max_participants > 50 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_MAX_PARTICIPANTS');
  END IF;
  
  INSERT INTO public.study_rooms (name, description, is_public, max_participants, created_by, current_members, room_status)
  VALUES (TRIM(p_name), NULLIF(TRIM(p_description), ''), p_is_public, p_max_participants, v_user_id, 1, 'active')
  RETURNING id INTO v_room_id;
  
  INSERT INTO public.study_room_participants (room_id, user_id, role, status)
  VALUES (v_room_id, v_user_id, 'owner', 'focusing');
  
  INSERT INTO public.room_activity_logs (room_id, user_id, action)
  VALUES (v_room_id, v_user_id, 'room_created');
  
  RETURN jsonb_build_object('success', true, 'room_id', v_room_id);
END;
$$;

-- 9. FUNCTION: Update focus status
CREATE OR REPLACE FUNCTION public.update_focus_status(p_room_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF p_status NOT IN ('focusing', 'break') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_STATUS');
  END IF;
  
  UPDATE public.study_room_participants 
  SET status = p_status 
  WHERE room_id = p_room_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_IN_ROOM');
  END IF;
  
  INSERT INTO public.room_activity_logs (room_id, user_id, action, metadata)
  VALUES (p_room_id, v_user_id, 'status_change', jsonb_build_object('status', p_status));
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 10. FUNCTION: Get active rooms with member count
CREATE OR REPLACE FUNCTION public.get_active_rooms()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  is_public BOOLEAN,
  max_participants INTEGER,
  current_members INTEGER,
  created_by UUID,
  created_at TIMESTAMPTZ,
  owner_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    sr.id,
    sr.name,
    sr.description,
    sr.is_public,
    sr.max_participants,
    sr.current_members,
    sr.created_by,
    sr.created_at,
    p.full_name as owner_name
  FROM public.study_rooms sr
  LEFT JOIN public.profiles p ON sr.created_by = p.user_id
  WHERE sr.room_status = 'active' AND sr.is_public = true
  ORDER BY sr.current_members DESC, sr.created_at DESC;
$$;

-- 11. Drop old policies
DROP POLICY IF EXISTS "Anyone can view public rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Authenticated users can view their own private rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Authenticated users can create rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Room owners can update their rooms" ON public.study_rooms;
DROP POLICY IF EXISTS "Room owners can delete their rooms" ON public.study_rooms;

-- 12. New RLS policies
CREATE POLICY "View active public rooms"
  ON public.study_rooms FOR SELECT
  USING (is_public = true AND room_status = 'active');

CREATE POLICY "View own rooms"
  ON public.study_rooms FOR SELECT
  USING (auth.uid() = created_by);

CREATE POLICY "View rooms user is member of"
  ON public.study_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_room_participants 
      WHERE room_id = study_rooms.id AND user_id = auth.uid()
    )
  );

-- 13. INDEX for performance
CREATE INDEX IF NOT EXISTS idx_study_rooms_room_status ON public.study_rooms(room_status) WHERE room_status = 'active';
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_public ON public.study_rooms(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_room_participants_room_id ON public.study_room_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_room_participants_user_id ON public.study_room_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_room_activity_logs_room_id ON public.room_activity_logs(room_id);

-- 14. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_activity_logs;