import legalData from "./legal-data.json";

export const PUBLIC_SITE_URL = "https://flathack.github.io/PKH-VKH-Rechner/";
export const PUBLIC_SITEMAP_URL = new URL("sitemap.xml", PUBLIC_SITE_URL).href;
export const PUBLIC_ICON_URL = new URL("favicon.svg", PUBLIC_SITE_URL).href;
export const PUBLIC_SOCIAL_IMAGE_URL = new URL("social-card.png", PUBLIC_SITE_URL).href;
export const SEO_TITLE = `PKH-/VKH-Rechner ${legalData.calculationYear} – Prozesskostenhilfe nach § 115 ZPO`;
export const SEO_DESCRIPTION = `PKH-/VKH-Rechner ${legalData.calculationYear}: Monatsrate nach § 115 ZPO mit Freibeträgen, Unterhalt, Wohn- und Fahrtkosten berechnen. Kostenlos und lokal ohne Upload.`;
export const SEO_HEADING = `PKH- und VKH-Rechner ${legalData.calculationYear}`;
export const SEO_INTRO = "Monatsrate für Prozess- und Verfahrenskostenhilfe nach § 115 ZPO überschlägig berechnen – lokal und ohne Datenübertragung.";
export const SEO_PRIVACY_NOTE = "Alle Eingaben und Berechnungen bleiben ausschließlich in diesem Browser.";
export const ZPO_SECTION_115_URL = legalData.sources.zpo115.url;
export const RELEASES_URL = "https://github.com/flathack/PKH-VKH-Rechner/releases/latest";
export const SEO_INFO_TITLE = "PKH und VKH berechnen – so geht’s";
export const SEO_INFO_INTRO = "Erfassen Sie Einkommen, unterhaltene Personen und monatliche Belastungen. Der Rechner ermittelt daraus das einzusetzende Einkommen und eine voraussichtliche Monatsrate. Rechtsstand, Rechenweg und Belegverweise lassen sich als Berechnungsvermerk drucken.";
export const SEO_FAQ = [
  { question: "Welche Angaben brauche ich?", answer: "Sie benötigen den Wohnsitz, das voraussichtliche Bewilligungsdatum, monatliche Einkünfte, Angaben zu unterhaltenen Personen sowie Wohnkosten und anerkannte Abzüge. Vermögenseinsatz und voraussichtliche Verfahrenskosten können Sie für einen ergänzenden Kostenvergleich erfassen." },
  { question: "Kann ich Fahrtkosten zur Arbeit abziehen?", answer: "Der Bereich Fahrtkosten bietet eine Pkw-Pauschale nach einfacher Entfernung, notwendige ÖPNV-Kosten und einen begründeten geprüften Monatsbetrag. Erstattungen und Belegverweise werden gesondert erfasst." },
  { question: "Werden meine Berechnungsdaten gespeichert?", answer: "Die Berechnung erfolgt ausschließlich in diesem Browser. Einkommensangaben, Aktenzeichen und andere Berechnungsdaten werden weder gespeichert noch übertragen. Nur die gewählte Darstellung wird für den nächsten Besuch auf diesem Gerät gespeichert." },
  { question: "Kann ich den Rechner mobil und offline nutzen?", answer: "Der Rechner funktioniert auch auf dem Smartphone. Die Ergebnisübersicht ist über die kompakte Monatsratenleiste erreichbar. Mit der herunterladbaren HTML-Datei können Sie den Rechner auch ohne Internetverbindung verwenden und über den Druckdialog ein PDF erstellen." },
] as const;

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
  image: PUBLIC_SOCIAL_IMAGE_URL,
  featureList: ["PKH- und VKH-Monatsrate", "Freibeträge und Unterhalt", "Wohn- und Fahrtkosten", "Druckbarer Berechnungsvermerk", "Lokale Offline-Berechnung"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
} as const;

export const SEO_STRUCTURED_DATA_JSON = JSON.stringify(SEO_STRUCTURED_DATA).replaceAll("<", "\\u003c");
