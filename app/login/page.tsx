import Link from "next/link";
import { ArrowRight, CheckCircle2, Cloud, LockKeyhole } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2563eb55,transparent_46%),radial-gradient(circle_at_bottom_right,#14b8a633,transparent_42%)]" />
        <Link href="/" className="relative flex items-center gap-3 text-xl font-bold">
          <span className="grid size-10 place-items-center rounded-2xl bg-blue-500">S</span>
          Spendly
        </Link>
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Cloudflare-native</p>
          <h1 className="mt-5 text-5xl font-bold leading-tight">Dữ liệu tài chính riêng tư trên một nền tảng duy nhất.</h1>
          <div className="mt-8 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
            {["Cloudflare Access bảo vệ đăng nhập", "D1 lưu dữ liệu tài chính", "R2 lưu hóa đơn an toàn", "Workers chạy ứng dụng toàn cầu"].map((item) => (
              <p key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" />{item}</p>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-slate-500">Spendly · Powered entirely by Cloudflare</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
        <Card className="w-full max-w-md border-0 shadow-2xl shadow-black/10">
          <CardHeader className="space-y-3 px-5 sm:px-8">
            <Link href="/" className="mb-2 flex items-center gap-2 font-bold lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white">S</span>Spendly</Link>
            <div className="grid size-12 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950"><Cloud /></div>
            <CardTitle className="text-2xl">Đăng nhập qua Cloudflare Access</CardTitle>
            <CardDescription>Access xác minh danh tính trước khi request đến ứng dụng. Spendly không lưu mật khẩu của bạn.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-5 sm:px-8">
            <div className="flex items-start gap-3 rounded-2xl border bg-muted/50 p-4 text-sm leading-6">
              <LockKeyhole className="mt-0.5 size-5 shrink-0 text-emerald-600" />
              <p>Nếu Cloudflare Access đã được cấu hình, mở dashboard sẽ tự chuyển đến màn hình OTP hoặc nhà cung cấp đăng nhập của bạn.</p>
            </div>
            <Button asChild className="h-11 w-full"><Link href="/">Tiếp tục đăng nhập <ArrowRight /></Link></Button>
            <p className="text-center text-xs leading-5 text-muted-foreground">Đang chạy local? Spendly tự sử dụng tài khoản demo, không cần đăng nhập.</p>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
