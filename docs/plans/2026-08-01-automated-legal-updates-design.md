# Automatische Rechtsstandsaktualisierung – Entwurf

**Datum:** 2026-08-01  
**Status:** von Steven bestätigt

## Ziel

Der PKH/VKH-Rechner soll Änderungen der für seine Berechnung maßgeblichen Rechtswerte rund um den 1. Januar und 1. Juni selbstständig erkennen, anhand amtlicher Primärquellen verifizieren, konsistent in der Anwendung übernehmen, testen und nach erfolgreicher Prüfung auf `main`, GitHub Pages und als Single-HTML-Release veröffentlichen.

## Architektur

Ein versioniertes Rechtsstands-Manifest unter `app/legal-data.json` ist die zentrale Quelle für Berechnungsjahr, Gültigkeitsbeginn, PKHB-Bezeichnung und -Fundstelle, amtliche Quell-URLs, Freibeträge, Ratenparameter und Höchstzahl der Raten. Berechnungslogik, UI, Metadaten, Druckansicht und Release-Build lesen diese Angaben aus dem Manifest. Nicht dynamisierbare Dokumentation wird jahresneutral formuliert oder durch Konsistenztests abgesichert.

Die wiederkehrende Automation läuft als zwei Hermes-Cronjobs in begrenzten Vor- und Stichtagsfenstern. Sie prüft zuerst amtliche Primärquellen (`gesetze-im-internet.de`, `recht.bund.de`, zuständige Bundesministerien und gegebenenfalls Bundestag/DIP). Sekundärquellen dürfen nur als Suchhinweis dienen. Ohne eindeutige Fundstelle, Gültigkeitsdatum und vollständige Werte gilt der Lauf als nicht freigegeben und darf das Repository nicht verändern.

## Veröffentlichungsablauf

1. `origin/main` abrufen; bei lokalem Dirty State, falschem Branch oder Divergenz abbrechen.
2. Manifest und amtliche Quellen vergleichen.
3. Nur eine vollständig belegte Änderung übernehmen; Rechtsstand, Tests und Dokumentation gemeinsam aktualisieren.
4. `npm ci`, `npm test`, `npm run lint`, `npm run build:pages` und `npm run build:single` ausführen.
5. Diff und Geheimnisfreiheit prüfen; Paket-Patchversion erhöhen.
6. Einen Conventional Commit direkt auf `main` pushen und den Remote-SHA verifizieren.
7. GitHub-Pages-Workflow bis zum erfolgreichen Abschluss prüfen.
8. Einen neuen semantischen Patch-Tag pushen; Release-Workflow, HTML-Asset und SHA-256-Datei prüfen.
9. Die live veröffentlichte Pages-App auf Rechtsstand und Kernwerte prüfen.

## Fehlerverhalten

Die Automation arbeitet fail-closed. Vor dem Stichtag bleibt ein Lauf ohne neue amtliche Veröffentlichung still. Widersprüche, unvollständige Veröffentlichungen, Build-/Testfehler, unerwartete Diffs, Git-Konflikte, CI-Fehler oder fehlende Authentifizierung stoppen alle weiteren Seiteneffekte. Bereits erfolgte Teilschritte werden mit Commit/Tag/Workflowstatus gemeldet; ein fehlgeschlagener Release darf nicht als erfolgreiche Gesamtaktualisierung ausgegeben werden.

## Duplikatkontrolle

Manifest und Git-Historie bilden die primäre Idempotenzgrenze: Ist Fundstelle und Gültigkeitsbeginn bereits enthalten, erfolgt keine Änderung. Eine lokale, nicht versionierte Zustandsdatei kann zusätzlich bereits gemeldete ergebnislose oder blockierte Prüfungen deduplizieren; sie darf keine Rechtswerte autorisieren.
