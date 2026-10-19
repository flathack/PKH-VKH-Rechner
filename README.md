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
- gesonderte Fahrtkosten zur Arbeit: Pkw-Monatspauschale je vollem einfachen Entfernungskilometer ohne 40-km-Grenze, ÖPNV oder begründeter Monatsbetrag; Erstattungen werden einmal berücksichtigt
- Kostendeckung und Ratenobergrenze über alle erfassten Ratenstufen; optionaler Ratenbeginn
- fünf Darstellungen: Gericht, Papier, Terminal, Bernstein und Eisblau
- Smartphone-Ansicht mit Abschnittsnavigation und direkt erreichbarem Ergebnis
- vollständig lokale Verarbeitung ohne Speicherung oder Übertragung von Berechnungsdaten; nur die gewählte Darstellung wird im Browser gespeichert

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

## Berechnungsannahmen seit v0.5.2

- **Jahreseinnahmen:** Je Empfänger werden alle Jahresbeträge zuerst in Cent
  addiert, einschließlich der Sammel-Sonderzahlung der Partei. Erst der gemeinsame
  Monatsanteil wird auf Cent gerundet. Monatliche Positionen werden danach addiert.
  Einzelne angezeigte Monatsanteile sind gerundete Anzeigewerte. Jahressumme,
  gemeinsamer Monatsanteil und gegebenenfalls Rundungsausgleich stehen im Ausdruck.
