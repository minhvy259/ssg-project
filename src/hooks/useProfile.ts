import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface UserProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  school: string | null;
  major: string | null;
  year_of_study: string | null;
  favorite_subjects: string[] | null;
  reputation_points: number;
  post_count: number;
  comment_count: number;
  upvotes_received: number;
  rank: string;
  privacy_setting: string;
  created_at: string;
  follower_count: number;
  following_count: number;
  is_following: boolean;
  is_own_profile: boolean;
  badges: { badge_name: string; badge_icon: string; badge_description: string; earned_at: string }[];
}

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_profile', { p_user_id: userId! });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result.profile as UserProfile;
    },
    enabled: !!userId,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      full_name?: string;
      bio?: string;
      school?: string;
      major?: string;
      year_of_study?: string;
      favorite_subjects?: string[];
      privacy_setting?: string;
    }) => {
      const { data, error } = await supabase.rpc('update_user_profile', {
        p_full_name: params.full_name || null,
        p_bio: params.bio || null,
        p_school: params.school || null,
        p_major: params.major || null,
        p_year_of_study: params.year_of_study || null,
        p_favorite_subjects: params.favorite_subjects || null,
        p_privacy_setting: params.privacy_setting || null,
      });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: 'Đã cập nhật hồ sơ!' });
    },
    onError: () => {
      toast({ title: 'Lỗi', description: 'Không thể cập nhật hồ sơ.', variant: 'destructive' });
    },
  });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data, error } = await supabase.rpc('toggle_follow', { p_target_user_id: targetUserId });
      if (error) throw error;
      const result = data as any;
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast({ title: data.following ? 'Đã theo dõi' : 'Đã bỏ theo dõi' });
    },
  });
}

export function useLeaderboard(type = 'reputation', limit = 10) {
  return useQuery({
    queryKey: ['leaderboard', type, limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', { p_type: type, p_limit: limit });
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}

export function useForumStats() {
  return useQuery({
    queryKey: ['forum-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_forum_stats');
      if (error) throw error;
      return data as any;
    },
  });
}
