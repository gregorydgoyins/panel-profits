"use client";

import * as React from "react";
import Link from "next/link";
import { Pin, PinOff } from "lucide-react";
import {
  SURFACE_COLORS,
  SURFACE_LABELS,
  SURFACE_ICONS,
  SURFACE_ART_MAP,
  CARD_FAMILY_MAP,
  FAMILY_HEADER,
  type SurfaceKey,
} from "@/lib/assets/surfaceConfig";
import {
  resolveCardDisplayName,
  getTypeLabel,
  getAnchorMetric,
  getSecondaryMetric,
  formatHumanTicker,
} from "@/lib/assets/assetHelpers";
import type { AssetItem } from "@/lib/assets/types";
import { ERA_LOOKUP, withAlpha } from "@/lib/design-system/colors";
import { AnimatedPrice } from "@/components/shared/animated-price";

const ASSET_CARD_STYLE_ID = "asset-card-shadow-kf";
if (typeof document !== "undefined" && !document.getElementById(ASSET_CARD_STYLE_ID)) {
  const s = document.createElement("style");
  s.id = ASSET_CARD_STYLE_ID;
  s.textContent = `
    .asset-card {
      box-shadow: 0 4px 16px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08);
      contain: layout paint;
    }
    .asset-card:hover,
    .asset-card[data-hovered='true'],
    .asset-card[data-selected='true'] {
      box-shadow: 0 16px 40px rgba(0,0,0,0.95), 0 0 24px var(--rim, rgba(6,182,212,0.45)), 0 0 0 1px var(--rim, rgba(6,182,212,0.85));
    }
  `;
  document.head.appendChild(s);
}

