"use client";

import { useCallback, useState } from "react";
import AmountInput, { AmountValidationContext } from "./amount-input";
import { ALLOWANCE_SETS as currentAllowanceSets, LEGAL_DATA, calculateDependentDeduction, dependentDetails, calculatePkh, legalDataForDate } from "./pkh-law.mjs";
import { incomeForRecipient, incomeSummary, monthlyIncome } from "./income-items.mjs";
import { BRAND_ICON_SVG } from "./branding.mjs";
import ThemeSelector from "./theme-selector";
import CalculatorInfo from "./calculator-info";
import EmploymentFields, { emptyEmployment, type EmploymentFieldsValue } from "./employment-fields";

type LocationKey = "bund" | "ffb" | "muenchen" | "landkreisMuenchen";
type DependentKind = "adult" | "adultEmployed" | "teen" | "teenEmployed" | "child" | "youngChild";

type Dependent = EmploymentFieldsValue & {
  id: number;
  kind: DependentKind;
  ownIncome: number;
  ownIncomeDeductions: number;
  incomeAlreadyAdjusted: boolean;
  deductionMode: "allowance" | "maintenance" | "shared";
  sharedCareAllowance: number | null;
  sharedCareNote: string;
  maintenancePayment: number;
};

type CustomDeduction = {
  id: number;
  description: string;
  amount: number;
  endMonth: string;
  evidence: string;
};

type IncomeItem = {
  id: number;
  description: string;
  amount: number;
  period: "monthly" | "annual";
  recipient: string;
  evidence: string;
};

type TravelInput = {
  method: "none" | "car" | "public" | "manual";
  distanceKm: number | null;
  monthlyAmount: number | null;
  reimbursement: number;
  reimbursementIncludedInIncome: boolean;
  reason: string;
  evidence: string;
};
const emptyTravel: TravelInput = { method: "none", distanceKm: null, monthlyAmount: null, reimbursement: 0, reimbursementIncludedInIncome: false, reason: "", evidence: "" };

const dependentLabels: Record<DependentKind, string> = {
  adult: "Erwachsene Person (ab 18 Jahre)",
  adultEmployed: "Erwachsene Person (ab 18 Jahre und erwerbstätig)",
  teen: "Jugendliche Person (14–17 Jahre)",
  teenEmployed: "Jugendliche Person (14–17 Jahre und erwerbstätig)",
  child: "Kind (6–13 Jahre)",
  youngChild: "Kind (0–5 Jahre)",
};

const euro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const compactEuro = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function baseDependentAllowance(kind: DependentKind, allowances: typeof currentAllowanceSets.bund) {
  return allowances[kind === "adultEmployed" ? "adult" : kind === "teenEmployed" ? "teen" : kind];
}

