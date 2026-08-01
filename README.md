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

## Automatische Rechtsstandsaktualisierung

Die Wartungsautomation prüft amtliche Quellen in Zeitfenstern rund um den
1. Januar und 1. Juni. Sie veröffentlicht nur vollständig belegte Änderungen,
die sämtliche Tests und Builds bestehen. Das fail-closed Verfahren ist in
[`docs/legal-update-runbook.md`](docs/legal-update-runbook.md) beschrieben.

## Rechtlicher Hinweis

Dieser Rechner ist ein privates Hobbyprojekt eines Rechtspflegers. Er ist kein
offizielles Angebot eines Gerichts oder einer Behörde und ersetzt keine
Rechtsberatung.

Trotz sorgfältiger Entwicklung und Pflege besteht kein Anspruch auf Richtigkeit,
Vollständigkeit oder Aktualität. Die Berechnung und ihr Ergebnis sind
unverbindlich; maßgeblich sind die geltenden Rechtsvorschriften und die
Entscheidung des zuständigen Gerichts.

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
