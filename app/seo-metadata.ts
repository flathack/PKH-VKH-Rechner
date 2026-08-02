import legalData from "./legal-data.json";

export const PUBLIC_SITE_URL = "https://flathack.github.io/PKH-VKH-Rechner/";
export const PUBLIC_SITEMAP_URL = new URL("sitemap.xml", PUBLIC_SITE_URL).href;
export const SEO_TITLE = `PKH-/VKH-Rechner ${legalData.calculationYear} – Prozesskostenhilfe nach § 115 ZPO`;
export const SEO_DESCRIPTION = `PKH- und VKH-Ratenrechner ${legalData.calculationYear} zur überschlägigen Berechnung der Monatsrate für Prozesskostenhilfe und Verfahrenskostenhilfe nach § 115 ZPO.`;
export const SEO_HEADING = `Prozesskostenhilfe- und Verfahrenskostenhilfe-Rechner ${legalData.calculationYear}`;
export const SEO_INTRO = "Monatsrate für Prozess- und Verfahrenskostenhilfe nach § 115 ZPO überschlägig berechnen – lokal und ohne Datenübertragung.";
export const SEO_PRIVACY_NOTE = "Alle Eingaben und Berechnungen bleiben ausschließlich in diesem Browser.";
export const ZPO_SECTION_115_URL = legalData.sources.zpo115.url;

export const SEO_STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SEO_TITLE,
  url: PUBLIC_SITE_URL,
  description: SEO_DESCRIPTION,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Any",
  browserRequirements: "Requires JavaScript",
  inLanguage: "de-DE",
  isAccessibleForFree: true,
} as const;

export const SEO_STRUCTURED_DATA_JSON = JSON.stringify(SEO_STRUCTURED_DATA).replaceAll("<", "\\u003c");
