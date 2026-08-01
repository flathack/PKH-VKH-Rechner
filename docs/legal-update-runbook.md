# Runbook: amtliche Rechtswerte automatisch aktualisieren

## Zweck und Geltungsbereich

Dieses Verfahren aktualisiert den PKH/VKH-Rechner nur auf Grundlage eines vollständig verkündeten und eindeutig geltenden Rechtsstands. Es umfasst:

- Freibeträge nach § 115 Abs. 1 ZPO und der jeweiligen Prozesskostenhilfebekanntmachung,
- die bundesweiten und im Manifest geführten regionalen Beträge,
- die Ratenparameter und Höchstratenzahl nach § 115 Abs. 2 ZPO,
- unmittelbar verwendete Verweisnormen, soweit sich daraus die Berechnung ändert,
- Berechnungsjahr, Gültigkeitsbeginn, Fundstelle, Quell-URLs, Tests, UI und Release-Artefakt.

`app/legal-data.json` ist die einzige maschinenlesbare Quelle des in der App verwendeten Rechtsstands.

## Zeitfenster richtig einordnen

§ 115 Abs. 1 Satz 6 ZPO verpflichtet das zuständige Bundesministerium, die maßgebenden Beträge bei jeder Neufestsetzung oder Fortschreibung im Bundesgesetzblatt bekannt zu machen. Die amtliche Fußnote zu § 115 ZPO weist für 2021 bis 2026 jeweils Werte **ab 1. Januar** aus.

Ein allgemeiner heutiger Automatismus, nach dem dieselben Werte zwingend jedes Jahr auch am 1. Juni wechseln, ist daraus nicht ableitbar. Die Mai/Juni-Termine sind deshalb ein zusätzlicher Änderungswächter für verkündete Änderungen an § 115 ZPO, den Verweisnormen, regionalen Beträgen oder anderen unmittelbar verwendeten Parametern. Ein Datum allein autorisiert niemals eine Änderung.

## Zulässige Quellen

### Autorisierende Primärquellen

1. **Bundesgesetzblatt:** `https://www.recht.bund.de/`
   - bevorzugt kanonischer ELI-Link und Regelungstext/PDF,
   - Fundstelle, Ausfertigungsdatum, Veröffentlichungsdatum und Inkrafttreten erfassen.
2. **Gesetze im Internet:** `https://www.gesetze-im-internet.de/`
   - konsolidierter § 115 ZPO,
   - aktuelle Prozesskostenhilfebekanntmachung,
   - unmittelbar verwendete Verweisnormen.
3. **Amtliche Gesetzgebungsmaterialien:** Bundestag/DIP, Bundesrat oder zuständiges Bundesministerium
   - nur zur Suche und zur Einordnung künftiger Änderungen,
   - ein Entwurf, Referentenentwurf, Beschluss oder eine Pressemitteilung autorisiert noch keinen Produktionswert.

Sekundärquellen, Such-Snippets, Kanzlei-Blogs und Rechner anderer Anbieter dürfen ausschließlich Suchhinweise liefern. Sie dürfen weder einen Wert noch ein Inkrafttretensdatum autorisieren.

## Recherche je Lauf

1. Aktuelles UTC-Datum und das relevante Zielzeitfenster bestimmen.
2. `app/legal-data.json` und die darin gespeicherten amtlichen Quellen lesen.
3. Im Bundesgesetzblatt nach folgenden Gegenständen suchen:
   - „Bekanntmachung zu § 115 der Zivilprozessordnung“,
   - „Prozesskostenhilfebekanntmachung“ und das Zieljahr,
   - Änderungsgesetze mit Treffern für § 115 ZPO oder unmittelbar verwendete Verweisnormen.
