export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  message: string;
  tokens: number;
}

// Rate limiting
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 10, timeWindowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  getWaitTime(): number {
    if (this.canMakeRequest()) return 0;
    const now = Date.now();
    const oldestRequest = this.requests[0];
    return Math.max(0, this.timeWindow - (now - oldestRequest));
  }
}

const rateLimiter = new RateLimiter(10, 60000); // 10 requests per minute

export const chatWithGPT = async (
  messages: ChatMessage[],
  conversationId?: string
): Promise<ChatResponse> => {
  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime();
    throw new Error(
      `Vui lòng đợi ${Math.ceil(waitTime / 1000)} giây trước khi gửi tin nhắn tiếp theo.`
    );
  }

  try {
    rateLimiter.recordRequest();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-gpt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages,
          conversationId,
          model: 'gpt-4o-mini',
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return {
      message: data.message,
      tokens: data.tokens,
    };
  } catch (error) {
    console.error('ChatGPT API error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra internet của bạn.');
    }
    
    throw error;
  }
};

export const chatWithGPTStream = async (
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  conversationId?: string
): Promise<void> => {
  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getWaitTime();
    throw new Error(
      `Vui lòng đợi ${Math.ceil(waitTime / 1000)} giây trước khi gửi tin nhắn tiếp theo.`
    );
  }

  try {
    rateLimiter.recordRequest();

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-gpt`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages,
          conversationId,
          model: 'gpt-4o-mini',
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `API error: ${response.status} ${response.statusText}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body không khả dụng');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const lines = buffer.split('\n').filter(line => line.trim());
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const jsonStr = line.slice(6).trim();
                  if (jsonStr && jsonStr !== '[DONE]') {
                    const data = JSON.parse(jsonStr);
                    if (data.token) {
                      onChunk(data.token);
                    }
                  }
                }
              }
            } catch (e) {
              console.warn('Error processing final buffer:', e);
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            try {
              const jsonStr = line.slice(6).trim();
              if (jsonStr && jsonStr !== '[DONE]') {
                const data = JSON.parse(jsonStr);
                if (data.token) {
                  onChunk(data.token);
                } else if (data.choices?.[0]?.delta?.content) {
                  // Support OpenAI streaming format
                  onChunk(data.choices[0].delta.content);
                }
              }
            } catch (e) {
              console.warn('Error parsing SSE line:', line, e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  } catch (error) {
    console.error('ChatGPT Stream error:', error);
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Lỗi kết nối mạng. Vui lòng kiểm tra internet của bạn.');
    }
    
    throw error;
  }
};