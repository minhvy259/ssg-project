import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Users, MessageSquare, Coffee, Timer, ArrowLeft, 
  Plus, Lock, Unlock, LogOut, Video, VideoOff, Mic, MicOff, Camera, CameraOff, Phone, PhoneOff,
  Hand, Monitor, User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Navbar } from '@/components/layout/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyRooms, useRoomParticipants, StudyRoom as StudyRoomType } from '@/hooks/useStudyRooms';
import { supabase } from '@/integrations/supabase/client';
import { useRoomTimer } from '@/hooks/useRoomTimer';
import { RoomChat } from '@/components/study-room/RoomChat';
import { VideoCall, getOrCreateDailyRoom, VideoParticipant } from '@/components/study-room/VideoCall';

export default function StudyRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rooms, loading: roomsLoading, createRoom, joinRoom, leaveRoom, updateStatus } = useStudyRooms();
  const { participants, loading: participantsLoading } = useRoomParticipants(roomId || null);
  
  const [currentRoom, setCurrentRoom] = useState<StudyRoomType | null>(null);
  const [time, setTime] = useState(25 * 60);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPublic, setNewRoomPublic] = useState(true);

  // Video/Audio state
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Daily.co video call state
  const [dailyRoomUrl, setDailyRoomUrl] = useState<string | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [raiseHand, setRaiseHand] = useState(false);
  const [videoParticipants, setVideoParticipants] = useState<VideoParticipant[]>([]);

  // Fetch current room details
  useEffect(() => {
    if (roomId) {
      const fetchRoom = async () => {
        const { data } = await supabase
          .from('study_rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();
        
        if (data) {
          // Map database response to StudyRoom type
          setCurrentRoom({
            id: data.id,
            name: data.name,
            description: data.description,
            is_public: data.is_public,
            max_participants: data.max_participants,
            current_members: data.current_members,
            created_by: data.created_by,
            created_at: data.created_at,
            owner_name: null, // Will be fetched separately if needed
          });
          // Daily.co room URL (sync)
          setDailyRoomUrl(getOrCreateDailyRoom(data.name || ''));
          // Auto-join room when visiting
          if (user) {
            joinRoom(roomId);
          }
        }
      };
      fetchRoom();
    } else {
      setCurrentRoom(null);
      setDailyRoomUrl(null);
    }
  }, [roomId, user, joinRoom]);

  const { state: timerState, timerError, startFocus, startBreak } = useRoomTimer(roomId || null);

  // Pomodoro timer đồng bộ giữa các thành viên trong phòng
  useEffect(() => {
    if (!timerState || !timerState.phase_end_at || timerState.current_phase === 'idle') {
      setTime(25 * 60);
      setIsOnBreak(false);
      return;
    }

    const updateFromServer = () => {
      const end = new Date(timerState.phase_end_at).getTime();
      const now = Date.now();
      const diffSeconds = Math.max(0, Math.round((end - now) / 1000));
      setTime(diffSeconds);
      setIsOnBreak(timerState.current_phase === 'break');
    };

    updateFromServer();

    const interval = setInterval(updateFromServer, 1000);
    return () => clearInterval(interval);
  }, [timerState]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    
    const roomId = await createRoom(newRoomName, newRoomDesc, newRoomPublic);
    if (roomId) {
      setCreateDialogOpen(false);
      setNewRoomName('');
      setNewRoomDesc('');
      navigate(`/study-room/${roomId}`);
    }
  };

  const handleLeaveRoom = async () => {
    if (roomId) {
      await leaveRoom(roomId);
      navigate('/study-room');
    }
  };

  const handleStatusChange = async (status: 'focusing' | 'break') => {
    if (roomId) {
      await updateStatus(roomId, status);
      setIsOnBreak(status === 'break');
      setTime(status === 'break' ? 5 * 60 : 25 * 60);
    }
  };

  // Video/Audio controls
  const toggleCamera = async () => {
    setMediaError(null);
    if (isVideoOn) {
      // Turn off video - stop video tracks but keep audio if mic is on
      if (localStream) {
        localStream.getVideoTracks().forEach(track => track.stop());
        // If mic is also on, create new stream without video
        if (isMicOn) {
          try {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
              const newStream = new MediaStream([audioTrack]);
              setLocalStream(newStream);
            }
          } catch (err) {
            console.error('Error handling stream:', err);
          }
        } else {
          setLocalStream(null);
        }
      }
      setIsVideoOn(false);
    } else {
      // Turn on video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: isMicOn 
        });
        setLocalStream(stream);
        setIsVideoOn(true);
      } catch (err: any) {
        console.error('Error accessing camera:', err);
        if (err.name === 'NotAllowedError') {
          setMediaError('Bạn cần cho phép truy cập camera');
        } else if (err.name === 'NotFoundError') {
          setMediaError('Không tìm thấy camera');
        } else {
          setMediaError('Không thể truy cập camera: ' + err.message);
        }
      }
    }
  };

  const toggleMic = async () => {
    setMediaError(null);
    if (isMicOn) {
      // Turn off mic
      if (localStream) {
        localStream.getAudioTracks().forEach(track => track.stop());
        // If video is also on, create new stream without audio
        if (isVideoOn) {
          try {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack) {
              const newStream = new MediaStream([videoTrack]);
              setLocalStream(newStream);
            }
          } catch (err) {
            console.error('Error handling stream:', err);
          }
        } else {
          setLocalStream(null);
        }
      }
      setIsMicOn(false);
    } else {
      // Turn on mic
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: isVideoOn, 
          audio: true 
        });
        setLocalStream(stream);
        setIsMicOn(true);
        // If video was off, turn it on too for better UX
        if (!isVideoOn) {
          setIsVideoOn(true);
        }
      } catch (err: any) {
        console.error('Error accessing microphone:', err);
        if (err.name === 'NotAllowedError') {
          setMediaError('Bạn cần cho phép truy cập microphone');
        } else if (err.name === 'NotFoundError') {
          setMediaError('Không tìm thấy microphone');
        } else {
          setMediaError('Không thể truy cập microphone: ' + err.message);
        }
      }
    }
  };

  // Cleanup video stream on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
    };
  }, [localStream]);

  // Attach video to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const myStatus = participants.find(p => p.user_id === user?.id)?.status || 'focusing';

  // Room list view
  if (!roomId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 px-4 pb-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-display text-3xl font-bold gradient-text">Study Rooms</h1>
                <p className="text-muted-foreground">Học cùng bạn bè từ khắp nơi trên thế giới</p>
              </div>
              
              {user ? (
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="btn-gradient-primary border-0">
                      <Plus className="w-4 h-4 mr-2" />
                      Tạo phòng mới
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Tạo phòng học mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Tên phòng</Label>
                        <Input 
                          placeholder="VD: Morning Study Session"
                          value={newRoomName}
                          onChange={(e) => setNewRoomName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mô tả (tùy chọn)</Label>
                        <Input 
                          placeholder="VD: Ôn thi cuối kỳ"
                          value={newRoomDesc}
                          onChange={(e) => setNewRoomDesc(e.target.value)}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Phòng công khai</Label>
                        <Switch 
                          checked={newRoomPublic}
                          onCheckedChange={setNewRoomPublic}
                        />
                      </div>
                      <Button 
                        className="w-full btn-gradient-primary border-0"
                        onClick={handleCreateRoom}
                        disabled={!newRoomName.trim()}
                      >
                        Tạo phòng
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              ) : (
                <Button asChild className="btn-gradient-primary border-0">
                  <a href="/auth">Đăng nhập để tạo phòng</a>
                </Button>
              )}
            </div>

            {roomsLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Đang tải...
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Chưa có phòng học nào. Hãy tạo phòng đầu tiên!</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {rooms.map((room) => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-6 rounded-2xl cursor-pointer hover:scale-[1.02] transition-transform"
                    onClick={() => navigate(`/study-room/${room.id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-display font-semibold text-lg">{room.name}</h3>
                        {room.description && (
                          <p className="text-sm text-muted-foreground">{room.description}</p>
                        )}
                      </div>
                      {room.is_public ? (
                        <Unlock className="w-4 h-4 text-primary" />
                      ) : (
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>Tối đa {room.max_participants} người</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Room detail view
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 px-4 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/study-room')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold">{currentRoom?.name || 'Loading...'}</h1>
              <p className="text-sm text-muted-foreground">
                {currentRoom?.is_public ? 'Phòng công khai' : 'Phòng riêng'} · {participants.length} người tham gia
              </p>
            </div>
            {user && (
              <Button variant="outline" onClick={handleLeaveRoom}>
                <LogOut className="w-4 h-4 mr-2" />
                Rời phòng
              </Button>
            )}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left column - Video trước, rồi Timer */}
            <div className="lg:col-span-2 space-y-4">
              {/* Video Call - Luôn hiện khi đã đăng nhập và có phòng */}
              {user && roomId && (
                <div className="glass-card p-4 rounded-3xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Camera & Microphone
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant={localStream?.getVideoTracks().length ? "default" : "outline"}
                        size="sm"
                        onClick={toggleCamera}
                        className={localStream?.getVideoTracks().length ? "btn-gradient-primary border-0" : ""}
                        title={localStream?.getVideoTracks().length ? "Tắt camera" : "Bật camera"}
                      >
                        {localStream?.getVideoTracks().length ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant={localStream?.getAudioTracks().length ? "default" : "outline"}
                        size="sm"
                        onClick={toggleMic}
                        className={localStream?.getAudioTracks().length ? "btn-gradient-primary border-0" : ""}
                        title={localStream?.getAudioTracks().length ? "Tắt mic" : "Bật mic"}
                      >
                        {localStream?.getAudioTracks().length ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant={isInCall ? "destructive" : "default"}
                        size="sm"
                        onClick={() => setIsInCall(!isInCall)}
                        className={isInCall ? "" : "btn-gradient-primary border-0"}
                      >
                        {isInCall ? (
                          <>
                            <PhoneOff className="w-4 h-4 mr-2" />
                            Rời
                          </>
                        ) : (
                          <>
                            <Phone className="w-4 h-4 mr-2" />
                            Gọi video
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="relative aspect-video bg-black/20 rounded-xl overflow-hidden min-h-[200px]">
                    {/* Local camera preview - hiển thị khi đã bật camera */}
                    {localStream?.getVideoTracks().length ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]"
                      />
                    ) : null}
                    
                    {/* Nội dung khi không gọi video */}
                    {!isInCall && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center p-4">
                          {localStream?.getVideoTracks().length ? null : (
                            <>
                              <VideoOff className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                            </>
                          )}
                          <p className="text-sm text-muted-foreground mb-2">
                            {!localStream?.getVideoTracks().length 
                              ? "Bấm icon camera ở trên để xem mình" 
                              : "Bạn đang hiện camera - bấm &quot;Gọi video&quot; để gọi nhóm"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Chia sẻ link phòng để mọi người cùng vào!
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Video call khi đang gọi */}
                    {dailyRoomUrl && isInCall && (
                      <VideoCall 
                        roomUrl={dailyRoomUrl} 
                        onLeave={() => setIsInCall(false)}
                        onParticipantsChange={setVideoParticipants}
                        raiseHand={raiseHand}
                        onRaiseHand={setRaiseHand}
                      />
                    )}
                    
                    {/* Loading khi chưa có URL */}
                    {!dailyRoomUrl && isInCall && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Đang kết nối...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Mic indicator + Video status */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {localStream?.getAudioTracks().length ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-500">
                          <Mic className="w-4 h-4" />
                          <span>Mic bật</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MicOff className="w-4 h-4" />
                          <span>Mic tắt</span>
                        </div>
                      )}
                      {localStream?.getVideoTracks().length ? (
                        <div className="flex items-center gap-1.5 text-sm text-green-500">
                          <Camera className="w-4 h-4" />
                          <span>Camera bật</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <VideoOff className="w-4 h-4" />
                          <span>Camera tắt</span>
                        </div>
                      )}
                    </div>

                    {/* Raise hand indicator */}
                    {raiseHand && (
                      <div className="flex items-center gap-1.5 text-sm text-yellow-500 animate-pulse">
                        <Hand className="w-4 h-4" />
                        <span>Đang giơ tay</span>
                      </div>
                    )}
                  </div>

                  {/* Participants list when in call */}
                  {isInCall && videoParticipants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Người tham gia ({videoParticipants.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {videoParticipants.map((p) => (
                          <div 
                            key={p.session_id} 
                            className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-full text-xs"
                          >
                            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                              <User className="w-3 h-3 text-primary" />
                            </div>
                            <span className="truncate max-w-[100px]">{p.user_name}</span>
                            {!p.audio && <MicOff className="w-3 h-3 text-red-400" />}
                            {!p.video && <VideoOff className="w-3 h-3 text-red-400" />}
                            {p.screen && <Monitor className="w-3 h-3 text-green-500" />}
                            {p.session_id === 'local' && <span className="text-muted-foreground">(bạn)</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Pomodoro Timer */}
              <div className="glass-card p-8 rounded-3xl text-center">
                <div className="text-sm text-muted-foreground mb-1 uppercase tracking-wider">
                  {isOnBreak ? 'Break Time' : 'Focus Time'}
                </div>
                {timerState?.timer_owner_name && timerState.current_phase !== 'idle' && (
                  <div className="text-xs text-primary mb-2 flex items-center justify-center gap-1">
                    <Timer className="w-3 h-3" />
                    <span>{timerState.timer_owner_name} đang bật timer</span>
                  </div>
                )}
                <div className="font-display text-7xl font-bold gradient-text mb-6">
                  {formatTime(time)}
                </div>
                {timerError && (
                  <div className="text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-xl mb-4 text-center">
                    {timerError}
                  </div>
                )}
                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {user && roomId && (
                    <>
                      <Button
                        size="lg"
                        className="btn-gradient-primary border-0"
                        onClick={() => startFocus(25 * 60)}
                      >
                        <Play className="w-5 h-5 mr-2" /> Bắt đầu tập trung 25&apos;
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => startBreak(5 * 60)}
                      >
                        <Coffee className="w-5 h-5 mr-2" /> Nghỉ 5&apos;
                      </Button>
                    </>
                  )}
                  {user && (
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => handleStatusChange(myStatus === 'focusing' ? 'break' : 'focusing')}
                    >
                      {myStatus === 'focusing' ? (
                        <>
                          <Timer className="w-5 h-5 mr-2" /> Đánh dấu đang nghỉ
                        </>
                      ) : (
                        <>
                          <Timer className="w-5 h-5 mr-2" /> Đánh dấu đang tập trung
                        </>
                      )}
                    </Button>
                  )}
                </div>

                {!user && (
                  <p className="text-sm text-muted-foreground">
                    <a href="/auth" className="text-primary hover:underline">Đăng nhập</a> để lưu tiến độ và tham gia phòng
                  </p>
                )}
              </div>
            </div>

            {/* Chat + Participants */}
            <div className="space-y-4">
              <RoomChat roomId={roomId!} canChat={!!user} />

              <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Đang trong phòng</h3>
                  <span className="text-xs text-muted-foreground">
                    {participants.filter(p => p.status === 'focusing').length} đang tập trung
                  </span>
                </div>
                
                {participantsLoading ? (
                  <div className="text-center py-4 text-muted-foreground">Đang tải...</div>
                ) : participants.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    Chưa có ai trong phòng
                  </div>
                ) : (
                  <div className="space-y-3">
                    {participants.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`flex items-center gap-3 p-3 rounded-xl ${
                          p.status === 'focusing' ? 'bg-primary/10' : 'bg-muted/50'
                        }`}
                      >
                        <div className="relative">
                          <div 
                            className="w-10 h-10 rounded-full flex items-center justify-center text-primary-foreground font-medium"
                            style={{ background: 'var(--gradient-primary)' }}
                          >
                            {p.full_name?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div 
                            className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card flex items-center justify-center text-xs ${
                              p.status === 'focusing' ? 'bg-primary' : 'bg-accent'
                            }`}
                          >
                            {p.status === 'focusing' ? '📖' : '☕'}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-sm">
                            {p.full_name || 'Anonymous'}
                            {p.user_id === user?.id && ' (Bạn)'}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {p.status === 'focusing' ? 'Đang tập trung' : 'Nghỉ ngơi'}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
