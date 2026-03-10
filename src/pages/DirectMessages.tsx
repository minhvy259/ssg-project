import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Mail, MessageSquare, Send } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateOrGetDmByEmail,
  useDirectConversations,
  useDirectMessages,
} from "@/hooks/useDirectMessages";

export default function DirectMessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    data: conversations,
    isLoading: loadingConversations,
    refetch: refetchConversations,
  } = useDirectConversations();

  const {
    messages,
    loading: loadingMessages,
    sending,
    sendMessage,
  } = useDirectMessages({
    conversationId: conversationId ?? null,
  });

  const createDmMutation = useCreateOrGetDmByEmail();
  const [emailInput, setEmailInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth", { replace: true, state: { from: "/dm" } });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const activeConversation = useMemo(
    () =>
      conversations?.find((c) => c.conversation_id === conversationId) ??
      null,
    [conversations, conversationId]
  );

  const handleCreateDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || createDmMutation.isLoading) return;

    try {
      const id = await createDmMutation.mutateAsync(emailInput.trim());
      setEmailInput("");
      await refetchConversations();
      navigate(`/dm/${id}`);
    } catch (error: any) {
      if (error?.message === "USER_NOT_FOUND") {
        toast({
          title: "Không tìm thấy người dùng",
          description: "Vui lòng kiểm tra lại email.",
          variant: "destructive",
        });
      }
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !conversationId || sending) return;
    await sendMessage(messageInput);
    setMessageInput("");
  };

  const handleMessageKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    e
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
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
          {/* Conversations list */}
          <aside className="w-80 shrink-0 glass-card rounded-2xl p-4 flex flex-col h-[70vh]">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-sm">Tin nhắn trực tiếp</h2>
            </div>

            <form onSubmit={handleCreateDm} className="mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nhập email để bắt đầu DM..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  disabled={createDmMutation.isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!emailInput.trim() || createDmMutation.isLoading}
                  className="btn-gradient-primary border-0"
                >
                  {createDmMutation.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Nhập email của bạn bè để tạo cuộc trò chuyện riêng tư.
              </p>
            </form>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1 text-sm">
              {loadingConversations ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tải cuộc trò chuyện...
                </div>
              ) : !conversations || conversations.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Chưa có cuộc trò chuyện nào.
                  <br />
                  Hãy bắt đầu bằng cách mời một người bạn qua email.
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive =
                    conv.conversation_id === conversationId ||
                    (!conversationId &&
                      conversations[0].conversation_id ===
                        conv.conversation_id);

                  const initials =
                    conv.other_full_name?.[0]?.toUpperCase() ??
                    conv.other_user_id.slice(0, 2).toUpperCase();

                  return (
                    <button
                      key={conv.conversation_id}
                      type="button"
                      onClick={() => navigate(`/dm/${conv.conversation_id}`)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left hover:bg-muted transition-colors ${
                        isActive ? "bg-muted" : ""
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        {conv.other_avatar_url && (
                          <AvatarImage src={conv.other_avatar_url} />
                        )}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium truncate">
                            {conv.other_full_name || "Người dùng ẩn danh"}
                          </span>
                          {conv.last_message_at && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(
                                conv.last_message_at
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        {conv.last_message && (
                          <p className="text-[11px] text-muted-foreground truncate">
                            {conv.last_message}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Active conversation */}
          <section className="flex-1 glass-card rounded-2xl p-4 flex flex-col h-[70vh]">
            {conversationId ? (
              <>
                <div className="border-b border-border pb-3 mb-3 flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    {activeConversation?.other_avatar_url && (
                      <AvatarImage src={activeConversation.other_avatar_url} />
                    )}
                    <AvatarFallback>
                      {activeConversation?.other_full_name?.[0]?.toUpperCase() ??
                        "DM"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-sm font-semibold">
                      {activeConversation?.other_full_name ||
                        "Cuộc trò chuyện riêng"}
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Chỉ bạn và người này có thể xem cuộc trò chuyện này.
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground text-xs">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Đang tải tin nhắn...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện ✨
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender_id === user.id;
                      return (
                        <div
                          key={m.id}
                          className={`flex ${
                            isMine ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs ${
                              isMine
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {!isMine && (
                              <div className="font-semibold mb-0.5">
                                {m.sender_name ?? "Ẩn danh"}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap break-words">
                              {m.content}
                            </div>
                            <div className="text-[9px] opacity-70 mt-1 text-right">
                              {new Date(m.created_at).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Input
                    placeholder="Nhắn gì đó để động viên bạn bè..."
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={handleMessageKeyDown}
                    disabled={sending || loadingMessages}
                  />
                  <Button
                    size="icon"
                    className="btn-gradient-primary border-0 shrink-0"
                    onClick={handleSendMessage}
                    disabled={
                      sending ||
                      loadingMessages ||
                      !messageInput.trim() ||
                      !conversationId
                    }
                  >
                    {sending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground mb-3" />
                <h2 className="text-sm font-semibold mb-1">
                  Chọn một cuộc trò chuyện
                </h2>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Chọn một người ở danh sách bên trái hoặc bắt đầu cuộc trò
                  chuyện mới bằng email để nhắn tin trực tiếp.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

