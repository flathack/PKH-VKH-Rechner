import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function git(...args) {
  try {
    return execFileSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    fail(`Git-Prüfung fehlgeschlagen: git ${args[0]}`);
  }
}

const releaseTag = process.env.RELEASE_TAG ?? "";
if (!/^v\d+\.\d+\.\d+$/.test(releaseTag)) {
  fail(`Ungültiger Release-Tag: ${releaseTag || "<leer>"}`);
}

if (git("rev-parse", "--abbrev-ref", "HEAD") !== "HEAD") {
  fail("Der Release-Checkout ist nicht detached");
}

const tagRef = `refs/tags/${releaseTag}`;
if (git("cat-file", "-t", tagRef) !== "tag") {
  fail("Der Release-Tag muss annotiert sein");
}

const localTagObject = git("rev-parse", "--verify", tagRef);
const remoteTagLine = git("ls-remote", "--exit-code", "--refs", "origin", tagRef);
const [remoteTagObject, remoteTagRef, ...unexpectedFields] = remoteTagLine.split(/\s+/);
if (unexpectedFields.length > 0 || remoteTagRef !== tagRef || remoteTagObject !== localTagObject) {
  fail(`Lokaler und kanonischer Remote-Tag stimmen nicht überein: ${tagRef}`);
}

const tagCommit = git("rev-parse", "--verify", `${tagRef}^{commit}`);
const checkedOutCommit = git("rev-parse", "--verify", "HEAD");
if (checkedOutCommit !== tagCommit) {
  fail(`Checkout ${checkedOutCommit} entspricht nicht dem Tag-Ziel ${tagCommit}`);
}

const trackedChanges = git("status", "--porcelain=v1", "--untracked-files=no");
if (trackedChanges) {
  fail("Der Release-Checkout enthält getrackte Änderungen");
}

let packageVersion;
try {
  const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8"));
  packageVersion = packageJson.version;
} catch {
  fail("package.json konnte nicht als JSON gelesen werden");
}

if (typeof packageVersion !== "string" || `v${packageVersion}` !== releaseTag) {
  fail(`Paketversion und Release-Tag stimmen nicht überein: v${packageVersion ?? "<leer>"} != ${releaseTag}`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `sha=${checkedOutCommit}\n`, "utf8");
}

console.log(`Kanonischer Release-Tag verifiziert: ${releaseTag} -> ${checkedOutCommit}`);
