import { amountToCents, assertSafeCents } from "./amounts.mjs";

export function monthlyIncome(item) {
  const cents = amountToCents(item.amount);
  return (item.period === "annual" ? Math.round(cents / 12) : cents) / 100;
}

export function incomeForRecipient(items, recipient) {
  return items.filter((item) => item.recipient === recipient)
    .reduce((sum, item) => assertSafeCents(sum + amountToCents(monthlyIncome(item))), 0) / 100;
}
