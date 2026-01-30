-- Fix security definer view issue by using security_invoker
DROP VIEW IF EXISTS public.public_profiles;

CREATE VIEW public.public_profiles 
WITH (security_invoker = on) AS
SELECT 
  user_id,
  full_name,
  avatar_url
FROM public.profiles;

-- Add RLS policy to profiles for public profile data access
CREATE POLICY "Anyone can view non-sensitive profile data"
  ON public.profiles FOR SELECT
  USING (true);

-- Grant access to the view
GRANT SELECT ON public.public_profiles TO authenticated;
GRANT SELECT ON public.public_profiles TO anon;