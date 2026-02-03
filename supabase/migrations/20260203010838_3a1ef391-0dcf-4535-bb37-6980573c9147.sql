-- =============================================
-- FORUM POST DETAIL & COMMENTS ENHANCEMENT
-- =============================================

-- Function to get a single post with full details
CREATE OR REPLACE FUNCTION public.get_forum_post_detail(p_post_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post JSON;
  v_user_id UUID;
  v_user_vote INTEGER;
  v_is_saved BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  -- Increment view count
  UPDATE forum_posts 
  SET view_count = COALESCE(view_count, 0) + 1 
  WHERE id = p_post_id;
  
  -- Get user's vote on this post
  SELECT vote_type INTO v_user_vote
  FROM forum_post_votes
  WHERE post_id = p_post_id AND user_id = v_user_id;
  
  -- Check if post is saved
  SELECT EXISTS(
    SELECT 1 FROM forum_saved_posts
    WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_is_saved;
  
  -- Get post with author and category info
  SELECT json_build_object(
    'id', p.id,
    'title', p.title,
    'content', p.content,
    'excerpt', p.excerpt,
    'language', p.language,
    'upvotes', COALESCE(p.upvotes, 0),
    'downvotes', COALESCE(p.downvotes, 0),
    'comment_count', COALESCE(p.comment_count, 0),
    'view_count', COALESCE(p.view_count, 0),
    'is_pinned', COALESCE(p.is_pinned, false),
    'is_locked', COALESCE(p.is_locked, false),
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'author_id', p.author_id,
    'author_name', pp.full_name,
    'author_avatar', pp.avatar_url,
    'category_id', p.category_id,
    'category_name', c.name,
    'category_slug', c.slug,
    'category_color', c.color,
    'user_vote', v_user_vote,
    'is_saved', v_is_saved,
    'is_author', (p.author_id = v_user_id),
    'tags', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', t.id,
        'name', t.name,
        'slug', t.slug
      )), '[]'::json)
      FROM forum_post_tags pt
      JOIN forum_tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id
    )
  ) INTO v_post
  FROM forum_posts p
  LEFT JOIN public_profiles pp ON pp.user_id = p.author_id
  LEFT JOIN forum_categories c ON c.id = p.category_id
  WHERE p.id = p_post_id AND (p.status = 'published' OR p.author_id = v_user_id);
  
  IF v_post IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'POST_NOT_FOUND');
  END IF;
  
  RETURN json_build_object('success', true, 'post', v_post);
END;
$$;

-- Function to get comments for a post (supports nested comments)
CREATE OR REPLACE FUNCTION public.get_post_comments(
  p_post_id UUID,
  p_sort TEXT DEFAULT 'best'
)
RETURNS TABLE(
  id UUID,
  content TEXT,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  parent_id UUID,
  upvotes INTEGER,
  downvotes INTEGER,
  is_accepted BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_vote INTEGER,
  is_author BOOLEAN,
  reply_count BIGINT,
  depth INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
    -- Base case: top-level comments
    SELECT 
      c.id,
      c.content,
      c.author_id,
      c.parent_id,
      c.upvotes,
      c.downvotes,
      c.is_accepted,
      c.created_at,
      c.updated_at,
      0 AS depth
    FROM forum_comments c
    WHERE c.post_id = p_post_id AND c.parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: replies
    SELECT 
      c.id,
      c.content,
      c.author_id,
      c.parent_id,
      c.upvotes,
      c.downvotes,
      c.is_accepted,
      c.created_at,
      c.updated_at,
      ct.depth + 1
    FROM forum_comments c
    JOIN comment_tree ct ON c.parent_id = ct.id
    WHERE ct.depth < 5  -- Max 5 levels deep
  )
  SELECT 
    ct.id,
    ct.content,
    ct.author_id,
    pp.full_name AS author_name,
    pp.avatar_url AS author_avatar,
    ct.parent_id,
    COALESCE(ct.upvotes, 0) AS upvotes,
    COALESCE(ct.downvotes, 0) AS downvotes,
    COALESCE(ct.is_accepted, false) AS is_accepted,
    ct.created_at,
    ct.updated_at,
    cv.vote_type AS user_vote,
    (ct.author_id = v_user_id) AS is_author,
    (SELECT COUNT(*) FROM forum_comments fc WHERE fc.parent_id = ct.id) AS reply_count,
    ct.depth
  FROM comment_tree ct
  LEFT JOIN public_profiles pp ON pp.user_id = ct.author_id
  LEFT JOIN forum_comment_votes cv ON cv.comment_id = ct.id AND cv.user_id = v_user_id
  ORDER BY 
    CASE WHEN p_sort = 'best' THEN (COALESCE(ct.upvotes, 0) - COALESCE(ct.downvotes, 0)) END DESC NULLS LAST,
    CASE WHEN p_sort = 'new' THEN ct.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'old' THEN ct.created_at END ASC NULLS LAST,
    ct.created_at DESC;
