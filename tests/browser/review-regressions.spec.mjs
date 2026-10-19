import { test, expect } from "@playwright/test";
import { THEMES } from "../../app/theme.mjs";

test.beforeEach(async ({ page }) => {
  await page.goto("./");
  await page.locator("#approval-date").fill("2026-10-19");
});

test("deutsche Beträge bleiben beim Tippen und Einfügen erhalten (#10)", async ({ page }) => {
  for (const amount of ["1234,56", "1234.56"]) {
    await page.locator("#net-income").fill("");
    await page.locator("#net-income").pressSequentially(amount);
    await expect(page.locator("#net-income")).toHaveValue(amount);
    await expect(page.locator(".breakdown")).toContainText("1.234,56 €");
    await expect(page.locator(".result-card .rate")).toHaveText("315,00 €");
  }
  await page.locator("#net-income").fill("0,05");
  await expect(page.locator(".breakdown")).toContainText("0,05 €");
  await page.locator("#assets").fill("100,05");
  await expect(page.locator("#assets")).toHaveValue("100,05");
});

test("ungültige Beträge sperren Ergebnis und Druck bis zur Korrektur (#13)", async ({ page }) => {
  for (const amount of ["1e308", "1e309", "2.345", "1.234,56", "-1", "12,"]) {
    await page.locator("#net-income").fill(amount);
    await expect(page.locator("#net-income")).toHaveAttribute("aria-invalid", "true");
    await expect(page.locator(".result-card .rate")).toHaveText("—");
    await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeDisabled();
    await expect(page.locator("#net-income-error")).toBeVisible();
  }
  await page.locator("#net-income").fill("2000");
  await expect(page.locator(".result-card .rate")).toHaveText("1.081,00 €");
  await page.locator("#assets").fill("1e309");
  await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeDisabled();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".invalid-print-warning")).toContainText("keine verwendbare Ratenberechnung");
  await expect(page.locator(".document-result")).not.toBeVisible();
  await page.emulateMedia({ media: "screen" });
  await page.getByRole("button", { name: "Eingaben zurücksetzen" }).click();
  await expect(page.locator("#assets")).toHaveValue("");
  await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeEnabled();
});

test("ausgeblendete oder entfernte ungültige Felder hinterlassen keine Sperre (#13)", async ({ page }) => {
  await page.locator("#travel-method").selectOption("public");
  await page.locator("#travel-monthly").fill("ungültig");
  await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeDisabled();
  await page.locator("#travel-method").selectOption("none");
  await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "+ Zeile", exact: true }).click();
  await page.locator('[id^="deduction-amount-"]').fill("2.345");
  await page.getByRole("button", { name: "Abzug 1 entfernen" }).click();
  await expect(page.getByRole("button", { name: "Drucken", exact: true })).toBeEnabled();
});

test("Desktop-Zeilen bleiben mit Zusatzfeldern in allen Themes nutzbar (#12)", async ({ page }, testInfo) => {
  await page.getByRole("button", { name: "+ Kind / Person", exact: true }).click();
  await page.getByRole("button", { name: "+ Zeile", exact: true }).click();
  for (const width of [1100, 1280, 1440]) {
    await page.setViewportSize({ width, height: 950 });
    for (const theme of THEMES) {
      await page.locator("#theme-select").selectOption(theme.value);
      const fields = await page.locator(".dependent-fields input:not([type=checkbox]), .dependent-fields select, .deduction-fields input").evaluateAll((elements) => elements.map((e) => ({ width: e.getBoundingClientRect().width, right: e.getBoundingClientRect().right })));
      for (const field of fields) {
        expect(field.width).toBeGreaterThanOrEqual(150);
        expect(field.right).toBeLessThan(width);
      }
    }
  }
  await page.locator(".dependent-row").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("desktop-personenzeile.png") });
});

test("Folgeraten bestimmen Kostendeckung und Obergrenze in Anzeige und Druck (#11)", async ({ page }) => {
  await page.locator("#net-income").fill("2000");
  await page.locator("#special-burdens").fill("1300");
  await page.locator("#special-end").fill("2026-10");
  await page.locator("#assets").fill("0");
  await page.locator("#costs").fill("15000");
  await expect(page.locator(".result-card .rate")).toHaveText("40,00 €");
  await expect(page.locator(".maximum strong")).toHaveText("50.847,00 €");
  await expect(page.locator("#vermoegen")).toContainText("15 (innerhalb von 48 Raten)");
  await page.locator("#payment-start").fill("2026-11");
  await expect(page.locator("#vermoegen")).toContainText("14 (innerhalb von 48 Raten)");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-document")).toContainText("Kostendeckung nach 14 Zahlungsraten");
  await expect(page.locator(".print-document")).toContainText("2026-11 (angegebener Ratenbeginn)");
});

