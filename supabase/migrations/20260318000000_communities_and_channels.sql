-- ============================================
-- COMMUNITIES AND CHANNELS MIGRATION
-- ============================================

-- 1. Create communities table
CREATE TABLE IF NOT EXISTS public.communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT communities_name_length CHECK (LENGTH(TRIM(name)) >= 3)
);

-- 2. Create community_members table
CREATE TABLE IF NOT EXISTS public.community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);

-- 3. Create channels table
CREATE TABLE IF NOT EXISTS public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  topic TEXT,
  channel_type TEXT NOT NULL DEFAULT 'text' CHECK (channel_type IN ('text', 'study_room', 'forum')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(community_id, name),
  CONSTRAINT channels_name_length CHECK (LENGTH(TRIM(name)) >= 2)
);

-- 4. Create channel_messages table
CREATE TABLE IF NOT EXISTS public.channel_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.channel_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT messages_content_length CHECK (LENGTH(TRIM(content)) >= 1)
);

-- Enable RLS
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;

-- Communities RLS Policies
CREATE POLICY "Anyone can view public communities"
  ON public.communities FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can view their communities"
  ON public.communities FOR SELECT
  USING (
    is_public = true OR
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_id = communities.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create communities"
  ON public.communities FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Community owners can update"
  ON public.communities FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Community owners can delete"
  ON public.communities FOR DELETE
  USING (auth.uid() = owner_id);

-- Community Members RLS Policies
CREATE POLICY "Community members can view"
  ON public.community_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Community members can join"
  ON public.community_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    )
  );

CREATE POLICY "Members can leave themselves"
  ON public.community_members FOR DELETE
  USING (user_id = auth.uid());

CREATE POLICY "Owners can manage members"
  ON public.community_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    )
  );

-- Channels RLS Policies
CREATE POLICY "Members can view channels"
  ON public.channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND (c.is_public = true OR c.owner_id = auth.uid())
    ) OR
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid()
    )
  );

CREATE POLICY "Community admins can create channels"
  ON public.channels FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_id AND c.owner_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM public.community_members cm
      WHERE cm.community_id = community_id AND cm.user_id = auth.uid() AND cm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Channel creators can update"
  ON public.channels FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Channel creators can delete"
  ON public.channels FOR DELETE
  USING (auth.uid() = created_by);

