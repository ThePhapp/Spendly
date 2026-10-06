# Deploy Spendly lên Cloudflare

Tài liệu này hướng dẫn triển khai Spendly lên Cloudflare theo đúng cấu hình hiện tại của project:

- Cloudflare Workers chạy ứng dụng Vinext.
- Cloudflare D1 lưu dữ liệu tài chính qua binding `DB`.
- Cloudflare R2 lưu hóa đơn qua binding `RECEIPTS`.
- Cloudflare Access xác thực người dùng và cung cấp JWT cho Worker.

Trong repo, cấu hình chính nằm ở [wrangler.jsonc](./wrangler.jsonc), migration nằm trong [drizzle/](./drizzle/) và lệnh deploy nằm trong [package.json](./package.json).

## 1. Yêu cầu

Cần chuẩn bị:

- Node.js `>=22.13.0 <25` và npm.
- Tài khoản Cloudflare có quyền Workers, D1, R2 và Zero Trust/Access.
- Một domain đang quản lý DNS trên Cloudflare nếu muốn dùng domain riêng và Cloudflare Access.
- Mã nguồn đã được checkout trên máy deploy.

Kiểm tra phiên bản:

```bash
node --version
npm --version
```

Đăng nhập Wrangler:

```bash
npx wrangler login
npx wrangler whoami
```

Nếu tài khoản có nhiều account, chọn đúng account trong Cloudflare Dashboard hoặc cấu hình account ID theo môi trường deploy.

## 2. Cài dependency và kiểm tra project

Chạy từ thư mục gốc của Spendly:

```bash
npm install
npm run lint
npm test
```

`npm run typecheck` có thể báo lỗi nếu thư mục `.next/` đang chứa type sinh cũ từ Next.js. Đây là artifact local, không phải database production. Có thể xóa `.next/` rồi chạy lại typecheck nếu cần:

```bash
Remove-Item -Recurse -Force .next       # PowerShell
# hoặc: rm -rf .next                   # macOS/Linux
npm run typecheck
```

Không commit các thư mục sinh như `.next/`, `dist/` và `.wrangler/`.

## 3. Kiểm tra cấu hình Wrangler

