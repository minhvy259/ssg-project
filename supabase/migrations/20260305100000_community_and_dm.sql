-- ============================================
-- COMMUNITY (SERVER / CHANNEL) & DIRECT MESSAGES
-- Phase 2 - Community + DM realtime
-- ============================================

-- 1. Communities (similar to Discord servers)
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 3),
  description TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

-- Only members (or owner) can see communities details
CREATE POLICY IF NOT EXISTS "Members can read communities"
  ON public.communities
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = communities.id
        AND m.user_id = auth.uid()
    )
  );

-- Only authenticated users can insert communities (as owner)
CREATE POLICY IF NOT EXISTS "Users can create communities"
  ON public.communities
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Only owners can update their community basic info
CREATE POLICY IF NOT EXISTS "Owners can update communities"
  ON public.communities
  FOR UPDATE
  USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_communities_owner_id
  ON public.communities(owner_id);

-- 2. Community members
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);

ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own communities"
  ON public.community_members
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can join communities"
  ON public.community_members
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_community_members_user_id
  ON public.community_members(user_id);

CREATE INDEX IF NOT EXISTS idx_community_members_community_id
  ON public.community_members(community_id);

-- 3. Channels inside communities
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(trim(name)) >= 2),
  topic TEXT,
  channel_type TEXT NOT NULL DEFAULT 'text' CHECK (channel_type IN ('text', 'study_room', 'forum')),
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Members can read channels"
  ON public.channels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = channels.community_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "Members can insert channels"
  ON public.channels
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = community_id
        AND m.user_id = auth.uid()
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_channels_community_id_sort
  ON public.channels(community_id, sort_order);

-- 4. Direct message conversations
CREATE TABLE IF NOT EXISTS public.direct_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_conversations ENABLE ROW LEVEL SECURITY;

-- Only participants can see conversation row
CREATE POLICY IF NOT EXISTS "Participants can read conversations"
  ON public.direct_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_participants dp
      WHERE dp.conversation_id = direct_conversations.id
        AND dp.user_id = auth.uid()
    )
  );

-- 5. Direct message participants
CREATE TABLE IF NOT EXISTS public.direct_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);

ALTER TABLE public.direct_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can read own DM memberships"
  ON public.direct_participants
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can join DMs"
  ON public.direct_participants
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_direct_participants_user_id
  ON public.direct_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_direct_participants_conversation_id
  ON public.direct_participants(conversation_id);

-- 6. Direct messages
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.direct_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT NOT NULL CHECK (char_length(trim(content)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Only participants can read messages
CREATE POLICY IF NOT EXISTS "Participants can read messages"
  ON public.direct_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.direct_participants dp
      WHERE dp.conversation_id = direct_messages.conversation_id
        AND dp.user_id = auth.uid()
    )
  );

-- Only participants can insert messages
CREATE POLICY IF NOT EXISTS "Participants can insert messages"
  ON public.direct_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.direct_participants dp
      WHERE dp.conversation_id = conversation_id
        AND dp.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation_created_at
  ON public.direct_messages(conversation_id, created_at DESC);

-- 7. Helper functions for communities

