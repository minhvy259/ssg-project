import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type TimerPhase = 'idle' | 'focus' | 'break';

export interface RoomTimerState {
  room_id: string;
  current_phase: TimerPhase;
  phase_end_at: string | null;
  timer_owner_id: string | null;
  timer_owner_name?: string | null;
}

export function useRoomTimer(roomId: string | null) {
  const { user } = useAuth();
  const [state, setState] = useState<RoomTimerState | null>(null);
  const [timerError, setTimerError] = useState<string | null>(null);

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
    const timerState = rows[0] ?? null;
    
    // Fetch timer owner name if exists (profiles or users table)
    if (timerState?.timer_owner_id) {
      try {
        const { data: ownerData } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('id', timerState.timer_owner_id)
          .maybeSingle();
        
        if (ownerData) {
          timerState.timer_owner_name = (ownerData as { full_name?: string; email?: string }).full_name 
            || (ownerData as { full_name?: string; email?: string }).email?.split('@')[0];
        }
      } catch {
        // Ignore: profiles may not exist or RLS may block
      }
    }
    
    setState(timerState);
  }, [roomId]);

  const startTimer = useCallback(
    async (phase: Exclude<TimerPhase, 'idle'>, durationSeconds: number) => {
      if (!roomId) return;
      if (!user) return;

      setTimerError(null);
      const endAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

      const { data, error } = await supabase.rpc('start_room_timer', {
        p_room_id: roomId,
        p_phase: phase,
        p_duration_seconds: durationSeconds,
      });

      if (error) {
        const isFunctionMissing =
          error.message?.includes('Could not find the function') ||
          error.message?.includes('schema cache');
        if (isFunctionMissing) {
          // Fallback: upsert trực tiếp khi RPC chưa có trên Supabase
          const { error: upsertError } = await supabase
            .from('study_room_states')
            .upsert(
              {
                room_id: roomId,
                current_phase: phase,
                phase_end_at: endAt,
                timer_owner_id: user.id,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'room_id' }
            );
          if (!upsertError) {
            setState({
              room_id: roomId,
              current_phase: phase,
              phase_end_at: endAt,
              timer_owner_id: user.id,
              timer_owner_name: user.email?.split('@')[0] ?? null,
            });
          } else {
            const isTableMissing =
              upsertError.message?.includes('Could not find the table') ||
              upsertError.message?.includes('schema cache');
            setTimerError(
              isTableMissing
                ? 'Timer chưa sẵn sàng: cần chạy migration Supabase. Xem supabase/README_MIGRATIONS.md hoặc chạy: npx supabase db push'
                : 'Không thể bật timer: ' + upsertError.message
            );
            console.error('Fallback timer upsert failed:', upsertError);
          }
        } else {
          setTimerError('Không thể bật timer: ' + error.message);
          console.error('Error starting room timer:', error);
        }
        return;
      }

      const result = data as { success: boolean; phase?: TimerPhase; phase_end_at?: string };
      if (result?.success && result.phase && result.phase_end_at) {
        setState({
          room_id: roomId,
          current_phase: result.phase,
          phase_end_at: result.phase_end_at,
          timer_owner_id: user.id,
          timer_owner_name: user.email?.split('@')[0] ?? null,
        });
      }
    },
    [roomId, user]
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
    timerError,
    startFocus: (durationSeconds: number) => startTimer('focus', durationSeconds),
    startBreak: (durationSeconds: number) => startTimer('break', durationSeconds),
    refetch: fetchState,
  };
}

