-- Fix RLS: Allow all community members to create channels

-- Drop existing policy
DROP POLICY IF EXISTS "Community admins can create channels" ON public.channels;

-- Create new policy: all community members can create channels
CREATE POLICY "Community members can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND (c.owner_id = auth.uid() OR c.is_public = true)
    ) OR
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid()
    )
  );
