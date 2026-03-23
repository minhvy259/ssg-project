# Chạy migration Supabase cho Study Room (Chat + Timer)

Nếu bạn gặp lỗi:
- **Chat**: "Could not find the table 'public.study_room_messages' in the schema cache" hoặc không gửi được tin nhắn
- **Timer**: Nút "Bắt đầu tập trung" bấm không có phản hồi hoặc báo lỗi timer

Nguyên nhân: migration tạo bảng `study_room_messages`, `study_room_states` và các hàm RPC chưa được áp dụng lên database Supabase.

## Cách 1: Dùng Supabase CLI (khuyến nghị)

1. Cài [Supabase CLI](https://supabase.com/docs/guides/cli) nếu chưa có.
2. Ở thư mục gốc project (có `supabase/`), chạy:
   ```bash
   npx supabase link --project-ref <PROJECT_REF>
   ```
   Lấy `PROJECT_REF` từ Supabase Dashboard → Project Settings → General.
3. Đẩy migration lên remote:
   ```bash
   npx supabase db push
   ```

## Cách 2: Chạy SQL thủ công trong Dashboard

1. Mở [Supabase Dashboard](https://supabase.com/dashboard) → chọn project → **SQL Editor**.
2. Mở file migration và copy toàn bộ nội dung:
   - `supabase/migrations/20260305090000_study_room_chat_and_timer.sql`
3. Dán vào SQL Editor và chạy **Run**.

Sau khi chạy xong, làm mới trang Study Room và thử lại chat và nút "Bắt đầu tập trung".
