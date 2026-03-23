-- Update functions to support password-protected rooms

-- 1. Update create_study_room to accept password
CREATE OR REPLACE FUNCTION public.create_study_room(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT true,
  p_max_participants INTEGER DEFAULT 10,
  p_password TEXT DEFAULT NULL
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
  
  -- If password is provided, set is_public to false
  IF p_password IS NOT NULL AND LENGTH(TRIM(p_password)) > 0 THEN
    p_is_public := false;
  END IF;
  
  INSERT INTO public.study_rooms (name, description, is_public, max_participants, created_by, current_members, room_status, password)
  VALUES (TRIM(p_name), NULLIF(TRIM(p_description), ''), p_is_public, p_max_participants, v_user_id, 1, 'active', NULLIF(TRIM(p_password), ''))
  RETURNING id INTO v_room_id;
  
  INSERT INTO public.study_room_participants (room_id, user_id, role, status)
  VALUES (v_room_id, v_user_id, 'owner', 'focusing');
  
  INSERT INTO public.room_activity_logs (room_id, user_id, action)
  VALUES (v_room_id, v_user_id, 'room_created');
  
  RETURN jsonb_build_object('success', true, 'room_id', v_room_id);
END;
$$;

-- 2. Update can_user_join_room to check password
CREATE OR REPLACE FUNCTION public.can_user_join_room(p_room_id UUID, p_user_id UUID, p_password TEXT DEFAULT NULL)
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
  
  -- Check password if room is protected
  IF v_room.password IS NOT NULL AND v_room.password != '' THEN
    IF p_password IS NULL OR p_password != v_room.password THEN
      RETURN jsonb_build_object('allowed', false, 'reason', 'PASSWORD_REQUIRED', 'has_password', true);
    END IF;
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

-- 3. Update join_study_room to accept password
CREATE OR REPLACE FUNCTION public.join_study_room(p_room_id UUID, p_password TEXT DEFAULT NULL)
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
  
  v_check := public.can_user_join_room(p_room_id, v_user_id, p_password);
  
  IF NOT (v_check->>'allowed')::BOOLEAN THEN
    RETURN jsonb_build_object('success', false, 'error', v_check->>'reason', 'has_password', v_check->>'has_password');
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