`wrangler.jsonc` hiện đã khai báo:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "spendly-db",
    "migrations_dir": "drizzle"
  }
],
"r2_buckets": [
  {
    "binding": "RECEIPTS",
    "bucket_name": "spendly-receipts"
  }
]
```

Sau khi tạo D1, Wrangler sẽ bổ sung `database_id` vào cấu hình. Không đổi tên các binding `DB` và `RECEIPTS`, vì code đang đọc đúng hai tên này.

Các biến Access hiện có giá trị mẫu và phải được thay trước khi deploy production:

```jsonc
"vars": {
  "CF_ACCESS_TEAM_DOMAIN": "your-team.cloudflareaccess.com",
  "CF_ACCESS_AUD": "your-access-application-aud"
}
```

`CF_ACCESS_TEAM_DOMAIN` là team domain của Cloudflare Access, ví dụ `your-team.cloudflareaccess.com`.
`CF_ACCESS_AUD` là Application Audience (AUD) của Access application.

Để chạy Wrangler local bằng file riêng, copy file mẫu:

```bash
Copy-Item .dev.vars.example .dev.vars       # PowerShell
# hoặc: cp .dev.vars.example .dev.vars     # macOS/Linux
```

File `.dev.vars` đã được git ignore. Không commit giá trị thật trong file này.

## 4. Tạo tài nguyên Cloudflare lần đầu

### 4.1. Tạo D1

Kiểm tra các database hiện có trước để tránh tạo trùng:

```bash
npx wrangler d1 list
```

Nếu chưa có database `spendly-db`:

```bash
npm run cf:create-db
```

Script này chạy lệnh `wrangler d1 create spendly-db --binding DB --update-config --location apac` và cập nhật `wrangler.jsonc`.

Kiểm tra lại:

```bash
npx wrangler d1 list
```

Nếu database đã tồn tại, không chạy lệnh tạo mới. Hãy lấy đúng `database_id` từ Dashboard hoặc `npx wrangler d1 list`, rồi bổ sung vào entry `spendly-db` trong `wrangler.jsonc`.

### 4.2. Tạo R2

Kiểm tra bucket hiện có:

```bash
npx wrangler r2 bucket list
```

Nếu chưa có bucket `spendly-receipts`:

```bash
npm run cf:create-r2
```

Bucket nên để private. Ứng dụng không dùng public URL của R2; mọi thao tác upload, download và delete đều đi qua `/api/receipts` và kiểm tra `userId`.

Nếu bucket đã tồn tại, không tạo bucket mới. Đảm bảo `bucket_name` trong `wrangler.jsonc` trùng tên bucket thật.

## 5. Build và áp dụng migration production

Migration phải được áp dụng vào D1 remote trước khi Worker thực hiện query. Nếu bỏ qua bước này, ứng dụng sẽ gặp lỗi như:

```text
D1_ERROR: no such table: users
```

Xem migration nào còn thiếu:

```bash
npx wrangler d1 migrations list spendly-db --remote
```

Áp dụng migration:

```bash
npm run cf:migrate:remote
```

Lệnh trên tương đương:

```bash
npx wrangler d1 migrations apply spendly-db --remote
```

Wrangler sẽ yêu cầu xác nhận trong terminal tương tác. Kiểm tra các migration có trạng thái thành công trước khi deploy Worker.

Migration local và production là hai database khác nhau:

```bash
npm run cf:migrate:local     # chỉ dùng cho máy local
npm run cf:migrate:remote    # dùng cho D1 production
```

Tham khảo [Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/) để xem cách liệt kê và áp dụng migration.

## 6. Cấu hình Cloudflare Access

Spendly không tin tưởng trực tiếp các header danh tính. Code xác minh chữ ký JWT của Cloudflare Access bằng issuer, audience và JWKS endpoint trước khi đọc dữ liệu người dùng.

### 6.1. Tạo hostname cho Worker

Sau lần deploy đầu tiên, mở Cloudflare Dashboard:

1. Vào **Workers & Pages → spendly → Settings → Domains & Routes**.
2. Thêm custom domain, ví dụ `spendly.example.com`.
3. Xác nhận DNS/SSL hoạt động.

Nên dùng custom domain thuộc zone Cloudflare của bạn cho production. URL `workers.dev` chỉ nên dùng để kiểm tra ban đầu.

### 6.2. Tạo Access application

Trong Cloudflare Zero Trust:

1. Vào **Access controls → Applications**.
2. Chọn **Create new application**.
3. Chọn **Self-hosted** và thêm public hostname `spendly.example.com`.
4. Tạo policy **Allow** cho email, domain email hoặc nhóm người dùng được phép dùng Spendly.
5. Bật identity provider phù hợp, ví dụ One-time PIN, Google hoặc Microsoft.
6. Lưu application và lấy **Application Audience (AUD)** trong phần thông tin ứng dụng.

Cloudflare Access mặc định deny nếu người dùng không khớp policy Allow. Nên tạo Access application ngay khi thêm hostname để tránh public ứng dụng ngoài ý muốn.

Tài liệu chính thức: [Publish a self-hosted application](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/) và [Access application token](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/).

### 6.3. Cập nhật biến Access

Thay giá trị mẫu trong `wrangler.jsonc`:

```jsonc
"vars": {
  "CF_ACCESS_TEAM_DOMAIN": "your-team.cloudflareaccess.com",
  "CF_ACCESS_AUD": "0123456789abcdef..."
}
```

Không thêm `https://` bắt buộc vào `CF_ACCESS_TEAM_DOMAIN`; code tự chuẩn hóa giá trị này. Không dùng chuỗi `REPLACE_WITH_...` trong production.

Sau khi thay đổi `vars`, phải build và deploy lại để cấu hình được đưa vào Worker.

## 7. Deploy Worker

Chạy theo thứ tự:

```bash
npm run lint
npm test
npm run cf:migrate:remote
npm run build
npm run deploy
```

Lưu ý: `npm run deploy` chỉ deploy artifact đã build, không tự chạy `npm run build`. Build sẽ tạo `dist/server/wrangler.json`; script deploy dùng chính file này.

Nếu deploy thành công, Wrangler sẽ in URL Worker. Mở URL đó để kiểm tra nhanh, nhưng production nên truy cập qua custom domain đã được Access bảo vệ.

## 8. Kiểm tra sau deploy

### 8.1. Health check

```bash
curl https://spendly.example.com/api/health
```

Kết quả hợp lệ có dạng JSON với các trường:

```json
{
  "status": "ok",
  "platform": "cloudflare-workers",
  "database": "d1",
  "objectStorage": "r2",
  "authentication": "cloudflare-access"
}
```

### 8.2. Kiểm tra đăng nhập

1. Mở `https://spendly.example.com` ở cửa sổ ẩn danh.
2. Xác nhận Cloudflare Access hiển thị trang đăng nhập.
3. Đăng nhập bằng email nằm trong policy Allow.
4. Xác nhận dashboard hiển thị dữ liệu demo ban đầu.

Ở production, `host` không còn là localhost nên ứng dụng chỉ dùng user lấy từ Access JWT, không dùng tài khoản demo local.

