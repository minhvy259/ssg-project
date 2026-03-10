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

