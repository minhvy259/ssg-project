
-- 1. Create storage bucket for forum images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('forum-images', 'forum-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

-- Storage RLS policies
CREATE POLICY "Anyone can view forum images"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-images');

CREATE POLICY "Authenticated users can upload forum images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'forum-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
USING (bucket_id = 'forum-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2. User roles table for admin system
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Reputation triggers
-- Trigger: update post_count when creating/deleting posts
CREATE OR REPLACE FUNCTION public.update_profile_post_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET 
      post_count = COALESCE(post_count, 0) + 1,
      reputation_points = COALESCE(reputation_points, 0) + 10
    WHERE user_id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET 
      post_count = GREATEST(0, COALESCE(post_count, 0) - 1),
      reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 10)
    WHERE user_id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_post_count
AFTER INSERT OR DELETE ON public.forum_posts
FOR EACH ROW EXECUTE FUNCTION public.update_profile_post_count();

-- Trigger: update comment_count when creating/deleting comments
CREATE OR REPLACE FUNCTION public.update_profile_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET 
      comment_count = COALESCE(comment_count, 0) + 1,
      reputation_points = COALESCE(reputation_points, 0) + 5
    WHERE user_id = NEW.author_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET 
      comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1),
      reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 5)
    WHERE user_id = OLD.author_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_comment_count
AFTER INSERT OR DELETE ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.update_profile_comment_count();

-- Trigger: update upvotes_received & reputation on post votes
CREATE OR REPLACE FUNCTION public.update_profile_upvotes_on_post_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author UUID;
BEGIN
  SELECT author_id INTO v_post_author FROM forum_posts WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      UPDATE profiles SET 
        upvotes_received = COALESCE(upvotes_received, 0) + 1,
        reputation_points = COALESCE(reputation_points, 0) + 2
      WHERE user_id = v_post_author;
    ELSIF NEW.vote_type = -1 THEN
      UPDATE profiles SET 
        reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 1)
      WHERE user_id = v_post_author;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE profiles SET 
        upvotes_received = GREATEST(0, COALESCE(upvotes_received, 0) - 1),
        reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 2)
      WHERE user_id = v_post_author;
    ELSIF OLD.vote_type = -1 THEN
      UPDATE profiles SET 
        reputation_points = COALESCE(reputation_points, 0) + 1
      WHERE user_id = v_post_author;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Vote changed
    IF OLD.vote_type = 1 AND NEW.vote_type = -1 THEN
      UPDATE profiles SET 
        upvotes_received = GREATEST(0, COALESCE(upvotes_received, 0) - 1),
        reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 3)
      WHERE user_id = v_post_author;
    ELSIF OLD.vote_type = -1 AND NEW.vote_type = 1 THEN
      UPDATE profiles SET 
        upvotes_received = COALESCE(upvotes_received, 0) + 1,
        reputation_points = COALESCE(reputation_points, 0) + 3
      WHERE user_id = v_post_author;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_upvotes_post
AFTER INSERT OR UPDATE OR DELETE ON public.forum_post_votes
FOR EACH ROW EXECUTE FUNCTION public.update_profile_upvotes_on_post_vote();

-- Trigger: reputation on comment vote
CREATE OR REPLACE FUNCTION public.update_profile_on_comment_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comment_author UUID;
BEGIN
  SELECT author_id INTO v_comment_author FROM forum_comments WHERE id = COALESCE(NEW.comment_id, OLD.comment_id);
  
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 1 THEN
      UPDATE profiles SET reputation_points = COALESCE(reputation_points, 0) + 1 WHERE user_id = v_comment_author;
    ELSIF NEW.vote_type = -1 THEN
      UPDATE profiles SET reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 1) WHERE user_id = v_comment_author;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 1 THEN
      UPDATE profiles SET reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 1) WHERE user_id = v_comment_author;
    ELSIF OLD.vote_type = -1 THEN
      UPDATE profiles SET reputation_points = COALESCE(reputation_points, 0) + 1 WHERE user_id = v_comment_author;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.vote_type = 1 AND NEW.vote_type = -1 THEN
      UPDATE profiles SET reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 2) WHERE user_id = v_comment_author;
    ELSIF OLD.vote_type = -1 AND NEW.vote_type = 1 THEN
      UPDATE profiles SET reputation_points = COALESCE(reputation_points, 0) + 2 WHERE user_id = v_comment_author;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_update_reputation_comment_vote
AFTER INSERT OR UPDATE OR DELETE ON public.forum_comment_votes
FOR EACH ROW EXECUTE FUNCTION public.update_profile_on_comment_vote();

-- Trigger: reputation on accepted answer (+15)
CREATE OR REPLACE FUNCTION public.update_reputation_on_accept()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_accepted = true AND (OLD.is_accepted IS NULL OR OLD.is_accepted = false) THEN
    UPDATE profiles SET reputation_points = COALESCE(reputation_points, 0) + 15 WHERE user_id = NEW.author_id;
  ELSIF (NEW.is_accepted = false OR NEW.is_accepted IS NULL) AND OLD.is_accepted = true THEN
    UPDATE profiles SET reputation_points = GREATEST(0, COALESCE(reputation_points, 0) - 15) WHERE user_id = OLD.author_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_reputation_accept
AFTER UPDATE OF is_accepted ON public.forum_comments
FOR EACH ROW EXECUTE FUNCTION public.update_reputation_on_accept();

