import { useEffect, useRef, useState, useCallback } from 'react';
import DailyIframe, { DailyCall, DailyParticipant } from '@daily-co/daily-js';
import { useAuth } from '@/contexts/AuthContext';
import { Hand, Monitor, MonitorOff, Phone, PhoneOff, Mic, MicOff, Video, VideoOff, User } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface VideoParticipant {
  session_id: string;
  user_name: string;
  audio: boolean;
  video: boolean;
  screen: boolean;
  owner: boolean;
}

interface VideoCallProps {
  roomUrl: string;
  onLeave?: () => void;
  onParticipantsChange?: (participants: VideoParticipant[]) => void;
  raiseHand?: boolean;
  onRaiseHand?: (raised: boolean) => void;
}

export function VideoCall({ roomUrl, onLeave, onParticipantsChange, raiseHand, onRaiseHand }: VideoCallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<DailyCall | null>(null);
  const { user } = useAuth();
  const [isJoined, setIsJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<VideoParticipant[]>([]);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const joinCall = useCallback(async () => {
    if (!roomUrl || !containerRef.current) return;

    try {
      // Create Daily.co call frame
      const callFrame = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: '100%',
          height: '100%',
          border: 'none',
          borderRadius: '12px',
        },
        showLeaveButton: true,
        showFullscreenButton: true,
      });

      callFrameRef.current = callFrame;

      // Handle events
      callFrame.on('joined', () => {
        setIsJoined(true);
        setError(null);
        updateParticipants(callFrame);
      });

      callFrame.on('left', () => {
        setIsJoined(false);
        setParticipants([]);
        if (onLeave) onLeave();
      });

      callFrame.on('participant-joined', () => {
        updateParticipants(callFrame);
      });

      callFrame.on('participant-left', () => {
        updateParticipants(callFrame);
      });

      callFrame.on('participant-updated', (evt) => {
        updateParticipants(callFrame);
        if (evt?.participant?.session_id === 'local' && evt?.participant?.screen !== undefined) {
          setIsScreenSharing(!!evt.participant.screen);
        }
      });

      callFrame.on('error', (evt) => {
        console.error('Daily.co error:', evt);
        setError('Lỗi kết nối: ' + evt.errorMsg);
      });

      // Join the room
      await callFrame.join({
        url: roomUrl,
        userName: user?.email?.split('@')[0] || 'Người dùng',
      });

    } catch (err: any) {
      console.error('Failed to join call:', err);
      setError('Không thể tham gia cuộc gọi: ' + err.message);
    }
  }, [roomUrl, user, onLeave]);

  const updateParticipants = useCallback((callFrame: DailyCall) => {
    const participantsList = callFrame.participants();
    const list: VideoParticipant[] = Object.values(participantsList).map((p: DailyParticipant) => ({
      session_id: p.session_id,
      user_name: p.user_name || 'Người dùng',
      audio: !p.audio,
      video: !p.video,
      screen: !!p.screen,
      owner: p.owner,
    }));
    setParticipants(list);
    if (onParticipantsChange) {
      onParticipantsChange(list);
    }
  }, [onParticipantsChange]);

  useEffect(() => {
    joinCall();

    return () => {
      if (callFrameRef.current) {
        callFrameRef.current.leave();
        callFrameRef.current.destroy();
        callFrameRef.current = null;
      }
    };
  }, [joinCall]);

  const handleLeave = async () => {
    if (callFrameRef.current) {
      await callFrameRef.current.leave();
    }
    if (onLeave) onLeave();
  };

  const toggleScreenShare = useCallback(async () => {
    if (!callFrameRef.current) return;
    try {
      if (isScreenSharing) {
        await callFrameRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await callFrameRef.current.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error('Screen share error:', err);
    }
  }, [isScreenSharing]);

  // Screen share state is updated in joinCall via participant-updated and in toggleScreenShare
  // No separate effect needed; isScreenSharing is toggled by toggleScreenShare and participant events

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-muted/30 rounded-xl p-6">
        <p className="text-destructive mb-4">{error}</p>
        <button
          onClick={joinCall}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Main video area */}
      <div ref={containerRef} className="flex-1 w-full rounded-xl overflow-hidden" />
      {!isJoined && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/30 rounded-xl">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Control bar */}
      {isJoined && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full">
          {/* Mute/Unmute audio */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/20"
            onClick={() => callFrameRef.current?.setLocalAudio(!participants.find(p => p.session_id === 'local')?.audio)}
          >
            {participants.find(p => p.session_id === 'local')?.audio ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-400" />}
          </Button>

          {/* Enable/Disable video */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-white hover:bg-white/20"
            onClick={() => callFrameRef.current?.setLocalVideo(!participants.find(p => p.session_id === 'local')?.video)}
          >
            {participants.find(p => p.session_id === 'local')?.video ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-red-400" />}
          </Button>

          {/* Screen share */}
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full hover:bg-white/20 ${isScreenSharing ? 'bg-green-500 text-white' : 'text-white'}`}
            onClick={toggleScreenShare}
            title="Chia sẻ màn hình"
          >
            {isScreenSharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
          </Button>

          {/* Raise hand */}
          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full hover:bg-white/20 ${raiseHand ? 'bg-yellow-500 text-white' : 'text-white'}`}
            onClick={() => onRaiseHand?.(!raiseHand)}
            title="Giơ tay"
          >
            <Hand className="w-4 h-4" />
          </Button>

          {/* Leave call */}
          <Button
            variant="destructive"
            size="icon"
            className="rounded-full"
            onClick={handleLeave}
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Participants indicator */}
      {isJoined && participants.length > 0 && (
        <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <User className="w-4 h-4 text-white" />
          <span className="text-white text-sm font-medium">{participants.length}</span>
        </div>
      )}
    </div>
  );
}

// Helper to create Daily.co room URL (sync)
export function getOrCreateDailyRoom(roomName: string): string {
  const ROOM_PREFIX = 'studyverse-';
  const slug = (roomName || 'room').toLowerCase().replace(/[^a-z0-9]/g, '-') || 'room';
  return `https://studyverse.daily.co/${ROOM_PREFIX}${slug}`;
}
