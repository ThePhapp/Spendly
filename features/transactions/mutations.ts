import type { Transaction } from "../finance/types";

type UpdateTransactions = (update: (items: Transaction[]) => Transaction[]) => void;

// Keep one coordinator per mounted workspace so every entry point shares requests.
export function createTransactionMutations(update: UpdateTransactions, request: typeof fetch = fetch) {
  const creates = new Map<string, Promise<void>>();
  const deletes = new Map<string, Promise<void>>();

  function create(item: Transaction): Promise<void> {
    const pending = creates.get(item.id);
    if (pending) return pending;
    const operation = Promise.resolve().then(async () => {
      const response = await request("/api/transactions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item),
      });
      if (!response.ok) throw new Error("Không thể lưu giao dịch");
      const body = await response.json() as { transactions: Transaction[] };
      const saved = body.transactions;
      const ids = new Set(saved.map(row => row.id));
      update(items => [...saved, ...items.filter(existing => !ids.has(existing.id))]);
    }).finally(() => creates.delete(item.id));
    creates.set(item.id, operation);
    return operation;
  }

  function remove(id: string): Promise<void> {
    const pending = deletes.get(id);
    if (pending) return pending;
    const creating = creates.get(id);
    const operation = Promise.resolve().then(async () => {
      // A delete must not reach the server before a pending insert for this ID.
      if (creating) await creating;
      const response = await request(`/api/transactions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể xóa giao dịch");
      update(items => {
        const transferId = items.find(item => item.id === id)?.transferId;
        return items.filter(item => item.id !== id && (!transferId || item.transferId !== transferId));
      });
    }).finally(() => deletes.delete(id));
    deletes.set(id, operation);
    return operation;
  }

  return { create, remove };
}