END;
$$;

-- Function to create a comment
CREATE OR REPLACE FUNCTION public.create_comment(
  p_post_id UUID,
  p_content TEXT,
  p_parent_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_comment_id UUID;
  v_post_locked BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF LENGTH(TRIM(p_content)) < 2 THEN
    RETURN json_build_object('success', false, 'error', 'CONTENT_TOO_SHORT');
  END IF;
  
  -- Check if post is locked
  SELECT COALESCE(is_locked, false) INTO v_post_locked
  FROM forum_posts WHERE id = p_post_id;
  
  IF v_post_locked THEN
    RETURN json_build_object('success', false, 'error', 'POST_LOCKED');
  END IF;
  
  -- Verify parent comment exists if provided
  IF p_parent_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM forum_comments WHERE id = p_parent_id AND post_id = p_post_id) THEN
      RETURN json_build_object('success', false, 'error', 'PARENT_NOT_FOUND');
    END IF;
  END IF;
  
  -- Create comment
  INSERT INTO forum_comments (post_id, author_id, content, parent_id)
  VALUES (p_post_id, v_user_id, TRIM(p_content), p_parent_id)
  RETURNING id INTO v_comment_id;
  
  -- Update post comment count
  UPDATE forum_posts 
  SET comment_count = COALESCE(comment_count, 0) + 1,
      updated_at = NOW()
  WHERE id = p_post_id;
  
  RETURN json_build_object('success', true, 'comment_id', v_comment_id);
END;
$$;