-- Create community and auto-join as owner
CREATE OR REPLACE FUNCTION public.create_community(
  p_name TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_community_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_name IS NULL OR char_length(trim(p_name)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
  END IF;

  INSERT INTO public.communities (name, description, owner_id)
  VALUES (trim(p_name), NULLIF(trim(p_description), ''), v_user_id)
  RETURNING id INTO v_community_id;

  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (v_community_id, v_user_id, 'owner');

  -- Default "general" text channel
  INSERT INTO public.channels (community_id, name, topic, channel_type, sort_order)
  VALUES (v_community_id, 'general', 'Kênh chat chung', 'text', 0);

  RETURN jsonb_build_object('success', true, 'community_id', v_community_id);
END;
$$;

-- Get communities current user has joined
CREATE OR REPLACE FUNCTION public.get_user_communities()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.description,
    m.role,
    c.created_at
  FROM public.communities c
  JOIN public.community_members m
    ON m.community_id = c.id
  WHERE m.user_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

-- Get channels of a community the user is member of
CREATE OR REPLACE FUNCTION public.get_community_channels(p_community_id UUID)
RETURNS TABLE (
  id UUID,
  community_id UUID,
  name TEXT,
  topic TEXT,
  channel_type TEXT,
  sort_order INT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ch.id,
    ch.community_id,
    ch.name,
    ch.topic,
    ch.channel_type,
    ch.sort_order,
    ch.created_at
  FROM public.channels ch
  WHERE ch.community_id = p_community_id
    AND EXISTS (
      SELECT 1 FROM public.community_members m
      WHERE m.community_id = p_community_id
        AND m.user_id = auth.uid()
    )
  ORDER BY ch.sort_order, ch.created_at;
$$;

-- 8. Helper functions for Direct Messages

-- Create or get DM conversation by other user id
CREATE OR REPLACE FUNCTION public.create_or_get_dm(
  p_other_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_conversation_id UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_other_user_id IS NULL OR p_other_user_id = v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_TARGET');
  END IF;

  -- Look for existing conversation with exactly these two participants
  SELECT dc.id
  INTO v_conversation_id
  FROM public.direct_conversations dc
  WHERE EXISTS (
    SELECT 1 FROM public.direct_participants dp1
    WHERE dp1.conversation_id = dc.id AND dp1.user_id = v_user_id
  )
  AND EXISTS (
    SELECT 1 FROM public.direct_participants dp2
    WHERE dp2.conversation_id = dc.id AND dp2.user_id = p_other_user_id
  )
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.direct_conversations DEFAULT VALUES
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.direct_participants (conversation_id, user_id)
    VALUES (v_conversation_id, v_user_id),
           (v_conversation_id, p_other_user_id);
  END IF;

  RETURN jsonb_build_object('success', true, 'conversation_id', v_conversation_id);
END;
$$;

-- Convenience: create/get DM by email
CREATE OR REPLACE FUNCTION public.create_or_get_dm_by_email(
  p_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_other_user_id UUID;
BEGIN
  SELECT user_id
  INTO v_other_user_id
  FROM public.profiles
  WHERE lower(email) = lower(p_email)
  LIMIT 1;

  IF v_other_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  RETURN public.create_or_get_dm(v_other_user_id);
END;
$$;

-- Send message to DM conversation
CREATE OR REPLACE FUNCTION public.send_direct_message(
  p_conversation_id UUID,
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

  IF p_conversation_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CONVERSATION');
  END IF;

  IF p_content IS NULL OR char_length(trim(p_content)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'EMPTY_CONTENT');
  END IF;

  -- Must be participant
  IF NOT EXISTS (
    SELECT 1 FROM public.direct_participants
    WHERE conversation_id = p_conversation_id
      AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_PARTICIPANT');
  END IF;

  SELECT full_name, avatar_url
  INTO v_profile
  FROM public.profiles
  WHERE user_id = v_user_id;

  INSERT INTO public.direct_messages (conversation_id, sender_id, sender_name, sender_avatar, content)
  VALUES (
    p_conversation_id,
    v_user_id,
    COALESCE(v_profile.full_name, 'Ẩn danh'),
    v_profile.avatar_url,
    trim(p_content)
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Get DM conversations of current user with summary info
CREATE OR REPLACE FUNCTION public.get_direct_conversations()
RETURNS TABLE (
  conversation_id UUID,
  other_user_id UUID,
  other_full_name TEXT,
  other_avatar_url TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH my_memberships AS (
    SELECT conversation_id
    FROM public.direct_participants
    WHERE user_id = auth.uid()
  ),
  others AS (
    SELECT
      dp.conversation_id,
      dp.user_id AS other_user_id
    FROM public.direct_participants dp
    JOIN my_memberships mm
      ON mm.conversation_id = dp.conversation_id
    WHERE dp.user_id <> auth.uid()
  ),
  last_messages AS (
    SELECT DISTINCT ON (conversation_id)
      conversation_id,
      content AS last_message,
      created_at AS last_message_at
    FROM public.direct_messages
    ORDER BY conversation_id, created_at DESC
  )
  SELECT
    o.conversation_id,
    o.other_user_id,
    p.full_name AS other_full_name,
    p.avatar_url AS other_avatar_url,
    lm.last_message,
    lm.last_message_at
  FROM others o
  LEFT JOIN public.profiles p
    ON p.user_id = o.other_user_id
  LEFT JOIN last_messages lm
    ON lm.conversation_id = o.conversation_id
  ORDER BY COALESCE(lm.last_message_at, now()) DESC;
$$;

-- Get messages for a conversation
CREATE OR REPLACE FUNCTION public.get_direct_messages(
  p_conversation_id UUID,
  p_limit INT DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  conversation_id UUID,
  sender_id UUID,
  sender_name TEXT,
  sender_avatar TEXT,
  content TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    dm.id,
    dm.conversation_id,
    dm.sender_id,
    dm.sender_name,
    dm.sender_avatar,
    dm.content,
    dm.created_at
  FROM public.direct_messages dm
  WHERE dm.conversation_id = p_conversation_id
    AND EXISTS (
      SELECT 1 FROM public.direct_participants dp
      WHERE dp.conversation_id = p_conversation_id
        AND dp.user_id = auth.uid()
    )
    AND (p_before IS NULL OR dm.created_at < p_before)
  ORDER BY dm.created_at ASC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
$$;

-- 9. Enable realtime for direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

