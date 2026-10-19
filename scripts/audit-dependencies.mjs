import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { reviewAudit } from "./audit-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
let output;
let auditFailed = false;
try {
  output = execFileSync(process.platform === "win32" ? "npm.cmd" : "npm", ["audit", "--json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 10 * 1024 * 1024 });
} catch (error) {
  if (!error.stdout) throw error;
  auditFailed = true;
  output = error.stdout.toString();
}
const report = JSON.parse(output);
const { blocked } = reviewAudit(report);
console.log("npm audit:", JSON.stringify(report.metadata?.vulnerabilities));
if (blocked.length) {
  console.error(`Sicherheitsmeldungen: ${blocked.join(", ")}`);
  process.exitCode = 1;
} else if (auditFailed) {
  throw new Error("npm audit ist trotz leerer Meldungsliste fehlgeschlagen.");
}