-- Function to vote on a comment
CREATE OR REPLACE FUNCTION public.vote_on_comment(
  p_comment_id UUID,
  p_vote_type INTEGER
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote INTEGER;
  v_action TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF p_vote_type NOT IN (1, -1) THEN
    RETURN json_build_object('success', false, 'error', 'INVALID_VOTE');
  END IF;
  
  -- Check existing vote
  SELECT vote_type INTO v_existing_vote
  FROM forum_comment_votes
  WHERE comment_id = p_comment_id AND user_id = v_user_id;
  
  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      -- Remove vote
      DELETE FROM forum_comment_votes
      WHERE comment_id = p_comment_id AND user_id = v_user_id;
      
      -- Update comment counts
      IF p_vote_type = 1 THEN
        UPDATE forum_comments SET upvotes = GREATEST(0, COALESCE(upvotes, 0) - 1) WHERE id = p_comment_id;
      ELSE
        UPDATE forum_comments SET downvotes = GREATEST(0, COALESCE(downvotes, 0) - 1) WHERE id = p_comment_id;
      END IF;
      
      v_action := 'removed';
    ELSE
      -- Change vote
      UPDATE forum_comment_votes
      SET vote_type = p_vote_type
      WHERE comment_id = p_comment_id AND user_id = v_user_id;
      
      -- Update comment counts
      IF p_vote_type = 1 THEN
        UPDATE forum_comments SET 
          upvotes = COALESCE(upvotes, 0) + 1,
          downvotes = GREATEST(0, COALESCE(downvotes, 0) - 1)
        WHERE id = p_comment_id;
      ELSE
        UPDATE forum_comments SET 
          downvotes = COALESCE(downvotes, 0) + 1,
          upvotes = GREATEST(0, COALESCE(upvotes, 0) - 1)
        WHERE id = p_comment_id;
      END IF;
      
      v_action := 'changed';
    END IF;
  ELSE
    -- New vote
    INSERT INTO forum_comment_votes (comment_id, user_id, vote_type)
    VALUES (p_comment_id, v_user_id, p_vote_type);
    
    IF p_vote_type = 1 THEN
      UPDATE forum_comments SET upvotes = COALESCE(upvotes, 0) + 1 WHERE id = p_comment_id;
    ELSE
      UPDATE forum_comments SET downvotes = COALESCE(downvotes, 0) + 1 WHERE id = p_comment_id;
    END IF;
    
    v_action := 'voted';
  END IF;
  
  RETURN json_build_object('success', true, 'action', v_action);
END;
$$;

-- Function to accept a comment as best answer (only post author can do this)
CREATE OR REPLACE FUNCTION public.accept_comment(p_comment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_post_id UUID;
  v_post_author UUID;
  v_is_accepted BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  -- Get comment's post and check if user is author
  SELECT c.post_id, p.author_id, c.is_accepted
  INTO v_post_id, v_post_author, v_is_accepted
  FROM forum_comments c
  JOIN forum_posts p ON p.id = c.post_id
  WHERE c.id = p_comment_id;
  
  IF v_post_author IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'COMMENT_NOT_FOUND');
  END IF;
  
  IF v_post_author != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'NOT_POST_AUTHOR');
  END IF;
  
  -- Toggle or set accepted
  IF COALESCE(v_is_accepted, false) THEN
    -- Un-accept
    UPDATE forum_comments SET is_accepted = false WHERE id = p_comment_id;
    RETURN json_build_object('success', true, 'accepted', false);
  ELSE
    -- Un-accept any previously accepted comment on this post
    UPDATE forum_comments SET is_accepted = false WHERE post_id = v_post_id AND is_accepted = true;
    -- Accept this comment
    UPDATE forum_comments SET is_accepted = true WHERE id = p_comment_id;
    RETURN json_build_object('success', true, 'accepted', true);
  END IF;
END;
$$;

-- Function to delete a comment (only author can delete)
CREATE OR REPLACE FUNCTION public.delete_comment(p_comment_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_comment_author UUID;
  v_post_id UUID;
  v_reply_count BIGINT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  SELECT author_id, post_id INTO v_comment_author, v_post_id
  FROM forum_comments WHERE id = p_comment_id;
  
  IF v_comment_author IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'COMMENT_NOT_FOUND');
  END IF;
  
  IF v_comment_author != v_user_id THEN
    RETURN json_build_object('success', false, 'error', 'NOT_AUTHOR');
  END IF;
  
  -- Count replies (including nested)
  WITH RECURSIVE reply_tree AS (
    SELECT id FROM forum_comments WHERE parent_id = p_comment_id
    UNION ALL
    SELECT c.id FROM forum_comments c JOIN reply_tree rt ON c.parent_id = rt.id
  )
  SELECT COUNT(*) INTO v_reply_count FROM reply_tree;
  
  -- Delete the comment and all its replies
  WITH RECURSIVE reply_tree AS (
    SELECT id FROM forum_comments WHERE id = p_comment_id
    UNION ALL
    SELECT c.id FROM forum_comments c JOIN reply_tree rt ON c.parent_id = rt.id
  )
  DELETE FROM forum_comments WHERE id IN (SELECT id FROM reply_tree);
  
  -- Update post comment count
  UPDATE forum_posts 
  SET comment_count = GREATEST(0, COALESCE(comment_count, 0) - 1 - v_reply_count)
  WHERE id = v_post_id;
  
  RETURN json_build_object('success', true, 'deleted_count', 1 + v_reply_count);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_forum_post_detail(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_post_comments(UUID, TEXT) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.create_comment(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.vote_on_comment(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_comment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_comment(UUID) TO authenticated;