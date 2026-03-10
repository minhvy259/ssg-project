-- ============================================
-- FORUM <-> STUDY ROOM LINKING
-- ============================================

-- 1. Add linked_room_id to forum_posts
ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS linked_room_id UUID REFERENCES public.study_rooms(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_forum_posts_linked_room_id
  ON public.forum_posts(linked_room_id);

-- 2. Simple helper function to attach a study room to a post
CREATE OR REPLACE FUNCTION public.link_study_room_to_post(
  p_post_id UUID,
  p_room_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_post_author UUID;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT author_id INTO v_post_author
  FROM public.forum_posts
  WHERE id = p_post_id;

  IF v_post_author IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'POST_NOT_FOUND');
  END IF;

  -- Chỉ tác giả bài viết hoặc chủ phòng mới được liên kết
  IF v_post_author <> v_user_id
     AND NOT EXISTS (
       SELECT 1 FROM public.study_rooms
       WHERE id = p_room_id AND created_by = v_user_id
     ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ALLOWED');
  END IF;

  UPDATE public.forum_posts
  SET linked_room_id = p_room_id
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

