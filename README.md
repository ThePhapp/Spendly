# Spendly

Spendly là ứng dụng quản lý tài chính cá nhân hiện đại, tập trung vào trải nghiệm thêm giao dịch nhanh, tổng quan dòng tiền rõ ràng và các gợi ý tài chính dễ hành động.

## Tính năng

- Dashboard tổng số dư, thu nhập, chi tiêu, tiết kiệm và so sánh theo tháng.
- Giao dịch thu/chi/chuyển tiền, tìm kiếm, lọc, nhân bản, xóa có xác nhận và chế độ lịch.
- Quản lý ngân sách với cảnh báo 70%, 90% và vượt giới hạn.
- Nhiều tài khoản/ví, mục tiêu tiết kiệm và lịch sử nạp tiền.
- Báo cáo cash flow, tài sản ròng, phân bổ danh mục và so sánh tháng.
- Giao dịch định kỳ, danh mục, cài đặt, thông báo và insights theo rule.
- Light/dark mode, desktop sidebar, tablet layout và mobile bottom navigation.
- Xác thực ChatGPT, dữ liệu riêng theo người dùng và lưu trữ D1.
- WebMCP tools: đọc tổng quan và tạo giao dịch.

## Công nghệ

Next.js/Vinext, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Recharts, Drizzle ORM, Cloudflare D1, React Hook Form/Zod và Node test runner.

## Cấu trúc chính

```text
app/                 route, API và lớp bảo vệ đăng nhập
components/ui/       UI primitives
db/                  Drizzle schema và database adapter
features/            dashboard, transactions, finance engine và các màn hình nghiệp vụ
services/            khởi tạo và truy vấn workspace theo người dùng
tests/               business logic tests
drizzle/             migration SQL và metadata
```

## Chạy local

Yêu cầu Node.js 22.13 trở lên.

```bash
npm install
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_free_strong_guy.sql
npm run dev
```

Môi trường preview tự tạo người dùng thử và seed 4 tài khoản, 18 giao dịch, 3 ngân sách, 2 mục tiêu cùng giao dịch định kỳ.

## Kiểm tra

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

Test business logic bao phủ tổng thu nhập, tổng chi tiêu, transfer, số dư tài khoản, budget usage, saving rate và goal progress.

## Dữ liệu và bảo mật

Site dùng lớp đăng nhập của nền tảng. `user_id` được áp dụng cho mọi entity và kiểm tra ở server trước mutation. Dữ liệu quan hệ lưu trong D1; giao diện không dùng localStorage làm nguồn dữ liệu chính. Transfer được phân loại riêng và không tính vào income/expense.

## Triển khai

Project được cấu hình cho OpenAI Sites/Cloudflare Worker. Migration được áp dụng trước Worker upload trong quy trình publish.
