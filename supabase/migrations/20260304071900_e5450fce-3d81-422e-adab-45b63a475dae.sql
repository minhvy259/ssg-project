
-- Fix get_post_comments: cast vote_type to integer to match return type
CREATE OR REPLACE FUNCTION public.get_post_comments(p_post_id uuid, p_sort text DEFAULT 'best'::text)
 RETURNS TABLE(id uuid, content text, author_id uuid, author_name text, author_avatar text, parent_id uuid, upvotes integer, downvotes integer, is_accepted boolean, created_at timestamp with time zone, updated_at timestamp with time zone, user_vote integer, is_author boolean, reply_count bigint, depth integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  
  RETURN QUERY
  WITH RECURSIVE comment_tree AS (
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
    WHERE ct.depth < 5
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
    (cv.vote_type)::integer AS user_vote,
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
$function$;

-- Also fix get_forum_posts to cast vote_type to smallint consistently
-- (It already works but let's also cast for safety)

-- Enable realtime for forum_comments so comments update live
ALTER PUBLICATION supabase_realtime ADD TABLE public.forum_comments;
