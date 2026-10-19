"use client";

import AmountInput from "./amount-input";
import { EMPLOYMENT_SOURCES } from "./employment-allowance.mjs";

export type EmploymentFieldsValue = {
  employmentMode: "full" | "limited" | "reviewed";
  earnedIncome: number | null;
  reviewedEmploymentAllowance: number | null;
  employmentNote: string;
};
export const emptyEmployment: EmploymentFieldsValue = { employmentMode: "full", earnedIncome: null, reviewedEmploymentAllowance: null, employmentNote: "" };

export default function EmploymentFields({ prefix, value, standard, onChange, relative = false }: {
  prefix: string; value: EmploymentFieldsValue; standard: number;
  onChange: (patch: Partial<EmploymentFieldsValue>) => void; relative?: boolean;
}) {
  return <div className="employment-fields span-2">
    <label className="field span-2" htmlFor={`${prefix}-employment-mode`}><span className="field-label">Ansatz des Erwerbstätigenfreibetrags</span>
      <select id={`${prefix}-employment-mode`} value={value.employmentMode} onChange={(event) => onChange({ employmentMode: event.target.value as EmploymentFieldsValue["employmentMode"] })}>
        <option value="full">Voller örtlicher Freibetrag</option><option value="limited">Auf bereinigtes Erwerbseinkommen begrenzen</option><option value="reviewed">Abweichenden geprüften Betrag verwenden</option>
      </select>
      <small>Bei geringem Verdienst und weiteren Einkünften ist die Rechtsprechung uneinheitlich. Der gewählte Ansatz wird im Ausdruck dokumentiert.</small>
    </label>
    {value.employmentMode === "limited" ? <AmountInput id={`${prefix}-earned-income`} label="Bereinigtes monatliches Erwerbseinkommen" value={value.earnedIncome} optional onChange={(earnedIncome) => onChange({ earnedIncome })} hint="Nur den Erwerbsanteil nach den zugehörigen Pflicht- und Erwerbskosten erfassen, ohne Rente oder andere Einkünfte. Diese Angabe steuert die Begrenzung und wird nicht nochmals als Einkommen addiert." /> : null}
    {value.employmentMode === "reviewed" ? <AmountInput id={`${prefix}-reviewed-allowance`} label="Geprüfter Erwerbstätigenfreibetrag" value={value.reviewedEmploymentAllowance} max={standard} optional onChange={(reviewedEmploymentAllowance) => onChange({ reviewedEmploymentAllowance })} hint={`Höchstens ${standard} Euro; Begründung erforderlich.`} /> : null}
    <label className="field" htmlFor={`${prefix}-employment-note`}><span className="field-label">Prüfvermerk zum Erwerbstätigenfreibetrag</span><input id={`${prefix}-employment-note`} value={value.employmentNote} onChange={(event) => onChange({ employmentNote: event.target.value })} /><small>{value.employmentMode === "reviewed" || (relative && value.employmentMode === "limited") ? "Pflichtangabe; die Anwendung bei unterhaltenen Personen gesondert prüfen." : "Optional; z. B. gerichtliche Vorgabe oder geprüfte Einkommensaufteilung."}</small></label>
    <p className="employment-source span-2">{value.employmentMode === "full" ? <a href="https://www.justiz.sachsen.de/ovgentschweb/folder.phtml?id=30" target="_blank" rel="noreferrer">Voller Ansatz: {EMPLOYMENT_SOURCES.full}</a> : value.employmentMode === "limited" ? <a href="https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2025-N-27030?hl=true" target="_blank" rel="noreferrer">Begrenzter Ansatz: {EMPLOYMENT_SOURCES.limited}</a> : "Der abweichende Betrag beruht auf dem eingetragenen Prüfvermerk."}</p>
  </div>;
}
