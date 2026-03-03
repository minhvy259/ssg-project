
-- ============================================================
-- 1. Report system table
-- ============================================================
CREATE TABLE public.forum_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid NOT NULL,
  post_id uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  comment_id uuid REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

ALTER TABLE public.forum_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
  ON public.forum_reports FOR SELECT
  USING (auth.uid() = reporter_id);

CREATE POLICY "Users can create reports"
  ON public.forum_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- ============================================================
-- 2. Report RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_content(
  p_post_id uuid DEFAULT NULL,
  p_comment_id uuid DEFAULT NULL,
  p_reason text DEFAULT 'spam',
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_exists boolean;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF p_post_id IS NULL AND p_comment_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'NO_TARGET');
  END IF;

  -- Check duplicate report
  SELECT EXISTS(
    SELECT 1 FROM forum_reports
    WHERE reporter_id = v_user_id
      AND ((post_id = p_post_id AND p_post_id IS NOT NULL) OR (comment_id = p_comment_id AND p_comment_id IS NOT NULL))
  ) INTO v_exists;

  IF v_exists THEN
    RETURN json_build_object('success', false, 'error', 'ALREADY_REPORTED');
  END IF;

  INSERT INTO forum_reports (reporter_id, post_id, comment_id, reason, description)
  VALUES (v_user_id, p_post_id, p_comment_id, p_reason, p_description);

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- 3. Edit comment RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.edit_comment(
  p_comment_id uuid,
  p_content text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_author uuid;
  v_post_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF LENGTH(TRIM(p_content)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'CONTENT_TOO_SHORT');
  END IF;

  SELECT author_id, post_id INTO v_author, v_post_id
  FROM forum_comments WHERE id = p_comment_id;

  IF v_author IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'COMMENT_NOT_FOUND');
  END IF;

  IF v_author != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHOR');
  END IF;

  UPDATE forum_comments SET content = TRIM(p_content), updated_at = now()
  WHERE id = p_comment_id;

  RETURN json_build_object('success', true);
END;
$$;

-- ============================================================
-- 4. Update create_comment to send notifications
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_comment(p_post_id uuid, p_content text, p_parent_id uuid DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_comment_id UUID;
  v_post_locked BOOLEAN;
  v_post_author UUID;
  v_parent_author UUID;
  v_commenter_name TEXT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  IF LENGTH(TRIM(p_content)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'CONTENT_TOO_SHORT');
  END IF;

  -- Check if post is locked and get author
  SELECT COALESCE(is_locked, false), author_id INTO v_post_locked, v_post_author
  FROM forum_posts WHERE id = p_post_id;

  IF v_post_locked THEN
    RETURN json_build_object('success', false, 'error', 'POST_LOCKED');
  END IF;

  -- Verify parent comment exists if provided
  IF p_parent_id IS NOT NULL THEN
    SELECT author_id INTO v_parent_author
    FROM forum_comments WHERE id = p_parent_id AND post_id = p_post_id;
    IF v_parent_author IS NULL THEN
      RETURN json_build_object('success', false, 'error', 'PARENT_NOT_FOUND');
    END IF;
  END IF;

  -- Create comment
  INSERT INTO forum_comments (post_id, author_id, content, parent_id)
  VALUES (p_post_id, v_user_id, TRIM(p_content), p_parent_id)
  RETURNING id INTO v_comment_id;

  -- Update post comment count
  UPDATE forum_posts
  SET comment_count = COALESCE(comment_count, 0) + 1, updated_at = NOW()
  WHERE id = p_post_id;

  -- Get commenter name
  SELECT full_name INTO v_commenter_name FROM public_profiles WHERE user_id = v_user_id;

  -- Notify post author (if not self)
  IF v_post_author IS NOT NULL AND v_post_author != v_user_id AND p_parent_id IS NULL THEN
    INSERT INTO notifications (user_id, type, title, message, actor_id, link)
    VALUES (v_post_author, 'comment', 'Bình luận mới', COALESCE(v_commenter_name, 'Ai đó') || ' đã bình luận bài viết của bạn', v_user_id, '/forum/post/' || p_post_id);
  END IF;

  -- Notify parent comment author (if replying and not self)
  IF v_parent_author IS NOT NULL AND v_parent_author != v_user_id THEN
    INSERT INTO notifications (user_id, type, title, message, actor_id, link)
    VALUES (v_parent_author, 'reply', 'Phản hồi mới', COALESCE(v_commenter_name, 'Ai đó') || ' đã trả lời bình luận của bạn', v_user_id, '/forum/post/' || p_post_id);
  END IF;

  RETURN json_build_object('success', true, 'comment_id', v_comment_id);
END;
$$;
