export function displaySeries(series: string | null | undefined, issueNumber: string | null | undefined) {
  const cleanSeries = (series || "Unknown series").trim();
  const cleanIssue = (issueNumber || "").trim().replace(/^#/, "");
  if (!cleanIssue) return cleanSeries;
  const escapedIssue = cleanIssue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const suffix = new RegExp(`\\s+#${escapedIssue}$`, "i");
  return cleanSeries.replace(suffix, "");
}

export function displayIssue(issueNumber: string | null | undefined) {
  const cleanIssue = (issueNumber || "").trim().replace(/^#/, "");
  return cleanIssue ? `#${cleanIssue}` : "";
}
