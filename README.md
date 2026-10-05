# Spendly

Spendly là ứng dụng quản lý tài chính cá nhân responsive, chạy trên Next.js 16 và lưu dữ liệu bằng Supabase PostgreSQL. Ứng dụng có chế độ demo tự động khi chưa cấu hình Supabase, vì vậy có thể xem giao diện ngay sau khi clone.

## Tính năng chính

- Dashboard tổng số dư, thu nhập, chi tiêu, tiết kiệm và biểu đồ dòng tiền.
- Giao dịch thu/chi/chuyển tiền, tìm kiếm, lọc, nhân bản và xóa.
- Ngân sách, tài khoản, mục tiêu tiết kiệm, báo cáo, lịch và giao dịch định kỳ.
- Light/dark mode và giao diện thích ứng cho mobile, tablet, laptop, desktop.
- Mobile bottom navigation, tablet compact sidebar và desktop full sidebar.
- Supabase Auth bằng email/mật khẩu, quên mật khẩu và session SSR bằng cookie.
- PostgreSQL schema đầy đủ với foreign key, index và Row Level Security theo người dùng.
- Cấu hình sẵn cho Vercel và Render.

## Công nghệ

Next.js 16, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Supabase Auth/PostgreSQL, React Hook Form, Zod và Node test runner.

## Chạy local

Yêu cầu Node.js `>=22.13.0 <25`.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`. Khi chưa có `.env.local`, ứng dụng dùng dữ liệu demo và không cần database.

## Kết nối Supabase

1. Tạo một project mới trong Supabase.
2. Áp dụng file migration [supabase/migrations/202610050001_initial_schema.sql](supabase/migrations/202610050001_initial_schema.sql) bằng SQL Editor, hoặc dùng Supabase CLI:

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npm run db:push
```

3. Sao chép `.env.example` thành `.env.local` và điền hai giá trị trong `Project Settings → API`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Không thêm service-role key vào biến `NEXT_PUBLIC_*`. Ứng dụng chỉ cần publishable key; quyền truy cập dữ liệu được bảo vệ bằng session người dùng và RLS.

4. Trong `Authentication → URL Configuration`, đặt Site URL và thêm Redirect URLs:

```text
http://localhost:3000/**
https://your-production-domain.com/**
```

Sau lần đăng ký đầu tiên, trigger tạo hồ sơ/cài đặt và ứng dụng seed workspace mẫu riêng cho người dùng đó.

## Database

Migration tạo các bảng:

```text
users
accounts
categories
transactions
budgets
saving_goals
goal_transactions
recurring_transactions
tags
transaction_tags
notifications
user_settings
```

Mọi bảng nghiệp vụ đều bật Row Level Security với `auth.uid() = user_id`. Amount dùng `numeric(18,2)` để hỗ trợ thêm tiền tệ khác ngoài VND trong tương lai.

## Deploy Vercel

1. Import repository vào Vercel. Framework được nhận diện là Next.js; [vercel.json](vercel.json) đã khai báo lệnh cài đặt/build.
2. Thêm `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` cho Production, Preview và Development.
3. Deploy, sau đó thêm domain Vercel vào Supabase Auth Redirect URLs. Với preview deployment có thể dùng mẫu `https://*-YOUR_TEAM.vercel.app/**`.

Có thể deploy bằng CLI:

```bash
npx vercel
npx vercel --prod
```

## Deploy Render

[render.yaml](render.yaml) khai báo một Node Web Service, health check `/api/health`, Node 22 và hai biến môi trường Supabase.

1. Chọn `New → Blueprint` trong Render và kết nối repository.
2. Nhập hai biến Supabase khi Render yêu cầu.
3. Sau khi service có URL `onrender.com`, thêm URL đó vào Supabase Auth Site URL/Redirect URLs.

Nếu cấu hình thủ công, dùng:

```text
Build Command: npm ci && npm run build
Start Command: npm run start
Health Check: /api/health
```

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Test business logic bao phủ income, expense, transfer, số dư tài khoản, budget usage, saving rate và goal progress.
