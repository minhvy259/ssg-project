# 🤖 AI Tutor Chatbot - Hướng dẫn sử dụng

## Tổng quan

AI Tutor là một chatbot thông minh được xây dựng với React, TypeScript, và OpenAI GPT-4o-mini, giúp học sinh học tập hiệu quả hơn.

## Tính năng chính

### ✨ Giao diện người dùng
- **Giao diện hiện đại**: Gradient đẹp mắt, responsive trên mọi thiết bị
- **Dark mode support**: Tự động theo theme hệ thống
- **Typing indicator**: Hiển thị khi AI đang suy nghĩ
- **Auto-scroll**: Tự động cuộn xuống tin nhắn mới

### 💬 Xử lý tin nhắn
- **Streaming response**: Hiển thị câu trả lời theo thời gian thực
- **Markdown rendering**: Hỗ trợ format văn bản đẹp mắt
- **Code highlighting**: Syntax highlighting cho code blocks
- **Copy code**: Nút copy nhanh cho code blocks

### 🔒 Bảo mật & Hiệu suất
- **Rate limiting**: Giới hạn 10 requests/phút
- **Auto retry**: Tự động retry khi có lỗi (max 3 lần)
- **Error handling**: Xử lý lỗi chi tiết và thân thiện
- **Request cancellation**: Hủy request đang chạy

### 💾 Lưu trữ
- **LocalStorage**: Lưu lịch sử chat tự động
- **Persistent chat**: Giữ lại cuộc trò chuyện khi reload
- **Clear history**: Xóa lịch sử dễ dàng

## Cấu trúc code

```
src/
├── components/
│   ├── ChatBot.tsx              # Main chatbot component
│   └── MessageContent.tsx       # Markdown renderer
├── hooks/
│   └── useChat.ts              # Chat logic & state management
├── services/
│   └── chatgptService.ts       # API calls & streaming
└── utils/
    └── debounce.ts             # Utility functions

supabase/functions/
└── chat-gpt/
    └── index.ts                # Backend API endpoint
```

## Cách sử dụng

### 1. Setup môi trường

```bash
# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
```

### 2. Cấu hình API Key

Thêm OpenAI API key vào Supabase secrets:

```bash
supabase secrets set OPENAI_API_KEY=your_api_key_here
```

### 3. Deploy Supabase Functions

```bash
supabase functions deploy chat-gpt
```

### 4. Sử dụng trong component

```tsx
import { ChatBot } from '@/components/ChatBot';

function App() {
  return (
    <div className="h-screen p-4">
      <ChatBot conversationId="optional-id" />
    </div>
  );
}
```

## API Reference

### `useChat` Hook

```typescript
const {
  messages,        // Danh sách tin nhắn
  loading,         // Trạng thái loading
  error,          // Lỗi nếu có
  isTyping,       // AI đang typing
  sendMessage,    // Gửi tin nhắn
  clearMessages,  // Xóa lịch sử
  cancelRequest   // Hủy request
} = useChat(conversationId);
```

### `chatWithGPT` Service

```typescript
// Non-streaming
const response = await chatWithGPT(messages, conversationId);

// Streaming
await chatWithGPTStream(
  messages,
  (chunk) => console.log(chunk),
  conversationId
);
```

## Tùy chỉnh

### Thay đổi model

Trong `chatgptService.ts`:

```typescript
model: 'gpt-4o-mini', // Đổi thành 'gpt-4' hoặc model khác
```

### Thay đổi system prompt

Trong `useChat.ts`:

```typescript
{
  role: 'system',
  content: 'Bạn là một trợ lý...' // Custom prompt
}
```

### Thay đổi rate limit

Trong `chatgptService.ts`:

```typescript
const rateLimiter = new RateLimiter(
  10,    // Max requests
  60000  // Time window (ms)
);
```

### Thay đổi max tokens

Trong `supabase/functions/chat-gpt/index.ts`:

```typescript
max_tokens: 2000, // Tăng/giảm số tokens
```

## Xử lý lỗi

### Lỗi thường gặp

1. **"API error: 401"**
   - Kiểm tra API key
   - Đảm bảo đã set secret trong Supabase

2. **"Rate limit exceeded"**
   - Đợi 1 phút trước khi gửi tiếp
   - Tăng rate limit nếu cần

3. **"Network error"**
   - Kiểm tra kết nối internet
   - Kiểm tra CORS settings

4. **"No response body"**
   - Kiểm tra Supabase function logs
   - Đảm bảo streaming được config đúng

## Best Practices

### 1. Tối ưu hiệu suất
```typescript
// Sử dụng streaming cho UX tốt hơn
await sendMessage(text, true); // useStreaming = true
```

### 2. Xử lý lỗi gracefully
```typescript
try {
  await sendMessage(text);
} catch (error) {
  // Show user-friendly error
  toast.error('Có lỗi xảy ra. Vui lòng thử lại.');
}
```

### 3. Cleanup khi unmount
```typescript
useEffect(() => {
  return () => {
    cancelRequest(); // Cancel pending requests
  };
}, []);
```

## Testing

### Unit tests
```bash
npm run test
```

### Manual testing checklist
- [ ] Gửi tin nhắn thành công
- [ ] Streaming hoạt động
- [ ] Code blocks render đúng
- [ ] Copy code hoạt động
- [ ] Auto-scroll hoạt động
- [ ] Error handling đúng
- [ ] Rate limiting hoạt động
- [ ] LocalStorage lưu đúng
- [ ] Clear history hoạt động
- [ ] Cancel request hoạt động

## Performance Metrics

- **First message**: < 2s
- **Streaming latency**: < 100ms per chunk
- **UI responsiveness**: 60 FPS
- **Bundle size**: < 500KB (gzipped)

## Roadmap

- [ ] Voice input/output
- [ ] Image upload support
- [ ] Multi-language support
- [ ] Export chat history
- [ ] Share conversations
- [ ] Custom themes
- [ ] Plugins system

## Troubleshooting

### Debug mode

Enable debug logging:

```typescript
// In chatgptService.ts
const DEBUG = true;

if (DEBUG) {
  console.log('Request:', messages);
  console.log('Response:', data);
}
```

### Check Supabase logs

```bash
supabase functions logs chat-gpt
```

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a PR

## License

MIT License - feel free to use in your projects!

## Support

Có vấn đề? Tạo issue trên GitHub hoặc liên hệ qua email.

---

**Happy coding! 🚀**
