export function monthlyIncome(item) {
  const cents = Math.round((Number(item.amount) || 0) * 100);
  return (item.period === "annual" ? Math.round(cents / 12) : cents) / 100;
}

export function incomeForRecipient(items, recipient) {
  return items.filter((item) => item.recipient === recipient)
    .reduce((sum, item) => sum + Math.round(monthlyIncome(item) * 100), 0) / 100;
}
