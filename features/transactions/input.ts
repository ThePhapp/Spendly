export function parseVndAmount(input: string): number | undefined {
  const value = input.trim();
  const valid = /^\d+$/.test(value)
    || /^\d{1,3}(?:\.\d{3})+$/.test(value)
    || /^\d{1,3}(?:,\d{3})+$/.test(value)
    || /^\d{1,3}(?: \d{3})+$/.test(value);
  if (!valid) return undefined;
  const amount = Number(value.replace(/[., ]/g, ""));
  return Number.isSafeInteger(amount) && amount > 0 && amount <= 1_000_000_000_000 ? amount : undefined;
}
