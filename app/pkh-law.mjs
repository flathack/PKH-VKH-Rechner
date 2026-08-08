import legalData from "./legal-data.json" with { type: "json" };

export const LEGAL_DATA = legalData;
export const ALLOWANCE_SETS = LEGAL_DATA.allowanceSets;

export function toCents(value) {
  return Math.round((Number(value) || 0) * 100);
}

export function fromCents(cents) {
  return cents / 100;
}

/** Monatsrate nach § 115 Abs. 2 ZPO auf Basis ganzzahliger Centwerte. */
export function calculateMonthlyRateFromCents(disposableIncomeCents) {
  const usableCents = Math.max(0, Math.round(Number(disposableIncomeCents) || 0));
  const { incomeThreshold, thresholdRate, incomeDivisor, minimumRate } = LEGAL_DATA.monthlyRate;
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
  return calculateDependentAllowanceCents(person.kind, toCents(person.ownIncome), allowances);
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

/**
 * Vollständige PKH/VKH-Ratenberechnung. Geldbeträge werden beim Eintritt in
 * die Funktion in Cent umgewandelt und erst für die Ausgabe zurückkonvertiert.
 */
export function calculatePkh(input) {
  const allowances = ALLOWANCE_SETS[input.location] ?? ALLOWANCE_SETS.bund;
  const netIncomeCents = toCents(input.netIncome);
  const otherIncomeCents = toCents(input.otherIncome);
  const annualMonthlyCents = Math.round(toCents(input.annualPayments) / 12);
  const mandatoryDeductionsCents = toCents(input.mandatoryDeductions);
  const grossMonthlyIncomeCents = netIncomeCents + otherIncomeCents + annualMonthlyCents;
  const incomeAfterMandatoryCents = Math.max(0, grossMonthlyIncomeCents - mandatoryDeductionsCents);

  const employmentAllowanceCents = input.employed ? toCents(allowances.employed) : 0;
  const partyAllowanceCents = toCents(allowances.party);
  const spouseAllowanceCents = input.spouse
    ? calculateSpouseAllowanceCents(toCents(input.spouseIncome), input.spouseEmployed, allowances)
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
  }

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
    customDeductionTotal: fromCents(customDeductionTotalCents),
    furtherDeductions: fromCents(furtherDeductionsCents),
    disposableIncome: fromCents(disposableIncomeCents),
    monthlyRate: calculateMonthlyRateFromCents(disposableIncomeCents),
  };
}
