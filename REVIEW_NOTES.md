# Rà soát Spendly — 07/10/2026

## Đã sửa và kiểm tra

- Typecheck dùng route types của Vinext; loại trừ output build cũ.
- Phép tính bỏ qua giao dịch pending; chuyển tiền có hai bút toán vào/ra, lưu nguyên tử và xóa cả cặp.
- API kiểm tra ngày, số tiền, danh mục đúng loại, quyền sở hữu tài khoản và tài khoản nhận; lưu ghi chú; trả 409 khi trùng ID.
- Lưu/nhân bản/xóa trên client chờ API, xử lý lỗi mạng và thao tác đồng thời; kiểm tra chuỗi nhập tiền VND.
- Khởi tạo dữ liệu trong một batch có marker chống chạy lặp; tải lại không hồi sinh giao dịch đã xóa. Người dùng thật mới có số dư 0 và không có giao dịch mẫu.
- Tổng quan, ngân sách, báo cáo và lịch dùng dữ liệu thực, xử lý ranh giới tháng theo giờ Việt Nam. Tìm kiếm toàn cục truyền bộ lọc sang trang giao dịch.
- Đọc workspace bằng một batch cho năm truy vấn; tên cột join được alias để tránh mất dữ liệu trong kết quả D1. Gom tổng theo danh mục/mục tiêu và chuỗi biểu đồ bằng Map; các trang phụ tải khi mở.

## Kết quả xác minh

- `npm run lint`, `npm run typecheck`, `npm run build`: thành công.
- 49 test thành công, không bỏ qua test, khi chạy với Worker local và biến `SPENDLY_TEST_URL`.
- Playwright: thêm giao dịch, tải lại, tổng quan, báo cáo, tìm kiếm; không có lỗi console. Trang giao dịch ở viewport 390 × 844 không tràn ngang.
- Kiểm thử dùng D1 riêng tại `.wrangler/spendly-review`, không thao tác database production.

Để chạy lại kiểm thử tích hợp trong PowerShell, build ứng dụng, rồi mở Worker ở terminal riêng:

```powershell
npx wrangler d1 migrations apply spendly-db --local --persist-to .wrangler/spendly-review
npm run build
npx wrangler dev --config dist/server/wrangler.json --local --persist-to .wrangler/spendly-review --ip 127.0.0.1 --port 5187 --inspector-port 0
```

```powershell
$env:SPENDLY_TEST_URL = 'http://127.0.0.1:5187'
npm test
```

Nếu không đặt biến này, hai test HTTP được bỏ qua; các test còn lại vẫn chạy.

## Các phần chưa hoàn thiện trong ứng dụng hiện tại

- Nạp tiền mục tiêu hiện chỉ thay đổi state client; cài đặt và sao chép ngân sách chưa có API lưu tương ứng, dù giao diện có thông báo thành công.
- Các nút tạo/sửa tài khoản, danh mục, ngân sách, mục tiêu và một số bộ lọc vẫn là giao diện mẫu. Danh sách giao dịch định kỳ còn viết cứng; chưa có lịch chạy tự động.
- Chưa xác minh đăng nhập Cloudflare Access và triển khai trên production.
- Bản sửa không tự xóa số dư/giao dịch mẫu đã được tạo cho người dùng thật bởi phiên bản cũ, vì không thể phân biệt an toàn với dữ liệu người dùng đã chỉnh sửa.
- Hai tệp `DEPLOY_CLOUDFLARE.md` và `wrangler.jsonc` đã có thay đổi trước phiên rà soát và được giữ nguyên ngoài các commit sửa lỗi.
