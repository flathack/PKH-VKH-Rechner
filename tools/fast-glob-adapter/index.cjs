const { globSync } = require("tinyglobby");
const { isAbsolute } = require("node:path");

// Both consumers use synchronous string paths only. Fail on new options so an
// upstream change cannot silently assume unsupported fast-glob behaviour.
function sync(patterns, options = {}) {
  for (const key of Object.keys(options)) {
    if (key !== "cwd" && key !== "onlyDirectories") {
      throw new TypeError(`Unsupported glob adapter option: ${key}`);
    }
  }
  const inputs = typeof patterns === "string" ? [patterns] : patterns;
  if (!Array.isArray(inputs) || inputs.some((pattern) => typeof pattern !== "string")) {
    throw new TypeError("Glob adapter requires string patterns");
  }
  const modes = new Set(inputs.filter((pattern) => !pattern.startsWith("!")).map(isAbsolute));
  if (modes.size > 1) throw new TypeError("Glob adapter does not support mixed absolute/relative patterns");
  // Preserve absolute patterns (Next rootDir) and relative patterns (Vite).
  // tinyglobby expands a literal directory by default; fast-glob does not.
  return globSync(patterns, { ...options, absolute: modes.has(true), expandDirectories: false })
    // tinyglobby marks directories with a slash; fast-glob's default does not.
    .map((path) => path.length > 1 ? path.replace(/\/$/, "") : path);
}

exports.sync = sync;
exports.globSync = sync;
