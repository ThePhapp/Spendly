import { totalExpense, totalIncome } from "./calculations";
import type { Transaction } from "./types";

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
});

/** YYYY-MM-DD in Vietnam time. Date-only and unzoned ISO timestamps retain their local date.
 * Invalid dates return an empty key so they cannot enter a reporting period.
 */
export function dateKey(date: string | Date): string {
  if (typeof date === "string") {
    const parts = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/i.exec(date);
    if (!parts) return "";
    const [, year, month, day, hour, minute, second, zone] = parts;
    const leap = Number(year) % 4 === 0 && (Number(year) % 100 !== 0 || Number(year) % 400 === 0);
    const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > days[Number(month) - 1]
      || (hour !== undefined && Number(hour) > 23) || Number(minute ?? 0) > 59 || Number(second ?? 0) > 59) return "";
    if (!zone) return `${year}-${month}-${day}`;
    date = new Date(date.replace(" ", "T"));
  }
  if (!Number.isFinite(date.getTime())) return "";
  const parts = dateFormatter.formatToParts(date);
  return `${parts.find(part => part.type === "year")!.value.padStart(4, "0")}-${parts.find(part => part.type === "month")!.value}-${parts.find(part => part.type === "day")!.value}`;
}

export function monthKey(date: string | Date): string {
  return dateKey(date).slice(0, 7);
}

/** Calendar cells retain all statuses and match full dates, never just day-of-month. */
export function calendarMonth(items: Transaction[], key: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) throw new RangeError("Invalid calendar month");
  const start = new Date(`${key}-01T00:00:00Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1, 0);
  const byDay = new Map<string, Transaction[]>();
  for (const item of items) {
    const day = dateKey(item.date);
    if (day.slice(0, 7) !== key) continue;
    const rows = byDay.get(day) ?? [];
    rows.push(item);
    byDay.set(day, rows);
  }
  return {
    leadingDays: (start.getUTCDay() + 6) % 7,
    previous: shiftMonth(key, -1), next: shiftMonth(key, 1),
    days: Array.from({ length: end.getUTCDate() }, (_, index) => {
      const day = index + 1;
      const date = `${key}-${String(day).padStart(2, "0")}`;
      return { day, date, transactions: byDay.get(date) ?? [] };
    }),
  };
}

function shiftMonth(key: string, offset: number): string {
  const [year, month] = key.split("-").map(Number);
  const index = year * 12 + month - 1 + offset;
  return `${Math.floor(index / 12).toString().padStart(4, "0")}-${(index % 12 + 1).toString().padStart(2, "0")}`;
}

function periodKeys(monthCount: number, now: string | Date): string[] {
  if (!Number.isInteger(monthCount) || monthCount < 1 || monthCount > 1200) throw new RangeError("monthCount must be an integer from 1 to 1200");
  const end = monthKey(now);
  if (!end) throw new RangeError("Invalid reporting date");
  return Array.from({ length: monthCount }, (_, i) => shiftMonth(end, i - monthCount + 1));
}

/** Posted records in a calendar month; transfers remain available to callers. */
export function monthTransactions(items: Transaction[], key: string): Transaction[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key)) return [];
  return items.filter(item => item.status !== "pending" && monthKey(item.date) === key);
}

/** Oldest to newest, including the current calendar month and zero-filled gaps.
 * `month` is YYYY-MM; income/expense are in millions of VND.
 */
export function monthlySeries(items: Transaction[], monthCount: number, now: string | Date = new Date()) {
  const months = new Map(periodKeys(monthCount, now).map(month => [month, { month, income: 0, expense: 0 }]));
  for (const item of items) {
    if (item.status === "pending" || item.type === "transfer") continue;
    const bucket = months.get(monthKey(item.date));
    if (bucket) bucket[item.type] += item.amount;
  }
  return [...months.values()].map(bucket => ({
    month: bucket.month, income: bucket.income / 1_000_000, expense: bucket.expense / 1_000_000,
  }));
}

/** No percentage is defined for a zero baseline unless both values are zero. */
export function percentageChange(current: number, previous: number): number | null {
  return previous === 0 ? (current === 0 ? 0 : null) : (current - previous) / Math.abs(previous) * 100;
}

/** Compare the selected calendar months with the immediately preceding equal-length period. */
export function transactionReport(items: Transaction[], monthCount: number, now: string | Date = new Date()) {
  const keys = periodKeys(monthCount, now);
  const previousKeys = keys.map(key => shiftMonth(key, -monthCount));
  const select = (months: string[]) => {
    const allowed = new Set(months);
    return items.filter(item => item.status !== "pending" && allowed.has(monthKey(item.date)));
  };
  const current = select(keys), previous = select(previousKeys);
  const income = totalIncome(current), expense = totalExpense(current);
  const previousIncome = totalIncome(previous), previousExpense = totalExpense(previous);
  const categories = new Map<string, { name: string; value: number; color: string }>();
  for (const item of current) {
    if (item.type !== "expense") continue;
    const category = categories.get(item.category) ?? { name: item.category, value: 0, color: item.color };
    category.value += item.amount;
    categories.set(item.category, category);
  }
  return {
    keys, previousKeys, income, expense, previousIncome, previousExpense,
    incomeChange: percentageChange(income, previousIncome),
    expenseChange: percentageChange(expense, previousExpense),
    cashFlowChange: percentageChange(income - expense, previousIncome - previousExpense),
    categoryData: [...categories.values()].sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
    series: monthlySeries(current, monthCount, now),
  };
}
