-- Fix email exposure: Create public_profiles view without sensitive data
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
  user_id,
  full_name,
  avatar_url
FROM public.profiles;

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;

-- Update get_active_rooms to use public_profiles
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
    pp.full_name as owner_name
  FROM public.study_rooms sr
  LEFT JOIN public.public_profiles pp ON sr.created_by = pp.user_id
  WHERE sr.room_status = 'active' AND sr.is_public = true
  ORDER BY sr.current_members DESC, sr.created_at DESC;
$$;

-- Create function to get room participants safely (without email)
CREATE OR REPLACE FUNCTION public.get_room_participants(p_room_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  status TEXT,
  joined_at TIMESTAMPTZ,
  full_name TEXT,
  avatar_url TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    srp.id,
    srp.user_id,
    srp.role,
    srp.status,
    srp.joined_at,
    pp.full_name,
    pp.avatar_url
  FROM public.study_room_participants srp
  LEFT JOIN public.public_profiles pp ON srp.user_id = pp.user_id
  WHERE srp.room_id = p_room_id
  ORDER BY srp.joined_at ASC;
$$;