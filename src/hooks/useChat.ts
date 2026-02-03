import { useState, useCallback, useEffect, useRef } from 'react';
import { ChatMessage, chatWithGPT, chatWithGPTStream } from '@/services/chatgptService';

const STORAGE_KEY = 'chat_history';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const useChat = (conversationId?: string) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // Load từ localStorage khi khởi tạo
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return [
          {
            role: 'system',
            content: 'Bạn là một trợ lý giáo dục thân thiện, giúp học sinh học tập hiệu quả. Hãy trả lời bằng tiếng Việt và sử dụng markdown để format câu trả lời.',
          },
        ];
      }
    }
    return [
      {
        role: 'system',
        content: 'Bạn là một trợ lý giáo dục thân thiện, giúp học sinh học tập hiệu quả. Hãy trả lời bằng tiếng Việt và sử dụng markdown để format câu trả lời.',
      },
    ];
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Lưu messages vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (messages.length > 1) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Retry logic với exponential backoff
  const retryWithBackoff = async (
    fn: () => Promise<void>,
    retryCount: number = 0
  ): Promise<void> => {
    try {
      await fn();
      retryCountRef.current = 0;
    } catch (err) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        console.log(`Retry ${retryCount + 1}/${MAX_RETRIES} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retryWithBackoff(fn, retryCount + 1);
      }
      throw err;
    }
  };

  const sendMessage = useCallback(
    async (userMessage: string, useStreaming = true) => {
      if (!userMessage.trim() || loading) return;

      setError(null);
      setLoading(true);
      setIsTyping(true);

      // Cancel previous request if exists
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const newMessages: ChatMessage[] = [
        ...messages,
        { role: 'user', content: userMessage },
      ];
      setMessages(newMessages);

      try {
        await retryWithBackoff(async () => {
          if (useStreaming) {
            let fullResponse = '';
            let hasStarted = false;
            
            await chatWithGPTStream(
              newMessages,
              (chunk) => {
                if (!hasStarted) {
                  hasStarted = true;
                  setIsTyping(false);
                  // Thêm message assistant rỗng để bắt đầu streaming
                  setMessages(prev => [
                    ...prev,
                    { role: 'assistant', content: '' },
                  ]);
                }
                fullResponse += chunk;
                setMessages(prev => [
                  ...prev.slice(0, -1),
                  { role: 'assistant', content: fullResponse },
                ]);
              },
              conversationId
            );
          } else {
            const response = await chatWithGPT(newMessages, conversationId);
            setIsTyping(false);
            setMessages(prev => [
              ...prev,
              { role: 'assistant', content: response.message },
            ]);
          }
        });
      } catch (err) {
        setIsTyping(false);
        
        // Xóa user message nếu request thất bại
        setMessages(messages);
        
        let errorMessage = 'Có lỗi xảy ra. Vui lòng thử lại.';
        
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            errorMessage = 'Request đã bị hủy';
          } else if (err.message.includes('API error')) {
            errorMessage = 'Lỗi kết nối API. Vui lòng kiểm tra API key.';
          } else if (err.message.includes('Network')) {
            errorMessage = 'Lỗi mạng. Vui lòng kiểm tra kết nối internet.';
          } else {
            errorMessage = err.message;
          }
        }
        
        setError(errorMessage);
        console.error('Chat error:', err);
      } finally {
        setLoading(false);
        setIsTyping(false);
        abortControllerRef.current = null;
      }
    },
    [messages, conversationId, loading]
  );

  const clearMessages = useCallback(() => {
    setMessages([
      {
        role: 'system',
        content: 'Bạn là một trợ lý giáo dục thân thiện, giúp học sinh học tập hiệu quả. Hãy trả lời bằng tiếng Việt và sử dụng markdown để format câu trả lời.',
      },
    ]);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setIsTyping(false);
    }
  }, []);

  return {
    messages,
    loading,
    error,
    isTyping,
    sendMessage,
    clearMessages,
    cancelRequest,
  };
};