import assert from "node:assert/strict";
import test from "node:test";
import { parseAmount, amountToCents } from "../app/amounts.mjs";
import { calculatePkh, calculateMonthlyRateFromCents } from "../app/pkh-law.mjs";
import { monthlyIncome } from "../app/income-items.mjs";
import { reviewAudit } from "../scripts/audit-policy.mjs";
import { zipSync, unzipSync } from "fflate";

function input(overrides = {}) {
  return { location: "bund", netIncome: 2000, otherIncome: 0, annualPayments: 0, mandatoryDeductions: 0,
    employed: false, spouse: false, dependents: [], warmRent: 0, housingMode: "full", householdPeople: 1,
    insuranceAndWork: 0, additionalMaintenance: 0, additionalNeeds: 0, specialBurdens: 0,
    customDeductions: [], approvalDate: "2026-10-19", assetContribution: 0, estimatedCosts: 1000, ...overrides };
}

test("Dezimalzeichen werden eindeutig und verlustfrei in Cent umgewandelt (#10)", () => {
  for (const [text, cents] of [["1234,56", 123456], ["1234.56", 123456], ["0,05", 5], [".50", 50], ["00012,30", 1230], ["1000000000", 100000000000]]) {
    const result = parseAmount(text);
    assert.equal(result.error, "", text);
    assert.equal(amountToCents(result.value), cents, text);
  }
  assert.deepEqual(parseAmount(""), { value: 0, error: "" });
  assert.deepEqual(parseAmount("", { optional: true }), { value: null, error: "" });
});