const todayIso = () => new Date().toLocaleDateString("sv-SE");
const formatIsoDate = (date: string) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date.slice(8, 10)}.${date.slice(5, 7)}.${date.slice(0, 4)}` : "—";
const housingLabels = { full: "voller Ansatz", income: "Aufteilung nach Einkommen", heads: "Aufteilung nach Köpfen", manual: "begründeter Anteil" } as const;
const evidenceFields = {
  netIncome: "Nettoeinkommen",
  otherIncome: "Sonstige Einnahmen",
  annualPayments: "Sonderzahlungen",
  mandatoryDeductions: "Pflichtabzüge",
  warmRent: "Unterkunft und Heizung",
  insuranceAndWork: "Versicherung und sonstige Erwerbskosten",
  additionalMaintenance: "Weiterer Unterhalt",
  additionalNeeds: "Mehrbedarfe",
  specialBurdens: "Besondere Belastungen",
} as const;
type EvidenceKey = keyof typeof evidenceFields;
let nextEntryId = 1;

function OptionalMoneyInput(props: { id: string; label: string; value: number | null; onChange: (value: number | null) => void; hint?: string }) {
  return <AmountInput key={props.id} {...props} optional />;
}

function MoneyInput(props: { id: string; label: string; value: number; onChange: (value: number) => void; hint?: string }) {
  return <AmountInput key={props.id} {...props} onChange={(value) => props.onChange(value ?? 0)} />;
}

function SectionHeader({ number, title, subtitle }: { number: string; title: string; subtitle: string }) {
  return (
    <div className="section-heading">
      <span className="section-number">{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

export default function Home() {
  const [approvalDate, setApprovalDate] = useState(todayIso);
  const law = legalDataForDate(approvalDate);
  const allowanceSets = law?.allowanceSets ?? currentAllowanceSets;
  const calculationYear = law?.calculationYear ?? LEGAL_DATA.calculationYear;
  const legalBasis = law?.legalBasis ?? LEGAL_DATA.legalBasis;
  const sources = law?.sources ?? LEGAL_DATA.sources;
  const monthlyRate = law?.monthlyRate ?? LEGAL_DATA.monthlyRate;
  const [location, setLocation] = useState<LocationKey>("bund");
  const [netIncome, setNetIncome] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [annualPayments, setAnnualPayments] = useState(0);
  const [mandatoryDeductions, setMandatoryDeductions] = useState(0);
  const [employed, setEmployed] = useState(false);
  const [employment, setEmployment] = useState<EmploymentFieldsValue>(emptyEmployment);
  const [spouseEmployment, setSpouseEmployment] = useState<EmploymentFieldsValue>(emptyEmployment);
  const [spouse, setSpouse] = useState(false);
  const [spouseEmployed, setSpouseEmployed] = useState(false);
  const [spouseIncome, setSpouseIncome] = useState(0);
  const [spouseIncomeDeductions, setSpouseIncomeDeductions] = useState(0);
  const [spouseIncomeAlreadyAdjusted, setSpouseIncomeAlreadyAdjusted] = useState(false);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [incomeItems, setIncomeItems] = useState<IncomeItem[]>([]);
  const [warmRent, setWarmRent] = useState(0);
  const [housingMode, setHousingMode] = useState<"full" | "income" | "heads" | "manual">("full");
  const [otherHouseholdIncome, setOtherHouseholdIncome] = useState<number | null>(null);
  const [manualHousingShare, setManualHousingShare] = useState<number | null>(null);
  const [housingReason, setHousingReason] = useState("");
  const [housingAppropriate, setHousingAppropriate] = useState(false);
  const [householdPeople, setHouseholdPeople] = useState(2);
  const [insuranceAndWork, setInsuranceAndWork] = useState(0);
  const [travel, setTravel] = useState<TravelInput>(emptyTravel);
  const updateTravel = (patch: Partial<TravelInput>) => setTravel((current) => ({ ...current, ...patch }));
  const [additionalMaintenance, setAdditionalMaintenance] = useState(0);
  const [additionalNeeds, setAdditionalNeeds] = useState(0);
  const [specialBurdens, setSpecialBurdens] = useState(0);
  const [specialEndDate, setSpecialEndDate] = useState("");
  const [assetContribution, setAssetContribution] = useState<number | null>(null);
  const [estimatedCosts, setEstimatedCosts] = useState<number | null>(null);
  const [assessmentNote, setAssessmentNote] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState<Record<EvidenceKey, string>>({ netIncome: "", otherIncome: "", annualPayments: "", mandatoryDeductions: "", warmRent: "", insuranceAndWork: "", additionalMaintenance: "", additionalNeeds: "", specialBurdens: "" });
  const [customDeductions, setCustomDeductions] = useState<CustomDeduction[]>([]);
  const [caseNumber, setCaseNumber] = useState("");
  const [paymentStartMonth, setPaymentStartMonth] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formRevision, setFormRevision] = useState(0);
  const reportFieldError = useCallback((id: string, error: string) => {
    setFieldErrors((current) => {
      if ((current[id] ?? "") === error) return current;
      const next = { ...current };
      if (error) next[id] = error; else delete next[id];
      return next;
    });
  }, []);

  const assignedIncome = (recipient: string) => incomeForRecipient(incomeItems, recipient);
  const effectiveDependents = dependents.map((person) => ({ ...person, ownIncome: person.ownIncome + assignedIncome(`dependent-${person.id}`) }));
  const calculation = calculatePkh({
    location,
    netIncome,
    otherIncome,
    incomeItems,
    ...employment,
    spouseEmployment,
    annualPayments,
    mandatoryDeductions,
    employed,
    spouse,
    spouseEmployed,
    spouseIncome,
    spouseIncomeDeductions,
    spouseIncomeAlreadyAdjusted,
    dependents,
    warmRent,
    housingMode,
    otherHouseholdIncome,
    manualHousingShare,
    householdPeople,
    insuranceAndWork,
    travel,
    additionalMaintenance,
    additionalNeeds,
    specialBurdens,
    specialEndDate,
    approvalDate,
    paymentStartMonth,
    assetContribution,
    estimatedCosts,
    customDeductions,
  }, law ?? LEGAL_DATA);
  const validationMessage = Object.values(fieldErrors)[0] || calculation.dependentValidationMessage || calculation.employmentValidationMessage || (!law ? "Für dieses Bewilligungsdatum ist kein geprüfter Rechtsstand hinterlegt."
    : calculation.invalidBurdenEndInput ? "Bitte einen gültigen letzten Monat für die befristeten Belastungen wählen."
      : calculation.expiredBurdenInput ? "Eine befristete Belastung endet vor dem Bewilligungsmonat."
      : calculation.housingIncomplete ? "Für die gewählte Wohnkostenaufteilung fehlt eine Angabe."
        : calculation.paymentPlanIncomplete ? "Bitte einen gültigen Ratenbeginn ab dem Bewilligungsmonat wählen."
          : calculation.travelCosts.validationMessage);
  const incomplete = Boolean(validationMessage);
  const travelDescription = travel.method === "car"
    ? `Pkw-Pauschale: ${calculation.travelCosts.fullKilometers} volle einfache Entfernungskilometer × ${euro.format((law ?? LEGAL_DATA).travelCosts.carMonthlyRatePerKm)} monatlich`
    : `${calculation.travelCosts.label}: ${euro.format(calculation.travelCosts.grossAmount)} monatlich`;

  const addDependent = () => {
    setDependents((current) => [...current, {
      ...emptyEmployment,
      sharedCareAllowance: null, sharedCareNote: "",
      id: nextEntryId++,
      kind: "youngChild",
      ownIncome: 0,
      ownIncomeDeductions: 0,
      incomeAlreadyAdjusted: false,
      deductionMode: "allowance",
      maintenancePayment: 0,
    }]);
  };

  const updateDependent = (id: number, patch: Partial<Dependent>) => {
    setDependents((current) => current.map((person) => (person.id === id ? { ...person, ...patch } : person)));
  };

  const addCustomDeduction = () => {
    setCustomDeductions((current) => [...current, { id: nextEntryId++, description: "", amount: 0, endMonth: "", evidence: "" }]);
  };

  const updateCustomDeduction = (id: number, patch: Partial<CustomDeduction>) => {
    setCustomDeductions((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const reset = () => {
    setApprovalDate(todayIso());
    setLocation("bund");
    setNetIncome(0);
    setOtherIncome(0);
    setAnnualPayments(0);
    setMandatoryDeductions(0);
    setEmployed(false);
    setEmployment(emptyEmployment);
    setSpouseEmployment(emptyEmployment);
    setSpouse(false);
    setSpouseEmployed(false);
    setSpouseIncome(0);
    setSpouseIncomeDeductions(0);
    setSpouseIncomeAlreadyAdjusted(false);
    setDependents([]);
    setIncomeItems([]);
    setWarmRent(0);
    setHousingMode("full");
    setOtherHouseholdIncome(null);
    setManualHousingShare(null);
    setHousingReason("");
    setHousingAppropriate(false);
    setHouseholdPeople(2);
    setInsuranceAndWork(0);
    setTravel(emptyTravel);
    setAdditionalMaintenance(0);
    setAdditionalNeeds(0);
    setSpecialBurdens(0);
    setSpecialEndDate("");
    setAssetContribution(null);
    setEstimatedCosts(null);
    setAssessmentNote("");
    setEvidenceNotes({ netIncome: "", otherIncome: "", annualPayments: "", mandatoryDeductions: "", warmRent: "", insuranceAndWork: "", additionalMaintenance: "", additionalNeeds: "", specialBurdens: "" });
    setCustomDeductions([]);
    setCaseNumber("");
    setPaymentStartMonth("");
    setFieldErrors({});
    setFormRevision((current) => current + 1);
  };

  const annualSummaries = ["party", ...(spouse ? ["spouse"] : []), ...dependents.map((person) => `dependent-${person.id}`)].map((recipient) => ({
    recipient, label: recipient === "party" ? "Partei" : recipient === "spouse" ? "Partnerperson" : `Person ${dependents.findIndex((person) => recipient === `dependent-${person.id}`) + 1}`,
    ...incomeSummary(incomeItems, recipient, recipient === "party" ? annualPayments : 0),
  })).filter((summary) => summary.annualAmount > 0);

  const printDate = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <AmountValidationContext.Provider value={reportFieldError}><main>
      <a className="skip-link" href="#einkommen">Direkt zum Rechner</a>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PKH VKH Ratenrechner – Start">
          <span className="brand-mark" aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAND_ICON_SVG }} />
          <span>
            <strong>PKH · VKH</strong>
            <small>Ratenrechner</small>
          </span>
        </a>
        <div className="topbar-actions"><div className="privacy-badge"><span /> Lokal &amp; datensparsam</div><ThemeSelector /></div>
      </header>

      <section className="hero" id="top">
        <div>
          <span className="eyebrow">Berechnungsjahr {calculationYear}</span>
          <h1>{law ? `PKH- und VKH-Rechner ${calculationYear}` : "PKH- und VKH-Rechner"}</h1>
          <p>
            Monatsrate für Prozess- und Verfahrenskostenhilfe nach § 115 ZPO überschlägig berechnen.
            Alle Angaben bleiben auf diesem Gerät.
          </p>
        </div>
        <div className="hero-law">
          <span>Rechtsgrundlage</span>
          <strong>§ 115 ZPO</strong>
          <small>{legalBasis.shortName} · {legalBasis.citation}</small>
        </div>
      </section>

      <nav className="section-nav" aria-label="Berechnungsabschnitte">
        <a href="#einkommen">Einkommen</a><a href="#unterhalt">Unterhalt</a><a href="#wohnen">Wohnen</a><a href="#fahrtkosten">Fahrtkosten</a><a href="#abzuege">Abzüge</a><a href="#ergebnis">Ergebnis</a>
      </nav>

      <article className={`print-document${incomplete ? " incomplete-document" : ""}`} aria-label="Druckfassung der PKH- und VKH-Ratenberechnung">
        <header className="document-header">
          <div className="document-wordmark">
            <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: BRAND_ICON_SVG }} />
            <div><strong>PKH · VKH</strong><small>Ratenberechnung</small></div>
          </div>
          <dl className="document-meta">
            <div><dt>Aktenzeichen</dt><dd>{caseNumber || "—"}</dd></div>
            <div><dt>Berechnungsdatum</dt><dd>{printDate}</dd></div>
            <div><dt>Bewilligungsdatum</dt><dd>{formatIsoDate(approvalDate)}</dd></div>
            <div><dt>Rechenstand</dt><dd>{law ? `${legalBasis.shortName}, ${legalBasis.citation}` : "Nicht verfügbar"}</dd></div>
          </dl>
        </header>

        <div className="document-title">
          <p>Berechnungsvermerk</p>
          <h1>Monatsrate bei Prozess- und Verfahrenskostenhilfe</h1>
          <span>Berechnung des einzusetzenden Einkommens gemäß § 115 ZPO</span>
        </div>

        {incomplete ? <p className="invalid-print-warning"><strong>Berechnung unvollständig – keine verwendbare Ratenberechnung.</strong><br />{validationMessage}</p> : null}
        <section className="document-section">
          <h2>1. Monatliche Einkünfte</h2>
          <table>
            <tbody>
              <tr><th>Nettoeinkommen{evidenceNotes.netIncome ? ` – Beleg: ${evidenceNotes.netIncome}` : ""}</th><td>{euro.format(netIncome)}</td></tr>
              <tr><th>Sonstige monatliche Einnahmen (Sammelbetrag){evidenceNotes.otherIncome ? ` – Beleg: ${evidenceNotes.otherIncome}` : ""}</th><td>{euro.format(otherIncome)}</td></tr>
              {incomeItems.filter((item) => item.recipient === "party").map((item) => <tr key={item.id}><th>{item.description || "Weitere Einnahme"} (Partei, {item.period === "annual" ? `Jahresbetrag ${euro.format(item.amount)} / 12, monatlich gerundet` : "monatlich"}){item.evidence ? ` – Beleg: ${item.evidence}` : ""}</th><td>{euro.format(monthlyIncome(item))}</td></tr>)}
              <tr><th>Jährliche Sonderzahlungen {euro.format(annualPayments)} / 12, monatlicher Anteil (gerundet){evidenceNotes.annualPayments ? ` – Beleg: ${evidenceNotes.annualPayments}` : ""}</th><td>{euro.format(calculation.annualMonthlyAmount)}</td></tr>
              {annualSummaries.filter((summary) => summary.recipient === "party" && summary.roundingAdjustment !== 0).map((summary) => <tr key={summary.recipient}><th>Rundungsausgleich: Jahresbeträge gemeinsam durch 12 geteilt, erst danach auf Cent gerundet</th><td>{euro.format(summary.roundingAdjustment)}</td></tr>)}
              <tr className="document-subtotal"><th>Summe der monatlichen Einkünfte</th><td>{euro.format(calculation.grossMonthlyIncome)}</td></tr>
            </tbody>
          </table>
        </section>

        {annualSummaries.map((summary) => <p className="document-context" key={summary.recipient}>Jahresumrechnung {summary.label}: Jahressumme {euro.format(summary.annualAmount)} / 12 = {euro.format(summary.annualMonthlyAmount)} monatlich, gemeinsam auf Cent gerundet. Einzeln angezeigte Monatsanteile sind gerundete Anzeigewerte{summary.roundingAdjustment !== 0 ? `; Rundungsausgleich ${euro.format(summary.roundingAdjustment)}` : ""}.</p>)}
        <section className="document-section">
          <h2>2. Abzüge und Freibeträge</h2>
          <p className="document-context">Wohnsitz: {allowanceSets[location].label}</p>
          <table>
            <tbody>
              <tr><th>Steuern und Sozialversicherungsbeiträge (§ 82 Abs. 2 Nr. 1–2 SGB XII){evidenceNotes.mandatoryDeductions ? ` – Beleg: ${evidenceNotes.mandatoryDeductions}` : ""}</th><td>− {euro.format(mandatoryDeductions)}</td></tr>
              <tr><th>Erwerbstätigenfreibetrag{employed ? ` (${calculation.employment.description})` : ""}</th><td>− {euro.format(calculation.employmentAllowance)}</td></tr>
              <tr><th>Freibetrag der Partei</th><td>− {euro.format(calculation.partyAllowance)}</td></tr>
              {spouse ? <tr><th>Freibetrag der Ehe-/Lebenspartnerperson: Ausgangsbetrag {euro.format(allowanceSets[location].party)}, Einkommen {euro.format(spouseIncome + assignedIncome("spouse"))}, eigene Abzüge {spouseIncomeAlreadyAdjusted ? "bereits berücksichtigt" : euro.format(spouseIncomeDeductions)}, Erwerbstätigenfreibetrag {spouseEmployed && !spouseIncomeAlreadyAdjusted ? `${euro.format(calculation.spouseEmployment.amount)} (${calculation.spouseEmployment.description})` : "kein weiterer Ansatz"}, anrechenbar {euro.format(Math.max(0, allowanceSets[location].party - calculation.spouseAllowance))}</th><td>− {euro.format(calculation.spouseAllowance)}</td></tr> : null}
              {incomeItems.filter((item) => item.recipient !== "party").map((item) => <tr key={item.id}><th>Bei {item.recipient === "spouse" ? "Partnerperson" : `Person ${dependents.findIndex((person) => item.recipient === `dependent-${person.id}`) + 1}`} {dependents.some((person) => item.recipient === `dependent-${person.id}` && person.deductionMode === "maintenance") ? "erfasst, bei Unterhaltszahlung nicht verrechnet" : "angerechnet"}: {item.description || "Einnahme"} ({item.period === "annual" ? `Jahresbetrag ${euro.format(item.amount)} / 12, monatlich gerundet` : "monatlich"}){item.evidence ? ` – Beleg: ${item.evidence}` : ""}</th><td>{euro.format(monthlyIncome(item))}</td></tr>)}
              {effectiveDependents.map((person, index) => (
                <tr key={person.id}>
                  <th>{person.deductionMode === "shared" ? "Wechselmodell" : person.deductionMode === "maintenance" ? "Unterhaltszahlung" : "Freibetrag"} für unterhaltene Person {index + 1}: {dependentLabels[person.kind]}{person.deductionMode === "allowance" ? `, eigenes Einkommen ${euro.format(person.ownIncome)}, weitere Abzüge ${person.incomeAlreadyAdjusted ? "bereits berücksichtigt" : euro.format(person.ownIncomeDeductions)}, Erwerbstätigenfreibetrag ${(person.kind === "adultEmployed" || person.kind === "teenEmployed") && !person.incomeAlreadyAdjusted ? `${euro.format(calculation.dependentResults[index].employment.amount)} (${calculation.dependentResults[index].employment.description})` : "kein weiterer Ansatz"}` : person.deductionMode === "shared" ? `, hälftiger Altersfreibetrag ${euro.format(baseDependentAllowance(person.kind, allowanceSets[location]) / 2)}, eigenes Einkommen inkl. zugeordneter Einnahmen ${euro.format(person.ownIncome)}, angesetzter hälftiger Freibetrag ${euro.format(person.sharedCareAllowance ?? baseDependentAllowance(person.kind, allowanceSets[location]) / 2)}, tatsächlicher Barunterhalt ${euro.format(person.maintenancePayment)}; ${person.sharedCareNote || "ohne Kindeseinkommen; automatischer Halbansatz"}; BGH XII ZB 276/21 und XII ZB 19/21` : ""}</th>
                  <td>− {euro.format(calculateDependentDeduction(person, allowanceSets[location]))}</td>
                </tr>
              ))}
              <tr><th>Berücksichtigter Anteil der Unterkunft und Heizung ({housingLabels[housingMode]}; Gesamtkosten {euro.format(warmRent)}{housingMode === "income" ? `; Parteieinkommen nach Pflichtabzügen ${euro.format(calculation.incomeAfterMandatory)}, übriges Haushaltseinkommen ${otherHouseholdIncome == null ? "nicht angegeben" : euro.format(otherHouseholdIncome)}` : housingMode === "heads" ? `; ${householdPeople} Personen` : housingMode === "manual" ? `; eingegebener Anteil ${manualHousingShare == null ? "nicht angegeben" : euro.format(manualHousingShare)}, höchstens Gesamtkosten` : ""}; {housingReason || "ohne Begründung"}){evidenceNotes.warmRent ? ` – Beleg: ${evidenceNotes.warmRent}` : ""}</th><td>− {euro.format(calculation.housingShare)}</td></tr>
              <tr><th>Versicherungen und sonstige notwendige Erwerbskosten{evidenceNotes.insuranceAndWork ? ` – Beleg: ${evidenceNotes.insuranceAndWork}` : ""}</th><td>− {euro.format(insuranceAndWork)}</td></tr>
              {travel.method !== "none" ? <tr data-testid="print-travel"><th>Fahrtkosten zur Arbeit: {travelDescription}. {travel.method !== "public" && travel.reason ? `Begründung: ${travel.reason}. ` : ""}{travel.reimbursement > 0 ? `Erstattung ${euro.format(travel.reimbursement)}; ${travel.reimbursementIncludedInIncome ? "bereits im Einkommen enthalten, kein weiterer Abzug von den Fahrtkosten" : `vom Fahrtkostenansatz abgezogen: ${euro.format(calculation.travelCosts.reimbursementDeducted)}`}. ` : ""}{travel.evidence ? `Beleg: ${travel.evidence}. ` : ""}{travel.method === "car" ? `${sources.travelCostsRegulation.title}; ${sources.travelCostsBgh.title}.` : ""}</th><td>{calculation.travelCosts.incomplete ? "Angaben fehlen" : `− ${euro.format(calculation.travelCosts.deduction)}`}</td></tr> : null}
              <tr><th>Weiterer gesetzlicher Unterhalt / Sonderfälle{evidenceNotes.additionalMaintenance ? ` – Beleg: ${evidenceNotes.additionalMaintenance}` : ""}</th><td>− {euro.format(additionalMaintenance)}</td></tr>
              <tr><th>Anerkannte Mehrbedarfe{evidenceNotes.additionalNeeds ? ` – Beleg: ${evidenceNotes.additionalNeeds}` : ""}</th><td>− {euro.format(additionalNeeds)}</td></tr>
              <tr><th>Besondere Belastungen{specialEndDate ? ` bis ${specialEndDate}` : ""}{evidenceNotes.specialBurdens ? ` – Beleg: ${evidenceNotes.specialBurdens}` : ""}</th><td>− {euro.format(specialBurdens)}</td></tr>
              {customDeductions.map((item, index) => (
                <tr key={item.id}><th>{item.description.trim() || `Weiterer individueller Abzug ${index + 1}`}{item.endMonth ? ` bis ${item.endMonth}` : ""}{item.evidence ? ` – Beleg: ${item.evidence}` : ""}</th><td>− {euro.format(item.amount)}</td></tr>
              ))}
              <tr className="document-subtotal"><th>Summe sämtlicher Abzüge</th><td>− {euro.format(mandatoryDeductions + calculation.totalAllowances + calculation.housingShare + calculation.furtherDeductions)}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="document-result">
          <div>
            <span>Verbleibendes Einkommen</span>
            <strong>{euro.format(calculation.disposableIncome)}</strong>
          </div>
          <div>
            <span>Einzusetzendes Einkommen</span>
            <strong>{euro.format(Math.max(0, calculation.disposableIncome))}</strong>
          </div>
          <div className="document-rate">
            <span>Voraussichtliche Monatsrate aus Einkommen</span>
            <strong>{incomplete ? "Nicht berechenbar" : euro.format(calculation.monthlyRate)}</strong>
          </div>
        </section>

        <section className="document-section">
          <h2>3. Ergänzende Prüfung</h2>
          {calculation.travelCosts.reimbursementExcess > 0 ? <p>Fahrtkostenerstattung: Überschuss von {euro.format(calculation.travelCosts.reimbursementExcess)} über den Fahrtkostenansatz. Anrechnung als Einkommen gesondert prüfen.</p> : null}
          <p>Vermögenseinsatz: {calculation.assetContribution == null ? "nicht angegeben" : euro.format(calculation.assetContribution)} · Voraussichtliche Kosten: {calculation.estimatedCosts == null ? "nicht angegeben" : euro.format(calculation.estimatedCosts)}</p>
          <p>Vier Monatsraten zuzüglich Vermögenseinsatz: {euro.format(calculation.fourRateThreshold)}. {calculation.costExclusion == null ? "Kostenvergleich offen." : calculation.costExclusion ? "Kosten übersteigen diesen Betrag nicht; Ausschluss nach § 115 Abs. 4 ZPO prüfen." : "Kosten übersteigen diesen Betrag."}</p>
          {calculation.futurePlanNeedsReview ? <p><strong>{calculation.futurePlanMessage}</strong></p> : calculation.installmentsToCoverCosts != null ? <p>Rechnerische Kostendeckung nach {calculation.installmentsToCoverCosts} Zahlungsraten nach Vermögenseinsatz. {calculation.costsCoveredWithinCap ? `Innerhalb der Grenze von ${monthlyRate.maximumInstallments} Raten.` : `Außerhalb der Grenze von ${monthlyRate.maximumInstallments} Raten.`}</p> : calculation.estimatedCosts != null && calculation.assetContribution != null ? <p>Mit diesem Ratenplan keine Kostendeckung durch Monatsraten.</p> : null}
          <p>Planungsgrundlage: Erstbewilligung und vorweggenommene Staffel nach § 120 Abs. 1 ZPO. Nachprüfungen bestehender Bewilligungen nach § 120a ZPO einschließlich früherer Zahlungen und Verfahrensbeendigung sind gesondert zu prüfen.</p>
          <p>Ratenplanung ab {calculation.paymentPlanStartMonth ?? "Bewilligung"}{paymentStartMonth ? " (angegebener Ratenbeginn)" : " (Annahme: Bewilligungsmonat)"}. Monate ohne Zahlung verbrauchen keine Zahlungsrate. {calculation.futurePlanNeedsReview ? "Die Staffelprognose ist offen; es wird keine Kostendeckung aus ungeprüften späteren Raten ausgewiesen." : "Spätere Ratenstufen werden bei der Kostendeckung berücksichtigt."}</p>
          {calculation.futureRates.map((step) => <p key={step.from}>Nach Wegfall befristeter Belastungen ab {step.from}: voraussichtlich {euro.format(step.monthlyRate)} monatlich.</p>)}
          <p>Wohnkosten angemessen geprüft: {housingAppropriate ? "ja" : "offen"}. {assessmentNote}</p>
          {incomplete ? <p><strong>Berechnung unvollständig: {validationMessage}</strong></p> : null}
        </section>

        <section className="document-explanation">
          <h2>Berechnungshinweis</h2>
          <p>
            Bis zu einem einzusetzenden Einkommen von {euro.format(monthlyRate.incomeThreshold)} entspricht
            die Monatsrate einem Anteil von 1/{monthlyRate.incomeDivisor} des einzusetzenden Einkommens. Bei
            einem höheren Betrag werden {euro.format(monthlyRate.thresholdRate)} zuzüglich des
            {euro.format(monthlyRate.incomeThreshold)} übersteigenden Teils angesetzt. Die Rate wird auf volle
            Euro abgerundet; Beträge unter {euro.format(monthlyRate.minimumRate)} werden nicht festgesetzt. Es
            sind höchstens {monthlyRate.maximumInstallments} Monatsraten aufzubringen.
          </p>
        </section>

        <footer className="document-footer">
          <div><span>Rechnerischer Vermerk, keine gerichtliche Festsetzung · § 115 ZPO</span><span>Freibeträge: {legalBasis.shortName}, {legalBasis.citation}</span></div>
        </footer>
      </article>

      <div className="workspace" key={formRevision}>
        <div className="form-column">
          <section className="form-card" id="einkommen">
            <SectionHeader number="01" title="Einkommen" subtitle="Monatliche Einnahmen und gesetzliche Abzüge" />
            <div className="field-grid">
              <label className="field" htmlFor="approval-date"><span className="field-label">Voraussichtliches Bewilligungsdatum</span><input id="approval-date" type="date" value={approvalDate} onChange={(event) => setApprovalDate(event.target.value)} /><small>Bestimmt den maßgeblichen Freibetragsstand.</small></label>
              <div className="field"><span className="field-label">Rechtsstand</span><strong>{law ? `${legalBasis.shortName} · ${legalBasis.citation}` : "Kein geprüfter Rechtsstand verfügbar"}</strong><small>{law ? `Gültig ab ${law.effectiveFrom}${"effectiveUntil" in law ? ` bis ${law.effectiveUntil}` : ""}` : "Bitte ein unterstütztes Bewilligungsdatum wählen."}</small></div>
              <label className="field span-2" htmlFor="location">
                <span className="field-label">Wohnsitz für Freibeträge</span>
                <select id="location" value={location} onChange={(event) => setLocation(event.target.value as LocationKey)}>
                  {Object.entries(allowanceSets).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
                <small>Für München und Fürstenfeldbruck gelten regional erhöhte Beträge.</small>
              </label>
              <MoneyInput id="net-income" label="Nettoeinkommen der Partei" value={netIncome} onChange={setNetIncome} hint="Bereits im Netto abgezogene Steuern und Beiträge nicht erneut erfassen." />
              <MoneyInput id="other-income" label="Sonstige monatliche Einnahmen der Partei" value={otherIncome} onChange={setOtherIncome} hint="Nur Einnahmen der Partei; Positionen unten nicht doppelt eintragen." />
              <MoneyInput id="annual-payments" label="Jährliche Sonderzahlungen" value={annualPayments} onChange={setAnnualPayments} hint="z. B. Weihnachts- und Urlaubsgeld; wird durch 12 geteilt" />
              <MoneyInput id="mandatory" label="Steuern und Sozialversicherungsbeiträge" value={mandatoryDeductions} onChange={setMandatoryDeductions} hint="§ 82 Abs. 2 Nr. 1–2 SGB XII; nur soweit nicht im Nettobetrag berücksichtigt" />
            </div>
            <div className="subsection-title"><div><strong>Einzelne weitere Einnahmen</strong><small>Art, Empfänger und Zeitraum dokumentieren. Kindergeld und Unterhalt nur einmal der geprüften Person zuordnen.</small></div><button type="button" className="secondary-button" onClick={() => setIncomeItems((items) => [...items, { id: nextEntryId++, description: "", amount: 0, period: "monthly", recipient: "party", evidence: "" }])}>+ Einnahme</button></div>
            {incomeItems.map((item) => <div className="entry-grid" key={item.id}>
              <label className="field"><span className="field-label">Art</span><input value={item.description} placeholder="z. B. Unterhalt" onChange={(event) => setIncomeItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, description: event.target.value } : entry))} /></label>
              <MoneyInput id={`income-${item.id}`} label="Betrag" value={item.amount} onChange={(value) => setIncomeItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, amount: value } : entry))} />
              <label className="field"><span className="field-label">Zeitraum</span><select value={item.period} onChange={(event) => setIncomeItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, period: event.target.value as IncomeItem["period"] } : entry))}><option value="monthly">Monatlich</option><option value="annual">Jährlich</option></select></label>
              <label className="field"><span className="field-label">Empfänger / Anrechnung bei</span><select value={item.recipient} onChange={(event) => setIncomeItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, recipient: event.target.value } : entry))}><option value="party">Partei</option>{spouse ? <option value="spouse">Partnerperson</option> : null}{dependents.map((person, index) => <option key={person.id} value={`dependent-${person.id}`}>Unterhaltene Person {index + 1}</option>)}</select></label>
              <label className="field"><span className="field-label">Beleg</span><input value={item.evidence} onChange={(event) => setIncomeItems((items) => items.map((entry) => entry.id === item.id ? { ...entry, evidence: event.target.value } : entry))} /></label>
              <button type="button" className="icon-button" aria-label="Einnahme entfernen" onClick={() => setIncomeItems((items) => items.filter((entry) => entry.id !== item.id))}>×</button>
            </div>)}
            {(netIncome > 0 && mandatoryDeductions > 0) || (otherIncome > 0 && incomeItems.some((item) => item.recipient === "party")) ? <p className="validation-note">Bitte Doppelansätze prüfen: Abzüge können bereits im Nettobetrag enthalten sein; weitere Einnahmen können zugleich im Sammelbetrag stehen.</p> : null}
            {incomeItems.some((item) => dependents.some((person) => item.recipient === `dependent-${person.id}` && person.deductionMode === "maintenance")) ? <p className="validation-note">Einnahmen bei einer Person mit angesetzter Unterhaltszahlung werden dokumentiert, mindern diesen Ansatz aber nicht.</p> : null}
            <label className="switch-row">
              <input type="checkbox" checked={employed} onChange={(event) => setEmployed(event.target.checked)} />
              <span className="switch" aria-hidden="true" />
              <span><strong>Partei ist erwerbstätig</strong><small>Nur bei tatsächlich erzielten Erwerbseinkünften. Örtlicher Erwerbstätigenfreibetrag: {compactEuro.format(allowanceSets[location].employed)}</small></span>
            </label>
            {employed ? <EmploymentFields prefix="party" value={employment} standard={allowanceSets[location].employed} onChange={(patch) => setEmployment((current) => ({ ...current, ...patch }))} /> : null}
            {annualSummaries.filter((summary) => summary.recipient === "party").map((summary) => <p className="calculation-note" key={summary.recipient}>Jahressumme {euro.format(summary.annualAmount)} / 12 = {euro.format(summary.annualMonthlyAmount)} monatlich. Jahresbeträge werden gemeinsam auf Cent gerundet.</p>)}
          </section>

          <section className="form-card" id="unterhalt">
            <SectionHeader number="02" title="Freibeträge und Unterhalt" subtitle="Partei und gesetzlich unterhaltene Personen" />
            <div className="allowance-line allowance-highlight">
              <div><strong>Freibetrag der Partei</strong><small>{allowanceSets[location].label}</small></div>
              <b>{compactEuro.format(allowanceSets[location].party)}</b>
            </div>
            <details className="legal-details">
              <summary>Freibeträge {calculationYear} für diesen Wohnsitz</summary>
              <div className="allowance-table">
                <div><span>Erwerbstätige Partei</span><strong>{compactEuro.format(allowanceSets[location].employed)}</strong></div>
                <div><span>Partei / Ehe- oder Lebenspartner</span><strong>{compactEuro.format(allowanceSets[location].party)}</strong></div>
                <div><span>Unterhaltsberechtigte Erwachsene (ab 18 Jahre)</span><strong>{compactEuro.format(allowanceSets[location].adult)}</strong></div>
                <div><span>Jugendliche (14–17 Jahre)</span><strong>{compactEuro.format(allowanceSets[location].teen)}</strong></div>
                <div><span>Kinder (6–13 Jahre)</span><strong>{compactEuro.format(allowanceSets[location].child)}</strong></div>
                <div><span>Kinder (0–5 Jahre)</span><strong>{compactEuro.format(allowanceSets[location].youngChild)}</strong></div>
              </div>
              <p>Unterhaltsfreibeträge vermindern sich um eigenes Einkommen der unterhaltenen Person (§ 115 Abs. 1 Satz 7 ZPO).</p>
            </details>
            <label className="switch-row bordered">
              <input type="checkbox" checked={spouse} onChange={(event) => { setSpouse(event.target.checked); if (!event.target.checked) setIncomeItems((items) => items.filter((item) => item.recipient !== "spouse")); }} />
              <span className="switch" aria-hidden="true" />
              <span><strong>Ehe- oder eingetragene Lebenspartnerschaft</strong><small>Eigenes Einkommen mindert den Freibetrag.</small></span>
            </label>
            {spouse ? (
              <div className="sub-panel">
                <MoneyInput id="spouse-income" label="Eigenes monatliches Einkommen der Partnerperson" value={spouseIncome} onChange={setSpouseIncome} hint="Netto vor den nachfolgenden abzugsfähigen Positionen oder bereits bereinigt." />
                <MoneyInput id="spouse-deductions" label="Weitere Abzüge vom Einkommen der Partnerperson" value={spouseIncomeDeductions} onChange={setSpouseIncomeDeductions} />
                <label className="switch-row compact-switch"><input type="checkbox" checked={spouseIncomeAlreadyAdjusted} onChange={(event) => setSpouseIncomeAlreadyAdjusted(event.target.checked)} /><span className="switch" aria-hidden="true" /><span><strong>Einkommen bereits vollständig bereinigt</strong><small>Dann keine weiteren Abzüge und keinen Erwerbstätigenfreibetrag nochmals abziehen.</small></span></label>
                <label className="switch-row compact-switch">
                  <input type="checkbox" checked={spouseEmployed} onChange={(event) => setSpouseEmployed(event.target.checked)} />
                  <span className="switch" aria-hidden="true" />
                  <span><strong>Partnerperson ist erwerbstätig</strong><small>Bei nicht bereinigtem Einkommen um {compactEuro.format(allowanceSets[location].employed)} bereinigen.</small></span>
                </label>
                {spouseEmployed && !spouseIncomeAlreadyAdjusted ? <EmploymentFields prefix="spouse" relative value={spouseEmployment} standard={allowanceSets[location].employed} onChange={(patch) => setSpouseEmployment((current) => ({ ...current, ...patch }))} /> : null}
                <div className="sub-result"><span>Verbleibender Freibetrag</span><strong>{euro.format(calculation.spouseAllowance)}</strong></div>
              </div>
            ) : null}

            <div className="subsection-title">
              <div><strong>Kinder und weitere unterhaltene Personen</strong><small>Für jedes Kind und jede weitere Person das monatliche eigene Einkommen eintragen. Es mindert den jeweiligen Freibetrag bis auf 0 Euro.</small></div>
              <button type="button" className="secondary-button" onClick={addDependent}>+ Kind / Person</button>
            </div>
            {dependents.length === 0 ? (
              <div className="empty-state">Noch keine weiteren Personen erfasst.</div>
            ) : (
              <div className="dependents-list">
                {dependents.map((person, index) => (
                  <div className="dependent-row" key={person.id}>
                    <span className="person-index">{index + 1}</span>
                    <div className="dependent-fields"><label className="field">
                      <span className="field-label">Altersgruppe</span>
                      <select value={person.kind} onChange={(event) => updateDependent(person.id, { kind: event.target.value as DependentKind })}>
                        {Object.entries(dependentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </label>
                    <label className="field">
                      <span className="field-label">Ansatz</span>
                      <select value={person.deductionMode} onChange={(event) => updateDependent(person.id, { deductionMode: event.target.value as Dependent["deductionMode"] })}>
                        <option value="allowance">Freibetrag verwenden</option>
                        <option value="maintenance">Unterhaltszahlung verwenden</option>
                        <option value="shared">Paritätisches Wechselmodell (minderjährig)</option>
                      </select>
                    </label>
                    {person.deductionMode === "maintenance" ? (
                      <MoneyInput id={`dependent-maintenance-${person.id}`} label="Monatliche Unterhaltszahlung" value={person.maintenancePayment} onChange={(value) => updateDependent(person.id, { maintenancePayment: value })} />
                    ) : (
                      <MoneyInput id={`dependent-income-${person.id}`} label="Monatliches eigenes Einkommen" value={person.ownIncome} onChange={(value) => updateDependent(person.id, { ownIncome: value })} />
                    )}
                    {person.deductionMode === "shared" ? <>
                      <MoneyInput id={`shared-maintenance-${person.id}`} label="Tatsächlich gezahlter Barunterhalt" value={person.maintenancePayment} onChange={(value) => updateDependent(person.id, { maintenancePayment: value })} />
                      <AmountInput id={`shared-allowance-${person.id}`} label="Geprüfter hälftiger Freibetrag nach Einkommensanrechnung" value={person.sharedCareAllowance} optional max={baseDependentAllowance(person.kind, allowanceSets[location]) / 2} onChange={(value) => updateDependent(person.id, { sharedCareAllowance: value })} hint="Ohne Kindeseinkommen bleibt das Feld für den automatischen Halbansatz leer. Bei Kindergeld oder sonstigem Kindeseinkommen ist ein fachlich geprüfter Betrag erforderlich. Jeden manuellen Ansatz im Prüfvermerk begründen." />
                      <label className="field"><span className="field-label">Prüfvermerk zum Wechselmodell</span><input id={`shared-note-${person.id}`} value={person.sharedCareNote} onChange={(event) => updateDependent(person.id, { sharedCareNote: event.target.value })} /></label>
                      <p className="calculation-note span-2">Nur für tatsächlich paritätische Betreuung. Ansatz: hälftiger Altersfreibetrag plus gezahlter Barunterhalt (BGH XII ZB 276/21; XII ZB 19/21). Kindergeld und eigenes Einkommen erfordern einen geprüften Freibetrag; Wohn- und sonstige Mehrkosten werden gesondert geprüft.</p>
                    </> : null}
                    {person.deductionMode === "allowance" ? <><MoneyInput id={`dependent-deductions-${person.id}`} label="Abzüge vom eigenen Einkommen" value={person.ownIncomeDeductions} onChange={(value) => updateDependent(person.id, { ownIncomeDeductions: value })} /><label className="switch-row compact-switch"><input type="checkbox" checked={person.incomeAlreadyAdjusted} onChange={(event) => updateDependent(person.id, { incomeAlreadyAdjusted: event.target.checked })} /><span className="switch" aria-hidden="true" /><span><strong>Einkommen bereits bereinigt</strong><small>Keine weiteren Abzüge.</small></span></label></> : null}
                    {person.deductionMode === "allowance" && !person.incomeAlreadyAdjusted && (person.kind === "adultEmployed" || person.kind === "teenEmployed") ? <EmploymentFields prefix={`dependent-${person.id}`} relative value={person} standard={allowanceSets[location].employed} onChange={(patch) => updateDependent(person.id, patch)} /> : null}
                    <div className="dependent-allowance" aria-live="polite">
                      <span>{person.deductionMode === "shared" ? "Hälftiger Freibetrag + Barunterhalt" : person.deductionMode === "maintenance" ? "Unterhaltszahlung" : "Verbleibender Freibetrag"}</span>
                      <strong>{euro.format(calculateDependentDeduction(effectiveDependents[index], allowanceSets[location]))}</strong>
                      {person.deductionMode === "shared" ? <small>{dependentDetails(effectiveDependents[index], allowanceSets[location]).message || "Paritätisches Wechselmodell; kein zusätzlicher voller Kinderfreibetrag"}</small> : person.deductionMode === "maintenance" ? (
                        <small>tatsächlich gezahlter Betrag</small>
                      ) : person.kind === "adultEmployed" || person.kind === "teenEmployed" ? (
                        <small>{person.incomeAlreadyAdjusted ? "Einkommen bereits bereinigt; kein weiterer Erwerbstätigenfreibetrag" : `Einkommen bereinigt um ${compactEuro.format(calculation.dependentResults[index].employment.amount)}; ${calculation.dependentResults[index].employment.description}`}</small>
                      ) : effectiveDependents[index].ownIncome > 0 ? <small>nach Einkommensanrechnung</small> : <small>{legalBasis.shortName}</small>}
                    </div>
                    </div><button className="icon-button" type="button" aria-label={`Person ${index + 1} entfernen`} onClick={() => { setDependents((current) => current.filter((item) => item.id !== person.id)); setIncomeItems((items) => items.filter((item) => item.recipient !== `dependent-${person.id}`)); }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <MoneyInput id="maintenance" label="Weiterer gesetzlicher Unterhalt / Sonderfälle" value={additionalMaintenance} onChange={setAdditionalMaintenance} />
          </section>

          <section className="form-card" id="wohnen">
            <SectionHeader number="03" title="Unterkunft" subtitle="Angemessene Kosten für Wohnung und Heizung" />
            <div className="field-grid">
              <MoneyInput id="warm-rent" label="Warmmiete / Wohnkosten gesamt" value={warmRent} onChange={setWarmRent} />
              <label className="field" htmlFor="housing-mode">
                <span className="field-label">Aufteilung der Wohnkosten</span>
                <select id="housing-mode" value={housingMode} onChange={(event) => setHousingMode(event.target.value as "full" | "income" | "heads")}>
                  <option value="full">Vollständig bei der Partei</option>
                  <option value="income">Nach Einkommen aufteilen</option>
                  <option value="heads">Nach Köpfen aufteilen</option>
                  <option value="manual">Begründeten Anteil eingeben</option>
                </select>
              </label>
              {housingMode === "income" ? <OptionalMoneyInput id="household-income" label="Nettoeinkommen der übrigen Personen" value={otherHouseholdIncome} onChange={setOtherHouseholdIncome} hint="Pflichtangabe für diese Aufteilung; 0 Euro bewusst eintragen, falls zutreffend." /> : null}
              {housingMode === "manual" ? <OptionalMoneyInput id="housing-share" label="Anteil der Partei" value={manualHousingShare} onChange={setManualHousingShare} hint="Bis zur Höhe der gesamten Wohnkosten." /> : null}
              {housingMode === "heads" ? (
                <AmountInput id="household-people" label="Personen im Haushalt" value={householdPeople} onChange={(value) => setHouseholdPeople(value ?? 1)} fractionDigits={0} min={1} max={10000} unit="" placeholder="Personenzahl" />
              ) : null}
              <label className="field span-2" htmlFor="housing-reason"><span className="field-label">Begründung der Aufteilung</span><input id="housing-reason" value={housingReason} onChange={(event) => setHousingReason(event.target.value)} placeholder="z. B. getrennte Haushaltskasse" /></label>
            </div>
            <label className="switch-row"><input type="checkbox" checked={housingAppropriate} onChange={(event) => setHousingAppropriate(event.target.checked)} /><span className="switch" aria-hidden="true" /><span><strong>Angemessenheit der Wohnkosten geprüft</strong><small>§ 115 Abs. 1 Satz 3 Nr. 3 ZPO; die Bewertung bleibt eine Einzelfallprüfung.</small></span></label>
            <div className="calculated-line"><span>Berücksichtigter Anteil der Partei</span><strong>{euro.format(calculation.housingShare)}</strong></div>
          </section>

          <section className="form-card" id="fahrtkosten">
            <SectionHeader number="04" title="Fahrtkosten zur Arbeit" subtitle="Gesonderter monatlicher Abzug für die Partei" />
            <label className="field" htmlFor="travel-method"><span className="field-label">Berechnungsmethode</span><select id="travel-method" value={travel.method} onChange={(event) => updateTravel({ method: event.target.value as TravelInput["method"] })}>
              <option value="none">Kein gesonderter Ansatz</option>
              <option value="car">Pkw-Pauschale nach einfacher Entfernung</option>
              <option value="public">Öffentliche Verkehrsmittel</option>
              <option value="manual">Abweichender geprüfter Monatsbetrag</option>
            </select></label>
            {travel.method !== "none" ? <>
              <div className="field-grid travel-fields">
                {travel.method === "car" ? <AmountInput id="travel-distance" label="Einfache Entfernung zur Arbeit (km)" value={travel.distanceKm} onChange={(distanceKm) => updateTravel({ distanceKm })} optional fractionDigits={1} max={100000} unit="km" placeholder="z. B. 25" hint={`Volle Kilometer × ${euro.format((law ?? LEGAL_DATA).travelCosts.carMonthlyRatePerKm)} pro Monat. Keine zusätzliche Multiplikation mit Rückweg oder Arbeitstagen.`} />
                  : <OptionalMoneyInput id="travel-monthly" label={travel.method === "public" ? "Notwendige monatliche Ticketkosten" : "Geprüfter monatlicher Fahrtkostenbetrag"} value={travel.monthlyAmount} onChange={(monthlyAmount) => updateTravel({ monthlyAmount })} hint="Vor Erstattungen eintragen; bereits in anderen Positionen enthaltene Kosten herausrechnen." />}
                {travel.method !== "public" ? <label className="field" htmlFor="travel-reason"><span className="field-label">{travel.method === "car" ? "Warum ist die Pkw-Nutzung erforderlich?" : "Begründung des abweichenden Ansatzes"}</span><input id="travel-reason" value={travel.reason} onChange={(event) => updateTravel({ reason: event.target.value })} placeholder={travel.method === "car" ? "z. B. kein zumutbarer ÖPNV bei Schichtbeginn" : "z. B. anteiliger Monat oder gerichtliche Vorgabe"} /></label> : null}
                <MoneyInput id="travel-reimbursement" label="Monatliche Fahrtkostenerstattung" value={travel.reimbursement} onChange={(reimbursement) => updateTravel({ reimbursement })} hint="Soweit nicht im Einkommen erfasst, bis zur Höhe des Fahrtkostenansatzes verrechnen." />
                <label className="field" htmlFor="travel-evidence"><span className="field-label">Beleg / Prüfvermerk (optional)</span><input id="travel-evidence" value={travel.evidence} onChange={(event) => updateTravel({ evidence: event.target.value })} placeholder="z. B. Anlage 4, Fahrplan und Arbeitszeiten" /></label>
              </div>
              {travel.reimbursement > 0 ? <label className="switch-row"><input id="travel-reimbursement-income" type="checkbox" checked={travel.reimbursementIncludedInIncome} onChange={(event) => updateTravel({ reimbursementIncludedInIncome: event.target.checked })} /><span className="switch" aria-hidden="true" /><span><strong>Erstattung ist bereits im erfassten Einkommen enthalten</strong><small>Dann bleibt der volle Fahrtkostenabzug erhalten; die Erstattung wird nicht nochmals verrechnet.</small></span></label> : null}
              {calculation.travelCosts.incomplete ? <p className="validation-note" role="status">{calculation.travelCosts.validationMessage}</p> : <div className="calculated-line" data-testid="travel-result"><span>{travelDescription}{calculation.travelCosts.reimbursementDeducted > 0 ? ` − Erstattung ${euro.format(calculation.travelCosts.reimbursementDeducted)}` : ""}</span><strong>{euro.format(calculation.travelCosts.deduction)}</strong></div>}
              {calculation.travelCosts.reimbursementExcess > 0 ? <p className="validation-note">Die Erstattung übersteigt den Fahrtkostenansatz um {euro.format(calculation.travelCosts.reimbursementExcess)}. Eine Anrechnung dieses Überschusses als Einkommen gesondert prüfen.</p> : null}
              <p className="travel-help">Fahrtkosten nur hier oder in anderen Abzügen erfassen. Bei Selbständigen dürfen bereits im Gewinn berücksichtigte Kosten nicht nochmals abgezogen werden. Für Teilmonate, abweichende Fahrtmuster oder eine andere gerichtliche Berechnung den geprüften Monatsbetrag verwenden.</p>
              {travel.method === "car" ? <div className="law-links"><a href={sources.travelCostsRegulation.url} target="_blank" rel="noreferrer">{sources.travelCostsRegulation.title}</a><a href={sources.travelCostsBgh.url} target="_blank" rel="noreferrer">BGH: keine Begrenzung auf 40 km</a></div> : null}
            </> : null}
          </section>

          <section className="form-card" id="abzuege">
            <SectionHeader number="05" title="Weitere Abzüge" subtitle="Nachweisbare Mehrbedarfe und besondere Belastungen" />
            <div className="field-grid">
              <MoneyInput id="insurance-work" label="Versicherungen und sonstige Erwerbskosten" value={insuranceAndWork} onChange={setInsuranceAndWork} hint="§ 82 Abs. 2 Nr. 3–4 SGB XII; separat erfasste Fahrtkosten hier nicht nochmals eintragen." />
              <MoneyInput id="additional-needs" label="Anerkannte Mehrbedarfe" value={additionalNeeds} onChange={setAdditionalNeeds} hint="§ 21 SGB II / § 30 SGB XII, z. B. Ernährung, Behinderung oder Alleinerziehung" />
              <MoneyInput id="special-burdens" label="Besondere Belastungen" value={specialBurdens} onChange={setSpecialBurdens} hint="§ 115 Abs. 1 Nr. 5 ZPO, z. B. laufende Kreditrate, Fortbildung oder andere PKH-Rate" />
              <label className="field" htmlFor="special-end"><span className="field-label">Letzter Monat dieser Belastung (optional)</span><input id="special-end" type="month" value={specialEndDate} onChange={(event) => setSpecialEndDate(event.target.value)} /><small>Ab dem Folgemonat wird eine weitere Rate berechnet.</small></label>
              <label className="field" htmlFor="case-number">
                <span className="field-label">Aktenzeichen (optional)</span>
                <input id="case-number" type="text" value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} placeholder="z. B. 12 O 345/26" />
              </label>
            </div>

            <div className="subsection-title custom-deduction-title">
              <div><strong>Weitere individuelle Abzüge</strong><small>Eigene Positionen mit Beschreibung und monatlichem Betrag erfassen.</small></div>
              <button type="button" className="secondary-button" onClick={addCustomDeduction}>+ Zeile</button>
            </div>
            {customDeductions.length === 0 ? (
              <div className="empty-state">Noch keine individuellen Abzüge erfasst.</div>
            ) : (
              <div className="custom-deductions-list">
                {customDeductions.map((item, index) => (
                  <div className="custom-deduction-row" key={item.id}>
                    <span className="person-index">{index + 1}</span>
                    <div className="deduction-fields"><label className="field" htmlFor={`deduction-description-${item.id}`}>
                      <span className="field-label">Beschreibung</span>
                      <input
                        id={`deduction-description-${item.id}`}
                        type="text"
                        value={item.description}
                        onChange={(event) => updateCustomDeduction(item.id, { description: event.target.value })}
                        placeholder="z. B. monatliche Darlehensrate"
                      />
                    </label>
                    <MoneyInput id={`deduction-amount-${item.id}`} label="Monatlicher Betrag" value={item.amount} onChange={(amount) => updateCustomDeduction(item.id, { amount })} />
                    <label className="field"><span className="field-label">Letzter Monat (optional)</span><input type="month" value={item.endMonth} onChange={(event) => updateCustomDeduction(item.id, { endMonth: event.target.value })} /></label>
                    <label className="field"><span className="field-label">Beleg / Prüfvermerk</span><input value={item.evidence} onChange={(event) => updateCustomDeduction(item.id, { evidence: event.target.value })} /></label>
                    </div><button className="icon-button" type="button" aria-label={`Abzug ${index + 1} entfernen`} onClick={() => setCustomDeductions((current) => current.filter((entry) => entry.id !== item.id))}>×</button>
                  </div>
                ))}
                <div className="custom-deduction-total"><span>Summe der individuellen Abzüge</span><strong>{euro.format(calculation.customDeductionTotal)}</strong></div>
              </div>
            )}
            <details className="legal-details"><summary>Belegverweise für Sammelpositionen</summary><div className="evidence-grid">{(Object.entries(evidenceFields) as [EvidenceKey, string][]).map(([key, label]) => <label className="field" key={key}><span className="field-label">{label}</span><input value={evidenceNotes[key]} onChange={(event) => setEvidenceNotes((notes) => ({ ...notes, [key]: event.target.value }))} placeholder="z. B. Anlage 3" /></label>)}</div></details>
          </section>
          <section className="form-card" id="vermoegen">
            <SectionHeader number="06" title="Vermögen und Kosten" subtitle="Ergänzende Prüfung nach § 115 Abs. 3 und 4 ZPO" />
            <p className="calculation-note">Planung für eine Erstbewilligung: automatische Staffelprognose höchstens bis vier Jahre ab Bewilligung (§ 120 Abs. 1 ZPO). Nachprüfung nach § 120a ZPO und frühere Zahlungen sind gesondert zu prüfen. Die Grenze von 48 Zahlungsraten ist kein pauschaler Vierjahres-Zahlungszeitraum.</p>
            <div className="field-grid">
              <OptionalMoneyInput id="assets" label="Einzusetzender Vermögensteil" value={assetContribution} onChange={setAssetContribution} hint="Nur nach gesonderter Zumutbarkeitsprüfung; 0 Euro bewusst eintragen." />
              <OptionalMoneyInput id="costs" label="Voraussichtliche Verfahrenskosten" value={estimatedCosts} onChange={setEstimatedCosts} hint="Für den Vergleich mit vier Monatsraten zuzüglich Vermögenseinsatz." />
              <label className="field span-2" htmlFor="payment-start"><span className="field-label">Ratenbeginn (Monat, optional)</span><input id="payment-start" type="month" value={paymentStartMonth} onChange={(event) => setPaymentStartMonth(event.target.value)} /><small>Ohne Angabe gilt der Bewilligungsmonat. Monate ohne Zahlung zählen nicht als gezahlte Raten.</small></label>
              <label className="field span-2" htmlFor="assessment-note"><span className="field-label">Prüfvermerk / fehlende Belege</span><input id="assessment-note" value={assessmentNote} onChange={(event) => setAssessmentNote(event.target.value)} /></label>
            </div>
            <div className="calculated-line"><span>Kostenvergleich</span><strong>{calculation.costExclusion == null ? "Angaben fehlen" : calculation.costExclusion ? "Ausschluss nach § 115 Abs. 4 prüfen" : "Kosten liegen über vier Raten + Vermögen"}</strong></div>
            {calculation.installmentsToCoverCosts != null ? <div className="calculated-line"><span>Rechnerische Zahlungsraten bis zur Kostendeckung</span><strong>{calculation.installmentsToCoverCosts} {calculation.costsCoveredWithinCap ? `(innerhalb von ${monthlyRate.maximumInstallments} Raten)` : `(über ${monthlyRate.maximumInstallments} Raten)`}</strong></div> : null}
          </section>
        </div>

        <aside className="result-card" id="ergebnis" tabIndex={-1} aria-label="Ergebnis der Ratenberechnung" aria-live="polite">
          <div className="result-kicker">Voraussichtliche Monatsrate</div>
          <div className="rate">{incomplete ? "—" : euro.format(calculation.monthlyRate)}</div>
          <div className={`result-status ${calculation.monthlyRate > 0 ? "rate-due" : "no-rate"}`}>
            <span /> {incomplete ? "Angaben fehlen" : calculation.monthlyRate > 0 ? "Ratenzahlung voraussichtlich" : "Voraussichtlich ratenfrei"}
          </div>

          <div className="breakdown">
            <div><span>Monatliche Einkünfte</span><strong>{euro.format(calculation.grossMonthlyIncome)}</strong></div>
            <div><span>Pflichtabzüge</span><strong>− {euro.format(mandatoryDeductions)}</strong></div>
            <div><span>Freibeträge / Unterhalt</span><strong>− {euro.format(calculation.totalAllowances)}</strong></div>
            <div><span>Unterkunftsanteil</span><strong>− {euro.format(calculation.housingShare)}</strong></div>
            {travel.method !== "none" ? <div data-testid="summary-travel"><span>Fahrtkosten zur Arbeit</span><strong>{calculation.travelCosts.incomplete ? "Angaben fehlen" : `− ${euro.format(calculation.travelCosts.deduction)}`}</strong></div> : null}
            <div><span>Weitere Abzüge</span><strong>− {euro.format(calculation.furtherDeductions - calculation.travelCosts.deduction)}</strong></div>
            <div className="disposable"><span>Einzusetzendes Einkommen</span><strong>{euro.format(Math.max(0, calculation.disposableIncome))}</strong></div>
          </div>

          {!incomplete ? <div className="maximum">
            <span>Rechnerische Obergrenze bei {monthlyRate.maximumInstallments} Raten, vorbehaltlich tatsächlicher Kosten</span>
            <strong>{calculation.maximumContribution == null ? "Nicht bestimmbar" : euro.format(calculation.maximumContribution)}</strong>
            <small>{calculation.futurePlanNeedsReview ? "Staffelprognose offen; siehe Prüfhinweis." : `Ratenplan ab ${calculation.paymentPlanStartMonth ?? "Bewilligung"}; spätere Ratenstufen berücksichtigt.`}</small>
          </div> : null}
          {calculation.futurePlanNeedsReview ? <p className="validation-note">{calculation.futurePlanMessage}</p> : null}
          {calculation.futureRates.map((step) => <div className="calculated-line" key={step.from}><span>Ab {step.from} nach Wegfall befristeter Belastung</span><strong>{euro.format(step.monthlyRate)}</strong></div>)}
          {incomplete ? <p className="validation-note">{validationMessage}</p> : null}
          <div className="action-row">
            <button type="button" className="primary-button" disabled={incomplete} onClick={() => window.print()}>Drucken</button>
            <button type="button" className="pdf-button" disabled={incomplete} onClick={() => window.print()} aria-describedby="pdf-help">Als PDF speichern</button>
            <small id="pdf-help" className="pdf-help">Im Druckdialog als Ziel „Als PDF speichern“ auswählen.</small>
            <button type="button" className="text-button" onClick={reset}>Eingaben zurücksetzen</button>
          </div>
          <p className="legal-note">
            Unverbindliche Orientierung. Die endgültige Prüfung und Festsetzung obliegt dem zuständigen Gericht.
          </p>
          <div className="law-links">
            <a href={sources.zpo115.url} target="_blank" rel="noreferrer">§ 115 ZPO</a>
            <a href={sources.pkhb.url} target="_blank" rel="noreferrer">{legalBasis.shortName}</a>
            <a href={sources.sgb12Section82.url} target="_blank" rel="noreferrer">§ 82 SGB XII</a>
          </div>
        </aside>
      </div>

      <div className="mobile-result-bar" aria-label="Kurzergebnis"><div><span>Voraussichtliche Monatsrate</span><strong>{incomplete ? "Angaben fehlen" : euro.format(calculation.monthlyRate)}</strong></div><a href="#ergebnis">Ergebnis ansehen <span aria-hidden="true">↑</span></a></div>
      <CalculatorInfo />
      <footer className="site-footer">
        <div><strong>PKH · VKH Ratenrechner</strong><span>Lokale Berechnung ohne Datenübertragung</span></div>
        <p>Rechenstand: {calculationYear} · Freibeträge gemäß {legalBasis.shortName}</p>
      </footer>
    </main></AmountValidationContext.Provider>
  );
}
