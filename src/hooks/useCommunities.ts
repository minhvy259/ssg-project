import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const client = supabase as any;

export interface CommunitySummary {
  id: string;
  name: string;
  description: string | null;
  role: "owner" | "admin" | "member" | string;
  created_at: string;
}

export interface CommunityChannel {
  id: string;
  community_id: string;
  name: string;
  topic: string | null;
  channel_type: "text" | "study_room" | "forum" | string;
  sort_order: number;
  created_at: string;
}

export interface ChannelMessage {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  user_email: string;
  user_full_name: string;
}

export function useUserCommunities() {
  return useQuery<CommunitySummary[]>({
    queryKey: ["communities", "mine"],
    queryFn: async () => {
      const { data, error } = await client.rpc("get_user_communities");
      if (error) {
        throw error;
      }
      return (data || []) as CommunitySummary[];
    },
  });
}

export function useCommunityChannels(communityId: string | null) {
  return useQuery<CommunityChannel[]>({
    queryKey: ["community-channels", communityId],
    enabled: !!communityId,
    queryFn: async () => {
      if (!communityId) return [];
      const { data, error } = await client.rpc("get_community_channels", {
        p_community_id: communityId,
      });
      if (error) {
        throw error;
      }
      return (data || []) as CommunityChannel[];
    },
  });
}

export function useChannelMessages(channelId: string | null, limit: number = 50) {
  return useQuery<ChannelMessage[]>({
    queryKey: ["channel-messages", channelId, limit],
    enabled: !!channelId,
    queryFn: async () => {
      if (!channelId) return [];
      const { data, error } = await client.rpc("get_channel_messages", {
        p_channel_id: channelId,
        p_limit: limit,
      });
      if (error) {
        throw error;
      }
      return (data || []) as ChannelMessage[];
    },
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
}

export function useCreateCommunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { name: string; description?: string }) => {
      const { data, error } = await client.rpc("create_community", {
        p_name: params.name,
        p_description: params.description ?? null,
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string; community_id?: string };

      if (!result?.success) {
        throw new Error(result?.error || "FAILED_TO_CREATE_COMMUNITY");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities", "mine"] });
      toast({
        title: "Đã tạo cộng đồng mới",
        description: "Cộng đồng của bạn đã được tạo với kênh #general mặc định.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Không thể tạo cộng đồng",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    },
  });
}

export function useCreateChannel() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { 
      communityId: string; 
      name: string; 
      topic?: string;
      channelType?: string;
    }) => {
      const { data, error } = await client.rpc("create_channel", {
        p_community_id: params.communityId,
        p_name: params.name,
        p_topic: params.topic ?? null,
        p_channel_type: params.channelType ?? 'text',
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string; channel_id?: string };

      if (!result?.success) {
        throw new Error(result?.error || "FAILED_TO_CREATE_CHANNEL");
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-channels", variables.communityId] });
      toast({
        title: "Đã tạo kênh mới",
        description: `Kênh #${variables.name} đã được tạo.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Không thể tạo kênh",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { channelId: string; content: string; parentId?: string }) => {
      const { data, error } = await client.rpc("send_channel_message", {
        p_channel_id: params.channelId,
        p_content: params.content,
        p_parent_id: params.parentId ?? null,
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string; message_id?: string };

      if (!result?.success) {
        throw new Error(result?.error || "FAILED_TO_SEND_MESSAGE");
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["channel-messages", variables.channelId] });
    },
    onError: (error: any) => {
      toast({
        title: "Không thể gửi tin nhắn",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: { channelId: string; messageId: string }) => {
      const { data, error } = await client.rpc("delete_channel_message", {
        p_message_id: params.messageId,
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string };

      if (!result?.success) {
        throw new Error(result?.error || "FAILED_TO_DELETE_MESSAGE");
      }

      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["channel-messages", variables.channelId] });
      toast({
        title: "Đã xóa tin nhắn",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Không thể xóa tin nhắn",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    },
  });
}

export function useJoinCommunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const { data, error } = await client.rpc("join_community", {
        p_community_id: communityId,
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string };

      if (!result?.success) {
        throw new Error(result?.error || "FAILED_TO_JOIN_COMMUNITY");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities", "mine"] });
      toast({
        title: "Đã tham gia cộng đồng",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Không thể tham gia cộng đồng",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    },
  });
}

export function useLeaveCommunity() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (communityId: string) => {
      const { data, error } = await client.rpc("leave_community", {
        p_community_id: communityId,
      });

      if (error) {
        throw error;
      }

      const result = data as { success: boolean; error?: string };

      if (!result?.success) {
        throw new Error(result?.error || "FAILED_TO_LEAVE_COMMUNITY");
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities", "mine"] });
      toast({
        title: "Đã rời cộng đồng",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Không thể rời cộng đồng",
        description: error?.message || "Vui lòng thử lại sau.",
        variant: "destructive",
      });
    },
  });
}