test("Ungültige Geldwerte werden nicht zu Null oder Unendlich (#13)", () => {
  for (const text of ["1e308", "1e309", "NaN", "Infinity", "2.345", "1.234,56", "1,234.56", "-1", "12,", ",", "1000000000.01"]) {
    assert.notEqual(parseAmount(text).error, "", text);
  }
  for (const number of [Infinity, NaN, 1e308, 1e14, 2.345]) assert.throws(() => amountToCents(number), RangeError);
  for (const cents of [NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => calculateMonthlyRateFromCents(cents), RangeError);
  assert.throws(() => calculatePkh(input({ netIncome: Infinity })), RangeError);
  assert.throws(() => monthlyIncome({ amount: NaN, period: "annual" }), RangeError);
  assert.equal(amountToCents(32.37 - .37), 3200);
});

test("Kostendeckung folgt den Ratenstufen einschließlich Nullraten (#11)", () => {
  // 40 Euro im Oktober + 14 * 1081 Euro ab November decken 15000 Euro.
  const changing = calculatePkh(input({ specialBurdens: 1300, specialEndDate: "2026-10", estimatedCosts: 15000 }));
  assert.equal(changing.monthlyRate, 40);
  assert.equal(changing.installmentsToCoverCosts, 15);
  assert.equal(changing.costsCoveredWithinCap, true);
  assert.equal(changing.maximumContribution, 40 + 47 * 1081);
  const zero = calculatePkh(input({ specialBurdens: 1400, specialEndDate: "2026-10" }));
  assert.equal(zero.monthlyRate, 0);
  assert.equal(zero.installmentsToCoverCosts, 1);
  assert.equal(zero.maximumContribution, 48 * 1081);
  assert.equal(zero.costsCoveredWithinCap, true);
});

test("Kosten vor/nach einer Stufe, mehrere Endmonate und Zahlungen jenseits der Grenze (#9, #11)", () => {
  const base = input({ specialBurdens: 100, specialEndDate: "2026-10", customDeductions: [{ amount: 50, endMonth: "2026-11" }] });
  // Oktober 931 Euro, November 1031 Euro, anschließend 1081 Euro.
  for (const [costs, payments] of [[931, 1], [931.01, 2], [1962, 2], [1962.01, 3]]) {
    assert.equal(calculatePkh({ ...base, estimatedCosts: costs }).installmentsToCoverCosts, payments);
  }
  const max = 931 + 1031 + 46 * 1081;
  assert.equal(calculatePkh(base).maximumContribution, max);
  assert.equal(calculatePkh({ ...base, estimatedCosts: max }).costsCoveredWithinCap, true);
  const beyond = calculatePkh({ ...base, estimatedCosts: max + .01 });
  assert.equal(beyond.installmentsToCoverCosts, 49);
  assert.equal(beyond.costsCoveredWithinCap, false);
  assert.equal(calculatePkh({ ...base, estimatedCosts: 0 }).installmentsToCoverCosts, 0);
});

test("Expliziter Ratenbeginn ersetzt die Annahme Bewilligungsmonat (#11)", () => {
  const base = input({ specialBurdens: 1300, specialEndDate: "2026-10", paymentStartMonth: "2026-11", estimatedCosts: 15000 });
  const result = calculatePkh(base);
  assert.equal(result.paymentPlanStartMonth, "2026-11");
  assert.equal(result.installmentsToCoverCosts, 14);
  assert.equal(result.maximumContribution, 48 * 1081);
  assert.equal(calculatePkh({ ...base, paymentStartMonth: "2026-09" }).paymentPlanIncomplete, true);
  assert.equal(calculatePkh({ ...base, paymentStartMonth: "2026-13" }).paymentPlanIncomplete, true);
  assert.equal(calculatePkh({ ...base, paymentStartMonth: "", approvalDate: undefined }).paymentPlanIncomplete, true);
  const invalidEnd = calculatePkh({ ...base, specialEndDate: "10000-01" });
  assert.equal(invalidEnd.invalidBurdenEndInput, true);
  assert.deepEqual(invalidEnd.futureRates, []);
});

test("Nullrate ohne spätere Steigerung verspricht keine Kostendeckung (#11)", () => {
  const result = calculatePkh(input({ netIncome: 0 }));
  assert.equal(result.maximumContribution, 0);
  assert.equal(result.installmentsToCoverCosts, null);
  assert.equal(result.costsCoveredWithinCap, false);
});

test("Unabhängige Referenztabelle für Mindestbetrag und 600-Euro-Grenze (#9)", () => {
  // Bundesfreibetrag 619 Euro, keine weiteren Abzüge. Die Sollwerte folgen
  // unabhängig der Fallunterscheidung Hälfte / 300 + Rest, jeweils abgerundet.
  for (const [netIncome, disposable, rate] of [[638.99, 19.99, 0], [639, 20, 10],
    [1218.99, 599.99, 299], [1219, 600, 300], [1219.01, 600.01, 300], [1220, 601, 301]]) {
    const result = calculatePkh(input({ netIncome }));
    assert.equal(result.disposableIncome, disposable);
    assert.equal(result.monthlyRate, rate);
  }
});

test("Kombinierte Referenzfälle mit Unterhalt, Bereinigung und Wohnkosten (#9)", () => {
  const base = input({ netIncome: 2400, mandatoryDeductions: 200, spouse: true, spouseIncome: 500,
    spouseIncomeDeductions: 100, dependents: [{ kind: "adultEmployed", ownIncome: 600, ownIncomeDeductions: 50 }, { kind: "youngChild", ownIncome: 100 }],
    warmRent: 900, housingMode: "heads", householdPeople: 3, insuranceAndWork: 50, customDeductions: [{ amount: 25 }] });
  // 2400 - 200 - (619 + 219 + 228 + 293) - 300 - 50 - 25 = 466 -> 233.
  const result = calculatePkh(base);
  assert.equal(result.disposableIncome, 466);
  assert.equal(result.monthlyRate, 233);
  // Statt 293 Euro Freibetrag genau 300 Euro Unterhaltszahlung: 459 -> 229.
  const maintenance = calculatePkh({ ...base, dependents: [base.dependents[0], { kind: "youngChild", deductionMode: "maintenance", maintenancePayment: 300 }] });
  assert.equal(maintenance.disposableIncome, 459);
  assert.equal(maintenance.monthlyRate, 229);
  const allocated = calculatePkh(input({ netIncome: 2000, mandatoryDeductions: 100, warmRent: 1000, housingMode: "income", otherHouseholdIncome: 500 }));
  // 1000 * 1900 / 2400 = 791,67 Euro; 2000 - 100 - 619 - 791,67 = 489,33.
  assert.equal(allocated.housingShare, 791.67);
  assert.equal(allocated.disposableIncome, 489.33);
  assert.equal(allocated.monthlyRate, 244);
});

test("Tooling-Ausnahme unterdrückt weder neue Ursachen noch kritische Meldungen (#15)", () => {
  const report = { vulnerabilities: { braces: { severity: "high", nodes: ["node_modules/braces"], via: [{ name: "braces", severity: "high", url: "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm" }] } } };
  const lock = { packages: { "node_modules/braces": { version: "3.0.3" } } };
  assert.deepEqual(reviewAudit(report, lock, "2026-10-19"), { reviewed: ["braces"], blocked: [] });
  assert.deepEqual(reviewAudit(report, lock, "2026-11-19").blocked, ["braces"]);
  assert.deepEqual(reviewAudit(report, { packages: {} }, "2026-10-19").blocked, ["braces"]);
  const critical = structuredClone(report); critical.vulnerabilities.braces.severity = "critical";
  assert.deepEqual(reviewAudit(critical, lock, "2026-10-19").blocked, ["braces"]);
  const newCause = structuredClone(report); newCause.vulnerabilities.braces.via[0].url = "https://github.com/advisories/new";
  assert.deepEqual(reviewAudit(newCause, lock, "2026-10-19").blocked, ["braces"]);
  const extraPath = structuredClone(report); extraPath.vulnerabilities.braces.nodes.push("node_modules/runtime/node_modules/braces");
  assert.deepEqual(reviewAudit(extraPath, lock, "2026-10-19").blocked, ["braces"]);
});

test("fflate-Override erhält die synchrone ZIP-API für Schriftdaten (#15)", () => {
  const bytes = new TextEncoder().encode("PKH und VKH – äöü");
  assert.deepEqual(unzipSync(zipSync({ "font-data": bytes }))["font-data"], bytes);
});
