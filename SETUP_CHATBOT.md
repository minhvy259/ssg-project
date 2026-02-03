# 🤖 Setup Chatbot – Làm 1 lần để chatbot chạy

Làm **đủ 2 bước** dưới đây (chỉ mất vài phút), sau đó chatbot sẽ hoạt động.

---

## Bước 1: Cài Supabase CLI (nếu chưa có)

Mở **PowerShell** hoặc **Terminal** và chạy:

```powershell
npm install -g supabase
```

Rồi đăng nhập:

```powershell
supabase login
```

(Mở link trong trình duyệt, đăng nhập Supabase, xong quay lại terminal.)

---

## Bước 2: Set API key + Deploy function

**Cách A – Dùng script (nhanh):**

1. Lấy **OpenAI API Key** tại: https://platform.openai.com/api-keys  
2. Trong thư mục project, chạy:

```powershell
cd d:\fpt_uni\KI_4\AppLearning\ssg-project
.\scripts\setup-chatbot.ps1 -OpenAIKey "sk-xxx-cua-ban"
```

(Thay `sk-xxx-cua-ban` bằng key thật.)

Script sẽ:
- Set `OPENAI_API_KEY` vào Supabase
- Deploy function `chat-gpt`

**Cách B – Làm tay từng lệnh:**

```powershell
cd d:\fpt_uni\KI_4\AppLearning\ssg-project

# Set OpenAI key (thay sk-xxx bằng key của bạn)
supabase secrets set OPENAI_API_KEY="sk-xxx" --project-ref qxwwwgbhqgnmbbnjqluu

# Deploy function
supabase functions deploy chat-gpt --project-ref qxwwwgbhqgnmbbnjqluu --no-verify-jwt
```

---

## Chạy app và thử chatbot

```powershell
npm run dev
```

Mở http://localhost:5173 → kéo xuống phần **Gia sư AI** → gõ tin nhắn và gửi.

---

## Nếu gặp lỗi

| Lỗi | Cách xử lý |
|-----|------------|
| `supabase: command not found` | Cài lại: `npm install -g supabase`, đóng/mở lại terminal. |
| `401` hoặc API error | Chưa set OpenAI key đúng. Chạy lại: `supabase secrets set OPENAI_API_KEY="sk-xxx"` |
| Function not found | Chưa deploy. Chạy: `supabase functions deploy chat-gpt --no-verify-jwt` |
| Script bị chặn | Chạy: `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned` |

---

## Tóm tắt

1. Cài Supabase CLI + `supabase login`
2. Chạy `.\scripts\setup-chatbot.ps1 -OpenAIKey "sk-xxx"` (hoặc 2 lệnh ở Cách B)
3. `npm run dev` và thử chat trên trang chủ

Làm xong 2 bước trên là chatbot dùng được.
