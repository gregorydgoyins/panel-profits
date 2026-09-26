export function isMissingTableError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;

  const code = String(error.code ?? "").toUpperCase();
  const message = String(error.message ?? "").toLowerCase();

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("does not exist") ||
    (message.includes("relation") && message.includes("does not exist"))
  );
}
