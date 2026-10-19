// Genau eine ungepatchte Ursache im Compiler/Linter; siehe docs/dependency-security.md.
const reviewedNodes = {
  braces: ["node_modules/braces"],
  micromatch: ["node_modules/micromatch"],
  "fast-glob": ["node_modules/fast-glob", "node_modules/vite-plugin-dynamic-import/node_modules/fast-glob"],
  "@next/eslint-plugin-next": ["node_modules/@next/eslint-plugin-next"],
  "eslint-config-next": ["node_modules/eslint-config-next"],
  "vite-plugin-dynamic-import": ["node_modules/vite-plugin-dynamic-import"],
  "vite-plugin-commonjs": ["node_modules/vite-plugin-commonjs"],
  vinext: ["node_modules/vinext"],
};

export function reviewAudit(report, lock, today = new Date().toISOString().slice(0, 10)) {
  const reviewed = [];
  const blocked = [];
  const vulnerabilities = report.vulnerabilities;
  if (!vulnerabilities || report.error) throw new Error("Kein gültiger npm-Auditbericht.");
  const isReviewed = (name, visited = new Set()) => {
    const item = vulnerabilities[name];
    if (!item || item.severity === "critical" || visited.has(name) || today >= "2026-11-19"
      || lock.packages?.["node_modules/braces"]?.version !== "3.0.3"
      || !reviewedNodes[name] || !item.nodes?.length || item.nodes.some((node) => !reviewedNodes[name].includes(node))) return false;
    const next = new Set([...visited, name]);
    return item.via?.length > 0 && item.via.every((via) => typeof via === "string" ? isReviewed(via, next)
      : name === "braces" && via.name === "braces" && via.severity === "high" && via.url === "https://github.com/advisories/GHSA-vfj7-8cjw-p6xm");
  };
  for (const [name, item] of Object.entries(vulnerabilities)) {
    if (item.severity !== "critical" && item.severity !== "high") continue;
    (isReviewed(name) ? reviewed : blocked).push(name);
  }
  return { reviewed, blocked };
}