export const AssetCard = React.memo(function AssetCard({
  item,
  assetType,
  index = 0,
}: {
  item: AssetItem;
  assetType: string;
  index?: number;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [imgLoaded, setImgLoaded] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);
  // An image that finished loading before hydration never fires onLoad; check it directly so the card is not left at opacity 0.
  const coverRef = React.useRef<HTMLImageElement | null>(null);
  React.useEffect(() => {
    if (imgLoaded) return;
    const el = coverRef.current;
    if (el && el.complete && el.naturalWidth > 0) setImgLoaded(true);
  }, [imgLoaded]);
  const [isPinned, setIsPinned] = React.useState(false);

  const surfaceKey = (assetType || item.assetType || "INDEX") as SurfaceKey;
  const colors = SURFACE_COLORS[surfaceKey] || SURFACE_COLORS.INDEX;
  const familyKey = CARD_FAMILY_MAP[surfaceKey] || "DERIVATIVE";
  const familyHeader = FAMILY_HEADER[familyKey] || FAMILY_HEADER.DERIVATIVE;

  const isBullBear =
    ["LONG_SHORT", "FUTURES", "HEDGE", "FUND", "MANAGED_FUTURES"].includes(surfaceKey) ||
    (item?.symbol &&
      (item.symbol.includes("LONG") ||
        item.symbol.includes("SHORT") ||
        item.symbol.includes("BULL") ||
        item.symbol.includes("BEAR")));

  const isHalfSplit =
    isBullBear ||
    ["SECRET_IDENTITY", "NEMESIS", "SWAPS", "CONVERTIBLE", "CROSSOVER"].includes(surfaceKey);

  const activePrimary = colors.primary;
  const activeBorder = colors.border;
  const rimColor = activeBorder;
  const rim = (a: number) => withAlpha(rimColor, a);

  const surfaceIcon = SURFACE_ICONS[surfaceKey] ?? "◈";
  const typeBadge = SURFACE_LABELS[surfaceKey] || surfaceKey;

  // Resolves primary authentic 3D surface artwork graphic or constituent cover
  const surfaceArt = SURFACE_ART_MAP[surfaceKey] ?? null;
  const isSeat = Boolean((item?.parameters as any)?.seatNumber != null);
  const displayImage = isSeat ? (item?.coverImageUrl || surfaceArt) : (surfaceArt || item?.coverImageUrl);

  const pricing = item?.pricing ?? {};
  const eraKey = pricing?.production_age ?? pricing?.era ?? null;
  const eraKeyStr = eraKey != null ? String(eraKey) : null;
  const eraMeta = eraKeyStr ? ERA_LOOKUP[eraKeyStr.toLowerCase()] ?? null : null;
  const eraLabel = eraMeta?.label?.replace(/ Age$/, "").toUpperCase() ?? (eraKeyStr ? eraKeyStr.toUpperCase() : null);

  const publisher = (item?.universe || pricing?.publisher || familyHeader.label || "GLOBAL") as string;
  const displayName = resolveCardDisplayName(item, surfaceKey);
  const humanTicker = formatHumanTicker(item?.symbol || item?.assetId || "", displayName, surfaceKey);
  const typeLabel = getTypeLabel(item, surfaceKey);
  const anchor = getAnchorMetric(item, surfaceKey);
  const secondary = getSecondaryMetric(item, surfaceKey);

  const resolvedDetailUrl = item?.detailUrl || `/assets/${encodeURIComponent(item?.symbol?.replace(/^\$/, "") || surfaceKey)}`;

  return (
    <Link href={resolvedDetailUrl} style={{ display: "contents" }}>
      <div
        className="asset-card flex-shrink-0 cursor-pointer outline-none"
        data-hovered={hovered ? "true" : "false"}
        style={{
          width: "215px",
          minWidth: "215px",
          height: "375px",
          border: hovered ? `2px solid ${rim(1)}` : `2px solid ${rim(0.8)}`,
          borderRadius: "6px",
          overflow: "hidden",
          position: "relative",
          backgroundColor: "#060a12",
          display: "flex",
          flexDirection: "column",
          transform: hovered
            ? "translateY(-12px) scale(1.02) perspective(700px) rotateX(2deg) rotateY(-1deg)"
            : "translateY(0) scale(1) perspective(700px) rotateX(0) rotateY(0)",
          transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1), border-color 260ms cubic-bezier(0.22, 1, 0.36, 1)",
          ["--rim" as string]: rimColor,
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* ── Graphic Cover Zone (Upper region, flex: 1) ─────────── */}
        <div
          style={{
            position: "relative",
            width: "100%",
            flex: 1,
            minHeight: 0,
            overflow: "hidden",
            backgroundColor: "#060a12",
          }}
        >
          {/* Surface Artwork PNG or Cover Image */}
          {displayImage && !imgError && (
            <>
              {/* Full Color Base Layer */}
              <img
            ref={coverRef}
                src={displayImage}
                alt={displayName}
                loading={index < 8 ? "eager" : "lazy"}
                decoding="async"
                draggable={false}
                onLoad={() => React.startTransition(() => setImgLoaded(true))}
                onError={() => React.startTransition(() => setImgError(true))}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                  display: "block",
                  opacity: imgLoaded ? 1 : 0,
                  transition: "opacity 350ms ease",
                  pointerEvents: "none",
                }}
              />

              {/* 50/50 Split Noir Overlay for dual-sided instruments */}
              {isHalfSplit && (
                <img
                  src={displayImage}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center top",
                    display: "block",
                    opacity: imgLoaded ? 1 : 0,
                    filter: "grayscale(100%) contrast(125%) brightness(90%)",
                    clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
                    zIndex: 1,
                    transition: "opacity 350ms ease",
                    pointerEvents: "none",
                  }}
                />
              )}

              {/* Glowing Split Axis Line */}
              {isHalfSplit && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    left: "50%",
                    width: "1.5px",
                    backgroundColor: activePrimary,
                    boxShadow: `0 0 8px ${activePrimary}, 0 0 2px #fff`,
                    zIndex: 3,
                    pointerEvents: "none",
                  }}
                />
              )}
            </>
          )}

          {/* Placeholder / Fallback when no image or image error */}
          {(!displayImage || imgError || !imgLoaded) && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                background: `radial-gradient(ellipse at 50% 38%, ${rim(0.18)} 0%, transparent 72%), ${colors.bg}`,
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  fontSize: "48px",
                  lineHeight: 1,
                  color: activePrimary,
                  fontFamily: "monospace",
                  opacity: 0.6,
                }}
              >
                {surfaceIcon}
              </span>
              <span
                style={{
                  fontSize: "9px",
                  fontFamily: "monospace",
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: activePrimary,
                  opacity: 0.8,
                }}
              >
                {typeBadge}
              </span>
            </div>
          )}

          {/* Top & Bottom Gradient Overlay for contrast */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              pointerEvents: "none",
              background: isBullBear
                ? "linear-gradient(135deg, rgba(74,222,128,0.24) 0%, rgba(4,6,18,0.40) 50%, rgba(248,113,113,0.24) 100%)"
                : "linear-gradient(to bottom, rgba(4,6,18,0.85) 0%, rgba(4,6,18,0.10) 35%, rgba(4,6,18,0.25) 70%, rgba(4,6,18,0.92) 100%)",
            }}
          />

          {/* Top-Left: Family Icon & Type Badge Pill */}
          <div
            style={{
              position: "absolute",
              top: 6,
              left: 6,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "5px",
              backgroundColor: "rgba(0,0,0,0.85)",
              border: `1px solid ${rim(0.5)}`,
              borderRadius: "3px",
              padding: "2px 6px",
              backdropFilter: "blur(4px)",
            }}
          >
            <span style={{ fontSize: "10px", color: activePrimary, fontFamily: "monospace", lineHeight: 1 }}>
              {surfaceIcon}
            </span>
            <span
              style={{
                fontSize: "8.5px",
                fontFamily: "monospace",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#fff",
                fontWeight: 600,
              }}
            >
              {typeBadge}
            </span>
          </div>

          {/* Top-Right: Bull & Bear Pill / Watchlist Pin */}
          <div
            style={{
              position: "absolute",
              top: 6,
              right: 6,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {isBullBear && (
              <span
                style={{
                  fontSize: "7.5px",
                  fontFamily: "monospace",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#fff",
                  backgroundColor: "rgba(6,10,18,0.92)",
                  border: "1px solid rgba(74,222,128,0.5)",
                  borderRadius: "2px",
                  padding: "1px 5px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "3px",
                }}
              >
                <span style={{ color: "#4ade80", fontWeight: 700 }}>▲ BULL</span>
                <span style={{ color: "rgba(255,255,255,0.4)" }}>|</span>
                <span style={{ color: "#f87171", fontWeight: 700 }}>🐻 BEAR</span>
              </span>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsPinned((p) => !p);
              }}
              title={isPinned ? "Unpin asset" : "Pin asset"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                borderRadius: 3,
                cursor: "pointer",
                border: isPinned ? `1px solid ${rim(0.8)}` : "1px solid rgba(255,255,255,0.25)",
                backgroundColor: isPinned ? rim(0.3) : "rgba(6,10,18,0.72)",
                color: isPinned ? activePrimary : "rgba(255,255,255,0.75)",
                backdropFilter: "blur(4px)",
              }}
            >
              {isPinned ? <PinOff size={9} /> : <Pin size={9} />}
            </button>
          </div>

          {/* Bottom-Left Cover Badge: Era / Universe overlay */}
          {eraLabel && (
            <div
              style={{
                position: "absolute",
                left: 6,
                bottom: 6,
                zIndex: 10,
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  fontSize: "8px",
                  fontFamily: "monospace",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: activePrimary,
                  backgroundColor: "rgba(6,10,18,0.85)",
                  border: `1px solid ${rim(0.4)}`,
                  borderRadius: "3px",
                  padding: "2px 6px",
                  backdropFilter: "blur(4px)",
                }}
              >
                {eraLabel}
              </span>
            </div>
          )}
        </div>

        {/* ── Approved Dedicated Bottom Info Strip ───────────────────────── */}
        <div
          style={{
            flexShrink: 0,
            backgroundColor: "#060a12",
            borderTop: `1px solid ${rim(0.25)}`,
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Publisher / Family Header Bar */}
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingInline: "10px",
              height: "20px",
              backgroundColor: rim(0.14),
              borderBottom: `1px solid ${rim(0.25)}`,
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: activePrimary,
                textTransform: "uppercase",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                backgroundColor: rim(0.25),
                border: `1px solid ${rim(0.4)}`,
                padding: "1px 5px",
                borderRadius: "2px",
              }}
            >
              {humanTicker}
            </span>
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "7.5px",
                letterSpacing: "0.08em",
                color: "rgba(255,255,255,0.75)",
                textTransform: "uppercase",
                flexShrink: 0,
              }}
            >
              {publisher}
            </span>
          </div>

          <div style={{ padding: "4px 10px 8px", display: "flex", flexDirection: "column", gap: "2px" }}>
            {/* Display Name */}
            <div
              style={{
                fontSize: "14px",
                fontWeight: 500,
                color: "#f1f5f9",
                fontFamily: "var(--font-sans, system-ui)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.2,
              }}
            >
              {displayName}
            </div>

            {/* Type / Context Line */}
            <div
              style={{
                fontSize: "11px",
                fontWeight: 400,
                color: "rgba(210,220,245,0.55)",
                fontFamily: "monospace",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                lineHeight: 1.3,
                minHeight: "15px",
              }}
            >
              {typeLabel}
            </div>

            {/* Anchor Metric (Price/Value) + Secondary Metric */}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "6px",
                marginTop: "2px",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "7.5px",
                    color: "rgba(210,220,245,0.40)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  {anchor.label}
                </div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: 600,
                    color: anchor.color || "#fff",
                    fontFamily: "var(--font-sans, system-ui)",
                    letterSpacing: "-0.2px",
                    lineHeight: 1.2,
                  }}
                >
                  {typeof anchor.value === "number" ? (
                    <AnimatedPrice value={anchor.value} />
                  ) : (
                    anchor.value
                  )}
                </div>
              </div>

              {secondary && (
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div
                    style={{
                      fontFamily: "monospace",
                      fontSize: "7.5px",
                      color: "rgba(210,220,245,0.40)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {secondary.label}
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 500,
                      color: secondary.color || "#c8d4f0",
                      fontFamily: "monospace",
                      lineHeight: 1.2,
                    }}
                  >
                    {secondary.value}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Pills line */}
            <div style={{ display: "flex", alignItems: "center", gap: "3px", marginTop: "3px" }}>
              <span
                style={{
                  fontSize: "8px",
                  fontFamily: "var(--font-sans, system-ui)",
                  fontWeight: 500,
                  color: activePrimary,
                  backgroundColor: rim(0.15),
                  border: `1px solid ${rim(0.4)}`,
                  borderRadius: "2px",
                  padding: "1px 4px",
                  lineHeight: "13px",
                  flexShrink: 0,
                }}
              >
                {typeBadge}
              </span>

              {item.pricing?.asset_class && (
                <span
                  style={{
                    fontSize: "8px",
                    fontFamily: "var(--font-sans, system-ui)",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(255,255,255,0.25)",
                    borderRadius: "2px",
                    padding: "1px 4px",
                    lineHeight: "13px",
                    flexShrink: 0,
                  }}
                >
                  {item.pricing.asset_class}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
});
