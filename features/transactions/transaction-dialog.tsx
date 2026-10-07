"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { transactionSchema } from "@/lib/transaction-input";
import { parseVndAmount } from "./input";
import type { Transaction, TransactionType } from "@/features/finance/types";

export function TransactionDialog({ open, onOpenChange, onSubmit }: { open: boolean; onOpenChange: (open:boolean)=>void; onSubmit: (item:Transaction)=>Promise<void> }) {
  const [type,setType]=useState<TransactionType>("expense"); const [amount,setAmount]=useState(""); const [description,setDescription]=useState(""); const [category,setCategory]=useState("Ăn uống"); const [account,setAccount]=useState("Vietcombank"); const [note,setNote]=useState("");
  const [toAccount, setToAccount] = useState("Ví tiền mặt");
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  async function save() {
    if (submitting.current) return;
    const parsed = parseVndAmount(amount);
    if (parsed === undefined) {
      toast.error("Vui lòng nhập số tiền VND nguyên hợp lệ, tối đa 1.000.000.000.000");
      return;
    }
    if (type === "transfer" && (!toAccount || toAccount === account)) {
      toast.error("Vui lòng chọn tài khoản nhận khác tài khoản nguồn");
      return;
    }
    const draft = transactionSchema.safeParse({
      id: crypto.randomUUID(), type, amount: parsed, description: description.trim(),
      category: type === "transfer" ? "Chuyển tiền" : category, account,
      note: note.trim(), ...(type === "transfer" ? { toAccount } : {}), date: new Date().toISOString(),
    });
    if (!draft.success) {
      toast.error("Nội dung phải có 2–160 ký tự và ghi chú tối đa 2000 ký tự");
      return;
    }
    submitting.current = true;
    setSaving(true);
    try {
      await onSubmit({ ...draft.data, color: type === "income" ? "#22c55e" : type === "transfer" ? "#2563eb" : "#f59e0b", status: "completed" });
      setAmount("");
      setDescription("");
      setNote("");
      onOpenChange(false);
      toast.success("Đã thêm giao dịch");
    } catch {
      toast.error("Không thể lưu giao dịch, vui lòng thử lại");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }
  return <Dialog open={open} onOpenChange={(next)=>{if(!submitting.current)onOpenChange(next)}}><DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-xl sm:p-6"><DialogHeader><DialogTitle>Thêm giao dịch</DialogTitle><DialogDescription>Ghi lại giao dịch mới chỉ trong vài thao tác.</DialogDescription></DialogHeader><div className="grid grid-cols-3 gap-2">{([{"id":"expense","label":"Chi tiêu","icon":ArrowUpRight},{"id":"income","label":"Thu nhập","icon":ArrowDownLeft},{"id":"transfer","label":"Chuyển tiền","icon":ArrowLeftRight}] as const).map(item=><button type="button" key={item.id} disabled={saving} onClick={()=>{setType(item.id);setCategory(item.id==="income"?"Lương":"Ăn uống")}} className={`flex min-h-16 flex-col items-center gap-1.5 rounded-xl border p-2 text-xs font-semibold transition sm:p-3 sm:text-sm ${type===item.id?"border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950":"hover:bg-muted"}`}><item.icon className="size-5"/>{item.label}</button>)}</div><div className="space-y-2"><Label htmlFor="amount">Số tiền</Label><div className="relative"><Input disabled={saving} id="amount" value={amount} onChange={e=>setAmount(e.target.value)} className="h-12 pr-12 text-lg font-bold" inputMode="numeric" placeholder="0" autoFocus/><span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">VND</span></div></div><div className="space-y-2"><Label htmlFor="description">Nội dung</Label><Input disabled={saving} id="description" value={description} onChange={e=>setDescription(e.target.value)} placeholder="Ví dụ: Highlands Coffee"/></div><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-sm font-medium">Danh mục<Select value={category} onValueChange={setCategory} disabled={saving||type==="transfer"}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent>{(type==="income"?["Lương","Freelance"]:["Ăn uống","Di chuyển","Nhà ở","Gia đình","Mua sắm","Giải trí"]).map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></label><label className="space-y-2 text-sm font-medium">Tài khoản<Select disabled={saving} value={account} onValueChange={setAccount}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent>{["Vietcombank","Ví tiền mặt","MoMo","Tiết kiệm"].map(x=><SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></label></div>{type==="transfer"&&<label className="space-y-2 text-sm font-medium">Tài khoản nhận<Select disabled={saving} value={toAccount} onValueChange={setToAccount}><SelectTrigger className="w-full"><SelectValue/></SelectTrigger><SelectContent>{["Vietcombank","Ví tiền mặt","MoMo","Tiết kiệm"].filter(name=>name!==account).map(name=><SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent></Select></label>}<div className="space-y-2"><Label htmlFor="note">Ghi chú</Label><Textarea disabled={saving} id="note" value={note} onChange={e=>setNote(e.target.value)} placeholder="Tùy chọn" rows={2}/></div><DialogFooter showCloseButton><Button disabled={saving} onClick={save}>Lưu giao dịch</Button></DialogFooter></DialogContent></Dialog>;
}