### 8.3. Kiểm tra D1 remote

Liệt kê bảng:

```bash
npx wrangler d1 execute spendly-db --remote --command "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name;"
```

Các bảng chính cần có gồm `users`, `accounts`, `categories`, `transactions`, `budgets`, `saving_goals`, `goal_transactions`, `recurring_transactions`, `tags`, `transaction_tags`, `notifications` và `user_settings`.

### 8.4. Kiểm tra R2

Sau khi upload một hóa đơn từ dashboard:

```bash
npx wrangler r2 object list spendly-receipts
```

Object phải có prefix là `userId/`. API không cho user này đọc hoặc xóa object thuộc user khác.

## 9. Quy trình cập nhật những lần sau

### Chỉ thay đổi code/UI

```bash
npm run lint
npm test
npm run build
npm run deploy
```

### Có thay đổi database

1. Sửa [db/schema.ts](./db/schema.ts).
2. Tạo migration mới:

   ```bash
   npm run db:generate
   ```

3. Review file SQL mới trong [drizzle/](./drizzle/).
4. Test local:

   ```bash
   npm run cf:migrate:local
   npm run dev
   ```

5. Chạy kiểm tra:

   ```bash
   npm run lint
   npm test
   npm run build
   ```

6. Áp dụng migration production rồi deploy:

   ```bash
   npm run cf:migrate:remote
   npm run deploy
   ```

Không sửa hoặc đổi tên migration đã áp dụng trên production. Hãy luôn tạo migration mới để giữ lịch sử schema nhất quán giữa local và remote.

## 10. Xem log và xử lý lỗi

Theo dõi log Worker:

```bash
npx wrangler tail spendly
```

### `no such table: users`

D1 remote chưa có migration hoặc Worker đang dùng nhầm database:

```bash
npx wrangler d1 migrations list spendly-db --remote
npm run cf:migrate:remote
```

Kiểm tra thêm `database_id`, `database_name` và binding `DB` trong `wrangler.jsonc`.

### `Cloudflare D1 binding DB is unavailable`

Thường do deploy từ artifact cũ hoặc cấu hình generated chưa được tạo:

```bash
npm run build
Get-Content dist/server/wrangler.json       # PowerShell
npm run deploy
```

Đảm bảo `d1_databases[].binding` là `DB`.

### Luôn bị chuyển về `/login`

Kiểm tra:

- Hostname production đã được thêm vào Access application.
- Người dùng khớp policy Allow.
- `CF_ACCESS_TEAM_DOMAIN` đúng team domain.
- `CF_ACCESS_AUD` đúng AUD của chính Access application đó.
- Đã build và deploy sau khi sửa `wrangler.jsonc`.

### Upload hóa đơn trả lỗi R2

Kiểm tra binding và bucket:

```bash
npx wrangler r2 bucket list
Get-Content dist/server/wrangler.json       # PowerShell
```

Binding phải là `RECEIPTS` và bucket phải là `spendly-receipts` hoặc tên bucket thực tế đã cấu hình.

### Deploy báo resource đã tồn tại

Không chạy lại lệnh tạo D1/R2. Kiểm tra resource hiện có:

```bash
npx wrangler d1 list
npx wrangler r2 bucket list
```

Sau đó cập nhật `wrangler.jsonc` để trỏ đúng resource.

## 11. Checklist production

- [ ] `database_id` đã có trong `wrangler.jsonc`.
- [ ] D1 remote đã apply toàn bộ migration.
- [ ] R2 bucket tồn tại và để private.
- [ ] `CF_ACCESS_TEAM_DOMAIN` không còn là placeholder.
- [ ] `CF_ACCESS_AUD` đúng application.
- [ ] Access có policy Allow đúng người dùng.
- [ ] Custom domain/SSL hoạt động.
- [ ] `npm run lint`, `npm test` và `npm run build` đều thành công.
- [ ] `/api/health` trả `status: ok`.
- [ ] Đã thử login, tạo giao dịch và upload hóa đơn.
- [ ] Không commit API token, secret hoặc file `.dev.vars`.
- [ ] Đã biết cách xem log bằng `npx wrangler tail spendly`.

## 12. Tài liệu tham khảo Cloudflare

- [Wrangler D1 commands](https://developers.cloudflare.com/d1/wrangler-commands/)
- [Cloudflare D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [Cloudflare R2 with Workers](https://developers.cloudflare.com/workers/tutorials/upload-assets-with-r2/)
- [Cloudflare Access self-hosted applications](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/self-hosted-public-app/)
- [Cloudflare Access application token/JWT](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/application-token/)
