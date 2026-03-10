import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Hash, Plus, Users } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useCommunityChannels,
  useCreateCommunity,
  useUserCommunities,
} from "@/hooks/useCommunities";
import { useToast } from "@/hooks/use-toast";

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
  const [communityName, setCommunityName] = useState("");
  const [communityDesc, setCommunityDesc] = useState("");

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 px-4 pb-8">
        <div className="max-w-6xl mx-auto flex gap-6">
          {/* Communities column */}
          <aside className="w-64 shrink-0 glass-card rounded-2xl p-4 flex flex-col h-[70vh]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-sm">Cộng đồng</h2>
              </div>
            </div>

            <form onSubmit={handleCreateCommunity} className="space-y-2 mb-4">
              <Input
                placeholder="Tên cộng đồng mới..."
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
                size="sm"
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

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-sm">
              {loadingCommunities ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tải cộng đồng...
                </div>
              ) : !communities || communities.length === 0 ? (
                <div className="text-xs text-muted-foreground py-6 text-center">
                  Bạn chưa tham gia cộng đồng nào.
                  <br />
                  Hãy tạo cộng đồng đầu tiên của bạn!
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
                      <div className="text-xs font-medium truncate">
                        {c.name}
                      </div>
                      {c.description && (
                        <div className="text-[11px] text-muted-foreground truncate">
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
          <section className="flex-1 glass-card rounded-2xl p-4 flex gap-4 h-[70vh]">
            {/* Channels list */}
            <div className="w-60 shrink-0 border-r border-border pr-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Hash className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">
                  Kênh
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto space-y-1 text-sm">
                {loadingChannels ? (
                  <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Đang tải kênh...
                  </div>
                ) : !channels || channels.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6">
                    Chưa có kênh nào trong cộng đồng này.
                    <br />
                    Kênh mặc định #general sẽ được tạo khi tạo cộng đồng.
                  </div>
                ) : (
                  channels.map((ch) => {
                    const isActive = ch.id === channelId;
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
                        <span className="text-xs text-muted-foreground">#</span>
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

            {/* Channel content placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {activeCommunityId ? (
                <>
                  <Hash className="w-10 h-10 text-muted-foreground mb-3" />
                  <h2 className="text-sm font-semibold mb-1">
                    {channels && channels.length > 0
                      ? channelId
                        ? `Đang ở kênh #${
                            channels.find((c) => c.id === channelId)?.name ??
                            "channel"
                          }`
                        : "Chọn một kênh để bắt đầu"
                      : "Cộng đồng chưa có kênh nào"}
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Trong tương lai, mỗi kênh có thể là phòng chat, Study Room
                    hoặc diễn đàn chuyên đề – tương tự như Discord nhưng tập
                    trung cho học tập.
                  </p>
                </>
              ) : (
                <>
                  <Users className="w-10 h-10 text-muted-foreground mb-3" />
                  <h2 className="text-sm font-semibold mb-1">
                    Tạo hoặc chọn một cộng đồng
                  </h2>
                  <p className="text-xs text-muted-foreground max-w-sm">
                    Hệ thống cộng đồng cho phép bạn tổ chức các kênh học tập,
                    study room và diễn đàn theo từng nhóm, giống như server của
                    Discord.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

