import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface StudyRoom {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  max_participants: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Participant {
  id: string;
  room_id: string;
  user_id: string;
  status: 'focusing' | 'break';
  joined_at: string;
  profile?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useStudyRooms() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch public rooms
  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('study_rooms')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách phòng học',
        variant: 'destructive',
      });
    } else {
      setRooms(data || []);
    }
    setLoading(false);
  };

  // Create a new room
  const createRoom = async (name: string, description: string, isPublic: boolean, maxParticipants: number = 10) => {
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Bạn cần đăng nhập để tạo phòng học',
        variant: 'destructive',
      });
      return null;
    }

    const { data, error } = await supabase
      .from('study_rooms')
      .insert({
        name,
        description,
        is_public: isPublic,
        max_participants: maxParticipants,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo phòng học',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Thành công',
      description: 'Đã tạo phòng học mới',
    });

    fetchRooms();
    return data;
  };

  // Join a room
  const joinRoom = async (roomId: string) => {
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Bạn cần đăng nhập để tham gia phòng học',
        variant: 'destructive',
      });
      return false;
    }

    const { error } = await supabase
      .from('study_room_participants')
      .insert({
        room_id: roomId,
        user_id: user.id,
        status: 'focusing',
      });

    if (error) {
      if (error.code === '23505') {
        // Already in room
        return true;
      }
      toast({
        title: 'Lỗi',
        description: 'Không thể tham gia phòng học',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Leave a room
  const leaveRoom = async (roomId: string) => {
    if (!user) return false;

    const { error } = await supabase
      .from('study_room_participants')
      .delete()
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể rời phòng học',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  // Update status (focusing/break)
  const updateStatus = async (roomId: string, status: 'focusing' | 'break') => {
    if (!user) return false;

    const { error } = await supabase
      .from('study_room_participants')
      .update({ status })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  useEffect(() => {
    fetchRooms();

    // Subscribe to realtime updates for rooms
    const roomsChannel = supabase
      .channel('study_rooms_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_rooms',
        },
        () => {
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomsChannel);
    };
  }, []);

  return {
    rooms,
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    updateStatus,
    refetch: fetchRooms,
  };
}

export function useRoomParticipants(roomId: string | null) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchParticipants = async () => {
    if (!roomId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    // First fetch participants
    const { data: participantsData, error } = await supabase
      .from('study_room_participants')
      .select('*')
      .eq('room_id', roomId);

    if (error || !participantsData) {
      setLoading(false);
      return;
    }

    // Then fetch profiles for each participant
    const userIds = participantsData.map(p => p.user_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('user_id, full_name, avatar_url')
      .in('user_id', userIds);

    // Merge data
    const merged = participantsData.map(p => ({
      ...p,
      status: p.status as 'focusing' | 'break',
      profile: profilesData?.find(pr => pr.user_id === p.user_id) || null,
    }));

    setParticipants(merged as Participant[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchParticipants();

    if (!roomId) return;

    // Subscribe to realtime updates for participants
    const participantsChannel = supabase
      .channel(`room_participants_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(participantsChannel);
    };
  }, [roomId]);

  return { participants, loading, refetch: fetchParticipants };
}
