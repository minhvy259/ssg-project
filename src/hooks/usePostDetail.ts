import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PostDetail {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  language: string;
  upvotes: number;
  downvotes: number;
  comment_count: number;
  view_count: number;
  is_pinned: boolean;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  category_color: string | null;
  user_vote: number | null;
  is_saved: boolean;
  is_author: boolean;
  tags: { id: string; name: string; slug: string }[];
}

export interface Comment {
  id: string;
  content: string;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
  parent_id: string | null;
  upvotes: number;
  downvotes: number;
  is_accepted: boolean;
  created_at: string;
  updated_at: string;
  user_vote: number | null;
  is_author: boolean;
  reply_count: number;
  depth: number;
}

export type CommentSortType = 'best' | 'new' | 'old';

export function usePostDetail(postId: string | undefined) {
  return useQuery({
    queryKey: ['post-detail', postId],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID is required');
      
      const { data, error } = await supabase.rpc('get_forum_post_detail', {
        p_post_id: postId,
      });

      if (error) throw error;
      
      const result = data as unknown as { success: boolean; error?: string; post?: PostDetail };
      if (!result.success) {
        throw new Error(result.error || 'Failed to load post');
      }
      
      return result.post as PostDetail;
    },
    enabled: !!postId,
  });
}

export function usePostComments(postId: string | undefined, sort: CommentSortType = 'best') {
  return useQuery({
    queryKey: ['post-comments', postId, sort],
    queryFn: async () => {
      if (!postId) throw new Error('Post ID is required');
      
      const { data, error } = await supabase.rpc('get_post_comments', {
        p_post_id: postId,
        p_sort: sort,
      });

      if (error) throw error;
      return (data || []) as Comment[];
    },
    enabled: !!postId,
  });
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      postId: string;
      content: string;
      parentId?: string | null;
    }) => {
      const { data, error } = await supabase.rpc('create_comment', {
        p_post_id: params.postId,
        p_content: params.content,
        p_parent_id: params.parentId || null,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; comment_id?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to create comment');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['post-detail', variables.postId] });
      toast({
        title: 'Đã gửi bình luận!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message === 'CONTENT_TOO_SHORT' 
          ? 'Nội dung quá ngắn'
          : error.message === 'POST_LOCKED'
          ? 'Bài viết đã bị khóa'
          : 'Không thể gửi bình luận. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}

export function useVoteComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { commentId: string; voteType: 1 | -1; postId: string }) => {
      const { data, error } = await supabase.rpc('vote_on_comment', {
        p_comment_id: params.commentId,
        p_vote_type: params.voteType,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; action?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to vote');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', variables.postId] });
    },
  });
}

export function useAcceptComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { commentId: string; postId: string }) => {
      const { data, error } = await supabase.rpc('accept_comment', {
        p_comment_id: params.commentId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; accepted?: boolean };
      if (!result.success) {
        throw new Error(result.error || 'Failed to accept comment');
      }
      
      return result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', variables.postId] });
      toast({
        title: result.accepted ? 'Đã chấp nhận câu trả lời!' : 'Đã bỏ chấp nhận',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message === 'NOT_POST_AUTHOR' 
          ? 'Chỉ tác giả bài viết mới có thể chấp nhận câu trả lời'
          : 'Không thể thực hiện. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteComment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { commentId: string; postId: string }) => {
      const { data, error } = await supabase.rpc('delete_comment', {
        p_comment_id: params.commentId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string; deleted_count?: number };
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete comment');
      }
      
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['post-detail', variables.postId] });
      toast({
        title: 'Đã xóa bình luận!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message === 'NOT_AUTHOR' 
          ? 'Bạn chỉ có thể xóa bình luận của mình'
          : 'Không thể xóa bình luận. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}
