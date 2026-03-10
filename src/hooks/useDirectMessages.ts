import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const client = supabase as any;

export interface DirectConversationSummary {
  conversation_id: string;
  other_user_id: string;
  other_full_name: string | null;
  other_avatar_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string | null;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

export function useDirectConversations() {
  return useQuery<DirectConversationSummary[]>({
    queryKey: ["direct-conversations"],
    queryFn: async () => {
      const { data, error } = await client.rpc("get_direct_conversations");
      if (error) {
        throw error;
      }
      return (data || []) as DirectConversationSummary[];
    },
  });
}

export function useCreateOrGetDmByEmail() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (email: string) => {
      const trimmed = email.trim();
      if (!trimmed) {
        throw new Error("EMAIL_REQUIRED");
      }

      const { data, error } = await client.rpc("create_or_get_dm_by_email", {
        p_email: trimmed,
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string; conversation_id?: string };

      if (!result?.success || !result.conversation_id) {
        throw new Error(result?.error || "FAILED_TO_CREATE_DM");
      }

      return result.conversation_id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["direct-conversations"] });
    },
    onError: (error: any) => {
      const message =
        error?.message === "USER_NOT_FOUND"
          ? "Không tìm thấy người dùng với email này."
          : "Không thể tạo cuộc trò chuyện. Vui lòng thử lại.";

      const description = error?.message === "USER_NOT_FOUND" ? undefined : error?.message;

      useToast().toast?.({
        title: "Lỗi",
        description: description ?? message,
        variant: "destructive",
      });

      // Fallback when useToast() above doesn't expose toast directly
      console.error("Create DM error:", error);
    },
  });
}

interface UseDirectMessagesOptions {
  conversationId: string | null;
  pageSize?: number;
}

export function useDirectMessages({ conversationId, pageSize = 50 }: UseDirectMessagesOptions) {
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const fetchInitialMessages = useCallback(async () => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const { data, error } = await client.rpc("get_direct_messages", {
      p_conversation_id: conversationId,
      p_limit: pageSize,
    });

    if (error) {
      console.error("Error fetching direct messages:", error);
      toast({
        title: "Lỗi",
        description: "Không thể tải tin nhắn.",
        variant: "destructive",
      });
      setMessages([]);
    } else {
      setMessages((data || []) as DirectMessage[]);
    }

    setLoading(false);
  }, [conversationId, pageSize, toast]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim() || sending) return;

      setSending(true);
      try {
        const { data, error } = await client.rpc("send_direct_message", {
          p_conversation_id: conversationId,
          p_content: content.trim(),
        });

        if (error) {
          console.error("Error sending direct message:", error);
          toast({
            title: "Lỗi",
            description: "Không thể gửi tin nhắn.",
            variant: "destructive",
          });
        } else if (!(data as { success: boolean; error?: string })?.success) {
          console.error("send_direct_message returned error:", data);
          toast({
            title: "Lỗi",
            description: "Không thể gửi tin nhắn.",
            variant: "destructive",
          });
        }
        // Realtime will push the new message.
      } finally {
        setSending(false);
      }
    },
    [conversationId, sending, toast]
  );

  useEffect(() => {
    fetchInitialMessages();

    if (!conversationId) return;

    const channel = supabase
      .channel(`direct_messages_${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as DirectMessage;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, fetchInitialMessages]);

  return {
    messages,
    loading,
    sending,
    sendMessage,
  };
}

