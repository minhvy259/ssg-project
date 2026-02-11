
-- Add reputation fields to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS reputation_points integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS post_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS comment_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS upvotes_received integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS school text,
ADD COLUMN IF NOT EXISTS major text,
ADD COLUMN IF NOT EXISTS year_of_study text,
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS favorite_subjects text[],
ADD COLUMN IF NOT EXISTS privacy_setting text DEFAULT 'public';

-- Create user_badges table
CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_name text NOT NULL,
  badge_icon text NOT NULL DEFAULT '🏅',
  badge_description text,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_name)
);
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view badges" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "System manages badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create user_follows table
CREATE TABLE public.user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.user_follows FOR DELETE USING (auth.uid() = follower_id);

-- Create notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'comment', 'vote', 'follow', 'badge', 'mention'
  title text NOT NULL,
  message text,
  link text,
  is_read boolean DEFAULT false,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System creates notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Create messages table for DM
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own messages" ON public.messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users update own messages" ON public.messages FOR UPDATE USING (auth.uid() = receiver_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Function to get user rank based on reputation
CREATE OR REPLACE FUNCTION public.get_user_rank(p_reputation integer)
RETURNS text
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_reputation >= 5000 THEN 'Giáo sư'
    WHEN p_reputation >= 2000 THEN 'Tiến sĩ'
    WHEN p_reputation >= 1000 THEN 'Thạc sĩ'
    WHEN p_reputation >= 500 THEN 'Sinh viên'
    WHEN p_reputation >= 100 THEN 'Học sinh'
    ELSE 'Tân thủ'
  END;
$$;

-- Function to get user profile with stats
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_profile json;
  v_current_user uuid;
  v_is_following boolean;
  v_follower_count bigint;
  v_following_count bigint;
BEGIN
  v_current_user := auth.uid();

  SELECT COUNT(*) INTO v_follower_count FROM user_follows WHERE following_id = p_user_id;
  SELECT COUNT(*) INTO v_following_count FROM user_follows WHERE follower_id = p_user_id;
  
  SELECT EXISTS(
    SELECT 1 FROM user_follows WHERE follower_id = v_current_user AND following_id = p_user_id
  ) INTO v_is_following;

  SELECT json_build_object(
    'user_id', p.user_id,
    'full_name', p.full_name,
    'email', CASE WHEN p.privacy_setting = 'public' OR p.user_id = v_current_user THEN p.email ELSE NULL END,
    'avatar_url', p.avatar_url,
    'bio', p.bio,
    'school', p.school,
    'major', p.major,
    'year_of_study', p.year_of_study,
    'favorite_subjects', p.favorite_subjects,
    'reputation_points', COALESCE(p.reputation_points, 0),
    'post_count', COALESCE(p.post_count, 0),
    'comment_count', COALESCE(p.comment_count, 0),
    'upvotes_received', COALESCE(p.upvotes_received, 0),
    'rank', get_user_rank(COALESCE(p.reputation_points, 0)),
    'privacy_setting', p.privacy_setting,
    'created_at', p.created_at,
    'follower_count', v_follower_count,
    'following_count', v_following_count,
    'is_following', v_is_following,
    'is_own_profile', (p.user_id = v_current_user),
    'badges', (
      SELECT COALESCE(json_agg(json_build_object(
        'badge_name', b.badge_name,
        'badge_icon', b.badge_icon,
        'badge_description', b.badge_description,
        'earned_at', b.earned_at
      ) ORDER BY b.earned_at DESC), '[]'::json)
      FROM user_badges b WHERE b.user_id = p_user_id
    )
  ) INTO v_profile
  FROM profiles p
  WHERE p.user_id = p_user_id;

  IF v_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'USER_NOT_FOUND');
  END IF;

  RETURN json_build_object('success', true, 'profile', v_profile);
END;
$$;

-- Function to toggle follow
CREATE OR REPLACE FUNCTION public.toggle_follow(p_target_user_id uuid)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;
  IF v_user_id = p_target_user_id THEN RETURN json_build_object('success', false, 'error', 'CANNOT_FOLLOW_SELF'); END IF;

  SELECT EXISTS(SELECT 1 FROM user_follows WHERE follower_id = v_user_id AND following_id = p_target_user_id) INTO v_exists;

  IF v_exists THEN
    DELETE FROM user_follows WHERE follower_id = v_user_id AND following_id = p_target_user_id;
    RETURN json_build_object('success', true, 'following', false);
  ELSE
    INSERT INTO user_follows (follower_id, following_id) VALUES (v_user_id, p_target_user_id);
    -- Create notification
    INSERT INTO notifications (user_id, type, title, message, actor_id, link)
    VALUES (p_target_user_id, 'follow', 'Người theo dõi mới', 'Có người vừa theo dõi bạn', v_user_id, '/profile/' || v_user_id);
    RETURN json_build_object('success', true, 'following', true);
  END IF;
