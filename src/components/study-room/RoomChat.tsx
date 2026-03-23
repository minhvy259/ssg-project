import { useEffect, useRef, useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { useRoomMessages } from '@/hooks/useRoomMessages';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface RoomChatProps {
  roomId: string;
  canChat: boolean;
}

export function RoomChat({ roomId, canChat }: RoomChatProps) {
  const { messages, loading, sending, sendMessage, error, typingUsers, seenMessageId, setTyping, markAsSeen } = useRoomMessages({ roomId });
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const prevMessagesLengthRef = useRef(0);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (!listRef.current) return;
    if (messages.length > prevMessagesLengthRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  // Mark last message as seen when it appears
  useEffect(() => {
    if (messages.length > 0 && canChat) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage) {
        markAsSeen(lastMessage.id);
      }
    }
  }, [messages, canChat, markAsSeen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    setTyping(true);
  };

  const handleSend = async () => {
    if (!input.trim() || !canChat) return;
    setTyping(false);
    await sendMessage(input);
    setInput('');
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="glass-card p-4 rounded-2xl flex flex-col h-80">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Chat trong phòng</h3>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1 text-sm"
      >
        {loading ? (
          <div className="text-muted-foreground text-xs text-center py-4">
            Đang tải tin nhắn...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-muted-foreground text-xs text-center py-4">
            Hãy gửi tin nhắn đầu tiên để bắt đầu cuộc trò chuyện ✨
          </div>
        ) : (
          messages.map((m, idx) => {
            const isLastMessage = idx === messages.length - 1;
            return (
              <div key={m.id} className="flex flex-col group">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium text-xs">
                    {m.sender_name ?? 'Ẩn danh'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(m.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isLastMessage && (
                    <span className="text-[10px] text-green-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                      Đã xem
                    </span>
                  )}
                </div>
                <div className="text-sm text-foreground break-words">
                  {m.content}
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
            <span>{typingUsers.join(', ')}</span>
            {typingUsers.length === 1 ? 'đang nhập...' : 'đang nhập tin nhắn...'}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2">
        {error && (
          <div className="w-full text-xs text-destructive bg-destructive/10 px-2 py-1 rounded">
            {error}
          </div>
        )}
        <Input
          placeholder={
            canChat ? 'Nhắn gì đó để động viên mọi người...' : 'Đăng nhập để tham gia chat'
          }
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={!canChat || sending}
        />
        <Button
          size="icon"
          className="btn-gradient-primary border-0 shrink-0"
          onClick={handleSend}
          disabled={!canChat || sending || !input.trim()}
        >
          <MessageSquare className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

