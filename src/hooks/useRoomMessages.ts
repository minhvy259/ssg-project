import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

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
    } else {
      setMessages((data as RoomMessage[]) || []);
    }

    setLoading(false);
  }, [roomId, pageSize]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!roomId || !content.trim() || sending) return;

      setSending(true);
      try {
        const { data, error } = await supabase.rpc('send_room_message', {
          p_room_id: roomId,
          p_content: content.trim(),
        });

        if (error) {
          console.error('Error sending room message:', error);
        } else if (!(data as { success: boolean; error?: string })?.success) {
          console.error('send_room_message returned error:', data);
        }
        // Không cần tự append: realtime sẽ đẩy message mới xuống
      } finally {
        setSending(false);
      }
    },
    [roomId, sending]
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

  return {
    messages,
    loading,
    sending,
    sendMessage,
  };
}

