import { amountToCents, assertSafeCents } from './amounts.mjs';

// Individual monthly equivalents are display values. Calculation aggregates annual
// cents per recipient first, including the party's collective special payment.
export function monthlyIncome(item) {
  const cents = amountToCents(item.amount);
  return (item.period === 'annual' ? Math.round(cents / 12) : cents) / 100;
}

export function incomeSummary(items, recipient, additionalAnnual = 0) {
  let monthly = 0;
  let annual = amountToCents(additionalAnnual);
  let displayedAnnualMonthly = Math.round(annual / 12);
  for (const item of items.filter((item) => item.recipient === recipient)) {
    const cents = amountToCents(item.amount);
    if (item.period === 'annual') {
      annual = assertSafeCents(annual + cents);
      displayedAnnualMonthly = assertSafeCents(displayedAnnualMonthly + Math.round(cents / 12));
    } else monthly = assertSafeCents(monthly + cents);
  }
  const annualMonthly = Math.round(annual / 12);
  return { annualAmount: annual / 100, annualMonthlyAmount: annualMonthly / 100,
    totalMonthlyAmount: assertSafeCents(monthly + annualMonthly) / 100,
    roundingAdjustment: (annualMonthly - displayedAnnualMonthly) / 100 };
}

export function incomeForRecipient(items, recipient) {
  return incomeSummary(items, recipient).totalMonthlyAmount;
}
