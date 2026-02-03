-- =============================================
-- STUDENT FORUM DATABASE SCHEMA
-- =============================================

-- 1. ENUM TYPES
CREATE TYPE public.post_status AS ENUM ('published', 'draft', 'archived', 'flagged');
CREATE TYPE public.content_language AS ENUM ('en', 'vi', 'es', 'ja', 'ko', 'zh', 'fr', 'de', 'other');

-- 2. FORUM CATEGORIES TABLE
CREATE TABLE public.forum_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Lucide icon name
  color TEXT DEFAULT '#6366f1', -- hex color for category badge
  parent_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. FORUM TAGS TABLE
CREATE TABLE public.forum_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. FORUM POSTS TABLE
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.forum_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT, -- Auto-generated or manual excerpt
  language content_language DEFAULT 'en',
  status post_status DEFAULT 'published',
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. POST TAGS JUNCTION TABLE
CREATE TABLE public.forum_post_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.forum_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, tag_id)
);

-- 6. POST VOTES TABLE
CREATE TABLE public.forum_post_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 = downvote, 1 = upvote
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- 7. FORUM COMMENTS TABLE
CREATE TABLE public.forum_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  is_accepted BOOLEAN DEFAULT false, -- For Q&A style posts
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. COMMENT VOTES TABLE
CREATE TABLE public.forum_comment_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.forum_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type SMALLINT NOT NULL CHECK (vote_type IN (-1, 1)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- 9. SAVED POSTS TABLE
CREATE TABLE public.forum_saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_forum_posts_author ON public.forum_posts(author_id);
CREATE INDEX idx_forum_posts_category ON public.forum_posts(category_id);
CREATE INDEX idx_forum_posts_status ON public.forum_posts(status);
CREATE INDEX idx_forum_posts_created ON public.forum_posts(created_at DESC);
CREATE INDEX idx_forum_posts_hot ON public.forum_posts(upvotes DESC, comment_count DESC, created_at DESC);
CREATE INDEX idx_forum_comments_post ON public.forum_comments(post_id);
CREATE INDEX idx_forum_comments_author ON public.forum_comments(author_id);
CREATE INDEX idx_forum_post_tags_post ON public.forum_post_tags(post_id);
CREATE INDEX idx_forum_post_tags_tag ON public.forum_post_tags(tag_id);

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================
ALTER TABLE public.forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_post_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_comment_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_saved_posts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Categories: Public read
CREATE POLICY "Anyone can view categories" ON public.forum_categories FOR SELECT USING (true);

-- Tags: Public read
CREATE POLICY "Anyone can view tags" ON public.forum_tags FOR SELECT USING (true);

-- Posts: Public read for published, authors can manage their own
CREATE POLICY "Anyone can view published posts" ON public.forum_posts 
  FOR SELECT USING (status = 'published');

CREATE POLICY "Authors can view their own posts" ON public.forum_posts 
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Authenticated users can create posts" ON public.forum_posts 
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own posts" ON public.forum_posts 
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their own posts" ON public.forum_posts 
  FOR DELETE USING (auth.uid() = author_id);

-- Post Tags: Public read, authors can manage
CREATE POLICY "Anyone can view post tags" ON public.forum_post_tags FOR SELECT USING (true);

CREATE POLICY "Post authors can manage tags" ON public.forum_post_tags 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.forum_posts WHERE id = post_id AND author_id = auth.uid())
  );

CREATE POLICY "Post authors can delete tags" ON public.forum_post_tags 
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.forum_posts WHERE id = post_id AND author_id = auth.uid())
  );

-- Post Votes: Authenticated users
CREATE POLICY "Anyone can view post votes" ON public.forum_post_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote" ON public.forum_post_votes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their vote" ON public.forum_post_votes 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote" ON public.forum_post_votes 
  FOR DELETE USING (auth.uid() = user_id);

-- Comments: Public read, authenticated write
CREATE POLICY "Anyone can view comments" ON public.forum_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can comment" ON public.forum_comments 
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their comments" ON public.forum_comments 
  FOR UPDATE USING (auth.uid() = author_id);

CREATE POLICY "Authors can delete their comments" ON public.forum_comments 
  FOR DELETE USING (auth.uid() = author_id);

-- Comment Votes
CREATE POLICY "Anyone can view comment votes" ON public.forum_comment_votes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can vote comments" ON public.forum_comment_votes 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change comment vote" ON public.forum_comment_votes 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can remove comment vote" ON public.forum_comment_votes 
  FOR DELETE USING (auth.uid() = user_id);

-- Saved Posts
CREATE POLICY "Users can view their saved posts" ON public.forum_saved_posts 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts" ON public.forum_saved_posts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts" ON public.forum_saved_posts 
  FOR DELETE USING (auth.uid() = user_id);

-- =============================================
-- DATABASE FUNCTIONS
-- =============================================