-- 4. Admin functions
-- Admin: get all reports
CREATE OR REPLACE FUNCTION public.get_admin_reports(p_status TEXT DEFAULT 'pending', p_limit INTEGER DEFAULT 50)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  RETURN (
    SELECT json_build_object('success', true, 'reports', COALESCE(json_agg(row_to_json(t)), '[]'::json))
    FROM (
      SELECT 
        r.id, r.reason, r.description, r.status, r.created_at,
        r.post_id, r.comment_id,
        rp.full_name AS reporter_name, rp.avatar_url AS reporter_avatar,
        p.title AS post_title, p.author_id AS post_author_id,
        c.content AS comment_content, c.author_id AS comment_author_id
      FROM forum_reports r
      LEFT JOIN public_profiles rp ON rp.user_id = r.reporter_id
      LEFT JOIN forum_posts p ON p.id = r.post_id
      LEFT JOIN forum_comments c ON c.id = r.comment_id
      WHERE r.status = p_status
      ORDER BY r.created_at DESC
      LIMIT p_limit
    ) t
  );
END;
$$;

-- Admin: resolve report
CREATE OR REPLACE FUNCTION public.resolve_report(p_report_id UUID, p_action TEXT DEFAULT 'dismissed')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  UPDATE forum_reports SET status = p_action WHERE id = p_report_id;
  
  RETURN json_build_object('success', true);
END;
$$;

-- Admin: toggle pin post
CREATE OR REPLACE FUNCTION public.admin_toggle_pin(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_is_pinned BOOLEAN;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT is_pinned INTO v_is_pinned FROM forum_posts WHERE id = p_post_id;
  UPDATE forum_posts SET is_pinned = NOT COALESCE(v_is_pinned, false) WHERE id = p_post_id;
  
  RETURN json_build_object('success', true, 'is_pinned', NOT COALESCE(v_is_pinned, false));
END;
$$;

-- Admin: toggle lock post
CREATE OR REPLACE FUNCTION public.admin_toggle_lock(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_is_locked BOOLEAN;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT is_locked INTO v_is_locked FROM forum_posts WHERE id = p_post_id;
  UPDATE forum_posts SET is_locked = NOT COALESCE(v_is_locked, false) WHERE id = p_post_id;
  
  RETURN json_build_object('success', true, 'is_locked', NOT COALESCE(v_is_locked, false));
END;
$$;

-- Admin: delete any post
CREATE OR REPLACE FUNCTION public.admin_delete_post(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  DELETE FROM forum_comment_votes WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id = p_post_id);
  DELETE FROM forum_comments WHERE post_id = p_post_id;
  DELETE FROM forum_post_votes WHERE post_id = p_post_id;
  DELETE FROM forum_saved_posts WHERE post_id = p_post_id;
  DELETE FROM forum_post_tags WHERE post_id = p_post_id;
  DELETE FROM forum_reports WHERE post_id = p_post_id;
  DELETE FROM forum_posts WHERE id = p_post_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Admin: delete any comment
CREATE OR REPLACE FUNCTION public.admin_delete_comment(p_comment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_post_id UUID; v_count BIGINT;
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  SELECT post_id INTO v_post_id FROM forum_comments WHERE id = p_comment_id;

  WITH RECURSIVE reply_tree AS (
    SELECT id FROM forum_comments WHERE id = p_comment_id
    UNION ALL
    SELECT c.id FROM forum_comments c JOIN reply_tree rt ON c.parent_id = rt.id
  )
  SELECT COUNT(*) INTO v_count FROM reply_tree;

  WITH RECURSIVE reply_tree AS (
    SELECT id FROM forum_comments WHERE id = p_comment_id
    UNION ALL
    SELECT c.id FROM forum_comments c JOIN reply_tree rt ON c.parent_id = rt.id
  )
  DELETE FROM forum_comment_votes WHERE comment_id IN (SELECT id FROM reply_tree);

  WITH RECURSIVE reply_tree AS (
    SELECT id FROM forum_comments WHERE id = p_comment_id
    UNION ALL
    SELECT c.id FROM forum_comments c JOIN reply_tree rt ON c.parent_id = rt.id
  )
  DELETE FROM forum_comments WHERE id IN (SELECT id FROM reply_tree);

  UPDATE forum_posts SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - v_count) WHERE id = v_post_id;
  DELETE FROM forum_reports WHERE comment_id = p_comment_id;

  RETURN json_build_object('success', true, 'deleted_count', v_count);
END;
$$;

-- Admin: get admin stats
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT has_role(auth.uid(), 'admin') AND NOT has_role(auth.uid(), 'moderator') THEN
    RETURN json_build_object('success', false, 'error', 'FORBIDDEN');
  END IF;

  RETURN json_build_object(
    'success', true,
    'total_posts', (SELECT COUNT(*) FROM forum_posts),
    'total_comments', (SELECT COUNT(*) FROM forum_comments),
    'total_users', (SELECT COUNT(*) FROM profiles),
    'pending_reports', (SELECT COUNT(*) FROM forum_reports WHERE status = 'pending'),
    'posts_today', (SELECT COUNT(*) FROM forum_posts WHERE created_at > now() - interval '1 day'),
    'posts_week', (SELECT COUNT(*) FROM forum_posts WHERE created_at > now() - interval '7 days'),
    'comments_today', (SELECT COUNT(*) FROM forum_comments WHERE created_at > now() - interval '1 day'),
    'flagged_posts', (SELECT COUNT(*) FROM forum_posts WHERE status = 'flagged')
  );
END;
$$;