-- Channel Messages RLS Policies
CREATE POLICY "Members can view messages"
  ON public.channel_messages FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.channels ch
      WHERE ch.id = channel_id AND (
        EXISTS (
          SELECT 1 FROM public.communities c
          WHERE c.id = ch.community_id AND c.is_public = true
        ) OR
        EXISTS (
          SELECT 1 FROM public.community_members cm
          WHERE cm.community_id = ch.community_id AND cm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Members can send messages"
  ON public.channel_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Message authors can update"
  ON public.channel_messages FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Message authors can delete"
  ON public.channel_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_communities_owner_id ON public.communities(owner_id);
CREATE INDEX IF NOT EXISTS idx_community_members_community_id ON public.community_members(community_id);
CREATE INDEX IF NOT EXISTS idx_community_members_user_id ON public.community_members(user_id);
CREATE INDEX IF NOT EXISTS idx_channels_community_id ON public.channels(community_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel_id ON public.channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_user_id ON public.channel_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created_at ON public.channel_messages(created_at DESC);

-- ============================================
-- RPC FUNCTIONS
-- ============================================

-- 1. Get user communities
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
    COALESCE(
      CASE 
        WHEN c.owner_id = auth.uid() THEN 'owner'
        ELSE cm.role
      END,
      'member'
    ) as role,
    c.created_at
  FROM public.communities c
  LEFT JOIN public.community_members cm ON c.id = cm.community_id AND cm.user_id = auth.uid()
  WHERE c.is_public = true 
     OR c.owner_id = auth.uid()
     OR cm.user_id = auth.uid()
  ORDER BY c.created_at DESC;
$$;

-- 2. Create community (with default #general channel)
CREATE OR REPLACE FUNCTION public.create_community(p_name TEXT, p_description TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_community_id UUID;
  v_channel_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
  END IF;
  
  -- Create community
  INSERT INTO public.communities (name, description, owner_id)
  VALUES (TRIM(p_name), NULLIF(TRIM(p_description), ''), v_user_id)
  RETURNING id INTO v_community_id;
  
  -- Add owner as member with owner role
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (v_community_id, v_user_id, 'owner');
  
  -- Create default #general channel
  INSERT INTO public.channels (community_id, name, topic, channel_type, sort_order, created_by)
  VALUES (v_community_id, 'general', 'Kênh mặc định', 'text', 0, v_user_id)
  RETURNING id INTO v_channel_id;
  
  RETURN jsonb_build_object('success', true, 'community_id', v_community_id, 'channel_id', v_channel_id);
END;
$$;

-- 3. Get community channels
CREATE OR REPLACE FUNCTION public.get_community_channels(p_community_id UUID)
RETURNS TABLE (
  id UUID,
  community_id UUID,
  name TEXT,
  topic TEXT,
  channel_type TEXT,
  sort_order INTEGER,
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
  JOIN public.communities c ON ch.community_id = c.id
  WHERE ch.community_id = p_community_id
    AND (
      c.is_public = true 
      OR c.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.community_members cm
        WHERE cm.community_id = p_community_id AND cm.user_id = auth.uid()
      )
    )
  ORDER BY ch.sort_order, ch.name;
$$;

-- 4. Create channel
CREATE OR REPLACE FUNCTION public.create_channel(
  p_community_id UUID, 
  p_name TEXT, 
  p_topic TEXT DEFAULT NULL,
  p_channel_type TEXT DEFAULT 'text'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_channel_id UUID;
  v_max_order INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_NAME');
  END IF;
  
  IF p_channel_type NOT IN ('text', 'study_room', 'forum') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CHANNEL_TYPE');
  END IF;
  
  -- Check if user has permission
  IF NOT (
    EXISTS (SELECT 1 FROM public.communities WHERE id = p_community_id AND owner_id = v_user_id)
    OR
    EXISTS (
      SELECT 1 FROM public.community_members 
      WHERE community_id = p_community_id AND user_id = v_user_id AND role IN ('owner', 'admin')
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;
  
  -- Get max sort order
  SELECT COALESCE(MAX(sort_order), 0) INTO v_max_order
  FROM public.channels WHERE community_id = p_community_id;
  
  -- Create channel
  INSERT INTO public.channels (community_id, name, topic, channel_type, sort_order, created_by)
  VALUES (p_community_id, TRIM(p_name), NULLIF(TRIM(p_topic), ''), p_channel_type, v_max_order + 1, v_user_id)
  RETURNING id INTO v_channel_id;
  
  RETURN jsonb_build_object('success', true, 'channel_id', v_channel_id);
END;
$$;

-- 5. Get channel messages
CREATE OR REPLACE FUNCTION public.get_channel_messages(
  p_channel_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_before TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  channel_id UUID,
  user_id UUID,
  content TEXT,
  parent_id UUID,
  created_at TIMESTAMPTZ,
  user_email TEXT,
  user_full_name TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.channel_id,
    m.user_id,
    m.content,
    m.parent_id,
    m.created_at,
    u.email as user_email,
    COALESCE(p.full_name, split_part(u.email, '@', 1)) as user_full_name
  FROM public.channel_messages m
  JOIN auth.users u ON m.user_id = u.id
  LEFT JOIN public.profiles p ON m.user_id = p.user_id
  WHERE m.channel_id = p_channel_id
    AND (
      p_before IS NULL OR m.created_at < p_before
    )
  ORDER BY m.created_at DESC
  LIMIT p_limit;
$$;

-- 6. Send channel message
CREATE OR REPLACE FUNCTION public.send_channel_message(
  p_channel_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_message_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF p_content IS NULL OR LENGTH(TRIM(p_content)) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_CONTENT');
  END IF;
  
  -- Check if user can access this channel
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.channels ch
      JOIN public.communities c ON ch.community_id = c.id
      WHERE ch.id = p_channel_id AND (
        c.is_public = true
        OR c.owner_id = v_user_id
        OR EXISTS (
          SELECT 1 FROM public.community_members cm
          WHERE cm.community_id = c.id AND cm.user_id = v_user_id
        )
      )
    )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
  END IF;
  
  -- Create message
  INSERT INTO public.channel_messages (channel_id, user_id, content, parent_id)
  VALUES (p_channel_id, v_user_id, TRIM(p_content), p_parent_id)
  RETURNING id INTO v_message_id;
  
  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$;

-- 7. Delete channel message
CREATE OR REPLACE FUNCTION public.delete_channel_message(p_message_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_message RECORD;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  -- Get message
  SELECT * INTO v_message
  FROM public.channel_messages
  WHERE id = p_message_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'MESSAGE_NOT_FOUND');
  END IF;
  
  -- Check ownership
  IF v_message.user_id != v_user_id THEN
    -- Also allow community owner/admin to delete
    IF NOT EXISTS (
      SELECT 1 FROM public.channels ch
      JOIN public.communities c ON ch.community_id = c.id
      WHERE ch.id = v_message.channel_id AND c.owner_id = v_user_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
    END IF;
  END IF;
  
  DELETE FROM public.channel_messages WHERE id = p_message_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 8. Join community
CREATE OR REPLACE FUNCTION public.join_community(p_community_id UUID)
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
  
  -- Check if community exists and is public
  IF NOT EXISTS (
    SELECT 1 FROM public.communities 
    WHERE id = p_community_id AND is_public = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'COMMUNITY_NOT_FOUND_OR_PRIVATE');
  END IF;
  
  -- Check if already a member
  IF EXISTS (
    SELECT 1 FROM public.community_members
    WHERE community_id = p_community_id AND user_id = v_user_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_MEMBER');
  END IF;
  
  -- Add member
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (p_community_id, v_user_id, 'member');
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Leave community
CREATE OR REPLACE FUNCTION public.leave_community(p_community_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_owner BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  -- Check if user is owner
  SELECT EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = p_community_id AND owner_id = v_user_id
  ) INTO v_is_owner;
  
  IF v_is_owner THEN
    RETURN jsonb_build_object('success', false, 'error', 'OWNER_CANNOT_LEAVE');
  END IF;
  
  DELETE FROM public.community_members
  WHERE community_id = p_community_id AND user_id = v_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_MEMBER');
  END IF;
  
  RETURN jsonb_build_object('success', true);
END;
$$;

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.channel_messages;
