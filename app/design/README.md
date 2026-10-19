# Designressourcen

Die Flathack-Tokens und Basiskomponenten stammen aus dem persönlichen
Flathack-Designsystem. Der zusätzliche helle Gerichtslook bewahrt die bestehende
Produktidentität. App-spezifische Anpassungen stehen in `app/screen.css`.

Die mitgelieferten JetBrains-Mono-Schriften wurden für lateinische Zeichen,
deutsche Texte und die verwendeten Symbole verkleinert und in „PKH Mono“
umbenannt. Die SIL Open Font License liegt bei. Es werden keine externen
Schriftdienste geladen.

Das Logo steht in `app/branding.mjs`. Nach Änderungen erzeugt
`node scripts/build-brand-assets.mjs` mit dem installierten Playwright-Browser
die Dateien unter `public/` neu. Die Link-Vorschau enthält bewusst kein Jahr;
Titel und Rechtsstand werden unabhängig davon aus den Rechtsdaten erzeugt.
