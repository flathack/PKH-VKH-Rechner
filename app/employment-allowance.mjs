import { amountToCents } from './amounts.mjs';

export const EMPLOYMENT_SOURCES = {
  full: 'OVG Sachsen, 28.11.2019 – 5 A 1187/17',
  limited: 'OLG Bamberg, 13.10.2025 – 2 UF 107/25 e',
};

/** Explicit legal assumption; a capped amount is never inferred from pooled income. */
export function employmentAllowance(input, standard, availableIncome, { relative = false } = {}) {
  const mode = input.employmentMode ?? 'full';
  if (!input.employed || input.incomeAlreadyAdjusted) return { amount: 0, incomplete: false, message: '', description: 'kein weiterer Ansatz' };
  let amount = standard;
  let message = '';
  let description = `voller Freibetrag; ${EMPLOYMENT_SOURCES.full}`;
  if (mode === 'limited') {
    if (input.earnedIncome == null) message = 'Bitte das bereinigte Erwerbseinkommen für den begrenzten Freibetrag angeben.';
    else {
      const earned = amountToCents(input.earnedIncome);
      if (earned < 0 || earned > amountToCents(availableIncome)) message = 'Das bereinigte Erwerbseinkommen muss zwischen null und dem verfügbaren eigenen Einkommen liegen.';
      amount = Math.min(standard, Math.max(0, earned / 100));
    }
    description = `begrenzt auf bereinigtes Erwerbseinkommen ${input.earnedIncome ?? 'nicht angegeben'} Euro; ${EMPLOYMENT_SOURCES.limited}`;
    if (relative && !input.employmentNote?.trim()) message ||= 'Bitte die Anwendung der begrenzten Bereinigung bei dieser unterhaltenen Person im Prüfvermerk begründen.';
  } else if (mode === 'reviewed') {
    if (input.reviewedEmploymentAllowance == null) message = 'Bitte den geprüften Erwerbstätigenfreibetrag angeben.';
    else {
      amount = amountToCents(input.reviewedEmploymentAllowance) / 100;
      if (amount < 0 || amount > standard) message = 'Der geprüfte Erwerbstätigenfreibetrag muss zwischen null und dem örtlichen Freibetrag liegen.';
    }
    if (!input.employmentNote?.trim()) message ||= 'Bitte den geprüften Erwerbstätigenfreibetrag begründen.';
    description = 'abweichender fachlich geprüfter Betrag';
  } else if (mode !== 'full') message = 'Bitte eine gültige Berechnungsannahme zum Erwerbstätigenfreibetrag wählen.';
  if (input.employmentNote?.trim()) description += `; Prüfvermerk: ${input.employmentNote.trim()}`;
  return { amount: message ? 0 : amount, incomplete: Boolean(message), message, description };
}
