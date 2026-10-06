# Spendly

Spendly là ứng dụng quản lý tài chính cá nhân responsive, được triển khai hoàn toàn trên Cloudflare.

## Kiến trúc Cloudflare

- **Cloudflare Workers** chạy ứng dụng Next.js 16 thông qua Vinext.
- **Cloudflare D1** lưu tài khoản, giao dịch, ngân sách, mục tiêu và cài đặt.
- **Cloudflare R2** lưu hóa đơn/chứng từ đính kèm.
- **Cloudflare Access** xác thực người dùng bằng One-time PIN hoặc nhà cung cấp danh tính đã cấu hình.
- Worker kiểm tra chữ ký JWT của Cloudflare Access trước khi truy cập dữ liệu người dùng.

Ứng dụng không cần Supabase, Vercel, Render hoặc máy chủ Node riêng.

## Tính năng chính

- Dashboard tổng số dư, thu nhập, chi tiêu, tiết kiệm và biểu đồ dòng tiền.
- Giao dịch thu/chi/chuyển tiền, tìm kiếm, lọc, nhân bản và xóa.
- Ngân sách, tài khoản, mục tiêu tiết kiệm, báo cáo, lịch và giao dịch định kỳ.
- Light/dark mode và giao diện thích ứng cho mobile, tablet, laptop, desktop.
- Mobile bottom navigation, tablet compact sidebar và desktop full sidebar.
- Dữ liệu của mỗi người dùng được cô lập bằng `user_id` lấy từ Access JWT đã xác thực.

## Yêu cầu

- Node.js `>=22.13.0 <25`
- Tài khoản Cloudflare có Workers, D1, R2 và Zero Trust Access

## Chạy local

```bash
npm install
npm run cf:migrate:local
npm run dev
```

Mở `http://127.0.0.1:5173`. Localhost tự dùng tài khoản demo; không cần đăng nhập Cloudflare Access.

Để chạy bản build Workers gần với production hơn:

```bash
npm run build
npm run start
```

## Khởi tạo Cloudflare lần đầu

Đăng nhập Wrangler:

```bash
npx wrangler login
```

Tạo D1 và để Wrangler ghi `database_id` vào `wrangler.jsonc`:

```bash
npm run cf:create-db
```

Tạo bucket R2:

```bash
npm run cf:create-r2
```

Áp dụng migration lên D1 production:

```bash
npm run cf:migrate:remote
```

## Cấu hình Cloudflare Access

1. Mở **Cloudflare Zero Trust → Access → Applications**.
2. Tạo một **Self-hosted application** cho domain production của Spendly.
3. Chọn One-time PIN hoặc Identity Provider, sau đó tạo policy cho các email được phép dùng.
4. Sao chép **Application Audience (AUD)** trong phần cấu hình ứng dụng.
5. Thay hai giá trị mẫu trong `wrangler.jsonc`:

```jsonc
"vars": {
  "CF_ACCESS_TEAM_DOMAIN": "your-team.cloudflareaccess.com",
  "CF_ACCESS_AUD": "your-access-application-aud"
}
```

Cloudflare Access phải bảo vệ hostname production. Ứng dụng vẫn xác minh Access JWT tại Worker để ngăn giả mạo header danh tính.

## Deploy

Xem hướng dẫn đầy đủ tại [DEPLOY_CLOUDFLARE.md](./DEPLOY_CLOUDFLARE.md).

```bash
npm run build
npm run deploy
```

Sau lần deploy đầu tiên, thêm custom domain/route trong **Workers & Pages → spendly → Settings → Domains & Routes**, rồi dùng chính hostname đó cho Cloudflare Access.

Endpoint kiểm tra hệ thống:

```text
GET /api/health
```

## API hóa đơn trên R2

- `POST /api/receipts`: upload `multipart/form-data` với field `file`.
- `GET /api/receipts?key=...`: tải file thuộc người dùng hiện tại.
- `DELETE /api/receipts?key=...`: xóa file thuộc người dùng hiện tại.
- Giới hạn mỗi file là 5 MB; hỗ trợ JPG, PNG, WebP và PDF.

## Database

Migration D1 nằm trong thư mục `drizzle/` và tạo các bảng:

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

## Kiểm tra chất lượng

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Test business logic bao phủ income, expense, transfer, số dư tài khoản, budget usage, saving rate và goal progress.
