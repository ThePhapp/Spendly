"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type Mode = "login" | "register" | "forgot";

export default function LoginPage() {
  const router = useRouter();
  const configured = isSupabaseConfigured();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!configured) return;
    setLoading(true);

    try {
      const supabase = createClient();
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        if (error) throw error;
        toast.success("Đã gửi email đặt lại mật khẩu");
        setMode("login");
        return;
      }

      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Hãy kiểm tra email để xác nhận tài khoản");
          setMode("login");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đăng nhập");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#2563eb55,transparent_46%),radial-gradient(circle_at_bottom_right,#14b8a633,transparent_42%)]" />
        <Link href="/" className="relative flex items-center gap-3 text-xl font-bold">
          <span className="grid size-10 place-items-center rounded-2xl bg-blue-500">S</span>
          Spendly
        </Link>
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Tài chính rõ ràng</p>
          <h1 className="mt-5 text-5xl font-bold leading-tight">Mọi quyết định tài chính bắt đầu từ một bức tranh đúng.</h1>
          <div className="mt-8 grid gap-4 text-sm text-slate-300 sm:grid-cols-2">
            {["Dữ liệu riêng theo từng tài khoản", "Đồng bộ an toàn với Supabase", "Theo dõi ngân sách theo thời gian thực", "Tối ưu cho mọi kích thước màn hình"].map((item) => (
              <p key={item} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-emerald-400" />{item}</p>
            ))}
          </div>
        </div>
        <p className="relative text-sm text-slate-500">Spendly · Personal finance workspace</p>
      </section>

      <section className="flex min-h-screen items-center justify-center bg-background p-4 sm:p-8">
        <Card className="w-full max-w-md border-0 shadow-2xl shadow-black/10">
          <CardHeader className="space-y-3 px-5 sm:px-8">
            <Link href="/" className="mb-2 flex items-center gap-2 font-bold lg:hidden"><span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white">S</span>Spendly</Link>
            <CardTitle className="text-2xl">
              {mode === "login" ? "Chào mừng trở lại" : mode === "register" ? "Tạo tài khoản" : "Quên mật khẩu"}
            </CardTitle>
            <CardDescription>
              {mode === "login" ? "Đăng nhập để tiếp tục quản lý tài chính." : mode === "register" ? "Bắt đầu xây dựng thói quen tài chính tốt hơn." : "Nhập email để nhận liên kết đặt lại mật khẩu."}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 sm:px-8">
            {!configured ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100">
                <p className="font-semibold">Đang chạy ở chế độ demo</p>
                <p className="mt-2 text-sm leading-6 opacity-80">Thêm biến môi trường Supabase để bật đăng ký và dữ liệu thật.</p>
                <Button asChild className="mt-5 w-full"><Link href="/">Mở dashboard demo <ArrowRight /></Link></Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "register" && <div className="space-y-2"><Label htmlFor="full-name">Họ và tên</Label><Input id="full-name" value={fullName} onChange={(event)=>setFullName(event.target.value)} placeholder="Nguyễn Văn An" minLength={2} required autoComplete="name" /></div>}
                <div className="space-y-2"><Label htmlFor="email">Email</Label><div className="relative"><Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="email" type="email" value={email} onChange={(event)=>setEmail(event.target.value)} className="pl-9" placeholder="ban@example.com" required autoComplete="email" /></div></div>
                {mode !== "forgot" && <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">Mật khẩu</Label>{mode === "login" && <button type="button" onClick={()=>setMode("forgot")} className="text-xs font-semibold text-blue-600 hover:underline">Quên mật khẩu?</button>}</div><div className="relative"><LockKeyhole className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="password" type="password" value={password} onChange={(event)=>setPassword(event.target.value)} className="pl-9" minLength={8} required autoComplete={mode === "login" ? "current-password" : "new-password"} /></div></div>}
                <Button type="submit" className="h-11 w-full" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : null}{mode === "login" ? "Đăng nhập" : mode === "register" ? "Đăng ký" : "Gửi liên kết"}</Button>
                <div className="text-center text-sm text-muted-foreground">
                  {mode === "login" ? <>Chưa có tài khoản? <button type="button" onClick={()=>setMode("register")} className="font-semibold text-blue-600 hover:underline">Đăng ký</button></> : <>Đã có tài khoản? <button type="button" onClick={()=>setMode("login")} className="font-semibold text-blue-600 hover:underline">Đăng nhập</button></>}
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
