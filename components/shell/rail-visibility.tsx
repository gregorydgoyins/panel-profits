"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

export type RailSetting = "newsTicker" | "marketTelemetry" | "assets" | "equities" | "diary";

const STORAGE_PREFIX = "pp-rail-visible-";

// Rails that should only be visible by default on the home dashboard (/)
// When navigating to /market, /comics, /news, /research, /learn, etc., these collapse by default
const FLOW_RAILS: RailSetting[] = ["assets", "equities", "diary"];

export function RailVisibility({ setting, children }: { setting: RailSetting; children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const load = () => {
      const stored = localStorage.getItem(`${STORAGE_PREFIX}${setting}`);
      if (stored !== null) {
        // Explicit user preference from settings dropdown overrides route default
        setVisible(stored === "true");
      } else {
        // Default behavior: flow rails (equities, assets, diary) only default to ON on home page ("/")
        if (FLOW_RAILS.includes(setting)) {
          setVisible(pathname === "/");
        } else {
          setVisible(true);
        }
      }
    };
    load();
    window.addEventListener("pp-rail-settings", load);
    return () => window.removeEventListener("pp-rail-settings", load);
  }, [setting, pathname]);

  return visible ? <>{children}</> : null;
}
