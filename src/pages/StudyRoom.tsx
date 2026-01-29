import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Play, Pause, Users, MessageSquare, Coffee, Timer, ArrowLeft, 
  Plus, Lock, Unlock, LogOut
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

export default function StudyRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { rooms, loading: roomsLoading, createRoom, joinRoom, leaveRoom, updateStatus } = useStudyRooms();
  const { participants, loading: participantsLoading } = useRoomParticipants(roomId || null);
  
  const [currentRoom, setCurrentRoom] = useState<StudyRoomType | null>(null);
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomPublic, setNewRoomPublic] = useState(true);

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
          setCurrentRoom(data);
          // Auto-join room when visiting
          if (user) {
            joinRoom(roomId);
          }
        }
      };
      fetchRoom();
    } else {
      setCurrentRoom(null);
    }
  }, [roomId, user]);

  // Pomodoro timer
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setTime((t) => {
        if (t <= 0) {
          setIsRunning(false);
          return isOnBreak ? 25 * 60 : 5 * 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, isOnBreak]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    
    const room = await createRoom(newRoomName, newRoomDesc, newRoomPublic);
    if (room) {
      setCreateDialogOpen(false);
      setNewRoomName('');
      setNewRoomDesc('');
      navigate(`/study-room/${room.id}`);
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
      setIsRunning(false);
    }
  };

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
            {/* Pomodoro Timer */}
            <div className="lg:col-span-2">
              <div className="glass-card p-8 rounded-3xl text-center">
                <div className="text-sm text-muted-foreground mb-2 uppercase tracking-wider">
                  {isOnBreak ? 'Break Time' : 'Focus Time'}
                </div>
                <div className="font-display text-7xl font-bold gradient-text mb-6">
                  {formatTime(time)}
                </div>
                <div className="flex justify-center gap-3 mb-6">
                  <Button
                    size="lg"
                    variant={isRunning ? 'secondary' : 'default'}
                    onClick={() => setIsRunning(!isRunning)}
                    className={isRunning ? '' : 'btn-gradient-primary border-0'}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" /> Start
                      </>
                    )}
                  </Button>
                  {user && (
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={() => handleStatusChange(myStatus === 'focusing' ? 'break' : 'focusing')}
                    >
                      {myStatus === 'focusing' ? (
                        <>
                          <Coffee className="w-5 h-5 mr-2" /> Take Break
                        </>
                      ) : (
                        <>
                          <Timer className="w-5 h-5 mr-2" /> Back to Focus
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

            {/* Participants */}
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
                          {p.profile?.full_name?.[0]?.toUpperCase() || '?'}
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
                          {p.profile?.full_name || 'Anonymous'}
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
      </main>
    </div>
  );
}
