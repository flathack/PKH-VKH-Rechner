import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { THEMES, THEME_STORAGE_KEY } from "../../app/theme.mjs";
import legalData from "../../app/legal-data.json" with { type: "json" };

test("alle Themes bleiben lesbar, erhalten Eingaben und speichern nur die Darstellung", async ({ page }, testInfo) => {
  await page.goto("./");
  await page.locator("#approval-date").fill("2026-10-18");
  await page.locator("#net-income").fill("2000");
  await expect(page.locator(".result-card .rate")).toHaveText("1.081,00 €");
  for (const theme of THEMES) {
    await page.locator("#theme-select").selectOption(theme.value);
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme.value);
    await expect(page.locator("#net-income")).toHaveValue("2000");
    await expect(page.locator(".result-card .rate")).toHaveText("1.081,00 €");
    await page.evaluate(() => document.fonts.ready);
    const contrasts = await page.evaluate(() => {
      const rgb = (color) => (color.match(/[\d.]+/g) ?? []).map(Number);
      const background = (element) => {
        if (!element) return [255, 255, 255];
        const color = rgb(getComputedStyle(element).backgroundColor);
        const alpha = color.length > 3 ? color[3] : 1;
        const behind = alpha < 1 ? background(element.parentElement) : color;
        return color.slice(0, 3).map((channel, index) => channel * alpha + behind[index] * (1 - alpha));
      };
      const luminance = (color) => color.map((value) => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, index) => sum + v * [.2126, .7152, .0722][index], 0);
      return [".field-label", "#einkommen .section-heading p", "#einkommen .field small", ".result-card .law-links a", ".primary-button"].map((selector) => {
        const element = document.querySelector(selector);
        const foreground = luminance(rgb(getComputedStyle(element).color));
        const bg = luminance(background(element));
        return { selector, ratio: (Math.max(foreground, bg) + .05) / (Math.min(foreground, bg) + .05) };
      });
    });
    for (const item of contrasts) expect(item.ratio, `${theme.value}: ${item.selector}`).toBeGreaterThanOrEqual(4.5);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`theme-${theme.value}.png`) });
  }
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([THEME_STORAGE_KEY]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "ice");
  await expect(page.locator("#theme-select")).toHaveValue("ice");
  await expect(page.locator("#net-income")).toHaveValue("");
});

test("Themes funktionieren auch bei gesperrtem Browserspeicher", async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Gesperrt", "SecurityError"); } }); });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.locator("#approval-date").fill("2026-10-18");
  await page.locator("#theme-select").selectOption("amber");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "amber");
  await page.locator("#net-income").fill("2000");
  await expect(page.locator(".result-card .rate")).toHaveText("1.081,00 €");
  expect(errors).toEqual([]);
});

test("320 bis 430 Pixel: dynamische Eingaben ohne Überlauf und Ergebnis erreichbar", async ({ page }, testInfo) => {
  await page.goto("./");
  await page.locator("#approval-date").fill("2026-10-18");
  await page.locator("#net-income").fill("2000");
  await page.getByRole("button", { name: "+ Kind / Person", exact: true }).click();
  await page.getByRole("button", { name: "+ Zeile", exact: true }).click();
  await page.getByRole("button", { name: "+ Einnahme", exact: true }).click();
  for (const width of [320, 375, 430]) {
    await page.setViewportSize({ width, height: 740 });
    for (const theme of THEMES) {
      await page.locator("#theme-select").selectOption(theme.value);
      await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
      await page.locator("#approval-date").fill("");
      await expect(page.locator(".mobile-result-bar strong")).toHaveText("Angaben fehlen");
      await expect(page.locator("body")).toHaveJSProperty("scrollWidth", width);
      const [text, link] = await Promise.all([page.locator(".mobile-result-bar strong").boundingBox(), page.locator(".mobile-result-bar a").boundingBox()]);
      expect(text.x + text.width).toBeLessThanOrEqual(link.x);
      await page.locator("#approval-date").fill("2026-10-18");
      const fields = await page.locator('input:not([type="checkbox"]), select').evaluateAll((elements) => elements.filter((element) => element.getBoundingClientRect().width > 0).map((element) => ({ id: element.id, width: element.getBoundingClientRect().width, height: element.getBoundingClientRect().height, fontSize: parseFloat(getComputedStyle(element).fontSize), right: element.getBoundingClientRect().right })));
      for (const field of fields) {
        expect(field.width, field.id).toBeGreaterThanOrEqual(44);
        expect(field.height, field.id).toBeGreaterThanOrEqual(44);
        expect(field.right, field.id).toBeLessThanOrEqual(width);
        expect(field.fontSize, field.id).toBeGreaterThanOrEqual(16);
      }
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({ path: testInfo.outputPath(`smartphone-${width}.png`) });
  }
  await page.getByRole("link", { name: "Ergebnis ansehen" }).click();
  await expect(page.locator(".result-card .rate")).toBeInViewport();
  await expect(page.locator("#einkommen")).not.toBeInViewport();
});

test("Suchmaschinen und Besucher erhalten sinnvolle Inhalte ohne JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("PKH- und VKH-Rechner");
    await expect(page.getByRole("heading", { name: "PKH und VKH berechnen – so geht’s" })).toBeVisible();
    await page.getByText("Kann ich Fahrtkosten zur Arbeit abziehen?", { exact: true }).click();
    await expect(page.getByText(/Der Bereich Fahrtkosten bietet eine Pkw-Pauschale/)).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://flathack.github.io/PKH-VKH-Rechner/");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /social-card\.png$/);
    for (const selector of ['link[rel="icon"][type="image/svg+xml"]', 'link[rel="icon"][type="image/png"]', 'link[rel="apple-touch-icon"]', 'link[rel="manifest"]']) {
      const url = new URL(await page.locator(selector).getAttribute("href"), page.url());
      expect(url.origin).toBe(new URL(page.url()).origin);
      expect((await page.request.get(url.href)).ok()).toBe(true);
    }
  } finally { await context.close(); }
});

test("Offline-Datei lädt auch im dunklen Theme alle Assets ohne Netzabruf", async ({ page }) => {
  const requests = [];
  page.on("request", (request) => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await page.goto(pathToFileURL(resolve(`release/PKH-VKH-Rechner-${legalData.calculationYear}.html`)).href);
  await page.locator("#theme-select").selectOption("terminal");
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "terminal");
  expect(await page.evaluate(() => document.fonts.check('14px "PKH Mono"'))).toBe(true);
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".print-document")).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  expect(requests).toEqual([]);
});
