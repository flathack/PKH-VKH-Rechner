export function reviewAudit(report) {
  const vulnerabilities = report?.vulnerabilities;
  const total = report?.metadata?.vulnerabilities?.total;
  if (report?.error || !vulnerabilities || typeof vulnerabilities !== "object"
    || Array.isArray(vulnerabilities) || !Number.isInteger(total) || total < 0
    || Object.keys(vulnerabilities).length !== total) {
    throw new Error("Kein gültiger npm-Auditbericht.");
  }
  // No package, advisory, severity or expiry exceptions.
  return { blocked: Object.keys(vulnerabilities) };
}
