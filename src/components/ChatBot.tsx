import { useChat } from '@/hooks/useChat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageContent } from '@/components/MessageContent';
import { 
  Loader2, 
  Send, 
  Trash2, 
  StopCircle, 
  Bot, 
  User,
  Sparkles 
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ChatBot = ({ conversationId }: { conversationId?: string }) => {
  const { 
    messages, 
    loading, 
    error, 
    isTyping,
    sendMessage, 
    clearMessages,
    cancelRequest 
  } = useChat(conversationId);
  
  const [inputValue, setInputValue] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (inputValue.trim() && !loading) {
      await sendMessage(inputValue);
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử chat?')) {
      clearMessages();
    }
  };

  // Suggested questions
  const suggestedQuestions = [
    'Giải thích về React hooks',
    'Cách học lập trình hiệu quả',
    'Phân biệt let, const và var',
    'Tips để code clean hơn',
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-2 rounded-full">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2">
                AI Tutor
                <Sparkles className="w-4 h-4" />
              </h2>
              <p className="text-xs opacity-90">
                {loading ? 'Đang suy nghĩ...' : 'Sẵn sàng hỗ trợ bạn'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            className="text-white hover:bg-white/20"
            title="Xóa lịch sử chat"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.length === 1 && (
            <div className="text-center py-8 space-y-4">
              <div className="flex justify-center">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded-full">
                  <Bot className="w-8 h-8 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Chào mừng đến với AI Tutor!
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Tôi có thể giúp bạn học tập hiệu quả hơn. Hãy thử hỏi:
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto">
                {suggestedQuestions.map((question, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestedQuestion(question)}
                    className="text-xs h-auto py-2 px-3 text-left justify-start hover:bg-blue-50 hover:border-blue-300"
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.slice(1).map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-2 ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
              
              <div
                className={`max-w-[75%] px-4 py-3 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                <MessageContent 
                  content={msg.content} 
                  isUser={msg.role === 'user'}
                />
              </div>

              {msg.role === 'user' && (
                <div className="flex-shrink-0">
                  <div className="bg-blue-500 p-2 rounded-full">
                    <User className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-2 justify-start">
              <div className="flex-shrink-0">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-full">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-sm">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Error Alert */}
      {error && (
        <div className="mx-4 mb-2">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">{error}</span>
              {loading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={cancelRequest}
                  className="h-6 px-2"
                >
                  <StopCircle className="w-4 h-4" />
                </Button>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-gray-50 p-4 rounded-b-lg">
        <div className="flex gap-2">
          <Input
            placeholder="Nhập câu hỏi của bạn... (Enter để gửi)"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            className="flex-1 bg-white"
          />
          {loading ? (
            <Button
              onClick={cancelRequest}
              variant="destructive"
              size="icon"
              title="Dừng"
            >
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              size="icon"
              title="Gửi"
            >
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">
          AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng.
        </p>
      </div>
    </div>
  );
};