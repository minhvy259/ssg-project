
-- Function to delete a forum post (only by author)
CREATE OR REPLACE FUNCTION public.delete_forum_post(p_post_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_post RECORD;
  v_comment_count bigint;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT author_id, category_id INTO v_post
  FROM forum_posts WHERE id = p_post_id;

  IF v_post IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'POST_NOT_FOUND');
  END IF;

  IF v_post.author_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHOR');
  END IF;

  -- Delete related data
  DELETE FROM forum_comment_votes WHERE comment_id IN (SELECT id FROM forum_comments WHERE post_id = p_post_id);
  DELETE FROM forum_comments WHERE post_id = p_post_id;
  DELETE FROM forum_post_votes WHERE post_id = p_post_id;
  DELETE FROM forum_saved_posts WHERE post_id = p_post_id;
  DELETE FROM forum_post_tags WHERE post_id = p_post_id;
  DELETE FROM forum_posts WHERE id = p_post_id;

  -- Update category post count
  IF v_post.category_id IS NOT NULL THEN
    UPDATE forum_categories SET post_count = GREATEST(0, post_count - 1) WHERE id = v_post.category_id;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

-- Function to edit a forum post (only by author)
CREATE OR REPLACE FUNCTION public.edit_forum_post(
  p_post_id uuid,
  p_title text DEFAULT NULL,
  p_content text DEFAULT NULL,
  p_category_id uuid DEFAULT NULL,
  p_tags text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_post RECORD;
  v_tag text;
  v_tag_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT author_id, category_id INTO v_post
  FROM forum_posts WHERE id = p_post_id;

  IF v_post IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'POST_NOT_FOUND');
  END IF;

  IF v_post.author_id != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHOR');
  END IF;

  IF p_title IS NOT NULL AND LENGTH(TRIM(p_title)) < 5 THEN
    RETURN json_build_object('success', false, 'error', 'TITLE_TOO_SHORT');
  END IF;

  IF p_content IS NOT NULL AND LENGTH(TRIM(p_content)) < 20 THEN
    RETURN json_build_object('success', false, 'error', 'CONTENT_TOO_SHORT');
  END IF;

  -- Update post
  UPDATE forum_posts SET
    title = COALESCE(NULLIF(TRIM(p_title), ''), title),
    content = COALESCE(NULLIF(TRIM(p_content), ''), content),
    excerpt = CASE WHEN p_content IS NOT NULL THEN LEFT(TRIM(p_content), 200) ELSE excerpt END,
    category_id = CASE WHEN p_category_id IS NOT NULL THEN p_category_id ELSE category_id END,
    updated_at = now()
  WHERE id = p_post_id;

  -- Update tags if provided
  IF p_tags IS NOT NULL THEN
    DELETE FROM forum_post_tags WHERE post_id = p_post_id;
    
    FOREACH v_tag IN ARRAY p_tags LOOP
      v_tag := LOWER(TRIM(v_tag));
      IF v_tag != '' THEN
        INSERT INTO forum_tags (name, slug)
        VALUES (v_tag, REPLACE(v_tag, ' ', '-'))
        ON CONFLICT (slug) DO UPDATE SET usage_count = forum_tags.usage_count + 1
        RETURNING id INTO v_tag_id;
        
        INSERT INTO forum_post_tags (post_id, tag_id) VALUES (p_post_id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;
