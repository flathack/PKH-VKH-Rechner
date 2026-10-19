import { assertSafeCents } from "./amounts.mjs";

function monthIndex(month) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(month ?? "")) return null;
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5)) - 1;
}

/** Plant positive Zahlungsraten; Monate mit 0 Euro verbrauchen keine Zahlungsrate. */
export function calculatePaymentPlan({ monthlyRate, futureRates, approvalDate, paymentStartMonth, remainingCostsCents, maximumInstallments }) {
  const approvalMonth = approvalDate?.slice(0, 7);
  const startMonth = paymentStartMonth || approvalMonth || null;
  const start = monthIndex(startMonth);
  const approval = monthIndex(approvalMonth);
  const incomplete = Boolean((paymentStartMonth && start == null)
    || (start != null && approval != null && start < approval)
    || (futureRates.length && start == null));
  if (incomplete) return { paymentPlanIncomplete: true, paymentPlanStartMonth: startMonth, maximumContribution: null, installmentsToCoverCosts: null, costsCoveredWithinCap: null };

  const stages = [{ from: start ?? 0, rate: monthlyRate }];
  for (const step of futureRates) {
    const from = monthIndex(step.from);
    if (from == null) throw new RangeError("Ungültiger Monat im Ratenplan.");
    if (from <= start) stages[0].rate = step.monthlyRate;
    else stages.push({ from, rate: step.monthlyRate });
  }
  let cappedPayments = 0;
  let maximumCents = 0;
  let neededPayments = 0;
  let remaining = remainingCostsCents;
  for (let index = 0; index < stages.length; index++) {
    const stage = stages[index];
    const months = stages[index + 1] ? stages[index + 1].from - stage.from : Infinity;
    if (stage.rate <= 0) continue;
    const cents = assertSafeCents(stage.rate * 100);
    const capped = Math.min(months, maximumInstallments - cappedPayments);
    maximumCents = assertSafeCents(maximumCents + capped * cents);
    cappedPayments += capped;
    if (remaining != null && remaining > 0) {
      const needed = Math.min(months, Math.ceil(remaining / cents));
      neededPayments += needed;
      remaining = Math.max(0, remaining - needed * cents);
    }
  }
  const installmentsToCoverCosts = remainingCostsCents == null || remaining > 0 ? null : neededPayments;
  return {
    paymentPlanIncomplete: false,
    paymentPlanStartMonth: startMonth,
    maximumContribution: maximumCents / 100,
    installmentsToCoverCosts,
    costsCoveredWithinCap: remainingCostsCents == null ? null : installmentsToCoverCosts != null && installmentsToCoverCosts <= maximumInstallments,
  };
}
