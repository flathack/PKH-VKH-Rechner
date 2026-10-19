import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { BRAND_ICON_SVG } from "../app/branding.mjs";

await mkdir(new URL("../public/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/favicon.svg", import.meta.url), BRAND_ICON_SVG);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const [name, size] of [["favicon-48.png", 48], ["apple-touch-icon.png", 180], ["icon-192.png", 192], ["icon-512.png", 512]]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:${size === 48 ? "transparent" : "#173f4c"}}svg{display:block;width:100%;height:100%}</style>${BRAND_ICON_SVG}`);
    await page.screenshot({ path: new URL(`../public/${name}`, import.meta.url).pathname, omitBackground: true });
  }
  await page.setViewportSize({ width: 1200, height: 630 });
  await page.setContent(`<html lang="de"><style>*{box-sizing:border-box}html,body{margin:0;width:1200px;height:630px;background:#173f4c;color:#fff;font-family:Arial,sans-serif}.card{padding:58px 70px;height:100%;display:flex;flex-direction:column}.brand{display:flex;align-items:center;gap:20px;font-size:28px;font-weight:700;letter-spacing:3px}.brand svg{width:76px;height:76px}.tag{margin-left:auto;font-size:19px;font-weight:400;letter-spacing:0;color:#d0e0e3;border:1px solid #72909a;padding:12px 18px}h1{font-family:Georgia,serif;font-size:64px;line-height:1.12;font-weight:400;margin:42px 0 28px;letter-spacing:-1px}.bottom{margin-top:auto;border-top:1px solid #72909a;padding-top:24px;display:flex;align-items:center;justify-content:space-between;font-size:23px;color:#d0e0e3}.bottom strong{color:#e8ba76;font-size:25px;font-weight:400}</style><div class="card"><div class="brand">${BRAND_ICON_SVG}<span>PKH · VKH</span><span class="tag">Lokal im Browser</span></div><h1>Prozess- und<br>Verfahrenskostenhilfe</h1><div class="bottom"><strong>Monatsrate berechnen</strong><span>Einkommen · Unterhalt · Fahrtkosten</span></div></div></html>`);
  await page.screenshot({ path: new URL("../public/social-card.png", import.meta.url).pathname });
} finally { await browser.close(); }
console.log("Icon, Smartphone-Icons und Link-Vorschau in public/ erzeugt.");