END;
$$;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION public.get_leaderboard(p_type text DEFAULT 'reputation', p_limit integer DEFAULT 10)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT 
        p.user_id,
        p.full_name,
        p.avatar_url,
        COALESCE(p.reputation_points, 0) as reputation_points,
        COALESCE(p.post_count, 0) as post_count,
        COALESCE(p.upvotes_received, 0) as upvotes_received,
        get_user_rank(COALESCE(p.reputation_points, 0)) as rank
      FROM profiles p
      ORDER BY
        CASE WHEN p_type = 'reputation' THEN COALESCE(p.reputation_points, 0) END DESC NULLS LAST,
        CASE WHEN p_type = 'posts' THEN COALESCE(p.post_count, 0) END DESC NULLS LAST,
        CASE WHEN p_type = 'upvotes' THEN COALESCE(p.upvotes_received, 0) END DESC NULLS LAST
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Function to update profile
CREATE OR REPLACE FUNCTION public.update_user_profile(
  p_full_name text DEFAULT NULL,
  p_bio text DEFAULT NULL,
  p_school text DEFAULT NULL,
  p_major text DEFAULT NULL,
  p_year_of_study text DEFAULT NULL,
  p_favorite_subjects text[] DEFAULT NULL,
  p_privacy_setting text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

  UPDATE profiles SET
    full_name = COALESCE(p_full_name, full_name),
    bio = COALESCE(p_bio, bio),
    school = COALESCE(p_school, school),
    major = COALESCE(p_major, major),
    year_of_study = COALESCE(p_year_of_study, year_of_study),
    favorite_subjects = COALESCE(p_favorite_subjects, favorite_subjects),
    privacy_setting = COALESCE(p_privacy_setting, privacy_setting),
    updated_at = now()
  WHERE user_id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to get/mark notifications
CREATE OR REPLACE FUNCTION public.get_notifications(p_limit integer DEFAULT 20, p_unread_only boolean DEFAULT false)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

  RETURN (
    SELECT json_build_object(
      'success', true,
      'unread_count', (SELECT COUNT(*) FROM notifications WHERE user_id = v_user_id AND is_read = false),
      'notifications', COALESCE((
        SELECT json_agg(json_build_object(
          'id', n.id,
          'type', n.type,
          'title', n.title,
          'message', n.message,
          'link', n.link,
          'is_read', n.is_read,
          'actor_name', pp.full_name,
          'actor_avatar', pp.avatar_url,
          'created_at', n.created_at
        ) ORDER BY n.created_at DESC)
        FROM notifications n
        LEFT JOIN public_profiles pp ON pp.user_id = n.actor_id
        WHERE n.user_id = v_user_id
          AND (NOT p_unread_only OR n.is_read = false)
        LIMIT p_limit
      ), '[]'::json)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_notification_ids uuid[] DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

  IF p_notification_ids IS NULL THEN
    UPDATE notifications SET is_read = true WHERE user_id = v_user_id AND is_read = false;
  ELSE
    UPDATE notifications SET is_read = true WHERE user_id = v_user_id AND id = ANY(p_notification_ids);
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to send/get messages
CREATE OR REPLACE FUNCTION public.send_message(p_receiver_id uuid, p_content text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_msg_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;
  IF LENGTH(TRIM(p_content)) < 1 THEN RETURN json_build_object('success', false, 'error', 'EMPTY_MESSAGE'); END IF;

  INSERT INTO messages (sender_id, receiver_id, content)
  VALUES (v_user_id, p_receiver_id, TRIM(p_content))
  RETURNING id INTO v_msg_id;

  -- Create notification
  INSERT INTO notifications (user_id, type, title, message, actor_id, link)
  VALUES (p_receiver_id, 'message', 'Tin nhắn mới', LEFT(p_content, 100), v_user_id, '/messages');

  RETURN json_build_object('success', true, 'message_id', v_msg_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_conversations(p_limit integer DEFAULT 20)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

  RETURN (
    SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
    FROM (
      SELECT DISTINCT ON (other_user_id)
        m.id,
        CASE WHEN m.sender_id = v_user_id THEN m.receiver_id ELSE m.sender_id END as other_user_id,
        pp.full_name as other_name,
        pp.avatar_url as other_avatar,
        m.content as last_message,
        m.created_at,
        m.is_read,
        m.sender_id = v_user_id as is_sender
      FROM messages m
      LEFT JOIN public_profiles pp ON pp.user_id = CASE WHEN m.sender_id = v_user_id THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = v_user_id OR m.receiver_id = v_user_id
      ORDER BY other_user_id, m.created_at DESC
    ) t
    ORDER BY t.created_at DESC
    LIMIT p_limit
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_messages_with_user(p_other_user_id uuid, p_limit integer DEFAULT 50)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_user_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED'); END IF;

  -- Mark as read
  UPDATE messages SET is_read = true
  WHERE sender_id = p_other_user_id AND receiver_id = v_user_id AND is_read = false;

  RETURN (
    SELECT COALESCE(json_agg(json_build_object(
      'id', m.id,
      'sender_id', m.sender_id,
      'receiver_id', m.receiver_id,
      'content', m.content,
      'is_read', m.is_read,
      'created_at', m.created_at,
      'is_mine', m.sender_id = v_user_id
    ) ORDER BY m.created_at ASC), '[]'::json)
    FROM messages m
    WHERE (m.sender_id = v_user_id AND m.receiver_id = p_other_user_id)
       OR (m.sender_id = p_other_user_id AND m.receiver_id = v_user_id)
    LIMIT p_limit
  );
END;
$$;

-- Forum stats function
CREATE OR REPLACE FUNCTION public.get_forum_stats()
RETURNS json
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_posts', (SELECT COUNT(*) FROM forum_posts WHERE status = 'published'),
    'total_comments', (SELECT COUNT(*) FROM forum_comments),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'posts_today', (SELECT COUNT(*) FROM forum_posts WHERE created_at > now() - interval '1 day' AND status = 'published')
  );
$$;
