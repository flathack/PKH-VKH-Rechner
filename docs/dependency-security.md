# Abhängigkeiten: Prüfung vom 19.10.2026

Die direkten Framework- und Build-Abhängigkeiten wurden aktualisiert, darunter
Next 16.4.2, React/React DOM/RSC 19.3.1, vinext 1.2.1, Vite 8.3.4 und Wrangler
4.151.2. Der Lockfile enthält auch aktualisierte transitive Pakete.

Kompatible API-Overrides entfernen zwei weitere alte Bibliotheksstände:

- `@esbuild-kit/core-utils` verwendet esbuild 0.25.12 statt 0.18.20. Der optionale
  Drizzle-Generator wird über `drizzle-kit check` geprüft; ein esbuild-Server
  wird durch die Anwendung nicht gestartet.
- satori und `@shuding/opentype.js` verwenden fflate 0.8.3 statt 0.7.3. Die
  öffentlichen Kompressions-/Dekompressionsfunktionen bleiben kompatibel; ein
  Rundlauf-Test sichert die benötigte synchrone ZIP-API ab.

## Glob-Bibliothek ersetzt, keine Sicherheitsausnahme

Seit v0.5.1 wird die Dateisuche beider Tooling-Pfade durch
[tinyglobby 0.2.17](https://github.com/SuperchupuDev/tinyglobby) ausgeführt:

- eslint-config-next → @next/eslint-plugin-next → lokaler Adapter → tinyglobby
- vinext → vite-plugin-commonjs → vite-plugin-dynamic-import → lokaler Adapter → tinyglobby

Der private Adapter unter `tools/fast-glob-adapter` ersetzt per npm-Override
sämtliche `fast-glob`-Installationen. Er enthält keinen Code aus fast-glob,
micromatch oder braces. Im Lockfile und nach einer frischen Installation fehlen
`braces` und `micromatch` vollständig. Damit entfällt die frühere Ausnahme für
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

Die zwei Aufrufer verwenden ausschließlich `sync` bzw. `globSync`, mit `cwd`
oder `onlyDirectories`. Der Adapter bildet genau diese Schnittstellen ab.
`expandDirectories: false` erhält die bisherige Behandlung wörtlicher
Verzeichnispfade; die von tinyglobby angehängten Verzeichnisslashes werden wie
bei fast-glob entfernt. Absolute und relative Suchpfade behalten ihren Modus;
gemischte positive Muster innerhalb eines Aufrufs werden abgelehnt. Unbekannte
Optionen führen zu einem Fehler, damit spätere
Tooling-Updates keine unbemerkte Verhaltensänderung verursachen. Der Adapter
ist kein allgemeiner Ersatz für sämtliche fast-glob-APIs.

Die Regressionstests prüfen beide tatsächlichen Aufrufer: Next-Lint findet
Projektverzeichnisse, und das Vite-Plugin findet dynamische Imports einschließlich
seiner erzeugten Dateiendungsgruppen. Weitere Fälle sichern Ausschlussmuster,
Unterverzeichnisse, versteckte Dateien und fehlende Verzeichnisexpansion ab.
Nach Updates von vinext oder eslint-config-next sind diese Schnittstellen erneut
zu prüfen. Worker-, Pages- und Offline-Build sowie Browserfälle laufen ebenfalls.

## Regelmäßige Prüfung

`npm run audit:security` fragt den vollständigen aktuellen npm-Auditbericht ab.
**Jede Meldung führt zum Fehlschlag**, unabhängig von Paket und Schweregrad.
Es gibt keine Allowlist, ignorierten Advisories oder befristeten Ausnahmen.
Netzwerk-, Prozess- und Formatfehler werden ebenfalls nicht akzeptiert.
Die Prüfung vom 19.10.2026 nach frischem `npm ci` meldet **0 Schwachstellen**.

Das Gate läuft vor Pages-/Release-Builds sowie wöchentlich und bei Pull Requests
im Workflow `Dependency security audit`. Reproduzierbare Installation: Node 22
und npm 10, wie in der CI; Lockfile und lokaler Adapter werden gemeinsam versioniert.

## Lokaler Worker

Der aktuelle Cloudflare-Build benötigt die workerd-Laufzeit (`cloudflare:workers`).
Nach `npm run build` startet `npm start` deshalb Wrangler explizit im lokalen
Modus. `vinext start` als reiner Node-Import ist für diesen Worker-Build kein
geeigneter Ausführungspfad. Die statische Pages- und Offline-Ausgabe bleibt ein
gesonderter Build ohne Worker-Abhängigkeit.
