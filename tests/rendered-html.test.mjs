import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import legalData from "../app/legal-data.json" with { type: "json" };
import {
  ALLOWANCE_SETS,
  LEGAL_DATA,
  calculateDependentAllowance,
  calculateMonthlyRate,
  calculatePkh,
  calculateSpouseAllowance,
} from "../app/pkh-law.mjs";

const REQUIRED_ALLOWANCE_KEYS = ["employed", "party", "adult", "teen", "child", "youngChild"];
const OFFICIAL_SOURCE_HOSTS = new Set(["www.gesetze-im-internet.de", "www.recht.bund.de"]);
const execFileAsync = promisify(execFile);
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));

function parseIsoDate(value, label) {
  assert.match(value, /^\d{4}-\d{2}-\d{2}$/, `${label}: ungültiges Format`);
  const parsed = new Date(`${value}T00:00:00Z`);
  assert.equal(parsed.toISOString().slice(0, 10), value, `${label}: ungültiges Kalenderdatum`);
  return parsed;
}

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

test("validiert das zentrale Rechtsstands-Manifest", () => {
  assert.equal(legalData.schemaVersion, 1);
  assert.equal(legalData.jurisdiction, "DE");
  assert.ok(Number.isInteger(legalData.calculationYear) && legalData.calculationYear > 0);
  const issuedOn = parseIsoDate(legalData.legalBasis.issuedOn, "Ausfertigungsdatum");
  const publishedOn = parseIsoDate(legalData.legalBasis.publishedOn, "Veröffentlichungsdatum");
  const effectiveFrom = parseIsoDate(legalData.effectiveFrom, "Gültigkeitsbeginn");
  assert.ok(issuedOn <= publishedOn, "Ausfertigung muss spätestens bei Veröffentlichung liegen");
  assert.ok(publishedOn <= effectiveFrom, "Veröffentlichung muss spätestens bei Gültigkeitsbeginn liegen");
  assert.equal(Number(legalData.effectiveFrom.slice(0, 4)), legalData.calculationYear);
  assert.equal(legalData.legalBasis.shortName, "PKHB 2026");
  assert.equal(legalData.legalBasis.issuedOn, "2025-12-19");
  assert.equal(legalData.legalBasis.publishedOn, "2025-12-23");
  assert.equal(legalData.legalBasis.citation, "BGBl. 2025 I Nr. 360");
  assert.equal(legalData.sources.federalGazette.url, "https://www.recht.bund.de/eli/bund/bgbl-1/2025/360");

  for (const source of Object.values(legalData.sources)) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:");
    assert.ok(OFFICIAL_SOURCE_HOSTS.has(url.hostname), `Nichtamtliche Quelle: ${url.hostname}`);
    assert.ok(source.title.trim().length > 0);
  }

  assert.deepEqual(Object.keys(legalData.allowanceSets), ["bund", "ffb", "muenchen", "landkreisMuenchen"]);
  for (const allowanceSet of Object.values(legalData.allowanceSets)) {
    assert.ok(allowanceSet.label.trim().length > 0);
    for (const key of REQUIRED_ALLOWANCE_KEYS) {
      assert.ok(Number.isInteger(allowanceSet[key]) && allowanceSet[key] > 0, `${allowanceSet.label}: ${key}`);
    }
  }

  assert.deepEqual(legalData.monthlyRate, {
    incomeThreshold: 600,
    thresholdRate: 300,
    incomeDivisor: 2,
    minimumRate: 10,
    maximumInstallments: 48,
  });
  for (const [key, value] of Object.entries(legalData.monthlyRate)) {
    assert.ok(Number.isInteger(value) && value > 0, `Ungültiger Ratenparameter: ${key}`);
  }
});

