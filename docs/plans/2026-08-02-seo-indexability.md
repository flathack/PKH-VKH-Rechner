# SEO-Indexierbarkeit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Die öffentliche GitHub-Pages-Ausgabe soll bereits ohne JavaScript fachlich crawlbar sein und eindeutige, manifestbasierte Indexierungssignale liefern.

**Architecture:** Eine zentrale SEO-Konfiguration leitet Jahr, Titel, Beschreibung und Rechtsgrundlagenlink aus `app/legal-data.json` ab. Ein gemeinsames Vite-Plugin ersetzt Platzhalter im statischen HTML; der Pages-Build ergänzt öffentliche Canonical-/Social-/JSON-LD-Tags und erzeugt `sitemap.xml`. Das öffentliche Next-Layout spiegelt diese Indexierungssignale einschließlich Sitemap-Link und JSON-LD, emittiert aber keine zweite Sitemap-Datei. Der bestehende React-Client ersetzt den semantischen Fallbackinhalt nach dem Laden wie bisher durch den vollständigen Rechner.

**Tech Stack:** TypeScript, React 19, Vite 8, Node-Test-Runner, GitHub Pages.

---

### Task 1: Reale RED-Tests für Crawlability und Metadaten

**Files:**
- Modify: `tests/rendered-html.test.mjs`

**Step 1:** Ergänze einen Test, der `npm run build:pages` ausführt und im echten `pages-dist` statischen H1-/Einleitungstext, dynamisches Jahr, Canonical, Robots-Meta, Open Graph, Twitter Card, parsebares `WebApplication`-JSON-LD und `sitemap.xml` verlangt.

**Step 2:** Ergänze beim öffentlichen Next-SSR-Artefakttest dieselben Indexierungssignale einschließlich Sitemap-Link und parsebarem JSON-LD. Ergänze beim vorhandenen Single-HTML-Artefakttest Assertions für dynamischen SEO-Titel und crawlbaren Fallback, aber gegen öffentliche Canonical-/Sitemap-Metadaten im Offline-Artefakt.

**Step 3:** Führe nur die neuen Tests aus. Erwartung: FAIL, weil initiales `#root` leer ist und öffentliche Metadaten/Sitemap fehlen.

### Task 2: Manifestbasierte SEO-Daten und Build-Plugin

**Files:**
- Create: `app/seo-metadata.ts`
- Create: `build/seo-metadata-plugin.ts`
- Modify: `vite.pages.config.ts`
- Modify: `vite.single.config.ts`
- Modify: `app/layout.tsx`
- Modify: `standalone/main.tsx`

**Step 1:** Leite Titel, Beschreibung, H1, Einleitung und §-115-URL ausschließlich aus `legal-data.json` ab; die kanonische öffentliche URL bleibt eine redaktionelle Konstante.

**Step 2:** Implementiere ein Vite-HTML-Transformationsplugin. Es ersetzt sämtliche SEO-Platzhalter fail-closed. Im Pages-Modus injiziert es Canonical, Robots, Open Graph, Twitter und JSON-LD und emittiert genau eine gültige `sitemap.xml`; im Single-Modus nicht.

**Step 3:** Verwende dieselben SEO-Daten in Next-Metadata, Next-Sitemap-Link, Next-JSON-LD und im Client-Dokumenttitel.

### Task 3: Crawlbarer HTML-Fallback und Patchversion

**Files:**
- Modify: `standalone/index.html`
- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1:** Ersetze das leere Root-Element durch semantischen, inhaltlich identischen Fallback mit H1, Erklärung, Datenschutzsignal und amtlichem §-115-Link. Keine versteckten Keywords und kein zusätzlicher Disclaimer.

**Step 2:** Hebe die Patchversion konsistent auf `0.2.4` an.

**Step 3:** Führe die neuen Tests erneut aus. Erwartung: PASS.

### Task 4: Vollständige Verifikation und Veröffentlichung

**Files:**
- Verify only; keine zusätzlichen Produktdateien ohne neuen RED-Nachweis.

**Step 1:** Führe `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run build:pages`, `npm run build:single`, SHA-256- und Workflow-Gates aus.

**Step 2:** Prüfe Desktop/Mobil mit echtem Browser sowie den initialen HTML-Quelltext mit deaktiviertem JavaScript. Stelle sicher, dass der interaktive Rechner nach dem React-Start unverändert funktioniert.

**Step 3:** Friere Index-Tree und staged Diff-SHA-256 ein und lasse den Snapshot unabhängig fail-closed reviewen.

**Step 4:** Verifiziere den exakten Commit in einem Detached-Worktree, pushe denselben SHA ohne Force auf `main`, reconcile Pages bytegenau und veröffentliche danach den annotierten Patch-Tag `v0.2.4`.

**Step 5:** Setze nach erfolgreicher Live-Prüfung das öffentliche GitHub-Homepage-Feld auf `https://flathack.github.io/PKH-VKH-Rechner/`. Search-Console-Verifikation bleibt ein separater manueller Schritt, bis Google einen Verifikationstag liefert.
