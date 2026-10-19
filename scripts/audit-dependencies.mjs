import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { reviewAudit } from "./audit-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
let output;
try {
  output = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 10 * 1024 * 1024 });
} catch (error) {
  if (!error.stdout) throw error;
  output = error.stdout.toString();
}
const report = JSON.parse(output);
const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));
const { reviewed, blocked } = reviewAudit(report, lock);
console.log("npm audit:", JSON.stringify(report.metadata?.vulnerabilities));
if (reviewed.length) console.log(`Dokumentierte Tooling-Ausnahme bis 19.11.2026: ${reviewed.join(", ")}. Siehe docs/dependency-security.md.`);
if (blocked.length) {
  console.error(`Nicht freigegebene hohe/kritische Meldungen: ${blocked.join(", ")}`);
  process.exitCode = 1;
}
