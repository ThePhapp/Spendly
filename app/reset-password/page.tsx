"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    try {
      const { error } = await createClient().auth.updateUser({ password });
      if (error) throw error;
      toast.success("Đã cập nhật mật khẩu");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật mật khẩu");
    } finally {
      setLoading(false);
    }
  }

  return <main className="grid min-h-screen place-items-center bg-background p-4"><Card className="w-full max-w-md"><CardHeader><CardTitle>Mật khẩu mới</CardTitle><CardDescription>Sử dụng ít nhất 8 ký tự.</CardDescription></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-4"><div className="space-y-2"><Label htmlFor="password">Mật khẩu</Label><Input id="password" type="password" value={password} onChange={(event)=>setPassword(event.target.value)} minLength={8} required autoComplete="new-password" /></div><Button type="submit" className="w-full" disabled={loading}>{loading&&<Loader2 className="animate-spin" />}Cập nhật mật khẩu</Button></form></CardContent></Card></main>;
}
