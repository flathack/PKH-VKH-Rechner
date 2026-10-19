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

## Verbleibende, befristete Tooling-Ausnahme

`npm audit` meldet noch acht hohe **Paketmeldungen mit derselben Ursache**:
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm),
`braces@3.0.3`. Für diese Version bzw. dieses Advisory existiert am Prüfdatum
keine korrigierte Hersteller-Version. Ein Downgrade von Next-Lint oder vinext,
wie vom Audit vorgeschlagen, würde andere Korrekturen und Funktionen verlieren.

Geprüfte Pfade:

- eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces
- vinext → vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob → micromatch → braces

Der Fehler benötigt ein vom Angreifer vorgegebenes, tief geschachteltes
Glob-Muster. In diesen Pfaden stammen Muster aus Projektquellen und
Linter-/Compiler-Konfiguration. Berechnungsdaten, Belegtexte und HTTP-Parameter
werden nicht als Glob-Muster an diese Bibliothek übergeben. Im geprüften
Pages-/Offline-Bundle und kompilierten Worker wird dieser Compiler-/Linterpfad
nicht mitgeliefert. Der Worker wird in den Integrationstests in einer echten
lokalen workerd-Laufzeit geprüft.

Die Ausnahme gilt **nur** für diesen Advisory, diese Version und die konkret
geprüften Paketpfade, längstens bis **19.11.2026**. Danach scheitert das Gate,
bis die Lage erneut geprüft oder das Paket ersetzt/aktualisiert wurde. Neue
Advisories, zusätzliche Paketpfade, andere Versionen und kritische Meldungen
werden nicht durch diese Ausnahme unterdrückt. Fremder Quellcode oder fremde
Glob-Konfiguration darf nicht in einer privilegierten lokalen/CI-Umgebung
ausgeführt werden.

## Regelmäßige Prüfung

`npm run audit:security` fragt den vollständigen aktuellen npm-Auditbericht ab.
Ein Netzwerk- oder Formatfehler schlägt fehl. Unbekannte hohe und alle kritischen
Meldungen lassen den Prozess fehlschlagen; die acht bekannten Paketmeldungen
werden sichtbar mit ihrer befristeten Einordnung ausgegeben. Moderate/niedrige
Meldungen bleiben im Bericht sichtbar.

Das Gate läuft vor Pages-/Release-Builds sowie wöchentlich und bei Pull Requests
im Workflow `Dependency security audit`. Änderungen an der Ausnahme erfordern
erneute Prüfung der Paketpfade und ihrer Erreichbarkeit.

## Lokaler Worker

Der aktuelle Cloudflare-Build benötigt die workerd-Laufzeit (`cloudflare:workers`).
Nach `npm run build` startet `npm start` deshalb Wrangler explizit im lokalen
Modus. `vinext start` als reiner Node-Import ist für diesen Worker-Build kein
geeigneter Ausführungspfad. Die statische Pages- und Offline-Ausgabe bleibt ein
gesonderter Build ohne Worker-Abhängigkeit.
