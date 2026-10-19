import legalData from "./legal-data.json" with { type: "json" };
import legalHistory from "./legal-history.json" with { type: "json" };
import { amountToCents, assertSafeCents } from "./amounts.mjs";
import { calculatePaymentPlan } from "./payment-plan.mjs";
import { incomeSummary, incomeForRecipient } from "./income-items.mjs";
import { employmentAllowance } from "./employment-allowance.mjs";

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
  return amountToCents(value);
}

export function fromCents(cents) {
  return cents / 100;
}

/** Monatsrate nach § 115 Abs. 2 ZPO auf Basis ganzzahliger Centwerte. */
export function calculateMonthlyRateFromCents(disposableIncomeCents, rateData = LEGAL_DATA.monthlyRate) {
  const usableCents = Math.max(0, assertSafeCents(disposableIncomeCents));
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

export function dependentDetails(person, allowances) {
  const base = allowances[dependentBaseKind(person.kind)];
  const ownIncome = fromCents(toCents(person.ownIncome));
  const employed = person.deductionMode !== "maintenance" && person.deductionMode !== "shared"
    && (person.kind === "adultEmployed" || person.kind === "teenEmployed");
  const employment = employmentAllowance({ ...person, employed }, allowances.employed,
    person.incomeAlreadyAdjusted ? ownIncome : Math.max(0, ownIncome - fromCents(toCents(person.ownIncomeDeductions))), { relative: true });
  let message = "";
  let amount;
  if (person.deductionMode === "maintenance") amount = Math.max(0, fromCents(toCents(person.maintenancePayment)));
  else if (person.deductionMode === "shared") {
    const half = base / 2;
    if (person.kind === "adult" || person.kind === "adultEmployed") message = "Das paritätische Wechselmodell ist hier nur für minderjährige Kinder vorgesehen.";
    if (ownIncome > 0 && (person.sharedCareAllowance == null || !person.sharedCareNote?.trim())) message ||= "Bei Kindeseinkommen/Kindergeld bitte den geprüften hälftigen Freibetrag und einen Prüfvermerk angeben.";
    if (person.sharedCareAllowance != null && !person.sharedCareNote?.trim()) message ||= "Bitte den manuell geprüften Freibetrag im Wechselmodell begründen.";
    const reviewed = person.sharedCareAllowance == null ? half : fromCents(toCents(person.sharedCareAllowance));
    if (reviewed < 0 || reviewed > half) message ||= "Der geprüfte Freibetrag im Wechselmodell darf den hälftigen Altersfreibetrag nicht übersteigen.";
    amount = reviewed + Math.max(0, fromCents(toCents(person.maintenancePayment)));
  } else {
    const chargeable = person.incomeAlreadyAdjusted ? toCents(ownIncome)
      : Math.max(0, toCents(ownIncome) - toCents(person.ownIncomeDeductions) - toCents(employment.amount));
    amount = fromCents(Math.max(0, toCents(base) - chargeable));
    message = employment.message;
  }
  return { amount: message ? 0 : amount, incomplete: Boolean(message), message, employment,
    halfAllowance: person.deductionMode === "shared" ? base / 2 : null };
}

export function calculateDependentDeductionCents(person, allowances) {
  return toCents(dependentDetails(person, allowances).amount);
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

/** Monatliche Fahrtkosten der Partei; die Pkw-Pauschale gilt je vollem einfachen Entfernungskilometer. */
export function calculateTravelCosts(input = {}, law = LEGAL_DATA) {
  const method = input.method ?? "none";
  const labels = { none: "Kein gesonderter Ansatz", car: "Pkw-Pauschale", public: "Öffentliche Verkehrsmittel", manual: "Abweichender geprüfter Monatsbetrag" };
  const fullKilometers = Math.floor(Number(input.distanceKm) || 0);
  let validationMessage = "";
  if (!Object.hasOwn(labels, method)) validationMessage = "Bitte eine gültige Fahrtkostenmethode wählen.";
  else if (method === "car" && (input.distanceKm == null || !Number.isFinite(input.distanceKm) || input.distanceKm < 0)) validationMessage = "Bitte die einfache Entfernung zur Arbeit angeben.";
  else if ((method === "public" || method === "manual") && (input.monthlyAmount == null || !Number.isFinite(input.monthlyAmount) || input.monthlyAmount < 0)) validationMessage = "Bitte den monatlichen Fahrtkostenbetrag angeben.";
  else if ((method === "car" || method === "manual") && !input.reason?.trim()) validationMessage = method === "car" ? "Bitte begründen, weshalb die Pkw-Nutzung erforderlich ist." : "Bitte den abweichenden Ansatz begründen.";
  else if (method !== "none" && (!Number.isFinite(input.reimbursement ?? 0) || (input.reimbursement ?? 0) < 0)) validationMessage = "Bitte einen gültigen Erstattungsbetrag angeben.";

  const grossCents = method === "none" || validationMessage ? 0
    : method === "car" ? fullKilometers * toCents(law.travelCosts.carMonthlyRatePerKm)
      : toCents(input.monthlyAmount);
  // Bereits im Einkommen enthaltene Erstattungen dürfen den Abzug nicht nochmals mindern.
  const reimbursementCents = method === "none" || validationMessage || input.reimbursementIncludedInIncome ? 0 : Math.max(0, toCents(input.reimbursement));
  return {
    method,
    label: labels[method] ?? "Unbekannte Methode",
    fullKilometers: Math.max(0, fullKilometers),
    grossAmount: fromCents(grossCents),
    reimbursementDeducted: fromCents(Math.min(grossCents, reimbursementCents)),
    reimbursementExcess: fromCents(Math.max(0, reimbursementCents - grossCents)),
    deduction: fromCents(Math.max(0, grossCents - reimbursementCents)),
    incomplete: Boolean(validationMessage),
    validationMessage,
  };
}

/**
 * Vollständige PKH/VKH-Ratenberechnung. Geldbeträge werden beim Eintritt in
 * die Funktion in Cent umgewandelt und erst für die Ausgabe zurückkonvertiert.
 */
export function calculatePkh(input, law = LEGAL_DATA) {
  const allowances = law.allowanceSets[input.location] ?? law.allowanceSets.bund;
  const netIncomeCents = toCents(input.netIncome);
  const otherIncomeCents = toCents(input.otherIncome);
  const incomeItems = input.incomeItems ?? [];
  const partyIncome = incomeSummary(incomeItems, "party", input.annualPayments ?? 0);
  const annualMonthlyCents = Math.round(toCents(input.annualPayments) / 12);
  const mandatoryDeductionsCents = toCents(input.mandatoryDeductions);
  const grossMonthlyIncomeCents = assertSafeCents(netIncomeCents + otherIncomeCents + toCents(partyIncome.totalMonthlyAmount));
  const incomeAfterMandatoryCents = Math.max(0, grossMonthlyIncomeCents - mandatoryDeductionsCents);

  const employment = employmentAllowance(input, allowances.employed, fromCents(incomeAfterMandatoryCents));
  const employmentAllowanceCents = toCents(employment.amount);
  const partyAllowanceCents = toCents(allowances.party);
  const spouseIncome = fromCents(toCents(input.spouseIncome) + toCents(incomeForRecipient(incomeItems, "spouse")));
  const spouseAvailable = input.spouseIncomeAlreadyAdjusted ? spouseIncome : Math.max(0, spouseIncome - fromCents(toCents(input.spouseIncomeDeductions)));
  const spouseEmployment = employmentAllowance({ ...input.spouseEmployment, employed: input.spouse && input.spouseEmployed,
    incomeAlreadyAdjusted: input.spouseIncomeAlreadyAdjusted }, allowances.employed, spouseAvailable, { relative: true });
  const spouseAllowanceCents = input.spouse ? Math.max(0, toCents(allowances.party) - Math.max(0,
    toCents(spouseAvailable) - toCents(spouseEmployment.amount))) : 0;
  const dependentResults = input.dependents.map((person) => dependentDetails({ ...person,
    ownIncome: fromCents(toCents(person.ownIncome) + toCents(incomeForRecipient(incomeItems, `dependent-${person.id}`))) }, allowances));
  const dependentAllowanceCents = dependentResults.reduce((sum, person) => assertSafeCents(sum + toCents(person.amount)), 0);
  const dependentValidationMessage = dependentResults.find((person) => person.incomplete)?.message ?? "";
  const employmentValidationMessage = employment.message || (input.spouse ? spouseEmployment.message : "");

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
  const travelCosts = calculateTravelCosts(input.travel, law);
  const customDeductionTotalCents = input.customDeductions.reduce((sum, item) => assertSafeCents(sum + toCents(item.amount)), 0);
  const furtherDeductionsCents = toCents(input.insuranceAndWork)
    + toCents(travelCosts.deduction)
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
  const endingAmounts = new Map();
  const approvalMonth = input.approvalDate?.slice(0, 7);
  const invalidBurdenEndInput = Boolean((input.specialEndDate && input.specialBurdens > 0 && !nextMonth(input.specialEndDate))
    || input.customDeductions.some((item) => item.endMonth && item.amount > 0 && !nextMonth(item.endMonth)));
  const expiredBurdenInput = Boolean(approvalMonth && (
    (input.specialEndDate && input.specialBurdens > 0 && input.specialEndDate < approvalMonth)
    || input.customDeductions.some((item) => item.endMonth && item.amount > 0 && item.endMonth < approvalMonth)
  ));
  if (nextMonth(input.specialEndDate ?? "") && input.specialBurdens > 0) endingAmounts.set(input.specialEndDate, toCents(input.specialBurdens));
  for (const item of input.customDeductions) {
    if (nextMonth(item.endMonth ?? "") && item.amount > 0) endingAmounts.set(item.endMonth, assertSafeCents((endingAmounts.get(item.endMonth) ?? 0) + toCents(item.amount)));
  }
  let endedCents = 0;
  const proposedFutureRates = [...endingAmounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([endMonth, amountCents]) => {
    endedCents = assertSafeCents(endedCents + amountCents);
    return { from: nextMonth(endMonth), monthlyRate: calculateMonthlyRateFromCents(disposableIncomeCents + endedCents, law.monthlyRate) };
  });
  const forecastLimit = approvalMonth && /^\d{4}-(?:0[1-9]|1[0-2])$/.test(approvalMonth)
    ? `${String(Number(approvalMonth.slice(0, 4)) + 4).padStart(4, "0")}-${approvalMonth.slice(5)}` : null;
  const futurePlanNeedsReview = Boolean(forecastLimit && proposedFutureRates.some((step) => step.from > forecastLimit));
  const futurePlanMessage = futurePlanNeedsReview
    ? "Keine belastbare Staffelprognose: Ein Belastungsende liegt außerhalb von vier Jahren ab Bewilligung (§ 120 Abs. 1 ZPO). Die heutige Monatsrate bleibt berechnet; Folgeraten, Kostendeckung und Obergrenze sind offen. Eine spätere Nachprüfung nach § 120a ZPO ist gesondert zu prüfen." : "";
  const futureRates = futurePlanNeedsReview ? [] : proposedFutureRates;
  const paymentPlan = calculatePaymentPlan({ monthlyRate, futureRates, approvalDate: input.approvalDate,
    paymentStartMonth: input.paymentStartMonth, remainingCostsCents, maximumInstallments: law.monthlyRate.maximumInstallments });

  return {
    grossMonthlyIncome: fromCents(grossMonthlyIncomeCents),
    annualMonthlyAmount: fromCents(annualMonthlyCents),
    incomeAfterMandatory: fromCents(incomeAfterMandatoryCents),
    employmentAllowance: fromCents(employmentAllowanceCents),
    employment, spouseEmployment, dependentResults, partyIncome,
    dependentInputIncomplete: Boolean(dependentValidationMessage), dependentValidationMessage,
    employmentInputIncomplete: Boolean(employmentValidationMessage), employmentValidationMessage,
    futurePlanNeedsReview, futurePlanMessage, forecastLimit,
    partyAllowance: fromCents(partyAllowanceCents),
    spouseAllowance: fromCents(spouseAllowanceCents),
    dependentAllowance: fromCents(dependentAllowanceCents),
    totalAllowances: fromCents(totalAllowancesCents),
    housingShare: fromCents(housingShareCents),
    housingIncomplete,
    travelCosts,
    expiredBurdenInput,
    invalidBurdenEndInput,
    customDeductionTotal: fromCents(customDeductionTotalCents),
    furtherDeductions: fromCents(furtherDeductionsCents),
    disposableIncome: fromCents(disposableIncomeCents),
    monthlyRate,
    assetContribution,
    estimatedCosts,
    fourRateThreshold,
    costExclusion,
    ...paymentPlan,
    ...(futurePlanNeedsReview ? { maximumContribution: null, installmentsToCoverCosts: null, costsCoveredWithinCap: null } : {}),
    futureRate: futureRates[0]?.monthlyRate ?? null,
    futureRateFrom: futureRates[0]?.from ?? null,
    futureRates,
  };
}

export function nextMonth(date) {
  if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(date) || date >= "9999-12") return null;
  const [year, month] = date.split("-").map(Number);
  return `${year + (month === 12 ? 1 : 0)}-${String(month === 12 ? 1 : month + 1).padStart(2, "0")}`;
}
