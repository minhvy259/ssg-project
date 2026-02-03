# 🚀 AI Tutor Chatbot - Quick Start Guide

## 5 phút để chạy chatbot

### Bước 1: Cài đặt dependencies (1 phút)

```bash
cd ssg-project
npm install
```

### Bước 2: Setup OpenAI API Key (1 phút)

1. Lấy API key từ [OpenAI Platform](https://platform.openai.com/api-keys)
2. Set secret trong Supabase:

```bash
supabase secrets set OPENAI_API_KEY=sk-your-key-here
```

### Bước 3: Deploy Supabase Function (2 phút)

```bash
supabase functions deploy chat-gpt
```

### Bước 4: Chạy app (1 phút)

```bash
npm run dev
```

Mở browser: `http://localhost:5173`

---

## ✅ Checklist

- [ ] Node.js >= 18 installed
- [ ] Supabase CLI installed
- [ ] OpenAI API key ready
- [ ] Dependencies installed
- [ ] Supabase function deployed
- [ ] Dev server running

---

## 🎯 Test nhanh

1. Mở app trong browser
2. Gõ: "Xin chào"
3. Xem AI trả lời
4. Thử gõ: "Viết code bubble sort bằng Python"
5. Xem code được highlight đẹp mắt
6. Click nút "Copy" để copy code
7. Reload page → Chat history vẫn còn!

---

## 🐛 Troubleshooting nhanh

### Lỗi: "API error: 401"
**Fix:** Kiểm tra OpenAI API key
```bash
supabase secrets list
```

### Lỗi: "Function not found"
**Fix:** Deploy lại function
```bash
supabase functions deploy chat-gpt --no-verify-jwt
```

### Lỗi: "CORS error"
**Fix:** Đã được xử lý trong code, restart dev server

### Lỗi: "Rate limit exceeded"
**Fix:** Đợi 1 phút hoặc tăng rate limit trong `chatgptService.ts`

---

## 📚 Tài liệu đầy đủ

- [CHATBOT_GUIDE.md](./docs/CHATBOT_GUIDE.md) - Hướng dẫn chi tiết
- [CHATBOT_CHANGELOG.md](./CHATBOT_CHANGELOG.md) - Lịch sử thay đổi
- [CHATBOT_IMPROVEMENTS_SUMMARY.md](./CHATBOT_IMPROVEMENTS_SUMMARY.md) - Tổng hợp cải tiến

---

## 🎨 Demo Features

### 1. Markdown Support
Thử hỏi: "Giải thích về React hooks với ví dụ"

### 2. Code Highlighting
Thử hỏi: "Viết code quicksort bằng JavaScript"

### 3. Tables
Thử hỏi: "So sánh SQL và NoSQL dưới dạng bảng"

### 4. Lists
Thử hỏi: "10 tips để học lập trình hiệu quả"

### 5. Streaming
Xem AI trả lời từng từ một (real-time)

---

## 🔥 Pro Tips

1. **Suggested Questions**: Click vào suggested questions ở welcome screen
2. **Stop Button**: Click nút stop nếu AI trả lời quá dài
3. **Clear History**: Click nút trash để xóa lịch sử
4. **Copy Code**: Hover vào code block → click Copy
5. **Keyboard Shortcut**: Enter để gửi tin nhắn

---

## 📊 Component Usage

### Basic Usage
```tsx
import { ChatBot } from '@/components/ChatBot';

function App() {
  return <ChatBot />;
}
```

### With Conversation ID
```tsx
<ChatBot conversationId="user-123" />
```

### Custom Height
```tsx
<div className="h-[600px]">
  <ChatBot />
</div>
```

---

## 🎓 Learning Path

1. **Day 1**: Setup và chạy basic chatbot
2. **Day 2**: Hiểu code structure và flow
3. **Day 3**: Customize UI và prompts
4. **Day 4**: Add features (voice, images, etc.)
5. **Day 5**: Deploy to production

---

## 🚀 Production Checklist

- [ ] Environment variables set
- [ ] API key secured
- [ ] Rate limiting configured
- [ ] Error tracking setup
- [ ] Analytics integrated
- [ ] Performance optimized
- [ ] Tests passing
- [ ] Documentation updated

---

## 💬 Example Conversations

### Example 1: Learning
```
User: Giải thích về React hooks
AI: React hooks là các hàm đặc biệt cho phép bạn...
    
    Các hooks phổ biến:
    1. useState - Quản lý state
    2. useEffect - Side effects
    3. useContext - Context API
    ...
```

### Example 2: Coding
```
User: Viết code bubble sort bằng Python
AI: Đây là code bubble sort:

    ```python
    def bubble_sort(arr):
        n = len(arr)
        for i in range(n):
            for j in range(0, n-i-1):
                if arr[j] > arr[j+1]:
                    arr[j], arr[j+1] = arr[j+1], arr[j]
        return arr
    ```
```

### Example 3: Comparison
```
User: So sánh SQL và NoSQL
AI: | Feature | SQL | NoSQL |
    |---------|-----|-------|
    | Schema | Fixed | Flexible |
    | Scaling | Vertical | Horizontal |
    ...
```

---

## 🎯 Next Steps

1. ✅ Setup complete
2. 📖 Read [CHATBOT_GUIDE.md](./docs/CHATBOT_GUIDE.md)
3. 🎨 Customize UI
4. 🔧 Add features
5. 🚀 Deploy to production

---

## 🙋 Need Help?

- 📚 Read full docs: [CHATBOT_GUIDE.md](./docs/CHATBOT_GUIDE.md)
- 🐛 Check troubleshooting: [CHATBOT_GUIDE.md#troubleshooting](./docs/CHATBOT_GUIDE.md#troubleshooting)
- 💬 Create GitHub issue
- 📧 Email support

---

**Chúc bạn code vui vẻ! 🎉**
