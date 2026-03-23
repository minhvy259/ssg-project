import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RoomMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

interface UseRoomMessagesOptions {
  roomId: string | null;
  pageSize?: number;
}

export function useRoomMessages({ roomId, pageSize = 50 }: UseRoomMessagesOptions) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [seenMessageId, setSeenMessageId] = useState<string | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchInitialMessages = useCallback(async () => {
    if (!roomId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase
      .from('study_room_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true })
      .limit(pageSize);

    if (error) {
      console.error('Error fetching room messages:', error);
      setMessages([]);
      const isTableMissing =
        error.message?.includes('Could not find the table') ||
        error.message?.includes('schema cache');
      if (isTableMissing) {
        setError(
          'Chat chưa sẵn sàng: cần chạy migration Supabase. Xem supabase/README_MIGRATIONS.md hoặc chạy: npx supabase db push'
        );
      }
    } else {
      setMessages((data as RoomMessage[]) || []);
      setError(null);
    }

    setLoading(false);
  }, [roomId, pageSize]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId || !content.trim() || sending) return;
      if (!user) {
        setError('Bạn cần đăng nhập để nhắn tin');
        return;
      }

      setSending(true);
      setError(null);
      try {
        const { data, error: rpcError } = await supabase.rpc('send_room_message', {
          p_room_id: roomId,
          p_content: content.trim(),
        });

        if (rpcError) {
          const isFunctionMissing =
            rpcError.message?.includes('Could not find the function') ||
            rpcError.message?.includes('schema cache');
          if (isFunctionMissing) {
            // Fallback: insert trực tiếp khi RPC chưa có trên Supabase
            const senderName =
              (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name ||
              user.email?.split('@')[0] ||
              'Ẩn danh';
            const { error: insertError } = await supabase.from('study_room_messages').insert({
              room_id: roomId,
              sender_id: user.id,
              sender_name: senderName,
              sender_avatar: null,
              content: content.trim(),
            });
            if (insertError) {
              const isTableMissing =
                insertError.message?.includes("Could not find the table") ||
                insertError.message?.includes("schema cache");
              setError(
                isTableMissing
                  ? 'Chat chưa sẵn sàng: cần chạy migration Supabase (study_room_messages). Xem supabase/README_MIGRATIONS.md hoặc chạy: npx supabase db push'
                  : 'Không thể gửi tin nhắn: ' + insertError.message
              );
            }
            return;
          }
          setError('Không thể gửi tin nhắn: ' + rpcError.message);
          return;
        }

        const result = data as { success: boolean; error?: string };
        if (!result?.success) {
          const errorMsg = result?.error || 'UNKNOWN';
          const errorMessages: Record<string, string> = {
            UNAUTHORIZED: 'Bạn cần đăng nhập',
            EMPTY_CONTENT: 'Tin nhắn không được để trống',
            NOT_IN_ROOM: 'Bạn cần tham gia phòng trước',
          };
          setError(errorMessages[errorMsg] || 'Không thể gửi tin nhắn');
        }
      } finally {
        setSending(false);
      }
    },
    [roomId, sending, user]
  );

  useEffect(() => {
    fetchInitialMessages();

    if (!roomId) return;

    const channel = supabase
      .channel(`room_messages_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_room_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as RoomMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchInitialMessages]);

  // Typing indicator - broadcast when user is typing
  const setTyping = useCallback((isTyping: boolean) => {
    if (!roomId || !user) return;
    try {
      const channel = supabase.channel(`room_typing_${roomId}`);
      if (isTyping) {
        channel.track({ user_id: user.id, user_name: user.email?.split('@')[0] });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
          try { channel.untrack(); } catch { /* ignore */ }
        }, 3000);
      } else {
        try { channel.untrack(); } catch { /* ignore */ }
      }
    } catch {
      /* presence not critical */
    }
  }, [roomId, user]);

  // Mark message as seen
  const markAsSeen = useCallback((messageId: string) => {
    if (!roomId || !user) return;
    if (seenMessageId === messageId) return;
    setSeenMessageId(messageId);
    try {
      const channel = supabase.channel(`room_seen_${roomId}`);
      channel.track({
        user_id: user.id,
        user_name: user.email?.split('@')[0],
        seen_message_id: messageId,
        last_seen_at: new Date().toISOString(),
      });
      setTimeout(() => {
        try { channel.untrack(); } catch { /* ignore */ }
      }, 5000);
    } catch {
      /* ignore */
    }
  }, [roomId, user, seenMessageId]);

  useEffect(() => {
    if (!roomId) return;
    let typingChannel: ReturnType<typeof supabase.channel> | null = null;
    let seenChannel: ReturnType<typeof supabase.channel> | null = null;
    try {
      typingChannel = supabase.channel(`room_typing_${roomId}`)
        .on('presence', { event: 'sync' }, () => {
          try {
            if (!typingChannel) return;
            const state = typingChannel.presenceState();
            const typing: string[] = [];
            Object.values(state).forEach((presences: unknown) => {
              (presences as { user_id?: string; user_name?: string }[]).forEach((p) => {
                if (p.user_id !== user?.id && p.user_name) typing.push(p.user_name);
              });
            });
            setTypingUsers(typing);
          } catch { /* ignore */ }
        })
        .subscribe();

      seenChannel = supabase.channel(`room_seen_${roomId}`)
        .on('presence', { event: 'sync' }, () => {})
        .subscribe();
    } catch {
      /* presence optional */
    }

    return () => {
      try {
        if (typingChannel) supabase.removeChannel(typingChannel);
        if (seenChannel) supabase.removeChannel(seenChannel);
      } catch { /* ignore */ }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [roomId, user]);

  return {
    messages,
    loading,
    sending,
    error,
    sendMessage,
    typingUsers,
    seenMessageId,
    setTyping,
    markAsSeen,
  };
}

