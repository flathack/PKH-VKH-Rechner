import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import legalData from "../../app/legal-data.json" with { type: "json" };

async function enterBaseCase(page) {
  await page.locator("#approval-date").fill("2026-10-18");
  await page.locator("#net-income").fill("2000");
  await page.getByText("Partei ist erwerbstätig", { exact: true }).click();
  await page.locator("#warm-rent").fill("500");
  await page.locator("#insurance-work").fill("50");
  await expect(page.locator(".result-card .rate")).toHaveText("274,00 €");
}

async function enterCar(page, distance = "25") {
  await page.locator("#travel-method").selectOption("car");
  await page.locator("#travel-distance").fill(distance);
  await page.locator("#travel-reason").fill("Kein ÖPNV bei Schichtbeginn");
}

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await enterBaseCase(page);
});

test("Pkw-Abzug und Monatsrate stimmen in Eingabe, Ergebnis und Druck überein", async ({ page }, testInfo) => {
  await enterCar(page);
  await page.locator("#travel-evidence").fill("Anlage 4, Schichtplan");
  await expect(page.getByTestId("travel-result")).toContainText("130,00 €");
  await expect(page.getByTestId("summary-travel")).toContainText("− 130,00 €");
  await expect(page.locator(".result-card .rate")).toHaveText("209,00 €");
  await page.getByRole("heading", { name: "Fahrtkosten zur Arbeit", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("fahrtkosten.png") });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", await page.locator("body").evaluate((body) => body.clientWidth));

  await page.locator("#theme-select").selectOption("ice");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.getByTestId("print-travel")).toBeVisible();
  await expect(page.getByTestId("print-travel")).toContainText("25 volle einfache Entfernungskilometer");
  await expect(page.getByTestId("print-travel")).toContainText("Anlage 4, Schichtplan");
  await expect(page.getByTestId("print-travel").locator("td")).toHaveText("− 130,00 €");
  await expect(page.locator(".document-rate strong")).toHaveText("209,00 €");
  if (testInfo.project.name === "desktop") await page.pdf({ path: testInfo.outputPath("berechnungsvermerk.pdf"), format: "A4" });
});

test("fehlende Begründung sperrt Ergebnis und Druck, null Kilometer ist gültig", async ({ page }) => {
  await page.locator("#travel-method").selectOption("car");
  await page.locator("#travel-distance").fill("25");
  await expect(page.locator(".result-card .rate")).toHaveText("—");
  await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeDisabled();
  await page.locator("#travel-reason").fill("Kein zumutbarer ÖPNV");
  await page.locator("#travel-distance").fill("0");
  await expect(page.locator(".result-card .rate")).toHaveText("274,00 €");
  await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeEnabled();
});

test("volle Kilometer und Strecken über 40 km werden richtig angesetzt", async ({ page }) => {
  await enterCar(page, "24.9");
  await expect(page.getByTestId("summary-travel")).toContainText("124,80 €");
  await page.locator("#travel-distance").fill("50");
  await expect(page.getByTestId("summary-travel")).toContainText("260,00 €");
  await expect(page.locator(".result-card .rate")).toHaveText("144,00 €");
  await expect(page.getByTestId("print-travel").locator("td")).toHaveText("− 260,00 €");
});

test("Erstattung als Einnahme oder als Kürzung ergibt dieselbe Rate", async ({ page }) => {
  await enterCar(page);
  await page.locator("#travel-reimbursement").fill("30");
  await expect(page.getByTestId("summary-travel")).toContainText("100,00 €");
  await expect(page.locator(".result-card .rate")).toHaveText("224,00 €");
  await page.locator("#travel-reimbursement").fill("200");
  await expect(page.locator(".result-card .rate")).toHaveText("274,00 €");
  await expect(page.getByText(/Die Erstattung übersteigt den Fahrtkostenansatz um/)).toContainText("70,00 €");
  await page.locator("#travel-reimbursement").fill("30");
  await page.getByText("Erstattung ist bereits im erfassten Einkommen enthalten", { exact: true }).click();
  await page.locator("#other-income").fill("30");
  await expect(page.getByTestId("summary-travel")).toContainText("130,00 €");
  await expect(page.locator(".result-card .rate")).toHaveText("224,00 €");
  await expect(page.getByTestId("print-travel")).toContainText("bereits im Einkommen enthalten");
});

test("ÖPNV und begründeter Sonderbetrag ersetzen die Pkw-Pauschale", async ({ page }) => {
  await enterCar(page);
  await page.locator("#travel-method").selectOption("public");
  await expect(page.locator(".result-card .rate")).toHaveText("—");
  await page.locator("#travel-monthly").fill("61.25");
  await expect(page.locator(".result-card .rate")).toHaveText("243,00 €");
  await expect(page.getByTestId("print-travel").locator("td")).toHaveText("− 61,25 €");
  await expect(page.getByTestId("print-travel")).not.toContainText("Kein ÖPNV bei Schichtbeginn");
  await page.locator("#travel-method").selectOption("manual");
  await page.locator("#travel-monthly").fill("312.40");
  await page.locator("#travel-reason").fill("Gerichtlich geprüfter Ansatz für diesen Monat");
  await expect(page.locator(".result-card .rate")).toHaveText("118,00 €");
  await expect(page.getByTestId("print-travel").locator("td")).toHaveText("− 312,40 €");
  await page.locator("#travel-method").selectOption("none");
  await expect(page.locator(".result-card .rate")).toHaveText("274,00 €");
  await expect(page.getByTestId("print-travel")).toHaveCount(0);
  await page.getByRole("button", { name: "Eingaben zurücksetzen" }).click();
  await expect(page.locator("#travel-method")).toHaveValue("none");
  await expect(page.locator("#net-income")).toHaveValue("");
});

test("Offline-HTML berechnet dieselben Beträge ohne Netzabruf", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(pathToFileURL(resolve(`release/PKH-VKH-Rechner-${legalData.calculationYear}.html`)).href);
  await enterBaseCase(page);
  await enterCar(page);
  await expect(page.locator(".result-card .rate")).toHaveText("209,00 €");
  await expect(page.getByTestId("print-travel").locator("td")).toHaveText("− 130,00 €");
  expect(requests).toEqual([]);
});
