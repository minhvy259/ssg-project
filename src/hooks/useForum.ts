import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ForumPost {
  id: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_color: string | null;
  title: string;
  excerpt: string;
  language: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  view_count: number;
  is_pinned: boolean;
  created_at: string;
  tags: { id: string; name: string; slug: string }[];
  user_vote: number | null;
}

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  post_count: number;
}

export interface ForumTag {
  id: string;
  name: string;
  slug: string;
  usage_count: number;
}

export type SortType = 'hot' | 'new' | 'top';

interface UseForumPostsOptions {
  sort?: SortType;
  categoryId?: string | null;
  tagSlug?: string | null;
  language?: string | null;
  search?: string | null;
  authorId?: string | null;
  limit?: number;
  offset?: number;
}

export function useForumPosts(options: UseForumPostsOptions = {}) {
  const { sort = 'hot', categoryId, tagSlug, language, search, authorId, limit = 20, offset = 0 } = options;

  return useQuery({
    queryKey: ['forum-posts', sort, categoryId, tagSlug, language, search, authorId, limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_forum_posts', {
        p_sort: sort,
        p_category_id: categoryId || null,
        p_tag_slug: tagSlug || null,
        p_language: language || null,
        p_search: search || null,
        p_author_id: authorId || null,
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return (data || []) as ForumPost[];
    },
  });
}

export function useSavedPosts(limit = 20, offset = 0) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['saved-posts', limit, offset],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_saved_posts', {
        p_limit: limit,
        p_offset: offset,
      });

      if (error) throw error;
      return (data || []) as (ForumPost & { saved_at: string })[];
    },
    enabled: !!user,
  });
}

export function useForumCategories() {
  return useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data as ForumCategory[];
    },
  });
}

export function useTrendingTags(limit = 10) {
  return useQuery({
    queryKey: ['trending-tags', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_tags')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as ForumTag[];
    },
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      title: string;
      content: string;
      categoryId?: string | null;
      language?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase.rpc('create_forum_post', {
        p_title: params.title,
        p_content: params.content,
        p_category_id: params.categoryId || null,
        p_language: params.language || 'en',
        p_tags: params.tags || [],
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; post_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to create post');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast({
        title: 'Bài viết đã được đăng!',
        description: 'Bài viết của bạn đã được đăng thành công.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message === 'TITLE_TOO_SHORT' 
          ? 'Tiêu đề phải có ít nhất 5 ký tự'
          : error.message === 'CONTENT_TOO_SHORT'
          ? 'Nội dung phải có ít nhất 20 ký tự'
          : 'Không thể đăng bài viết. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}

export function useVotePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { postId: string; voteType: 1 | -1 }) => {
      const { data, error } = await supabase.rpc('vote_on_post', {
        p_post_id: params.postId,
        p_vote_type: params.voteType,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; action?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to vote');
      }
      
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
    },
  });
}

export function useToggleSavePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.rpc('toggle_save_post', {
        p_post_id: postId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; saved: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to save post');
      }
      
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      toast({
        title: data.saved ? 'Đã lưu bài viết' : 'Đã bỏ lưu bài viết',
      });
    },
  });
}