-- Function to vote on a post
CREATE OR REPLACE FUNCTION public.vote_on_post(p_post_id UUID, p_vote_type SMALLINT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_existing_vote SMALLINT;
  v_old_upvotes INTEGER;
  v_old_downvotes INTEGER;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF p_vote_type NOT IN (-1, 1) THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_VOTE_TYPE');
  END IF;
  
  -- Get existing vote
  SELECT vote_type INTO v_existing_vote
  FROM public.forum_post_votes
  WHERE post_id = p_post_id AND user_id = v_user_id;
  
  -- Get current counts
  SELECT upvotes, downvotes INTO v_old_upvotes, v_old_downvotes
  FROM public.forum_posts WHERE id = p_post_id;
  
  IF v_existing_vote IS NOT NULL THEN
    IF v_existing_vote = p_vote_type THEN
      -- Remove vote (toggle off)
      DELETE FROM public.forum_post_votes WHERE post_id = p_post_id AND user_id = v_user_id;
      
      IF p_vote_type = 1 THEN
        UPDATE public.forum_posts SET upvotes = upvotes - 1 WHERE id = p_post_id;
      ELSE
        UPDATE public.forum_posts SET downvotes = downvotes - 1 WHERE id = p_post_id;
      END IF;
      
      RETURN jsonb_build_object('success', true, 'action', 'removed');
    ELSE
      -- Change vote
      UPDATE public.forum_post_votes SET vote_type = p_vote_type WHERE post_id = p_post_id AND user_id = v_user_id;
      
      IF p_vote_type = 1 THEN
        UPDATE public.forum_posts SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = p_post_id;
      ELSE
        UPDATE public.forum_posts SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = p_post_id;
      END IF;
      
      RETURN jsonb_build_object('success', true, 'action', 'changed');
    END IF;
  ELSE
    -- New vote
    INSERT INTO public.forum_post_votes (post_id, user_id, vote_type) VALUES (p_post_id, v_user_id, p_vote_type);
    
    IF p_vote_type = 1 THEN
      UPDATE public.forum_posts SET upvotes = upvotes + 1 WHERE id = p_post_id;
    ELSE
      UPDATE public.forum_posts SET downvotes = downvotes + 1 WHERE id = p_post_id;
    END IF;
    
    RETURN jsonb_build_object('success', true, 'action', 'voted');
  END IF;
END;
$$;

-- Function to get posts with filters
CREATE OR REPLACE FUNCTION public.get_forum_posts(
  p_sort TEXT DEFAULT 'hot',
  p_category_id UUID DEFAULT NULL,
  p_tag_slug TEXT DEFAULT NULL,
  p_language TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_author_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  category_id UUID,
  category_name TEXT,
  category_slug TEXT,
  category_color TEXT,
  title TEXT,
  excerpt TEXT,
  language content_language,
  upvotes INTEGER,
  downvotes INTEGER,
  comment_count INTEGER,
  view_count INTEGER,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  tags JSONB,
  user_vote SMALLINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    pp.full_name AS author_name,
    pp.avatar_url AS author_avatar,
    p.category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    c.color AS category_color,
    p.title,
    COALESCE(p.excerpt, LEFT(p.content, 200)) AS excerpt,
    p.language,
    p.upvotes,
    p.downvotes,
    p.comment_count,
    p.view_count,
    p.is_pinned,
    p.created_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
       FROM public.forum_post_tags pt
       JOIN public.forum_tags t ON t.id = pt.tag_id
       WHERE pt.post_id = p.id),
      '[]'::jsonb
    ) AS tags,
    (SELECT vote_type FROM public.forum_post_votes WHERE post_id = p.id AND user_id = auth.uid()) AS user_vote
  FROM public.forum_posts p
  LEFT JOIN public.public_profiles pp ON pp.user_id = p.author_id
  LEFT JOIN public.forum_categories c ON c.id = p.category_id
  WHERE p.status = 'published'
    AND (p_category_id IS NULL OR p.category_id = p_category_id)
    AND (p_language IS NULL OR p.language::TEXT = p_language)
    AND (p_author_id IS NULL OR p.author_id = p_author_id)
    AND (p_search IS NULL OR p.title ILIKE '%' || p_search || '%' OR p.content ILIKE '%' || p_search || '%')
    AND (p_tag_slug IS NULL OR EXISTS (
      SELECT 1 FROM public.forum_post_tags pt
      JOIN public.forum_tags t ON t.id = pt.tag_id
      WHERE pt.post_id = p.id AND t.slug = p_tag_slug
    ))
  ORDER BY
    p.is_pinned DESC,
    CASE WHEN p_sort = 'hot' THEN (p.upvotes * 2 + p.comment_count - p.downvotes) END DESC NULLS LAST,
    CASE WHEN p_sort = 'new' THEN p.created_at END DESC NULLS LAST,
    CASE WHEN p_sort = 'top' THEN (p.upvotes - p.downvotes) END DESC NULLS LAST,
    p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to create a post
