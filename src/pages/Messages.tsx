import { useState, useRef, useEffect } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { useConversations, useMessagesWithUser, useSendMessage, useRealtimeMessages } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Navigate } from 'react-router-dom';

export default function Messages() {
  const { user, loading } = useAuth();
  const [selectedUser, setSelectedUser] = useState<string | undefined>();
  const [messageInput, setMessageInput] = useState('');
  const { data: conversations } = useConversations();
  const { data: messages } = useMessagesWithUser(selectedUser);
  const sendMessage = useSendMessage();
  const scrollRef = useRef<HTMLDivElement>(null);
  useRealtimeMessages(selectedUser);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (!loading && !user) return <Navigate to="/auth" />;

  const handleSend = () => {
    if (!selectedUser || !messageInput.trim()) return;
    sendMessage.mutate({ receiverId: selectedUser, content: messageInput.trim() });
    setMessageInput('');
  };

  const selectedConvo = conversations?.find((c) => c.other_user_id === selectedUser);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-24">
        <h1 className="text-2xl font-bold text-foreground mb-6">💬 Tin nhắn</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[600px]">
          {/* Conversation List */}
          <Card className="md:col-span-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-2 space-y-1">
                {conversations && conversations.length > 0 ? (
                  conversations.map((convo) => (
                    <button
                      key={convo.other_user_id}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                        selectedUser === convo.other_user_id ? 'bg-primary/10' : 'hover:bg-muted'
                      )}
                      onClick={() => setSelectedUser(convo.other_user_id)}
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={convo.other_avatar || undefined} />
                        <AvatarFallback>{convo.other_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-foreground truncate">{convo.other_name || 'Ẩn danh'}</div>
                        <div className="text-xs text-muted-foreground truncate">{convo.last_message}</div>
                      </div>
                      {!convo.is_read && !convo.is_sender && (
                        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                      )}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Chưa có cuộc trò chuyện nào</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col overflow-hidden">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-border flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={selectedConvo?.other_avatar || undefined} />
                    <AvatarFallback>{selectedConvo?.other_name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-foreground">{selectedConvo?.other_name || 'Ẩn danh'}</span>
                </div>

                {/* Messages */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages?.map((msg) => (
                    <div key={msg.id} className={cn('flex', msg.is_mine ? 'justify-end' : 'justify-start')}>
                      <div className={cn(
                        'max-w-[70%] rounded-2xl px-4 py-2 text-sm',
                        msg.is_mine
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted text-foreground rounded-bl-md'
                      )}>
                        <p>{msg.content}</p>
                        <span className={cn('text-[10px] mt-1 block', msg.is_mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-border flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <Button size="icon" onClick={handleSend} disabled={sendMessage.isPending || !messageInput.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Chọn cuộc trò chuyện để bắt đầu</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
