import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDeletePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      const { data, error } = await supabase.rpc('delete_forum_post', {
        p_post_id: postId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || 'Failed to delete');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['saved-posts'] });
      toast({ title: 'Đã xóa bài viết!' });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message === 'NOT_AUTHOR'
          ? 'Bạn chỉ có thể xóa bài viết của mình'
          : 'Không thể xóa bài viết. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}

export function useEditPost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      postId: string;
      title?: string;
      content?: string;
      categoryId?: string;
      tags?: string[];
    }) => {
      const { data, error } = await supabase.rpc('edit_forum_post', {
        p_post_id: params.postId,
        p_title: params.title || null,
        p_content: params.content || null,
        p_category_id: params.categoryId || null,
        p_tags: params.tags || null,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || 'Failed to edit');
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-detail', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      toast({ title: 'Đã cập nhật bài viết!' });
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message === 'TITLE_TOO_SHORT'
          ? 'Tiêu đề phải có ít nhất 5 ký tự'
          : error.message === 'CONTENT_TOO_SHORT'
          ? 'Nội dung phải có ít nhất 20 ký tự'
          : 'Không thể cập nhật. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });
}
