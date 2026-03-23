import { useState } from "react";
import { useStudyRooms, StudyRoom } from "@/hooks/useStudyRooms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Video, Users, Clock, Lock, Loader2 } from "lucide-react";

interface StudyRoomListProps {
  rooms: StudyRoom[];
  onCreateRoom: () => void;
  onJoinRoom: (roomId: string) => void;
}

export function StudyRoomList({ rooms, onCreateRoom, onJoinRoom }: StudyRoomListProps) {
  const { joinRoom } = useStudyRooms();
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinClick = (roomId: string, hasPassword: boolean) => {
    setSelectedRoomId(roomId);
    if (hasPassword) {
      setPasswordDialogOpen(true);
    } else {
      handleJoin(roomId, "");
    }
  };

  const handleJoin = async (roomId: string, pwd: string) => {
    setIsJoining(true);
    const result = await joinRoom(roomId, pwd);
    setIsJoining(false);
    
    if (result.success) {
      setPasswordDialogOpen(false);
      setPassword("");
      onJoinRoom(roomId);
    } else if (!result.needsPassword) {
      // Some other error occurred, close dialog
      setPasswordDialogOpen(false);
      setPassword("");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Danh sách Study Rooms</h3>
        <Button 
          size="sm" 
          className="btn-gradient-primary border-0"
          onClick={onCreateRoom}
        >
          <Video className="w-4 h-4 mr-1" />
          Tạo Study Room
        </Button>
      </div>

      {rooms.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
          <Video className="w-12 h-12 text-green-500 mb-3" />
          <h2 className="text-lg font-semibold mb-1">
            Chưa có Study Room nào
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Kênh này dành cho việc học tập nhóm. Hãy tạo một Study Room để bắt đầu học cùng nhau!
          </p>
          <Button 
            className="btn-gradient-primary border-0"
            onClick={onCreateRoom}
          >
            <Video className="w-4 h-4 mr-2" />
            Tạo Study Room đầu tiên
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{room.name}</h4>
                    {room.password && (
                      <Lock className="w-3 h-3 text-orange-500" />
                    )}
                  </div>
                  {room.description && (
                    <p className="text-sm text-muted-foreground mt-1">{room.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{room.current_members}/{room.max_participants}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTime(room.created_at)}</span>
                    </div>
                    {room.owner_name && (
                      <span className="text-primary">Host: {room.owner_name}</span>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={room.current_members >= room.max_participants ? "outline" : "default"}
                  onClick={() => handleJoinClick(room.id, !!room.password)}
                  disabled={room.current_members >= room.max_participants}
                >
                  {room.current_members >= room.max_participants ? "Đầy" : "Tham gia"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nhập mật khẩu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Phòng học này được bảo vệ bằng mật khẩu. Vui lòng nhập mật khẩu để tham gia.
            </p>
            <Input
              type="password"
              placeholder="Mật khẩu..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && selectedRoomId && password) {
                  handleJoin(selectedRoomId, password);
                }
              }}
            />
            <Button
              className="w-full"
              onClick={() => selectedRoomId && handleJoin(selectedRoomId, password)}
              disabled={!password || isJoining}
            >
              {isJoining && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Tham gia
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