4. Den konsolidierten Wortlaut und die Fußnoten von § 115 ZPO vergleichen.
5. Inkrafttretensregel des verkündeten Dokuments lesen; nicht aus Titel, Veröffentlichungsdatum oder Such-Snippet ableiten.
6. Liegt der Gültigkeitsbeginn in der Zukunft, den Kandidaten nur prüfen und noch nicht veröffentlichen. Da die App genau einen aktiven Wertesatz führt, darf das Produktionsmanifest frühestens am Gültigkeitstag ersetzt werden.
7. Bei regionalen Beträgen jede im Manifest geführte Region ausdrücklich prüfen.
8. Quellen-URLs direkt abrufen. Ein Suchergebnis ohne abrufbaren Regelungstext gilt als unvollständig.

## Vollständigkeits- und Plausibilitätsgate

Vor jeder Dateiveränderung müssen eindeutig vorliegen:

- Bezeichnung, Fundstelle, Ausfertigungs- und Veröffentlichungsdatum,
- konkretes Gültigkeits-/Inkrafttretensdatum,
- sechs Freibeträge für jede geführte Region:
  - Erwerbstätigkeit,
  - Partei/Ehe- oder Lebenspartner,
  - unterhaltsberechtigte Erwachsene,
  - Jugendliche 14–17,
  - Kinder 6–13,
  - Kinder 0–5,
- alle fünf Ratenparameter:
  - Einkommensschwelle,
  - Rate an der Schwelle,
  - Divisor unterhalb der Schwelle,
  - Mindestrate,
  - Höchstzahl der Monatsraten,
- Aussage, ob die Rechenmethode unverändert bleibt.

Zusätzlich ist rechnerisch zu prüfen, ob die veröffentlichten Beträge zu den in § 115 ZPO bezeichneten Regelbedarfsstufen und Rundungsregeln passen. Diese Plausibilitätsrechnung ersetzt die amtliche Bekanntmachung nicht.

**Sofort abbrechen:** fehlender Einzelwert, widersprüchliche amtliche Fassungen, nur angekündigte Änderung, unklare Übergangsregel, nicht abrufbarer Regelungstext oder notwendige Interpretation ohne eindeutigen Gesetzeswortlaut.

## Idempotenz und Benachrichtigungen

- Entspricht Fundstelle plus `effectiveFrom` bereits dem Manifest, darf kein Commit entstehen.
- Vor einem stillen No-op den Veröffentlichungszustand der auf `origin/main` eingetragenen Paketversion abgleichen: Pages-Deployment und Live-Rechtsstand, erwarteter Tag, Release-Workflow, Assetnamen/-größen und Prüfsumme.
- Hat ein früherer Lauf `main` bereits gepusht, aber Tag oder Release nicht abgeschlossen, muss der nächste Lauf diesen Teilzustand sicher vervollständigen oder ausdrücklich melden; er darf nicht `[SILENT]` liefern.
- Vor dem Zielstichtag führt „noch keine neue amtliche Veröffentlichung“ zu `[SILENT]`.
- Ein vollständig geprüfter No-op führt ebenfalls zu `[SILENT]`.
- Blocker nach dem Stichtag und technische Fehler werden gemeldet.
- Optionale Deduplizierung liegt in `/opt/data/state/pkh-vkh-rechner-law-monitor.json`. Diese Datei darf nur Benachrichtigungsschlüssel enthalten und niemals Rechtswerte oder Freigaben ersetzen.

## Sicherer Änderungsumfang

Normalfall einer neuen PKHB:

- `app/legal-data.json`,
- der gepinnte Rechtswert-Test in `tests/rendered-html.test.mjs`,
- `package.json` und `package-lock.json` für die Patchversion.

Nur wenn der verkündete Rechtsstand die Formel oder Darstellung ändert, dürfen zusätzlich die unmittelbar betroffenen Dateien geändert werden:

- `app/pkh-law.mjs`,
- `app/page.tsx`,
- `app/layout.tsx`,
- `standalone/main.tsx`,
- `README.md`,
- Release-Build/-Workflow, falls das Artefaktformat betroffen ist.