- **Paritätisches Wechselmodell:** Bei minderjährigen Kindern ohne eigenes Einkommen
  ist der Ansatz ein halber Altersfreibetrag zuzüglich tatsächlich gezahlten
  Barunterhalts. Bei eigenem Einkommen oder zugeordnetem Kindergeld sind ein
  fachlich geprüfter hälftiger Restfreibetrag und ein Prüfvermerk erforderlich.
  Der Betrag ist auf den halben örtlichen Altersfreibetrag begrenzt. Die Anwendung
  halbiert Kindergeld, Mehrbedarfe und Wohnkosten nicht automatisch. Grundlage:
  [BGH XII ZB 276/21](https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=127302)
  und [XII ZB 19/21](https://juris.bundesgerichtshof.de/cgi-bin/rechtsprechung/document.py?Gericht=bgh&Art=en&nr=127804).
- **Staffelprognose:** Die automatische Vorschau für die Erstbewilligung nach
  [§ 120 Abs. 1 ZPO](https://www.gesetze-im-internet.de/zpo/__120.html) berücksichtigt
  Erhöhungen höchstens bis vier Jahre ab Bewilligung. Weil Belastungen als letzter
  belasteter Monat erfasst werden, darf der erste erhöhte Zahlungsmonat höchstens
  im entsprechenden Monat vier Jahre später liegen. Weiter entfernte Endmonate
  bleiben als Eingabe erhalten; heutige Rate und Vier-Raten-Vergleich bleiben
  berechnet, während Folgeraten, Obergrenze und Kostendeckung ausdrücklich offen
  bleiben. Der Zahlungsbeginn verschiebt den Prognosehorizont nicht.
  Die 48 positiven Zahlungsraten sind kein Höchstzeitraum von 48 Kalendermonaten.
  Nachprüfungen nach [§ 120a ZPO](https://www.gesetze-im-internet.de/zpo/__120a.html)
  einschließlich früherer Zahlungen, Rechtskraft und Verfahrensbeendigung werden
  nicht als neuer Erstbewilligungsplan berechnet und sind gesondert zu prüfen.
- **Erwerbstätigenfreibetrag:** Standard ist der sichtbar ausgewiesene volle örtliche
  Betrag. Bei geringem Erwerbseinkommen und weiteren Einkünften ist die Rechtsprechung
  uneinheitlich: [OVG Sachsen 5 A 1187/17](https://www.justiz.sachsen.de/ovgentschweb/folder.phtml?id=30)
  lässt den überschießenden Freibetrag auch andere Einkommensarten mindern;
  [OLG Bamberg 2 UF 107/25 e](https://www.gesetze-bayern.de/Content/Document/Y-300-Z-BECKRS-B-2025-N-27030?hl=true)
  begrenzt ihn auf das Erwerbseinkommen und nennt ausdrücklich Gegenauffassungen.
  Eine höchstrichterliche Klärung wurde am 19.10.2026 nicht verifiziert. Der begrenzte
  Ansatz benötigt deshalb einen ausdrücklich angegebenen bereinigten Erwerbsanteil;
  ein abweichender geprüfter Betrag benötigt einen Prüfvermerk. Diese Steuerwerte
  werden nicht erneut als Einkommen oder weitere Abzüge addiert. Bei Angehörigen
  ist die Anwendung gesondert zu prüfen und für einen begrenzten Ansatz zu begründen.
  Bereits vollständig bereinigtes Einkommen erhält keinen zweiten Abzug.
  Gewählter Ansatz, tatsächlicher Abzugsbetrag, Quelle und Prüfvermerk werden gedruckt.

Die Regressionstests in `tests/legal-corrections.test.mjs` und
`tests/browser/legal-corrections.spec.mjs` sichern diese Annahmen und Grenzfälle ab.

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
npm run lint
npm run audit:security
npm run build:pages
npm run build:single
```

Die Browsertests prüfen Fahrtkosten, Themes, Kontraste und Formularbreiten ab
320 Pixeln auf Desktop und Mobilgerät einschließlich Druckfassung, Offline-HTML
und Inhalten ohne JavaScript. Die Fachtests enthalten unabhängige Referenzfälle
für Rundung, Unterhalt, Wohnkosten und zeitliche Ratenstufen. Der Worker wird in
der lokalen workerd-Laufzeit geprüft. Einmalig den Testbrowser installieren:

```bash
npx playwright install --with-deps chromium
npm run test:browser
```

Geldbeträge dürfen ein Dezimalkomma oder einen Dezimalpunkt enthalten, jedoch
keine Tausendertrennzeichen. Ungültige, mehrdeutige oder übergroße Werte sperren
die Ratenberechnung. Pro Eingabefeld sind höchstens eine Milliarde Euro und zwei
Nachkommastellen möglich. Der native Browserdruck zeigt bei unvollständigen
Angaben nur einen Fehlervermerk.

Für die Kostendeckung wird ohne abweichenden Ratenbeginn der Bewilligungsmonat
angenommen. Monate mit null Euro zählen nicht als gezahlte Raten. Der Plan
berücksichtigt sämtliche erfassten Folgeraten; die Vier-Raten-Prüfung bleibt
eine gesonderte Prüfung anhand der anfänglichen Einkommensrate.

Nach `npm run build` startet `npm start` den Worker ausdrücklich lokal über
Wrangler. Die Abhängigkeitsprüfung ohne Sicherheitsausnahmen und der Ersatz
der bisherigen Glob-Bibliothek sind unter
[`docs/dependency-security.md`](docs/dependency-security.md) dokumentiert.

Fahrtkosten werden ausschließlich im eigenen Bereich erfasst. Bereits im
Sammelfeld oder im Gewinn enthaltene Fahrtkosten dürfen nicht zusätzlich
angesetzt werden. Eine schon als Einkommen erfasste Erstattung wird im
Fahrtkostenbereich entsprechend markiert. Für Teilmonate und andere gerichtlich
geprüfte Ansätze gibt es die begründbare manuelle Eingabe. Der Pauschbetrag und
die amtlichen Quellen stehen in den aktuellen und historischen Rechtsdaten.

Der statische GitHub-Pages-Build wird bei Änderungen auf `main` automatisch
veröffentlicht. Der Ein-Datei-Build wird bei einem Versions-Tag automatisch
als HTML-Datei unter GitHub Releases bereitgestellt.

## Darstellung und Suchmaschinen

Das Waagen-Icon wird als SVG-Favicon, PNG-Favicon, Apple-Touch-Icon und in den
Installationsgrößen des Webmanifests bereitgestellt. `node scripts/build-brand-assets.mjs`
erzeugt diese Dateien und das Vorschaubild für geteilte Links erneut.

Die öffentliche Seite liefert Titel, Beschreibung, kanonische URL, Sitemap,
Open-Graph-/Twitter-Vorschau und strukturierte Daten zur Webanwendung. Ein
Einleitungstext und häufige Fragen sind bereits im initialen HTML enthalten.
Die fünf Themes und ihre lokal eingebetteten Schriften funktionieren auch in
der herunterladbaren HTML-Datei. Herkunft und Schriftlizenz stehen unter
[`app/design/README.md`](app/design/README.md).
