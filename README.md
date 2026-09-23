# PKH · VKH Ratenrechner

**Online-Version:** https://flathack.github.io/PKH-VKH-Rechner/

**Download als einzelne HTML-Datei:**
https://github.com/flathack/PKH-VKH-Rechner/releases/latest

Die heruntergeladene Datei kann direkt per Doppelklick im Browser geöffnet
werden. Sie enthält den vollständigen Rechner und benötigt keine Installation
oder Internetverbindung.

Lokale Browser-Anwendung zur überschlägigen Berechnung einer Monatsrate für
Prozess- und Verfahrenskostenhilfe nach § 115 ZPO.

## Funktionsumfang

- Freibeträge des aktuell hinterlegten Rechtsstands für Bund, Fürstenfeldbruck und München
- Einkünfte, Pflichtabzüge und Erwerbstätigenfreibetrag
- Ehe-/Lebenspartner und weitere unterhaltene Personen
- Wohnkostenaufteilung nach Einkommen oder Köpfen
- Mehrbedarfe und besondere Belastungen
- druckbare Ergebnisübersicht
- Bewilligungsdatum mit geprüften Rechtsständen 2025 und 2026; andere Daten werden nicht stillschweigend mit aktuellen Werten berechnet
- optionale Angaben zu einzusetzendem Vermögen und voraussichtlichen Kosten für den Vier-Raten-Vergleich
- Einzelpositionen für weitere Einnahmen mit Empfänger, Zeitraum und Belegverweis
- begründbarer Wohnkostenanteil und Folgeraten nach Wegfall befristeter Belastungen
- vollständig lokale Verarbeitung ohne Speicherung oder Datenübertragung

## Rechtsgrundlagen und Rechenstand

- § 115 ZPO: einsetzbares Einkommen, Abzüge und Monatsraten
- § 82 Abs. 2 SGB XII: Steuern, Sozialversicherung, angemessene Versicherungen und notwendige Erwerbskosten
- § 21 SGB II und § 30 SGB XII: anerkannte Mehrbedarfe
- aktuelle Prozesskostenhilfebekanntmachung: bundesweite und regional erhöhte Freibeträge

Der maschinenlesbare Rechtsstand mit Gültigkeitsdatum, Fundstelle, amtlichen
Quellen, Freibeträgen und Ratenparametern liegt zentral in
[`app/legal-data.json`](app/legal-data.json). Die Anwendung zeigt den dort
hinterlegten Rechenstand an.

Bereits geprüfte frühere Jahrgänge stehen in [`app/legal-history.json`](app/legal-history.json).
Der Rechner ist ein Berechnungsvermerk für die Einkommensrate. Vermögensprüfung,
Angemessenheit von Abzügen, Belege und die gerichtliche Festsetzung bleiben
Einzelfallentscheidungen. Fehlt ein unterstützter Rechtsstand oder eine für die
gewählte Wohnkostenaufteilung notwendige Angabe, ist der Ausdruck gesperrt.

## Automatische Rechtsstandsaktualisierung

Die Wartungsautomation prüft amtliche Quellen in Zeitfenstern rund um den
1. Januar und 1. Juni. Sie veröffentlicht nur vollständig belegte Änderungen,
die sämtliche Tests und Builds bestehen. Das fail-closed Verfahren ist in
[`docs/legal-update-runbook.md`](docs/legal-update-runbook.md) beschrieben.

## Lokal starten

Voraussetzung ist Node.js ab Version 22.13.

```bash
npm install
npm run dev
```

Die im Terminal angezeigte lokale Adresse anschließend im Browser öffnen.

## Prüfen

```bash
npm run build
npm test
npm run build:pages
npm run build:single
```

Der statische GitHub-Pages-Build wird bei Änderungen auf `main` automatisch
veröffentlicht. Der Ein-Datei-Build wird bei einem Versions-Tag automatisch
als HTML-Datei unter GitHub Releases bereitgestellt.
