# PKH · VKH Ratenrechner

**Online-Version:** https://flathack.github.io/PKH-VKH-Rechner/

**Download als einzelne HTML-Datei:**
https://github.com/flathack/PKH-VKH-Rechner/releases/latest/download/PKH-VKH-Rechner-2026.html

Die heruntergeladene Datei kann direkt per Doppelklick im Browser geöffnet
werden. Sie enthält den vollständigen Rechner und benötigt keine Installation
oder Internetverbindung.

Lokale Browser-Anwendung zur überschlägigen Berechnung einer Monatsrate für
Prozess- und Verfahrenskostenhilfe nach § 115 ZPO.

## Funktionsumfang

- Freibeträge der PKHB 2026 für Bund, Fürstenfeldbruck und München
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
- PKHB 2026 (BGBl. 2025 I Nr. 360): bundesweite und regional erhöhte Freibeträge
- RBSFV 2026: Regelbedarfsstufen 563 / 506 / 451 / 471 / 390 / 357 Euro

Bundesweite Freibeträge ab 1. Januar 2026: 282 Euro für Erwerbstätigkeit,
619 Euro für Partei sowie Ehe-/Lebenspartner und – je nach Alter –
496 / 518 / 429 / 393 Euro für weitere unterhaltsberechtigte Personen.

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

Die Berechnung dient nur der unverbindlichen Orientierung. Die endgültige
Prüfung und Festsetzung obliegt dem zuständigen Gericht.
