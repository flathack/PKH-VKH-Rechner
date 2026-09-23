import legalData from "./legal-data.json" with { type: "json" };
import legalHistory from "./legal-history.json" with { type: "json" };

export const LEGAL_DATA = legalData;
export const ALLOWANCE_SETS = LEGAL_DATA.allowanceSets;
export const LEGAL_HISTORY = legalHistory;

export function legalDataForDate(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return null;
  if (date >= LEGAL_DATA.effectiveFrom && date.slice(0, 4) === String(LEGAL_DATA.calculationYear)) return LEGAL_DATA;
  const historical = LEGAL_HISTORY.find((item) => date >= item.effectiveFrom && date <= item.effectiveUntil);
  return historical ? { ...LEGAL_DATA, ...historical, legalBasis: { ...LEGAL_DATA.legalBasis, ...historical.legalBasis } } : null;
}

export function toCents(value) {
  return Math.round((Number(value) || 0) * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

/** Monatsrate nach § 115 Abs. 2 ZPO auf Basis ganzzahliger Centwerte. */
export function calculateMonthlyRateFromCents(disposableIncomeCents, rateData = LEGAL_DATA.monthlyRate) {
  const usableCents = Math.max(0, Math.round(Number(disposableIncomeCents) || 0));
  const { incomeThreshold, thresholdRate, incomeDivisor, minimumRate } = rateData;
  const thresholdCents = toCents(incomeThreshold);
  const roundedRate = usableCents > thresholdCents
    ? thresholdRate + Math.floor((usableCents - thresholdCents) / 100)
    : Math.floor(usableCents / (incomeDivisor * 100));
  return roundedRate < minimumRate ? 0 : roundedRate;
}

export function calculateMonthlyRate(disposableIncome) {
  return calculateMonthlyRateFromCents(toCents(disposableIncome));
}

function dependentBaseKind(kind) {
  if (kind === "adultEmployed") return "adult";
  if (kind === "teenEmployed") return "teen";
  return kind;
}

export function calculateDependentAllowanceCents(kind, ownIncomeCents, allowances) {
  const baseAllowanceCents = toCents(allowances[dependentBaseKind(kind)]);
  const isEmployed = kind === "adultEmployed" || kind === "teenEmployed";
  const employmentAllowanceCents = isEmployed ? toCents(allowances.employed) : 0;
  const chargeableIncomeCents = Math.max(0, ownIncomeCents - employmentAllowanceCents);
  return Math.max(0, baseAllowanceCents - chargeableIncomeCents);
}

export function calculateDependentAllowance(kind, ownIncome, allowances) {
  return fromCents(calculateDependentAllowanceCents(kind, toCents(ownIncome), allowances));
}

export function calculateDependentDeductionCents(person, allowances) {
  if (person.deductionMode === "maintenance") {
    return Math.max(0, toCents(person.maintenancePayment));
  }
  const ownIncomeCents = toCents(person.ownIncome);
  const deductionsCents = toCents(person.ownIncomeDeductions);
  if (person.incomeAlreadyAdjusted) {
    return Math.max(0, toCents(allowances[dependentBaseKind(person.kind)]) - ownIncomeCents);
  }
  return calculateDependentAllowanceCents(person.kind, Math.max(0, ownIncomeCents - deductionsCents), allowances);
}

export function calculateDependentDeduction(person, allowances) {
  return fromCents(calculateDependentDeductionCents(person, allowances));
}

export function calculateSpouseAllowanceCents(ownIncomeCents, employed, allowances) {
  const employmentAllowanceCents = employed ? toCents(allowances.employed) : 0;
  const chargeableIncomeCents = Math.max(0, ownIncomeCents - employmentAllowanceCents);
  return Math.max(0, toCents(allowances.party) - chargeableIncomeCents);
}

export function calculateSpouseAllowance(ownIncome, employed, allowances) {
  return fromCents(calculateSpouseAllowanceCents(toCents(ownIncome), employed, allowances));
}

export function calculatePersonAllowance(baseAllowance, income, deductions, employed, alreadyAdjusted, employmentAllowance) {
  const chargeable = alreadyAdjusted
    ? toCents(income)
    : Math.max(0, toCents(income) - toCents(deductions) - (employed ? toCents(employmentAllowance) : 0));
  return fromCents(Math.max(0, toCents(baseAllowance) - chargeable));
}

/**
 * Vollständige PKH/VKH-Ratenberechnung. Geldbeträge werden beim Eintritt in
 * die Funktion in Cent umgewandelt und erst für die Ausgabe zurückkonvertiert.
 */
export function calculatePkh(input, law = LEGAL_DATA) {
  const allowances = law.allowanceSets[input.location] ?? law.allowanceSets.bund;
  const netIncomeCents = toCents(input.netIncome);
  const otherIncomeCents = toCents(input.otherIncome);
  const annualMonthlyCents = Math.round(toCents(input.annualPayments) / 12);
  const mandatoryDeductionsCents = toCents(input.mandatoryDeductions);
  const grossMonthlyIncomeCents = netIncomeCents + otherIncomeCents + annualMonthlyCents;
  const incomeAfterMandatoryCents = Math.max(0, grossMonthlyIncomeCents - mandatoryDeductionsCents);

  const employmentAllowanceCents = input.employed ? toCents(allowances.employed) : 0;
  const partyAllowanceCents = toCents(allowances.party);
  const spouseAllowanceCents = input.spouse
    ? toCents(calculatePersonAllowance(allowances.party, input.spouseIncome, input.spouseIncomeDeductions, input.spouseEmployed, input.spouseIncomeAlreadyAdjusted, allowances.employed))
    : 0;
  const dependentAllowanceCents = input.dependents.reduce(
    (sum, person) => sum + calculateDependentDeductionCents(person, allowances),
    0,
  );

  const warmRentCents = toCents(input.warmRent);
  let housingShareCents = warmRentCents;
  if (input.housingMode === "income") {
    const otherHouseholdIncomeCents = toCents(input.otherHouseholdIncome);
    const householdIncomeCents = incomeAfterMandatoryCents + otherHouseholdIncomeCents;
    housingShareCents = householdIncomeCents > 0
      ? Math.round(warmRentCents * (incomeAfterMandatoryCents / householdIncomeCents))
      : warmRentCents;
  } else if (input.housingMode === "heads") {
    housingShareCents = Math.round(warmRentCents / Math.max(1, Math.trunc(input.householdPeople) || 1));
  } else if (input.housingMode === "manual") {
    housingShareCents = Math.min(warmRentCents, Math.max(0, toCents(input.manualHousingShare)));
  }
  const housingIncomplete = (input.housingMode === "income" && input.otherHouseholdIncome == null)
    || (input.housingMode === "manual" && input.manualHousingShare == null);

  const totalAllowancesCents = employmentAllowanceCents + partyAllowanceCents + spouseAllowanceCents + dependentAllowanceCents;
  const customDeductionTotalCents = input.customDeductions.reduce((sum, item) => sum + toCents(item.amount), 0);
  const furtherDeductionsCents = toCents(input.insuranceAndWork)
    + toCents(input.additionalMaintenance)
    + toCents(input.additionalNeeds)
    + toCents(input.specialBurdens)
    + customDeductionTotalCents;
  const disposableIncomeCents = grossMonthlyIncomeCents
    - mandatoryDeductionsCents
    - totalAllowancesCents
    - housingShareCents
    - furtherDeductionsCents;

  const monthlyRate = calculateMonthlyRateFromCents(disposableIncomeCents, law.monthlyRate);
  const assetContribution = input.assetContribution == null ? null : Math.max(0, fromCents(toCents(input.assetContribution)));
  const estimatedCosts = input.estimatedCosts == null ? null : Math.max(0, fromCents(toCents(input.estimatedCosts)));
  const fourRateThreshold = monthlyRate * 4 + (assetContribution ?? 0);
  const costExclusion = estimatedCosts == null || assetContribution == null ? null : estimatedCosts <= fourRateThreshold;
  const remainingCostsCents = estimatedCosts == null || assetContribution == null
    ? null : Math.max(0, toCents(estimatedCosts) - toCents(assetContribution));
  const installmentsToCoverCosts = remainingCostsCents == null ? null
    : remainingCostsCents === 0 ? 0
      : monthlyRate === 0 ? null : Math.ceil(remainingCostsCents / (monthlyRate * 100));
  const costsCoveredWithinCap = installmentsToCoverCosts == null ? null
    : installmentsToCoverCosts <= law.monthlyRate.maximumInstallments;
  const endingAmounts = new Map();
  const approvalMonth = input.approvalDate?.slice(0, 7);
  const expiredBurdenInput = Boolean(approvalMonth && (
    (input.specialEndDate && input.specialBurdens > 0 && input.specialEndDate < approvalMonth)
    || input.customDeductions.some((item) => item.endMonth && item.amount > 0 && item.endMonth < approvalMonth)
  ));
  if (input.specialEndDate && input.specialBurdens > 0) endingAmounts.set(input.specialEndDate, toCents(input.specialBurdens));
  for (const item of input.customDeductions) {
    if (item.endMonth && item.amount > 0) endingAmounts.set(item.endMonth, (endingAmounts.get(item.endMonth) ?? 0) + toCents(item.amount));
  }
  let endedCents = 0;
  const futureRates = [...endingAmounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([endMonth, amountCents]) => {
    endedCents += amountCents;
    return { from: nextMonth(endMonth), monthlyRate: calculateMonthlyRateFromCents(disposableIncomeCents + endedCents, law.monthlyRate) };
  });

  return {
    grossMonthlyIncome: fromCents(grossMonthlyIncomeCents),
    annualMonthlyAmount: fromCents(annualMonthlyCents),
    incomeAfterMandatory: fromCents(incomeAfterMandatoryCents),
    employmentAllowance: fromCents(employmentAllowanceCents),
    partyAllowance: fromCents(partyAllowanceCents),
    spouseAllowance: fromCents(spouseAllowanceCents),
    dependentAllowance: fromCents(dependentAllowanceCents),
    totalAllowances: fromCents(totalAllowancesCents),
    housingShare: fromCents(housingShareCents),
    housingIncomplete,
    expiredBurdenInput,
    customDeductionTotal: fromCents(customDeductionTotalCents),
    furtherDeductions: fromCents(furtherDeductionsCents),
    disposableIncome: fromCents(disposableIncomeCents),
    monthlyRate,
    assetContribution,
    estimatedCosts,
    fourRateThreshold,
    costExclusion,
    installmentsToCoverCosts,
    costsCoveredWithinCap,
    futureRate: futureRates[0]?.monthlyRate ?? null,
    futureRateFrom: futureRates[0]?.from ?? null,
    futureRates,
  };
}

export function nextMonth(date) {
  if (!/^\d{4}-\d{2}$/.test(date)) return null;
  const [year, month] = date.split("-").map(Number);
  return `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`;
}
