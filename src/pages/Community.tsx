import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Hash, Plus, Users, Settings, LogOut, MessageSquare, BookOpen, Calendar, Video, Lock } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  useCommunityChannels,
  useCreateCommunity,
  useCreateChannel,
  useUserCommunities,
  CommunityChannel,
} from "@/hooks/useCommunities";
import { useStudyRooms, StudyRoom } from "@/hooks/useStudyRooms";
import { useToast } from "@/hooks/use-toast";
import { ChannelChat } from "@/components/community/ChannelChat";
import { StudyRoomList } from "@/components/community/StudyRoomList";

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const { communityId, channelId } = useParams<{
    communityId?: string;
    channelId?: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: communities,
    isLoading: loadingCommunities,
    refetch: refetchCommunities,
  } = useUserCommunities();

  const activeCommunityId = useMemo(() => {
    if (communityId) return communityId;
    if (communities && communities.length > 0) {
      return communities[0].id;
    }
    return null;
  }, [communityId, communities]);

  const {
    data: channels,
    isLoading: loadingChannels,
  } = useCommunityChannels(activeCommunityId);

  const createCommunityMutation = useCreateCommunity();
  const createChannelMutation = useCreateChannel();
  const { rooms, createRoom, joinRoom } = useStudyRooms();
  
  const [communityName, setCommunityName] = useState("");
  const [communityDesc, setCommunityDesc] = useState("");
  const [showCreateCommunity, setShowCreateCommunity] = useState(false);
  
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelTopic, setNewChannelTopic] = useState("");
  const [newChannelType, setNewChannelType] = useState<"text" | "study_room" | "forum">("text");
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  
  // Study Room creation
  const [showCreateStudyRoom, setShowCreateStudyRoom] = useState(false);
  const [studyRoomName, setStudyRoomName] = useState("");
  const [studyRoomDesc, setStudyRoomDesc] = useState("");
  const [studyRoomPassword, setStudyRoomPassword] = useState("");
  const [studyRoomPrivate, setStudyRoomPrivate] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  const activeChannel = useMemo(() => {
    if (!channels || !channelId) return null;
    return channels.find(c => c.id === channelId);
  }, [channels, channelId]);

  const activeCommunity = useMemo(() => {
    if (!communities || !activeCommunityId) return null;
    return communities.find(c => c.id === activeCommunityId);
  }, [communities, activeCommunityId]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true, state: { from: "/c" } });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!communityId && communities && communities.length > 0) {
      navigate(`/c/${communities[0].id}`, { replace: true });
    }
  }, [communityId, communities, navigate]);

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!communityName.trim() || createCommunityMutation.isLoading) return;

    try {
      const result = await createCommunityMutation.mutateAsync({
        name: communityName.trim(),
        description: communityDesc.trim() || undefined,
      });
      setCommunityName("");
      setCommunityDesc("");
      setShowCreateCommunity(false);
      await refetchCommunities();
      if (result.community_id) {
        navigate(`/c/${result.community_id}`);
      }
    } catch (error: any) {
      if (error?.message === "INVALID_NAME") {
        toast({
          title: "Tên cộng đồng không hợp lệ",
          description: "Tên phải có ít nhất 3 ký tự.",
          variant: "destructive",
        });
      }
    }
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim() || !activeCommunityId || createChannelMutation.isLoading) return;

    try {
      await createChannelMutation.mutateAsync({
        communityId: activeCommunityId,
        name: newChannelName.trim(),
        topic: newChannelTopic.trim() || undefined,
        channelType: newChannelType,
      });
      setNewChannelName("");
      setNewChannelTopic("");
      setNewChannelType("text");
      setShowCreateChannel(false);
    } catch (error: any) {
      // Error handled by mutation
    }
  };

  const handleCreateStudyRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studyRoomName.trim() || isCreatingRoom) return;

    setIsCreatingRoom(true);
    try {
      const roomId = await createRoom(
        studyRoomName.trim(),
        studyRoomDesc.trim(),
        !studyRoomPrivate, // isPublic = true if not private
        10,
        studyRoomPrivate ? studyRoomPassword : undefined
      );
      
      if (roomId) {
        setStudyRoomName("");
        setStudyRoomDesc("");
        setStudyRoomPassword("");
        setStudyRoomPrivate(false);
        setShowCreateStudyRoom(false);
        navigate(`/study-room/${roomId}`);
      }
    } finally {
      setIsCreatingRoom(false);
    }
  };

  if (authLoading || (!user && authLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // All members can create channels
  const canCreateChannel = !!activeCommunity;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 px-4 pb-4">
        <div className="max-w-7xl mx-auto flex gap-4 h-[calc(100vh-6rem)]">
          {/* Communities column */}
          <aside className="w-64 shrink-0 glass-card rounded-2xl p-4 flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-sm">Cộng đồng</h2>
              </div>
              <Dialog open={showCreateCommunity} onOpenChange={setShowCreateCommunity}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Plus className="w-4 h-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tạo cộng đồng mới</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateCommunity} className="space-y-4">
                    <Input
                      placeholder="Tên cộng đồng..."
                      value={communityName}
                      onChange={(e) => setCommunityName(e.target.value)}
                      disabled={createCommunityMutation.isLoading}
                    />
                    <Input
                      placeholder="Mô tả (tuỳ chọn)"
                      value={communityDesc}
                      onChange={(e) => setCommunityDesc(e.target.value)}
                      disabled={createCommunityMutation.isLoading}
                    />
                    <Button
                      type="submit"
                      className="w-full btn-gradient-primary border-0"
                      disabled={
                        !communityName.trim() || createCommunityMutation.isLoading
                      }
                    >
                      {createCommunityMutation.isLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-2" />
                      )}
                      Tạo cộng đồng
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-sm">
              {loadingCommunities ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tải...
                </div>
              ) : !communities || communities.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  Bạn chưa tham gia cộng đồng nào.
                  <br />
                  Hãy tạo cộng đồng đầu tiên!
                </div>
              ) : (
                communities.map((c) => {
                  const isActive = c.id === activeCommunityId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => navigate(`/c/${c.id}`)}
                      className={`w-full px-3 py-2 rounded-xl text-left hover:bg-muted transition-colors ${
                        isActive ? "bg-muted" : ""
                      }`}
                    >
                      <div className="text-xs font-medium truncate flex items-center gap-2">
                        <Users className="w-3 h-3 shrink-0" />
                        {c.name}
                      </div>
                      {c.description && (
                        <div className="text-[11px] text-muted-foreground truncate pl-5">
                          {c.description}
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Channels and main content */}
          <section className="flex-1 glass-card rounded-2xl p-0 flex gap-0 h-full overflow-hidden">
            {/* Channels list */}
            <div className="w-56 shrink-0 border-r border-border p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Hash className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                    Kênh
                  </h3>
                </div>
                {canCreateChannel && (
                  <Dialog open={showCreateChannel} onOpenChange={setShowCreateChannel}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="w-3 h-3" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Tạo kênh mới</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleCreateChannel} className="space-y-4">
                        <Input
                          placeholder="Tên kênh..."
                          value={newChannelName}
                          onChange={(e) => setNewChannelName(e.target.value)}
                          disabled={createChannelMutation.isLoading}
                        />
                        <Input
                          placeholder="Chủ đề (tuỳ chọn)"
                          value={newChannelTopic}
                          onChange={(e) => setNewChannelTopic(e.target.value)}
                          disabled={createChannelMutation.isLoading}
                        />
                        <div className="space-y-2">
                          <label className="text-sm text-muted-foreground">Loại kênh</label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={newChannelType === "text" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNewChannelType("text")}
                              className="flex-1"
                            >
                              <MessageSquare className="w-4 h-4 mr-1" />
                              Text
                            </Button>
                            <Button
                              type="button"
                              variant={newChannelType === "study_room" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNewChannelType("study_room")}
                              className="flex-1"
                            >
                              <Video className="w-4 h-4 mr-1" />
                              Study Room
                            </Button>
                            <Button
                              type="button"
                              variant={newChannelType === "forum" ? "default" : "outline"}
                              size="sm"
                              onClick={() => setNewChannelType("forum")}
                              className="flex-1"
                            >
                              <BookOpen className="w-4 h-4 mr-1" />
                              Forum
                            </Button>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={
                            !newChannelName.trim() || createChannelMutation.isLoading
                          }
                        >
                          {createChannelMutation.isLoading ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4 mr-2" />
                          )}
                          Tạo kênh
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 text-sm">
                {loadingChannels ? (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tải...
                  </div>
                ) : !channels || channels.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6">
                    Chưa có kênh nào.
                    {canCreateChannel && " Tạo kênh đầu tiên!"}
                  </div>
                ) : (
                  channels.map((ch) => {
                    const isActive = ch.id === channelId;
                    const getChannelIcon = (type: string) => {
                      switch (type) {
                        case 'study_room':
                          return <Video className="w-3 h-3 text-green-500 shrink-0" />;
                        case 'forum':
                          return <BookOpen className="w-3 h-3 text-blue-500 shrink-0" />;
                        default:
                          return <Hash className="w-3 h-3 text-muted-foreground shrink-0" />;
                      }
                    };
                    return (
                      <button
                        key={ch.id}
                        type="button"
                        onClick={() =>
                          activeCommunityId &&
                          navigate(`/c/${activeCommunityId}/ch/${ch.id}`)
                        }
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left hover:bg-muted transition-colors ${
                          isActive ? "bg-muted" : ""
                        }`}
                      >
                        {getChannelIcon(ch.channel_type)}
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">
                            {ch.name}
                          </div>
                          {ch.topic && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {ch.topic}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Channel content */}
            {activeChannel ? (
              <div className="flex-1 flex flex-col h-full">
                {/* Channel header with Create Study Room button */}
                <div className="shrink-0 p-4 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activeChannel.channel_type === 'study_room' ? (
                      <Video className="w-5 h-5 text-green-500" />
                    ) : activeChannel.channel_type === 'forum' ? (
                      <BookOpen className="w-5 h-5 text-blue-500" />
                    ) : (
                      <span className="text-lg font-semibold">#</span>
                    )}
                    <h2 className="font-semibold">{activeChannel.name}</h2>
                  </div>
                </div>

                {/* Channel Chat or placeholder */}
                {activeChannel.channel_type === 'text' ? (
                  <ChannelChat 
                    channelId={activeChannel.id} 
                    channelName={activeChannel.name} 
                  />
                ) : activeChannel.channel_type === 'study_room' ? (
                  <StudyRoomList 
                    rooms={rooms} 
                    onCreateRoom={() => setShowCreateStudyRoom(true)}
                    onJoinRoom={(roomId) => navigate(`/study-room/${roomId}`)}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                    <BookOpen className="w-12 h-12 text-blue-500 mb-3" />
                    <h2 className="text-lg font-semibold mb-1">
                      Kênh Diễn đàn
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md">
                      Kênh này dành cho việc thảo luận. Các bài viết và thảo luận sẽ được hiển thị ở đây.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Hash className="w-12 h-12 text-muted-foreground mb-3" />
                <h2 className="text-lg font-semibold mb-1">
                  Chọn một kênh để bắt đầu
                </h2>
                <p className="text-sm text-muted-foreground max-w-md">
                  Chọn kênh từ danh sách bên trái để xem tin nhắn và trò chuyện với các thành viên trong cộng đồng.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Create Study Room Dialog */}
        <Dialog open={showCreateStudyRoom} onOpenChange={setShowCreateStudyRoom}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tạo Study Room mới</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStudyRoom} className="space-y-4">
              <Input
                placeholder="Tên phòng học..."
                value={studyRoomName}
                onChange={(e) => setStudyRoomName(e.target.value)}
                disabled={isCreatingRoom}
              />
              <Input
                placeholder="Mô tả (tuỳ chọn)"
                value={studyRoomDesc}
                onChange={(e) => setStudyRoomDesc(e.target.value)}
                disabled={isCreatingRoom}
              />
              
              {/* Private/Password toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="privateRoom"
                  checked={studyRoomPrivate}
                  onChange={(e) => setStudyRoomPrivate(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="privateRoom" className="text-sm cursor-pointer">
                  Phòng riêng tư (có mật khẩu)
                </label>
              </div>
              
              {studyRoomPrivate && (
                <Input
                  type="password"
                  placeholder="Mật khẩu..."
                  value={studyRoomPassword}
                  onChange={(e) => setStudyRoomPassword(e.target.value)}
                  disabled={isCreatingRoom}
                />
              )}
              
              <div className="text-xs text-muted-foreground">
                {studyRoomPrivate 
                  ? "Phòng riêng tư, cần mật khẩu để tham gia. Tối đa 10 người."
                  : "Phòng công khai, ai cũng có thể tham gia. Tối đa 10 người."}
              </div>
              <Button
                type="submit"
                className="w-full btn-gradient-primary border-0"
                disabled={!studyRoomName.trim() || isCreatingRoom || (studyRoomPrivate && !studyRoomPassword.trim())}
              >
                {isCreatingRoom ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Video className="w-4 h-4 mr-2" />
                )}
                Tạo và tham gia
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