test("historischer Rechtsstand und Bereinigungshinweis sind konsistent (#18, #19)", async ({ page }) => {
  await page.locator("#approval-date").fill("2025-10-19");
  await expect(page.locator(".hero h1")).toHaveText("PKH- und VKH-Rechner 2025");
  await page.locator("#approval-date").fill("2026-10-19");
  await expect(page.locator(".hero h1")).toHaveText("PKH- und VKH-Rechner 2026");
  await page.getByRole("button", { name: "+ Kind / Person", exact: true }).click();
  for (const kind of ["adultEmployed", "teenEmployed"]) {
    await page.locator(".dependent-fields select").first().selectOption(kind);
    await page.locator('[id^="dependent-income-"]').fill("500");
    await page.locator(".dependent-fields label.switch-row").click();
    await expect(page.locator(".dependent-allowance")).toContainText("kein weiterer Erwerbstätigenfreibetrag");
    await page.locator(".dependent-fields label.switch-row").click();
    await expect(page.locator(".dependent-allowance")).toContainText("Einkommen bereinigt um 282");
  }
});

test("Druckfassung enthält Jahresbeträge und Aufteilungsgrundlagen (#16, #17)", async ({ page }) => {
  await page.locator("#net-income").fill("2000");
  await page.locator("#annual-payments").fill("1000");
  await page.getByRole("button", { name: "+ Einnahme", exact: true }).click();
  await page.locator('[id^="income-"]').fill("1200");
  await page.locator(".entry-grid select").first().selectOption("annual");
  await page.locator("#warm-rent").fill("900");
  await page.locator("#housing-mode").selectOption("income");
  await page.locator("#household-income").fill("1000");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-document")).toContainText("Sonderzahlungen 1.000,00 € / 12");
  await expect(page.locator(".print-document")).toContainText("Jahresbetrag 1.200,00 € / 12");
  await expect(page.locator(".print-document")).toContainText("Gesamtkosten 900,00 €");
  await expect(page.locator(".print-document")).toContainText("Parteieinkommen nach Pflichtabzügen 2.183,33 €");
  await expect(page.locator(".print-document")).toContainText("übriges Haushaltseinkommen 1.000,00 €");
  await page.emulateMedia({ media: "screen" });
  await page.locator("#housing-mode").selectOption("heads");
  await page.locator("#household-people").fill("3");
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-document")).toContainText("3 Personen");
});

test("lange Belegverweise passen auf A4 auch aus einem dunklen Theme (#14)", async ({ page }, testInfo) => {
  await page.locator("#net-income").fill("2000");
  await page.locator("#theme-select").selectOption("ice");
  await page.locator("#travel-method").selectOption("public");
  await page.locator("#travel-monthly").fill("61");
  await page.locator("#travel-evidence").fill(`https://dokumente.example.org/akten/2026/${"Anlage_4_Nachweis_der_monatlichen_Fahrtkosten_".repeat(4)}.pdf`);
  await page.locator("#case-number").fill("Aktenzeichen".repeat(15));
  await page.locator("#assessment-note").fill("Prüfvermerk".repeat(40));
  await page.emulateMedia({ media: "print" });
  expect(await page.locator(".print-document").evaluate((e) => e.scrollWidth <= Math.ceil(e.getBoundingClientRect().width))).toBe(true);
  expect((await page.locator(".document-wordmark svg").boundingBox()).width).toBeGreaterThanOrEqual(45);
  const bounds = await page.locator(".print-document").evaluate((e) => ({ right: e.getBoundingClientRect().right, cells: [...e.querySelectorAll("td")].map((c) => c.getBoundingClientRect().right) }));
  for (const right of bounds.cells) expect(right).toBeLessThanOrEqual(bounds.right);
  if (testInfo.project.name === "desktop") await page.pdf({ path: testInfo.outputPath("lange-belege.pdf"), format: "A4" });
});
