import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Conversation {
  id: string;
  other_user_id: string;
  other_name: string | null;
  other_avatar: string | null;
  last_message: string;
  created_at: string;
  is_read: boolean;
  is_sender: boolean;
}

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
}

export function useConversations() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_conversations', { p_limit: 20 });
      if (error) throw error;
      return ((data || []) as unknown) as Conversation[];
    },
    enabled: !!user,
  });
}

export function useMessagesWithUser(otherUserId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['messages', otherUserId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_messages_with_user', {
        p_other_user_id: otherUserId!,
        p_limit: 50,
      });
      if (error) throw error;
      return ((data || []) as unknown) as Message[];
    },
    enabled: !!user && !!otherUserId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { receiverId: string; content: string }) => {
      const { data, error } = await supabase.rpc('send_message', {
        p_receiver_id: params.receiverId,
        p_content: params.content,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', variables.receiverId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
    onError: () => {
      toast({ title: 'Lỗi', description: 'Không thể gửi tin nhắn.', variant: 'destructive' });
    },
  });
}

export function useRealtimeMessages(otherUserId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user || !otherUserId) return;

    const channel = supabase
      .channel(`messages-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new as any;
          if (
            (msg.sender_id === user.id && msg.receiver_id === otherUserId) ||
            (msg.sender_id === otherUserId && msg.receiver_id === user.id)
          ) {
            queryClient.invalidateQueries({ queryKey: ['messages', otherUserId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, otherUserId, queryClient]);
}