test("verwendet das Manifest als einzige Quelle für den Rechtsstand", async () => {
  assert.deepEqual(LEGAL_DATA, legalData);
  assert.deepEqual(ALLOWANCE_SETS, legalData.allowanceSets);

  const productionFiles = await Promise.all([
    readFile(new URL("../app/pkh-law.mjs", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../standalone/index.html", import.meta.url), "utf8"),
  ]);
  const duplicatedLegalState = /PKHB 2026|BGBl\. 2025 I Nr\. 360|60_000|600,00|300,00|48 Monatsraten|Ratenrechner 2026/;
  for (const source of productionFiles) {
    assert.doesNotMatch(source, duplicatedLegalState);
  }
});

test("leitet die Ratenparameter aus dem Manifest ab", () => {
  const { incomeThreshold, thresholdRate, minimumRate } = legalData.monthlyRate;
  assert.equal(calculateMonthlyRate(incomeThreshold), thresholdRate);
  assert.equal(calculateMonthlyRate((minimumRate * legalData.monthlyRate.incomeDivisor) - 0.01), 0);
  assert.equal(calculateMonthlyRate(incomeThreshold + 1.75), thresholdRate + 1);
});

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
  assert.deepEqual(ALLOWANCE_SETS, {
    bund: {
      label: "Übriges Bundesgebiet",
      employed: 282,
      party: 619,
      adult: 496,
      teen: 518,
      child: 429,
      youngChild: 393,
    },
    ffb: {
      label: "Landkreis Fürstenfeldbruck",
      employed: 295,
      party: 649,
      adult: 520,
      teen: 540,
      child: 443,
      youngChild: 408,
    },
    muenchen: {
      label: "Landeshauptstadt München",
      employed: 296,
      party: 650,
      adult: 519,
      teen: 541,
      child: 446,
      youngChild: 407,
    },
    landkreisMuenchen: {
      label: "Landkreis München",
      employed: 290,
      party: 637,
      adult: 510,
      teen: 534,
      child: 441,
      youngChild: 404,
    },
  });
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

test("stellt einen automatischen Single-HTML-Release bereit", async () => {
  const [packageJson, releaseWorkflow, buildScript, readme] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/release.yml", import.meta.url), "utf8"),
    readFile(new URL("../scripts/build-single-html.mjs", import.meta.url), "utf8"),
    readFile(new URL("../README.md", import.meta.url), "utf8"),
  ]);

  assert.match(packageJson, /"build:single":\s*"node scripts\/build-single-html\.mjs"/);
  assert.match(releaseWorkflow, /tags:\s*\n\s*- "v\*"/);
  assert.match(releaseWorkflow, /id:\s*artifacts/);
  assert.match(releaseWorkflow, /steps\.artifacts\.outputs\.html/);
  assert.match(releaseWorkflow, /steps\.artifacts\.outputs\.checksum/);
  assert.doesNotMatch(releaseWorkflow, /PKH-VKH-Rechner-2026\.html/);
  assert.match(buildScript, /legal-data\.json/);
  assert.match(buildScript, /legalData\.calculationYear/);
  assert.match(buildScript, /process\.env\.GITHUB_OUTPUT/);
  assert.doesNotMatch(buildScript, /PKH-VKH-Rechner-2026\.html/);
  assert.match(buildScript, /createHash\("sha256"\)/);
  assert.match(readme, /github\.com\/flathack\/PKH-VKH-Rechner\/releases\/latest/);
  assert.doesNotMatch(readme, /PKH-VKH-Rechner-2026\.html|PKHB 2026|BGBl\. 2025 I Nr\. 360/);
});

test("erzeugt maschinenlesbare Release-Pfade mit gültiger SHA-256-Prüfsumme", async () => {
  const tempDirectory = await mkdtemp(join(tmpdir(), "pkh-vkh-release-test-"));
  const githubOutput = join(tempDirectory, "github-output");

  try {
    await execFileAsync(process.execPath, ["scripts/build-single-html.mjs"], {
      cwd: PROJECT_ROOT,
      env: { ...process.env, GITHUB_OUTPUT: githubOutput },
      maxBuffer: 10 * 1024 * 1024,
    });

    const outputLines = (await readFile(githubOutput, "utf8")).trim().split("\n");
    const outputs = Object.fromEntries(outputLines.map((line) => line.split("=", 2)));
    assert.deepEqual(Object.keys(outputs).sort(), ["checksum", "html"]);

    const htmlPath = resolve(PROJECT_ROOT, outputs.html);
    const checksumPath = resolve(PROJECT_ROOT, outputs.checksum);
    const html = await readFile(htmlPath);
    const [expectedHash, expectedFilename] = (await readFile(checksumPath, "utf8")).trim().split(/\s+/);
    const actualHash = createHash("sha256").update(html).digest("hex");

    assert.equal(expectedFilename, basename(htmlPath));
    assert.equal(actualHash, expectedHash);
  } finally {
    await rm(tempDirectory, { recursive: true, force: true });
  }
});
