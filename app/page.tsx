"use client";

import { useMemo, useState } from "react";
import { ALLOWANCE_SETS as allowanceSets, LEGAL_DATA, calculateDependentAllowance, calculatePkh } from "./pkh-law.mjs";

type LocationKey = "bund" | "ffb" | "muenchen" | "landkreisMuenchen";
type DependentKind = "adult" | "adultEmployed" | "teen" | "teenEmployed" | "child" | "youngChild";

type Dependent = {
  id: number;
  kind: DependentKind;
  ownIncome: number;
};

type CustomDeduction = {
  id: number;
  description: string;
  amount: number;
};

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

const { calculationYear, legalBasis, monthlyRate, sources } = LEGAL_DATA;

function MoneyInput({
  id,
  label,
  value,
  onChange,
  hint,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="money-control">
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value || ""}
          placeholder="0,00"
          onChange={(event) => onChange(Math.max(0, Number(event.target.value) || 0))}
        />
        <span aria-hidden="true">€</span>
      </span>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
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

function LegalDisclaimer({ className, titleId }: { className: string; titleId: string }) {
  return (
    <section className={`legal-disclaimer ${className}`} aria-labelledby={titleId}>
      <h2 id={titleId}>Rechtlicher Hinweis</h2>
      <p>
        Dieser Rechner ist ein <strong>privates Hobbyprojekt eines Rechtspflegers</strong>. Er ist kein
        offizielles Angebot eines Gerichts oder einer Behörde und ersetzt keine Rechtsberatung.
      </p>
      <p>
        Trotz sorgfältiger Entwicklung und Pflege besteht kein Anspruch auf Richtigkeit, Vollständigkeit
        oder Aktualität. Die Berechnung und ihr Ergebnis sind unverbindlich; maßgeblich sind die geltenden
        Rechtsvorschriften und die Entscheidung des zuständigen Gerichts.
      </p>
    </section>
  );
}

export default function Home() {
  const [location, setLocation] = useState<LocationKey>("bund");
  const [netIncome, setNetIncome] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [annualPayments, setAnnualPayments] = useState(0);
  const [mandatoryDeductions, setMandatoryDeductions] = useState(0);
  const [employed, setEmployed] = useState(true);
  const [spouse, setSpouse] = useState(false);
  const [spouseEmployed, setSpouseEmployed] = useState(false);
  const [spouseIncome, setSpouseIncome] = useState(0);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [warmRent, setWarmRent] = useState(0);
  const [housingMode, setHousingMode] = useState<"full" | "income" | "heads">("full");
  const [otherHouseholdIncome, setOtherHouseholdIncome] = useState(0);
  const [householdPeople, setHouseholdPeople] = useState(2);
  const [insuranceAndWork, setInsuranceAndWork] = useState(0);
  const [additionalMaintenance, setAdditionalMaintenance] = useState(0);
  const [additionalNeeds, setAdditionalNeeds] = useState(0);
  const [specialBurdens, setSpecialBurdens] = useState(0);
  const [customDeductions, setCustomDeductions] = useState<CustomDeduction[]>([]);
  const [caseNumber, setCaseNumber] = useState("");

  const calculation = useMemo(() => calculatePkh({
    location,
    netIncome,
    otherIncome,
    annualPayments,
    mandatoryDeductions,
    employed,
    spouse,
    spouseEmployed,
    spouseIncome,
    dependents,
    warmRent,
    housingMode,
    otherHouseholdIncome,
    householdPeople,
    insuranceAndWork,
    additionalMaintenance,
    additionalNeeds,
    specialBurdens,
    customDeductions,
  }), [location, netIncome, otherIncome, annualPayments, mandatoryDeductions, employed, spouse, spouseEmployed, spouseIncome, dependents, warmRent, housingMode, otherHouseholdIncome, householdPeople, insuranceAndWork, additionalMaintenance, additionalNeeds, specialBurdens, customDeductions]);

  const addDependent = () => {
    setDependents((current) => [...current, { id: Date.now(), kind: "youngChild", ownIncome: 0 }]);
  };

  const updateDependent = (id: number, patch: Partial<Dependent>) => {
    setDependents((current) => current.map((person) => (person.id === id ? { ...person, ...patch } : person)));
  };

  const addCustomDeduction = () => {
    setCustomDeductions((current) => [...current, { id: Date.now(), description: "", amount: 0 }]);
  };

  const updateCustomDeduction = (id: number, patch: Partial<CustomDeduction>) => {
    setCustomDeductions((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const reset = () => {
    setLocation("bund");
    setNetIncome(0);
    setOtherIncome(0);
    setAnnualPayments(0);
    setMandatoryDeductions(0);
    setEmployed(true);
    setSpouse(false);
    setSpouseEmployed(false);
    setSpouseIncome(0);
    setDependents([]);
    setWarmRent(0);
    setHousingMode("full");
    setOtherHouseholdIncome(0);
    setHouseholdPeople(2);
    setInsuranceAndWork(0);
    setAdditionalMaintenance(0);
    setAdditionalNeeds(0);
    setSpecialBurdens(0);
    setCustomDeductions([]);
    setCaseNumber("");
  };

  const printDate = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date());

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="PKH VKH Ratenrechner – Start">
          <span className="brand-mark">§</span>
          <span>
            <strong>PKH · VKH</strong>
            <small>Ratenrechner</small>
          </span>
        </a>
        <div className="privacy-badge"><span /> Lokal &amp; datensparsam</div>
      </header>

      <section className="hero" id="top">
        <div>
          <span className="eyebrow">Berechnungsjahr {calculationYear}</span>
          <h1>Monatsrate für Prozess- und Verfahrenskostenhilfe</h1>
          <p>
            Ermitteln Sie die voraussichtliche Rate nach § 115 ZPO. Die Berechnung erfolgt
            ausschließlich auf diesem Gerät.
          </p>
        </div>
        <div className="hero-law">
          <span>Rechtsgrundlage</span>
          <strong>§ 115 ZPO</strong>
          <small>{legalBasis.shortName} · {legalBasis.citation}</small>
        </div>
      </section>

      <LegalDisclaimer className="screen-disclaimer" titleId="screen-legal-disclaimer-title" />

      <article className="print-document" aria-label="Druckfassung der PKH- und VKH-Ratenberechnung">
        <header className="document-header">
          <div className="document-wordmark">
            <span>§</span>
            <div><strong>PKH · VKH</strong><small>Ratenberechnung</small></div>
          </div>
          <dl className="document-meta">
            <div><dt>Aktenzeichen</dt><dd>{caseNumber || "—"}</dd></div>
            <div><dt>Berechnungsdatum</dt><dd>{printDate}</dd></div>
            <div><dt>Rechenstand</dt><dd>{legalBasis.shortName}</dd></div>
          </dl>
        </header>

        <div className="document-title">
          <p>Berechnungsvermerk</p>
          <h1>Monatsrate bei Prozess- und Verfahrenskostenhilfe</h1>
          <span>Berechnung des einzusetzenden Einkommens gemäß § 115 ZPO</span>
        </div>

        <section className="document-section">
          <h2>1. Monatliche Einkünfte</h2>
          <table>
            <tbody>
              <tr><th>Nettoeinkommen</th><td>{euro.format(netIncome)}</td></tr>
              <tr><th>Sonstige monatliche Einnahmen</th><td>{euro.format(otherIncome)}</td></tr>
              <tr><th>Jährliche Sonderzahlungen, monatlicher Anteil</th><td>{euro.format(calculation.annualMonthlyAmount)}</td></tr>
              <tr className="document-subtotal"><th>Summe der monatlichen Einkünfte</th><td>{euro.format(calculation.grossMonthlyIncome)}</td></tr>
            </tbody>
          </table>
        </section>

        <section className="document-section">
          <h2>2. Abzüge und Freibeträge</h2>
          <p className="document-context">Wohnsitz: {allowanceSets[location].label}</p>
          <table>
            <tbody>
              <tr><th>Steuern und Sozialversicherungsbeiträge (§ 82 Abs. 2 Nr. 1–2 SGB XII)</th><td>− {euro.format(mandatoryDeductions)}</td></tr>
              <tr><th>Erwerbstätigenfreibetrag</th><td>− {euro.format(calculation.employmentAllowance)}</td></tr>
              <tr><th>Freibetrag der Partei</th><td>− {euro.format(calculation.partyAllowance)}</td></tr>
              {spouse ? <tr><th>Freibetrag der Ehe-/Lebenspartnerperson{spouseEmployed ? " (erwerbstätig)" : ""} nach Einkommensanrechnung</th><td>− {euro.format(calculation.spouseAllowance)}</td></tr> : null}
              {dependents.map((person, index) => (
                <tr key={person.id}>
                  <th>Unterhaltene Person {index + 1}: {dependentLabels[person.kind]}</th>
                  <td>− {euro.format(calculateDependentAllowance(person.kind, person.ownIncome, allowanceSets[location]))}</td>
                </tr>
              ))}
              <tr><th>Berücksichtigter Anteil der Unterkunft und Heizung</th><td>− {euro.format(calculation.housingShare)}</td></tr>
              <tr><th>Versicherungen und notwendige Erwerbskosten</th><td>− {euro.format(insuranceAndWork)}</td></tr>
              <tr><th>Weiterer gesetzlicher Unterhalt / Sonderfälle</th><td>− {euro.format(additionalMaintenance)}</td></tr>
              <tr><th>Anerkannte Mehrbedarfe</th><td>− {euro.format(additionalNeeds)}</td></tr>
              <tr><th>Besondere Belastungen</th><td>− {euro.format(specialBurdens)}</td></tr>
              {customDeductions.map((item, index) => (
                <tr key={item.id}><th>{item.description.trim() || `Weiterer individueller Abzug ${index + 1}`}</th><td>− {euro.format(item.amount)}</td></tr>
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
            <span>Festzusetzende Monatsrate</span>
            <strong>{euro.format(calculation.monthlyRate)}</strong>
          </div>
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
          <LegalDisclaimer className="print-disclaimer" titleId="print-legal-disclaimer-title" />
          <div><span>Rechtsgrundlage: § 115 ZPO</span><span>Freibeträge: {legalBasis.shortName}, {legalBasis.citation}</span></div>
        </footer>
      </article>

      <div className="workspace">
        <div className="form-column">
          <section className="form-card">
            <SectionHeader number="01" title="Einkommen" subtitle="Monatliche Einnahmen und gesetzliche Abzüge" />
            <div className="field-grid">
              <label className="field span-2" htmlFor="location">
                <span className="field-label">Wohnsitz für Freibeträge</span>
                <select id="location" value={location} onChange={(event) => setLocation(event.target.value as LocationKey)}>
                  {Object.entries(allowanceSets).map(([key, value]) => (
                    <option key={key} value={key}>{value.label}</option>
                  ))}
                </select>
                <small>Für München und Fürstenfeldbruck gelten regional erhöhte Beträge.</small>
              </label>
              <MoneyInput id="net-income" label="Nettoeinkommen" value={netIncome} onChange={setNetIncome} />
              <MoneyInput id="other-income" label="Sonstige monatliche Einnahmen" value={otherIncome} onChange={setOtherIncome} />
              <MoneyInput id="annual-payments" label="Jährliche Sonderzahlungen" value={annualPayments} onChange={setAnnualPayments} hint="z. B. Weihnachts- und Urlaubsgeld; wird durch 12 geteilt" />
              <MoneyInput id="mandatory" label="Steuern und Sozialversicherungsbeiträge" value={mandatoryDeductions} onChange={setMandatoryDeductions} hint="§ 82 Abs. 2 Nr. 1–2 SGB XII; nur soweit nicht im Nettobetrag berücksichtigt" />
            </div>
            <label className="switch-row">
              <input type="checkbox" checked={employed} onChange={(event) => setEmployed(event.target.checked)} />
              <span className="switch" aria-hidden="true" />
              <span><strong>Partei ist erwerbstätig</strong><small>Erwerbstätigenfreibetrag: {compactEuro.format(allowanceSets[location].employed)}</small></span>
            </label>
          </section>

          <section className="form-card">
            <SectionHeader number="02" title="Freibeträge" subtitle="Partei und gesetzlich unterhaltene Personen" />
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
              <input type="checkbox" checked={spouse} onChange={(event) => setSpouse(event.target.checked)} />
              <span className="switch" aria-hidden="true" />
              <span><strong>Ehe- oder eingetragene Lebenspartnerschaft</strong><small>Eigenes Einkommen mindert den Freibetrag.</small></span>
            </label>
            {spouse ? (
              <div className="sub-panel">
                <MoneyInput id="spouse-income" label="Eigenes Einkommen der Partnerperson" value={spouseIncome} onChange={setSpouseIncome} />
                <label className="switch-row compact-switch">
                  <input type="checkbox" checked={spouseEmployed} onChange={(event) => setSpouseEmployed(event.target.checked)} />
                  <span className="switch" aria-hidden="true" />
                  <span><strong>Partnerperson ist erwerbstätig</strong><small>Einkommen wird zuvor um {compactEuro.format(allowanceSets[location].employed)} bereinigt.</small></span>
                </label>
                <div className="sub-result"><span>Verbleibender Freibetrag</span><strong>{euro.format(calculation.spouseAllowance)}</strong></div>
              </div>
            ) : null}

            <div className="subsection-title">
              <div><strong>Weitere unterhaltene Personen</strong><small>Eigenes Einkommen wird jeweils gegengerechnet.</small></div>
              <button type="button" className="secondary-button" onClick={addDependent}>+ Person</button>
            </div>
            {dependents.length === 0 ? (
              <div className="empty-state">Noch keine weiteren Personen erfasst.</div>
            ) : (
              <div className="dependents-list">
                {dependents.map((person, index) => (
                  <div className="dependent-row" key={person.id}>
                    <span className="person-index">{index + 1}</span>
                    <label className="field">
                      <span className="field-label">Altersgruppe</span>
                      <select value={person.kind} onChange={(event) => updateDependent(person.id, { kind: event.target.value as DependentKind })}>
                        {Object.entries(dependentLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                      </select>
                    </label>
                    <MoneyInput id={`dependent-${person.id}`} label="Eigenes Einkommen" value={person.ownIncome} onChange={(value) => updateDependent(person.id, { ownIncome: value })} />
                    <div className="dependent-allowance" aria-live="polite">
                      <span>Freibetrag</span>
                      <strong>{euro.format(calculateDependentAllowance(person.kind, person.ownIncome, allowanceSets[location]))}</strong>
                      {person.kind === "adultEmployed" || person.kind === "teenEmployed" ? (
                        <small>Einkommen bereinigt um {compactEuro.format(allowanceSets[location].employed)}</small>
                      ) : person.ownIncome > 0 ? <small>nach Einkommensanrechnung</small> : <small>{legalBasis.shortName}</small>}
                    </div>
                    <button className="icon-button" type="button" aria-label={`Person ${index + 1} entfernen`} onClick={() => setDependents((current) => current.filter((item) => item.id !== person.id))}>×</button>
                  </div>
                ))}
              </div>
            )}
            <MoneyInput id="maintenance" label="Weiterer gesetzlicher Unterhalt / Sonderfälle" value={additionalMaintenance} onChange={setAdditionalMaintenance} />
          </section>

          <section className="form-card">
            <SectionHeader number="03" title="Unterkunft" subtitle="Angemessene Kosten für Wohnung und Heizung" />
            <div className="field-grid">
              <MoneyInput id="warm-rent" label="Warmmiete / Wohnkosten gesamt" value={warmRent} onChange={setWarmRent} />
              <label className="field" htmlFor="housing-mode">
                <span className="field-label">Aufteilung der Wohnkosten</span>
                <select id="housing-mode" value={housingMode} onChange={(event) => setHousingMode(event.target.value as "full" | "income" | "heads")}>
                  <option value="full">Vollständig bei der Partei</option>
                  <option value="income">Nach Einkommen aufteilen</option>
                  <option value="heads">Nach Köpfen aufteilen</option>
                </select>
              </label>
              {housingMode === "income" ? <MoneyInput id="household-income" label="Nettoeinkommen der übrigen Personen" value={otherHouseholdIncome} onChange={setOtherHouseholdIncome} /> : null}
              {housingMode === "heads" ? (
                <label className="field" htmlFor="household-people">
                  <span className="field-label">Personen im Haushalt</span>
                  <input id="household-people" type="number" min="1" step="1" value={householdPeople} onChange={(event) => setHouseholdPeople(Math.max(1, Number(event.target.value) || 1))} />
                </label>
              ) : null}
            </div>
            <div className="calculated-line"><span>Berücksichtigter Anteil der Partei</span><strong>{euro.format(calculation.housingShare)}</strong></div>
          </section>

          <section className="form-card">
            <SectionHeader number="04" title="Weitere Abzüge" subtitle="Nachweisbare Mehrbedarfe und besondere Belastungen" />
            <div className="field-grid">
              <MoneyInput id="insurance-work" label="Versicherungen und notwendige Erwerbskosten" value={insuranceAndWork} onChange={setInsuranceAndWork} hint="§ 82 Abs. 2 Nr. 3–4 SGB XII, z. B. angemessene Versicherung oder Fahrtkosten" />
              <MoneyInput id="additional-needs" label="Anerkannte Mehrbedarfe" value={additionalNeeds} onChange={setAdditionalNeeds} hint="§ 21 SGB II / § 30 SGB XII, z. B. Ernährung, Behinderung oder Alleinerziehung" />
              <MoneyInput id="special-burdens" label="Besondere Belastungen" value={specialBurdens} onChange={setSpecialBurdens} hint="§ 115 Abs. 1 Nr. 5 ZPO, z. B. laufende Kreditrate, Fortbildung oder andere PKH-Rate" />
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
                    <label className="field" htmlFor={`deduction-description-${item.id}`}>
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
                    <button className="icon-button" type="button" aria-label={`Abzug ${index + 1} entfernen`} onClick={() => setCustomDeductions((current) => current.filter((entry) => entry.id !== item.id))}>×</button>
                  </div>
                ))}
                <div className="custom-deduction-total"><span>Summe der individuellen Abzüge</span><strong>{euro.format(calculation.customDeductionTotal)}</strong></div>
              </div>
            )}
          </section>
        </div>

        <aside className="result-card" aria-live="polite">
          <div className="result-kicker">Voraussichtliche Monatsrate</div>
          <div className="rate">{euro.format(calculation.monthlyRate)}</div>
          <div className={`result-status ${calculation.monthlyRate > 0 ? "rate-due" : "no-rate"}`}>
            <span /> {calculation.monthlyRate > 0 ? "Ratenzahlung voraussichtlich" : "Voraussichtlich ratenfrei"}
          </div>

          <div className="breakdown">
            <div><span>Monatliche Einkünfte</span><strong>{euro.format(calculation.grossMonthlyIncome)}</strong></div>
            <div><span>Pflichtabzüge</span><strong>− {euro.format(mandatoryDeductions)}</strong></div>
            <div><span>Freibeträge</span><strong>− {euro.format(calculation.totalAllowances)}</strong></div>
            <div><span>Unterkunftsanteil</span><strong>− {euro.format(calculation.housingShare)}</strong></div>
            <div><span>Weitere Abzüge</span><strong>− {euro.format(calculation.furtherDeductions)}</strong></div>
            <div className="disposable"><span>Einzusetzendes Einkommen</span><strong>{euro.format(Math.max(0, calculation.disposableIncome))}</strong></div>
          </div>

          <div className="maximum">
            <span>Maximalbetrag bei {monthlyRate.maximumInstallments} Raten</span>
            <strong>{euro.format(calculation.monthlyRate * monthlyRate.maximumInstallments)}</strong>
          </div>
          <div className="action-row">
            <button type="button" className="primary-button" onClick={() => window.print()}>Drucken</button>
            <button type="button" className="pdf-button" onClick={() => window.print()} aria-describedby="pdf-help">Als PDF speichern</button>
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

      <footer>
        <div><strong>PKH · VKH Ratenrechner</strong><span>Lokale Berechnung ohne Datenübertragung</span></div>
        <p>Rechenstand: {calculationYear} · Freibeträge gemäß {legalBasis.shortName}</p>
      </footer>
    </main>
  );
}
