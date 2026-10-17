/** Strip a seller-added publisher prefix without changing the comic's actual title. */
export function researchTitle(series: string): string {
  if (/\bmace windu\b/i.test(series) && /\bjedi of the republic\b/i.test(series)) return "Star Wars: Mace Windu";
  if (/^(?:DC Comics Presents|DC All In Special|Marvel (?:Comics Presents|Presents|Premiere|Spotlight|Tales|Feature|Mystery Comics|Team-Up|Two-In-One))$/i.test(series.trim())) return series.trim();
  return series.trim().replace(/^(?:dynamite(?: entertainment)?|marvel(?: comics)?|dc(?: comics)?|image(?: comics)?|dark horse(?: comics)?)\s+(?!presents\b)/i, "").trim();
}
export function videoTopic(series: string): string {
  const title = researchTitle(series);
  return /^queen sonja$/i.test(title) ? "Red Sonja" : title;
}
export function publisherFromTitle(series: string): string | null {
  const prefix = series.match(/^(dynamite|marvel|dc|image|dark horse)\b/i)?.[1];
  return prefix ?? null;
}
