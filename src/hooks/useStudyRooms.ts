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
  current_members: number;
  created_by: string;
  created_at: string;
  owner_name: string | null;
}

export interface Participant {
  id: string;
  user_id: string;
  role: 'owner' | 'member';
  status: 'focusing' | 'break';
  joined_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

type RpcResponse = {
  success: boolean;
  error?: string;
  room_id?: string;
  participant_id?: string;
  room_closed?: boolean;
  new_owner_id?: string;
};

export function useStudyRooms() {
  const [rooms, setRooms] = useState<StudyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch active rooms using RPC function
  const fetchRooms = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_active_rooms');

    if (error) {
      console.error('Error fetching rooms:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tải danh sách phòng học',
        variant: 'destructive',
      });
      setRooms([]);
    } else {
      setRooms((data as StudyRoom[]) || []);
    }
    setLoading(false);
  };

  // Create a new room using RPC function
  const createRoom = async (
    name: string, 
    description: string, 
    isPublic: boolean, 
    maxParticipants: number = 10
  ): Promise<string | null> => {
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Bạn cần đăng nhập để tạo phòng học',
        variant: 'destructive',
      });
      return null;
    }

    const { data, error } = await supabase.rpc('create_study_room', {
      p_name: name,
      p_description: description || null,
      p_is_public: isPublic,
      p_max_participants: maxParticipants,
    });

    if (error) {
      console.error('Error creating room:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo phòng học',
        variant: 'destructive',
      });
      return null;
    }

    const result = data as RpcResponse;
    
    if (!result.success) {
      const errorMessages: Record<string, string> = {
        UNAUTHORIZED: 'Bạn cần đăng nhập',
        INVALID_NAME: 'Tên phòng phải có ít nhất 3 ký tự',
        INVALID_MAX_PARTICIPANTS: 'Số người tham gia phải từ 2-50',
      };
      toast({
        title: 'Lỗi',
        description: errorMessages[result.error || ''] || 'Không thể tạo phòng học',
        variant: 'destructive',
      });
      return null;
    }

    toast({
      title: 'Thành công',
      description: 'Đã tạo phòng học mới',
    });

    fetchRooms();
    return result.room_id || null;
  };

  // Join a room using RPC function
  const joinRoom = async (roomId: string): Promise<boolean> => {
    if (!user) {
      toast({
        title: 'Lỗi',
        description: 'Bạn cần đăng nhập để tham gia phòng học',
        variant: 'destructive',
      });
      return false;
    }

    const { data, error } = await supabase.rpc('join_study_room', {
      p_room_id: roomId,
    });

    if (error) {
      console.error('Error joining room:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tham gia phòng học',
        variant: 'destructive',
      });
      return false;
    }

    const result = data as RpcResponse;
    
    if (!result.success) {
      const errorMessages: Record<string, string> = {
        UNAUTHORIZED: 'Bạn cần đăng nhập',
        ROOM_NOT_FOUND: 'Phòng học không tồn tại',
        ROOM_CLOSED: 'Phòng học đã đóng',
        ALREADY_IN_ROOM: 'Bạn đã ở trong phòng này',
        ROOM_FULL: 'Phòng học đã đầy',
      };
      
      // Don't show error if already in room (that's fine)
      if (result.error !== 'ALREADY_IN_ROOM') {
        toast({
          title: 'Lỗi',
          description: errorMessages[result.error || ''] || 'Không thể tham gia phòng học',
          variant: 'destructive',
        });
      }
      return result.error === 'ALREADY_IN_ROOM';
    }

    return true;
  };

  // Leave a room using RPC function
  const leaveRoom = async (roomId: string): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase.rpc('leave_study_room', {
      p_room_id: roomId,
    });

    if (error) {
      console.error('Error leaving room:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể rời phòng học',
        variant: 'destructive',
      });
      return false;
    }

    const result = data as RpcResponse;
    
    if (!result.success) {
      toast({
        title: 'Lỗi',
        description: 'Không thể rời phòng học',
        variant: 'destructive',
      });
      return false;
    }

    if (result.room_closed) {
      toast({
        title: 'Thông báo',
        description: 'Phòng học đã được đóng do không còn thành viên',
      });
    }

    return true;
  };

  // Update status (focusing/break) using RPC function
  const updateStatus = async (roomId: string, status: 'focusing' | 'break'): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase.rpc('update_focus_status', {
      p_room_id: roomId,
      p_status: status,
    });

    if (error) {
      console.error('Error updating status:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể cập nhật trạng thái',
        variant: 'destructive',
      });
      return false;
    }

    const result = data as RpcResponse;
    return result.success;
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
    
    // Use RPC function to get participants safely (without email)
    const { data, error } = await supabase.rpc('get_room_participants', {
      p_room_id: roomId,
    });

    if (error) {
      console.error('Error fetching participants:', error);
      setParticipants([]);
    } else {
      setParticipants((data as Participant[]) || []);
    }
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
