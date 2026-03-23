import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Send, Trash2, MoreVertical, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  useChannelMessages, 
  useSendMessage, 
  useDeleteMessage,
  ChannelMessage as ChannelMessageType 
} from "@/hooks/useCommunities";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

interface ChannelChatProps {
  channelId: string;
  channelName: string;
}

function MessageItem({ 
  message, 
  isOwner, 
  onDelete 
}: { 
  message: ChannelMessageType; 
  isOwner: boolean;
  onDelete: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex gap-3 p-3 hover:bg-muted/30 rounded-lg"
    >
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarFallback 
          className="text-xs"
          style={{ background: "var(--gradient-primary)" }}
        >
          {getInitials(message.user_full_name || message.user_email)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-semibold text-sm">{message.user_full_name || message.user_email}</span>
          <span className="text-xs text-muted-foreground">
            {message.created_at ? formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: vi }) : ''}
          </span>
        </div>
        
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      {isOwner && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg py-1 z-10">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-destructive hover:text-destructive px-3"
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Xóa
              </Button>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function ChannelChat({ channelId, channelName }: ChannelChatProps) {
  const { user } = useAuth();
  const { data: messages, isLoading } = useChannelMessages(channelId);
  const sendMessageMutation = useSendMessage();
  const deleteMessageMutation = useDeleteMessage();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || sendMessageMutation.isLoading) return;
    
    sendMessageMutation.mutate({
      channelId,
      content: inputValue.trim(),
    });
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDelete = (messageId: string) => {
    deleteMessageMutation.mutate({
      channelId,
      messageId,
    });
  };

  // Reverse to show oldest first
  const sortedMessages = [...(messages || [])].reverse();

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Channel Header */}
      <div className="shrink-0 p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold">#</span>
          <h2 className="font-semibold">{channelName}</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground text-sm">Đang tải tin nhắn...</div>
          </div>
        ) : sortedMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <User className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Chưa có tin nhắn nào trong kênh này.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Hãy là người đầu tiên gửi tin nhắn!
            </p>
          </div>
        ) : (
          sortedMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              isOwner={user?.id === message.user_id}
              onDelete={() => handleDelete(message.id)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 p-4 border-t border-border">
        <div className="flex gap-2">
          <Input
            placeholder={`Nhắn tin #${channelName}...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sendMessageMutation.isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || sendMessageMutation.isLoading}
            size="icon"
            className="btn-gradient-primary border-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
