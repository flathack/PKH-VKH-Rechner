import { createHash } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { build } from "vite";
import legalData from "../app/legal-data.json" with { type: "json" };

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = dirname(scriptDirectory);
const buildDirectory = join(repositoryRoot, "single-dist");
const releaseDirectory = join(repositoryRoot, "release");
const outputName = `PKH-VKH-Rechner-${legalData.calculationYear}.html`;
const relativeOutputPath = `release/${outputName}`;
const outputPath = join(releaseDirectory, outputName);

await build({
  configFile: join(repositoryRoot, "vite.single.config.ts"),
});

const indexPath = join(buildDirectory, "index.html");
let html = await readFile(indexPath, "utf8");

const scriptMatch = html.match(/<script\b[^>]*\bsrc="([^"]+\.js)"[^>]*><\/script>/i);
const styleMatch = html.match(/<link\b[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+\.css)"[^>]*>/i);

if (!scriptMatch || !styleMatch) {
  throw new Error("JavaScript- oder CSS-Bundle konnte nicht eindeutig gefunden werden.");
}

const htmlShell = html.replace(scriptMatch[0], "").replace(styleMatch[0], "");
if (/\b(?:src|href)="(?:\.\/)?assets\//i.test(htmlShell)) {
  throw new Error("Der HTML-Rahmen enthält weitere externe Assets.");
}

const resolveAsset = (assetPath) => join(buildDirectory, assetPath.replace(/^\.\//, ""));
const [javaScript, css] = await Promise.all([
  readFile(resolveAsset(scriptMatch[1]), "utf8"),
  readFile(resolveAsset(styleMatch[1]), "utf8"),
]);

const inlineStyle = `<style>${css.replace(/<\/style/gi, "<\\/style")}</style>`;
const inlineScript = `<script type="module">${javaScript.replace(/<\/script/gi, "<\\/script")}</script>`;

// Replacement callbacks preserve dollar sequences such as $&, $` and $' in
// minified JavaScript. A plain replacement string would interpret them as
// String.replace placeholders and corrupt the generated HTML.
html = html
  .replace(styleMatch[0], () => inlineStyle)
  .replace(scriptMatch[0], () => inlineScript);

const firstScriptStart = html.indexOf("<script");
const firstScriptEnd = html.indexOf(">", firstScriptStart);
const firstScriptTag = html.slice(firstScriptStart, firstScriptEnd + 1);
if (firstScriptStart < 0 || !/type="module"/i.test(firstScriptTag) || /\bsrc=/i.test(firstScriptTag)) {
  throw new Error("Das JavaScript wurde nicht vollständig in die HTML-Datei eingebettet.");
}

if (!html.includes("<style>") || /<link\b[^>]*\brel="stylesheet"/i.test(html.slice(0, firstScriptStart))) {
  throw new Error("Das CSS wurde nicht vollständig in die HTML-Datei eingebettet.");
}

if ((html.match(/<\/script/gi) ?? []).length !== 1 || (html.match(/<\/style/gi) ?? []).length !== 1) {
  throw new Error("Der Ein-Datei-Build enthält vorzeitig geschlossene Script- oder Style-Blöcke.");
}

const finalScriptEnd = html.lastIndexOf("</script>");
const finalJavaScript = html.slice(firstScriptEnd + 1, finalScriptEnd);
new Script(finalJavaScript, { filename: outputName });

await mkdir(releaseDirectory, { recursive: true });
await writeFile(outputPath, html, "utf8");

const digest = createHash("sha256").update(html, "utf8").digest("hex");
await writeFile(`${outputPath}.sha256`, `${digest}  ${outputName}\n`, "utf8");

if (process.env.GITHUB_OUTPUT) {
  await appendFile(
    process.env.GITHUB_OUTPUT,
    `html=${relativeOutputPath}\nchecksum=${relativeOutputPath}.sha256\n`,
    "utf8",
  );
}

console.log(`Ein-Datei-Build erstellt: ${outputPath}`);
console.log(`SHA-256: ${digest}`);
