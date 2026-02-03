# Chatbot Changelog

Tất cả các thay đổi quan trọng cho AI Tutor Chatbot sẽ được ghi lại ở đây.

## [2.0.0] - 2026-01-30

### ✨ Added - Tính năng mới

#### UI/UX Improvements
- **Modern gradient design**: Giao diện gradient đẹp mắt với màu sắc từ blue → purple → pink
- **Welcome screen**: Màn hình chào mừng với suggested questions
- **Avatar icons**: Icon Bot và User cho mỗi tin nhắn
- **Typing indicator**: Animation 3 dots khi AI đang suy nghĩ
- **Auto-scroll**: Tự động cuộn xuống tin nhắn mới nhất
- **Message bubbles**: Bubble style hiện đại với rounded corners
- **Stop button**: Nút dừng request đang chạy
- **Confirm dialog**: Xác nhận trước khi xóa lịch sử

#### Markdown & Code Support
- **Markdown rendering**: Hỗ trợ đầy đủ markdown (headers, lists, tables, blockquotes)
- **Syntax highlighting**: Code blocks với syntax highlighting đẹp mắt
- **Copy code button**: Nút copy nhanh cho code blocks
- **Multi-language support**: Hỗ trợ nhiều ngôn ngữ lập trình
- **Inline code**: Style riêng cho inline code
- **Links**: Auto-detect và style links

#### Performance & Reliability
- **Rate limiting**: Giới hạn 10 requests/phút để bảo vệ API
- **Auto retry**: Tự động retry với exponential backoff (max 3 lần)
- **Request cancellation**: Hủy request đang chạy
- **Debounce/Throttle**: Utility functions để tối ưu performance
- **Error recovery**: Xử lý lỗi và recovery tốt hơn

#### Storage & Persistence
- **LocalStorage integration**: Lưu lịch sử chat tự động
- **Persistent chat**: Giữ lại cuộc trò chuyện khi reload
- **Clear history**: Xóa lịch sử dễ dàng với confirmation

#### Backend Improvements
- **Streaming support**: Server-Sent Events (SSE) cho streaming
- **Better error handling**: Error messages chi tiết và thân thiện
- **Validation**: Validate input trước khi gửi đến OpenAI
- **Configurable parameters**: Temperature, max_tokens có thể config
- **CORS support**: CORS headers đầy đủ

### 🔧 Changed - Thay đổi

#### Code Structure
- **Component separation**: Tách MessageContent thành component riêng
- **Custom hooks**: useChat hook với logic phức tạp hơn
- **Service layer**: Tách API calls vào service layer
- **Type safety**: TypeScript types đầy đủ
- **Error boundaries**: Better error handling

#### API Changes
- **Streaming endpoint**: Unified endpoint hỗ trợ cả streaming và non-streaming
- **Response format**: Chuẩn hóa response format
- **Error format**: Consistent error format

#### Configuration
- **Environment variables**: Sử dụng env vars cho config
- **Supabase integration**: Tích hợp với Supabase Functions
- **OpenAI model**: Sử dụng gpt-4o-mini mặc định

### 🐛 Fixed - Bug fixes

- **Memory leaks**: Cleanup subscriptions và event listeners
- **Race conditions**: Xử lý concurrent requests đúng cách
- **Scroll issues**: Fix auto-scroll không hoạt động
- **LocalStorage errors**: Handle localStorage errors gracefully
- **Streaming bugs**: Fix buffer overflow trong streaming
- **CORS errors**: Fix CORS issues với Supabase Functions

### 📚 Documentation

- **CHATBOT_GUIDE.md**: Hướng dẫn sử dụng đầy đủ
- **Code comments**: Comments chi tiết trong code
- **API documentation**: Docs cho API endpoints
- **Testing guide**: Hướng dẫn testing
- **Troubleshooting**: Common issues và solutions

### 🧪 Testing

- **Unit tests**: Tests cho useChat hook
- **Integration tests**: Tests cho API integration
- **Error handling tests**: Tests cho error scenarios
- **Manual testing checklist**: Checklist đầy đủ

### 🎨 Styling

- **Custom CSS**: Styles cho markdown và code blocks
- **Dark mode**: Full dark mode support
- **Responsive**: Hoạt động tốt trên mobile
- **Animations**: Smooth animations và transitions
- **Custom scrollbar**: Custom scrollbar cho chat area

### 🔒 Security

- **Rate limiting**: Bảo vệ API khỏi abuse
- **Input validation**: Validate user input
- **XSS protection**: Sanitize markdown content
- **API key security**: API key stored securely in Supabase

### ⚡ Performance

- **Code splitting**: Lazy load components
- **Memoization**: Memoize expensive computations
- **Debouncing**: Debounce user input
- **Optimistic updates**: Update UI before API response
- **Bundle optimization**: Reduce bundle size

## [1.0.0] - 2026-01-28

### Initial Release

- Basic chatbot functionality
- Simple UI with message list
- OpenAI API integration
- Basic error handling

---

## Migration Guide

### From 1.0.0 to 2.0.0

#### Breaking Changes

1. **API Endpoint**: Endpoint đã thay đổi để hỗ trợ streaming
   ```typescript
   // Old
   /functions/v1/chat-gpt
   /functions/v1/chat-gpt-stream
   
   // New (unified)
   /functions/v1/chat-gpt?stream=true
   ```

2. **useChat Hook**: Hook signature đã thay đổi
   ```typescript
   // Old
   const { messages, loading, error, sendMessage, clearMessages } = useChat();
   
   // New
   const { 
     messages, 
     loading, 
     error, 
     isTyping,
     sendMessage, 
     clearMessages,
     cancelRequest 
   } = useChat();
   ```

3. **Message Format**: Messages giờ được lưu trong localStorage
   - Cần clear localStorage nếu có data cũ
   - Format mới: `chat_history` key

#### New Features to Adopt

1. **Streaming**: Enable streaming cho UX tốt hơn
   ```typescript
   await sendMessage(text, true); // useStreaming = true
   ```

2. **Error Handling**: Sử dụng error state
   ```typescript
   {error && <Alert>{error}</Alert>}
   ```

3. **Cancel Requests**: Cho phép user hủy request
   ```typescript
   <Button onClick={cancelRequest}>Cancel</Button>
   ```

---

## Roadmap

### Version 2.1.0 (Q2 2026)
- [ ] Voice input/output
- [ ] Image upload support
- [ ] Multi-language UI
- [ ] Custom themes

### Version 2.2.0 (Q3 2026)
- [ ] Export chat history
- [ ] Share conversations
- [ ] Conversation search
- [ ] Message reactions

### Version 3.0.0 (Q4 2026)
- [ ] Plugins system
- [ ] Custom AI models
- [ ] Team collaboration
- [ ] Analytics dashboard

---

## Support

Có câu hỏi về changelog? Tạo issue trên GitHub!

**Happy coding! 🚀**