Keine Abhängigkeitsupdates, Formatierungsrundläufe, Refactorings oder sonstigen Nebenänderungen. Niemals `.env`, Credentials, Tokens, private Schlüssel oder generierte Release-Dateien committen.

## TDD und lokale Gates

1. Zuerst den gepinnten Rechtswert-Test auf die amtlich erwarteten Werte ändern.
2. Test ausführen und den erwarteten RED-Fehler gegen das alte Manifest sehen.
3. Manifest und nur bei Bedarf Berechnungslogik/UI ändern.
4. GREEN verifizieren.
5. Paket-Patchversion ohne Tag erhöhen:

```bash
npm version patch --no-git-tag-version
```

6. Vollständige Gates frisch ausführen:

```bash
npm ci
npm test
npm run lint
npm run build:pages
npm run build:single

git diff --check
git status --short
```

Der Single-HTML-Build muss genau eine jahresbezogene HTML-Datei und die zugehörige `.sha256`-Datei erzeugen. Generierte Verzeichnisse bleiben untracked/ignoriert.

## Git-Race- und Push-Gate

1. Nur auf sauberem lokalem `main` arbeiten. Bei Dirty State, falschem Branch oder Divergenz abbrechen und melden.
2. Vor Beginn:

```bash
git fetch origin --prune
base_sha="$(git rev-parse origin/main)"
git merge --ff-only origin/main
```

3. Nur explizite Dateien stagen; Diff und Secret-Scan prüfen; unabhängiges Review einholen.
4. Conventional Commit erstellen und `candidate_sha="$(git rev-parse HEAD)"` festhalten.
5. Den Kandidaten in einem sauberen, detached Worktree erneut mit allen Gates prüfen.
6. Direkt vor dem Push erneut fetchen. Nur fortfahren, wenn `origin/main == base_sha`.
7. Exakten Kandidaten pushen und Remote-SHA zurücklesen:

```bash
git push origin "$candidate_sha:refs/heads/main"
remote_sha="$(git ls-remote --heads origin refs/heads/main | cut -f1)"
test "$remote_sha" = "$candidate_sha"
```

Kein Force-Push und kein History-Rewrite. Bei einem Race abbrechen; nicht automatisch rebasen und dieselben Quellenannahmen ungeprüft wiederverwenden.

## GitHub Pages und Release

1. Den `Deploy GitHub Pages`-Lauf für `candidate_sha` finden und mit Exitstatus überwachen.
2. Erst bei grüner Pages-CI den neuen Tag aus `package.json` bilden.
3. Sicherstellen, dass der Tag lokal und remote noch nicht existiert.
4. Annotierten Tag erstellen, pushen und den Remote-Tag-SHA verifizieren.
5. Den Workflow `Publish single HTML release` bis zum erfolgreichen Abschluss überwachen.
6. Den neuesten Release prüfen:
   - erwarteter Tag,
   - `PKH-VKH-Rechner-<Jahr>.html`,
   - zugehörige `.sha256`-Datei,
   - beide Assets mit positiver Größe.
7. Live-Probe der Pages-URL:
   - HTTP 200,
   - aktuelle Script-Ressource abrufbar,
   - gerenderter oder gebündelter Inhalt enthält aktuellen Rechtsstand, Fundstelle und Kernwerte.

Wenn `main` bereits gepusht wurde und ein nachgelagerter Schritt fehlschlägt, nicht force-pushen und nicht still zurückrollen. Commit, Tagstatus, Workflow-URL und exakter Fehler werden als Teilzustand gemeldet.

## Erfolgsbericht

Nur nach allen Prüfungen melden:

- alte und neue Fundstelle/Gültigkeit,
- geänderte Werte oder Formel,
- Commit-SHA und Remote-Verifikation,
- Pages-Workflow und Live-Probe,
- Tag, Release-Workflow und Assetnamen,
- direkte Links auf die autorisierenden amtlichen Dokumente.
