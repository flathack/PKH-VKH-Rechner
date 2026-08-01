import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ALLOWANCE_SETS,
  calculateDependentAllowance,
  calculateMonthlyRate,
  calculatePkh,
  calculateSpouseAllowance,
} from "../app/pkh-law.mjs";

function calculationInput(overrides = {}) {
  return {
    location: "bund",
    netIncome: 0,
    otherIncome: 0,
    annualPayments: 0,
    mandatoryDeductions: 0,
    employed: false,
    spouse: false,
    spouseEmployed: false,
    spouseIncome: 0,
    dependents: [],
    warmRent: 0,
    housingMode: "full",
    otherHouseholdIncome: 0,
    householdPeople: 1,
    insuranceAndWork: 0,
    additionalMaintenance: 0,
    additionalNeeds: 0,
    specialBurdens: 0,
    customDeductions: [],
    ...overrides,
  };
}

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("liefert den lokalen PKH/VKH-Ratenrechner aus", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<html lang="de">/i);
  assert.match(html, /<title>PKH · VKH Ratenrechner 2026<\/title>/i);
  assert.match(html, /Monatsrate für Prozess- und Verfahrenskostenhilfe/);
  assert.match(html, /§ 115 ZPO/);
  assert.match(html, /Lokal &amp; datensparsam/);
  assert.match(html, /Freibetrag der Partei/);
  assert.doesNotMatch(html, /class="allowance-line fixed"/);
  assert.match(html, /Voraussichtliche Monatsrate/);
  assert.match(html, />Drucken<\/button>/);
  assert.match(html, />Als PDF speichern<\/button>/);
  assert.match(html, /Im Druckdialog als Ziel/);
  assert.match(html, /class="print-document"/);
  assert.match(html, /Berechnungsvermerk/);
  assert.match(html, /Summe sämtlicher Abzüge/);
  assert.match(html, /Festzusetzende Monatsrate/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton|Your site is taking shape/i);
});

test("verwendet die amtlichen Freibeträge der PKHB 2026", () => {
  assert.deepEqual(ALLOWANCE_SETS.bund, {
    label: "Übriges Bundesgebiet",
    employed: 282,
    party: 619,
    adult: 496,
    teen: 518,
    child: 429,
    youngChild: 393,
  });
  assert.equal(ALLOWANCE_SETS.ffb.party, 649);
  assert.equal(ALLOWANCE_SETS.muenchen.party, 650);
  assert.equal(ALLOWANCE_SETS.landkreisMuenchen.party, 637);
});

test("berechnet und rundet Monatsraten nach § 115 Abs. 2 ZPO", () => {
  assert.equal(calculateMonthlyRate(-100), 0);
  assert.equal(calculateMonthlyRate(19.99), 0);
  assert.equal(calculateMonthlyRate(20), 10);
  assert.equal(calculateMonthlyRate(599.99), 299);
  assert.equal(calculateMonthlyRate(600), 300);
  assert.equal(calculateMonthlyRate(601.75), 301);
  assert.equal(calculateMonthlyRate(32.37 - 0.37), 16);
  assert.equal(calculateMonthlyRate(34.80 - 14.80), 10);
});

test("zeigt den individuellen Freibetrag hinzugefügter Personen an", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /className="dependent-allowance"/);
  assert.match(page, /calculateDependentAllowance\(person\.kind, person\.ownIncome, allowanceSets\[location\]\)/);
  assert.match(page, /nach Einkommensanrechnung/);
  assert.match(page, /0–5 Jahre/);
  assert.match(page, /6–13 Jahre/);
  assert.match(page, /14–17 Jahre/);
  assert.match(page, /ab 18 Jahre/);
  assert.match(page, /ab 18 Jahre und erwerbstätig/);
  assert.match(page, /14–17 Jahre und erwerbstätig/);
  assert.doesNotMatch(page, /0–6 Jahre|7–14 Jahre|15–17 Jahre/);
});

test("berücksichtigt Erwerbstätigkeit bei volljährigen unterhaltenen Personen", () => {
  const allowances = ALLOWANCE_SETS.bund;
  assert.equal(calculateDependentAllowance("adult", 200, allowances), 296);
  assert.equal(calculateDependentAllowance("adultEmployed", 200, allowances), 496);
  assert.equal(calculateDependentAllowance("adultEmployed", 300, allowances), 478);
  assert.equal(calculateDependentAllowance("adultEmployed", 1_000, allowances), 0);
  assert.equal(calculateDependentAllowance("teen", 600, allowances), 0);
  assert.equal(calculateDependentAllowance("teenEmployed", 600, allowances), 200);
});

test("bereinigt Einkommen einer erwerbstätigen Partnerperson", () => {
  const allowances = ALLOWANCE_SETS.bund;
  assert.equal(calculateSpouseAllowance(500, false, allowances), 119);
  assert.equal(calculateSpouseAllowance(500, true, allowances), 401);
});

test("berechnet den vollständigen Rechenweg centgenau", () => {
  const result = calculatePkh(calculationInput({
    netIncome: 2_000,
    otherIncome: 100,
    annualPayments: 1_200,
    employed: true,
    warmRent: 500,
    insuranceAndWork: 100,
    customDeductions: [{ amount: 50, description: "Testabzug" }],
  }));

  assert.equal(result.grossMonthlyIncome, 2_200);
  assert.equal(result.totalAllowances, 901);
  assert.equal(result.furtherDeductions, 150);
  assert.equal(result.disposableIncome, 649);
  assert.equal(result.monthlyRate, 349);
});

test("wendet Wohnkosten- und Personenberechnung gemeinsam an", () => {
  const result = calculatePkh(calculationInput({
    netIncome: 2_400,
    spouse: true,
    spouseEmployed: true,
    spouseIncome: 500,
    dependents: [{ kind: "teenEmployed", ownIncome: 600 }],
    warmRent: 900,
    housingMode: "heads",
    householdPeople: 3,
  }));

  assert.equal(result.spouseAllowance, 401);
  assert.equal(result.dependentAllowance, 200);
  assert.equal(result.housingShare, 300);
  assert.equal(result.disposableIncome, 880);
  assert.equal(result.monthlyRate, 580);
});

test("unterstützt mehrere beschriftete individuelle Abzüge", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /Weitere individuelle Abzüge/);
  assert.match(page, /addCustomDeduction/);
  assert.match(page, /deduction-description-/);
  assert.match(page, /customDeductionTotal/);
  assert.match(page, /item\.description\.trim\(\)/);
});

test("unterdrückt Browser-Kopf- und Fußzeilen in der Druckfassung", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /@page\s*{[^}]*size:\s*A4 portrait;[^}]*margin:\s*0;/s);
  assert.match(css, /\.print-document\s*{[^}]*width:\s*210mm;[^}]*min-height:\s*297mm;[^}]*padding:\s*18mm 20mm 17mm;/s);
});
