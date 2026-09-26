"use client";

import * as React from "react";

export type RailSetting = "newsTicker" | "marketTelemetry" | "assets" | "equities" | "diary";

const STORAGE_PREFIX = "pp-rail-visible-";

export function RailVisibility({ setting, children }: { setting: RailSetting; children: React.ReactNode }) {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const load = () => setVisible(localStorage.getItem(`${STORAGE_PREFIX}${setting}`) !== "false");
    load();
    window.addEventListener("pp-rail-settings", load);
    return () => window.removeEventListener("pp-rail-settings", load);
  }, [setting]);

  return visible ? <>{children}</> : null;
}
