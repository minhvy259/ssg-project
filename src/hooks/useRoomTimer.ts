import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type TimerPhase = 'idle' | 'focus' | 'break';

export interface RoomTimerState {
  room_id: string;
  current_phase: TimerPhase;
  phase_end_at: string | null;
  timer_owner_id: string | null;
}

export function useRoomTimer(roomId: string | null) {
  const [state, setState] = useState<RoomTimerState | null>(null);

  const fetchState = useCallback(async () => {
    if (!roomId) {
      setState(null);
      return;
    }

    const { data, error } = await supabase.rpc('get_room_timer_state', {
      p_room_id: roomId,
    });

    if (error) {
      console.error('Error fetching room timer state:', error);
      return;
    }

    const rows = (data as RoomTimerState[]) || [];
    setState(rows[0] ?? null);
  }, [roomId]);

  const startTimer = useCallback(
    async (phase: Exclude<TimerPhase, 'idle'>, durationSeconds: number) => {
      if (!roomId) return;

      const { data, error } = await supabase.rpc('start_room_timer', {
        p_room_id: roomId,
        p_phase: phase,
        p_duration_seconds: durationSeconds,
      });

      if (error) {
        console.error('Error starting room timer:', error);
        return;
      }

      const result = data as { success: boolean; phase?: TimerPhase; phase_end_at?: string };
      if (result?.success && result.phase && result.phase_end_at) {
        setState({
          room_id: roomId,
          current_phase: result.phase,
          phase_end_at: result.phase_end_at,
          timer_owner_id: state?.timer_owner_id ?? null,
        });
      }
    },
    [roomId, state]
  );

  useEffect(() => {
    fetchState();

    if (!roomId) return;

    const channel = supabase
      .channel(`room_timer_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'study_room_states',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchState();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'study_room_states',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchState();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchState]);

  return {
    state,
    startFocus: (durationSeconds: number) => startTimer('focus', durationSeconds),
    startBreak: (durationSeconds: number) => startTimer('break', durationSeconds),
    refetch: fetchState,
  };
}