CREATE OR REPLACE FUNCTION public.create_forum_post(
  p_title TEXT,
  p_content TEXT,
  p_category_id UUID DEFAULT NULL,
  p_language TEXT DEFAULT 'en',
  p_tags TEXT[] DEFAULT ARRAY[]::TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_post_id UUID;
  v_tag_id UUID;
  v_tag TEXT;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  IF LENGTH(TRIM(p_title)) < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'TITLE_TOO_SHORT');
  END IF;
  
  IF LENGTH(TRIM(p_content)) < 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'CONTENT_TOO_SHORT');
  END IF;
  
  -- Create post
  INSERT INTO public.forum_posts (author_id, category_id, title, content, excerpt, language)
  VALUES (v_user_id, p_category_id, TRIM(p_title), p_content, LEFT(p_content, 200), p_language::content_language)
  RETURNING id INTO v_post_id;
  
  -- Handle tags
  FOREACH v_tag IN ARRAY p_tags LOOP
    v_tag := LOWER(TRIM(v_tag));
    IF v_tag != '' THEN
      -- Get or create tag
      INSERT INTO public.forum_tags (name, slug)
      VALUES (v_tag, REPLACE(v_tag, ' ', '-'))
      ON CONFLICT (slug) DO UPDATE SET usage_count = forum_tags.usage_count + 1
      RETURNING id INTO v_tag_id;
      
      -- Link tag to post
      INSERT INTO public.forum_post_tags (post_id, tag_id) VALUES (v_post_id, v_tag_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  
  -- Update category post count
  IF p_category_id IS NOT NULL THEN
    UPDATE public.forum_categories SET post_count = post_count + 1 WHERE id = p_category_id;
  END IF;
  
  RETURN jsonb_build_object('success', true, 'post_id', v_post_id);
END;
$$;

-- Function to toggle save post
CREATE OR REPLACE FUNCTION public.toggle_save_post(p_post_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;
  
  SELECT EXISTS(
    SELECT 1 FROM public.forum_saved_posts WHERE post_id = p_post_id AND user_id = v_user_id
  ) INTO v_exists;
  
  IF v_exists THEN
    DELETE FROM public.forum_saved_posts WHERE post_id = p_post_id AND user_id = v_user_id;
    RETURN jsonb_build_object('success', true, 'saved', false);
  ELSE
    INSERT INTO public.forum_saved_posts (post_id, user_id) VALUES (p_post_id, v_user_id);
    RETURN jsonb_build_object('success', true, 'saved', true);
  END IF;
END;
$$;

-- Function to get saved posts
CREATE OR REPLACE FUNCTION public.get_saved_posts(p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author_name TEXT,
  author_avatar TEXT,
  category_id UUID,
  category_name TEXT,
  category_slug TEXT,
  category_color TEXT,
  title TEXT,
  excerpt TEXT,
  language content_language,
  upvotes INTEGER,
  downvotes INTEGER,
  comment_count INTEGER,
  view_count INTEGER,
  is_pinned BOOLEAN,
  created_at TIMESTAMPTZ,
  tags JSONB,
  user_vote SMALLINT,
  saved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.author_id,
    pp.full_name AS author_name,
    pp.avatar_url AS author_avatar,
    p.category_id,
    c.name AS category_name,
    c.slug AS category_slug,
    c.color AS category_color,
    p.title,
    COALESCE(p.excerpt, LEFT(p.content, 200)) AS excerpt,
    p.language,
    p.upvotes,
    p.downvotes,
    p.comment_count,
    p.view_count,
    p.is_pinned,
    p.created_at,
    COALESCE(
      (SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'slug', t.slug))
       FROM public.forum_post_tags pt
       JOIN public.forum_tags t ON t.id = pt.tag_id
       WHERE pt.post_id = p.id),
      '[]'::jsonb
    ) AS tags,
    (SELECT vote_type FROM public.forum_post_votes WHERE post_id = p.id AND user_id = auth.uid()) AS user_vote,
    sp.created_at AS saved_at
  FROM public.forum_saved_posts sp
  JOIN public.forum_posts p ON p.id = sp.post_id
  LEFT JOIN public.public_profiles pp ON pp.user_id = p.author_id
  LEFT JOIN public.forum_categories c ON c.id = p.category_id
  WHERE sp.user_id = auth.uid() AND p.status = 'published'
  ORDER BY sp.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- =============================================
-- INSERT DEFAULT CATEGORIES
-- =============================================
INSERT INTO public.forum_categories (name, slug, description, icon, color, sort_order) VALUES
('General Discussion', 'general', 'General topics and announcements', 'MessageCircle', '#6366f1', 1),
('Mathematics', 'mathematics', 'Algebra, Calculus, Statistics, and more', 'Calculator', '#ec4899', 2),
('Computer Science', 'computer-science', 'Programming, Algorithms, AI/ML', 'Code', '#10b981', 3),
('Physics', 'physics', 'Classical mechanics, Quantum physics, Astrophysics', 'Atom', '#f59e0b', 4),
('Languages', 'languages', 'English, Spanish, Japanese, and language learning', 'Globe', '#8b5cf6', 5),
('Study Tips', 'study-tips', 'Productivity, Time management, Learning techniques', 'Lightbulb', '#06b6d4', 6),
('Career & Internships', 'career', 'Job hunting, Internship experiences, Career advice', 'Briefcase', '#84cc16', 7),
('Resources', 'resources', 'Books, Courses, Tools recommendations', 'BookOpen', '#f97316', 8);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.vote_on_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_forum_posts TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_forum_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_save_post TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_saved_posts TO authenticated;