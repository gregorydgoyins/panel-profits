"use client";

import React, { useState, useRef, useMemo } from "react";
import { ComicEra, GradingCompany } from "@/lib/sniper/types";
import { getEraDisplayName, uprezEbayImage } from "@/lib/sniper/anti-bullshit";

interface SlabEncasementProps {
  gradingCompany?: GradingCompany;
  grade: number;
  title: string;
  issueNumber?: string;
  publisher?: string;
  year?: number;
  era?: ComicEra;
  certNumber?: string;
  pageQuality?: string;
  isYellowLabel?: boolean;
  signatureDetails?: string;
  keyComments?: string;
  imageUrl?: string;
  galleryImages?: string[];
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

export function SlabEncasement({
  gradingCompany = "CGC",
  grade,
  title,
  issueNumber,
  publisher,
  year,
  era,
  certNumber,
  pageQuality = "WHITE Pages",
  isYellowLabel = false,
  signatureDetails,
  keyComments,
  imageUrl,
  galleryImages,
  size = "md",
  className = "",
  onClick,
}: SlabEncasementProps) {
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // eBay-Style Interactive Loupe & Magnifier Zoom State
  const [isZooming, setIsZooming] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(2.5); // 1x, 2.5x, 4x
  const [zoomPos, setZoomPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [isLoupeLocked, setIsLoupeLocked] = useState<boolean>(false);
  const wellRef = useRef<HTMLDivElement>(null);

  // Combine main image and any gallery photos with high-resolution uprez
  const allImages = useMemo(() => {
    const list: string[] = [];
    if (imageUrl) list.push(uprezEbayImage(imageUrl));
    if (galleryImages && galleryImages.length > 0) {
      for (const img of galleryImages) {
        const up = uprezEbayImage(img);
        if (!list.includes(up)) list.push(up);
      }
    }
    return list;
  }, [imageUrl, galleryImages]);

  const currentDisplayImage = allImages[activeImageIndex] || imageUrl;

  // Enhanced Size styling presets with larger frames for proper label formatting
  const sizeClasses = {
    sm: "w-52 max-w-[210px]",
    md: "w-80 sm:w-84 max-w-[340px]",
    lg: "w-88 md:w-[420px] max-w-[450px]",
    xl: "w-96 md:w-[500px] max-w-[520px]",
  }[size];

  // Grade Qualifier text (e.g. GEM MT 10 vs NM/MT 9.8)
  const getPsaGradeDescriptor = (g: number) => {
    if (g >= 10.0) return "GEM MT 10";
    if (g >= 9.8) return "NM-MT 9.8";
    if (g >= 9.6) return "NM+ 9.6";
    if (g >= 9.4) return "NM 9.4";
    if (g >= 9.2) return "NM- 9.2";
    if (g >= 9.0) return "VF/NM 9.0";
    return `EX-MT ${g.toFixed(1)}`;
  };

  // Cursor tracking for eBay-style magnifying loupe
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!wellRef.current) return;
    const rect = wellRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleMouseEnter = () => {
    if (!isLoupeLocked) setIsZooming(true);
  };

  const handleMouseLeave = () => {
    if (!isLoupeLocked) setIsZooming(false);
  };

  const toggleLoupeLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLoupeLocked((prev) => {
      const next = !prev;
      setIsZooming(next);
      return next;
    });
  };

  const cycleZoomScale = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoomScale((prev) => (prev === 2.5 ? 4.0 : prev === 4.0 ? 1.8 : 2.5));
  };

  /**
   * Authentic Grading Company Label Styling (High-Resolution Scaled Formatting)
   */
  const renderLabelHeader = () => {
    // 1. PSA CARD/COMIC SLAB (Iconic Red Border on Crisp White Background)
    if (gradingCompany === "PSA") {
      return (
        <div className="relative overflow-hidden rounded-t-lg border-2 border-[#DC2626] bg-white text-slate-950 p-2 shadow-md">
          {/* Top Row: Red PSA Logo + PSA Grade Descriptor */}
          <div className="flex items-center justify-between border-b-2 border-red-200 pb-1">
            <div className="flex items-center gap-1.5">
              <span className="bg-[#DC2626] text-white font-black text-xs px-2 py-0.5 rounded font-sans tracking-tight">
                PSA
              </span>
              <span className="text-[9px] font-mono font-bold text-red-700 tracking-wider">
                CERTIFIED AUTHENTIC
              </span>
            </div>
            <span className="text-sm sm:text-base font-black font-mono text-[#DC2626]">
              {getPsaGradeDescriptor(grade)}
            </span>
          </div>

          {/* Book Details */}
          <div className="py-1.5 space-y-0.5">
            <div className="font-black text-xs sm:text-sm uppercase leading-tight truncate text-slate-900">
              {title} {issueNumber ? `#${issueNumber}` : ""}
            </div>
            <div className="text-[9px] sm:text-[10px] text-slate-600 font-mono truncate leading-tight">
              {publisher || "Universal"} {year ? `• ${year}` : ""} {era ? `• ${getEraDisplayName(era)}` : ""}
            </div>
            {keyComments && (
              <div className="text-[8.5px] sm:text-[9.5px] text-red-700 font-bold truncate leading-tight">
                ★ {keyComments}
              </div>
            )}
          </div>

          {/* Bottom Barcode & Prominent Cert Number */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-200 text-[9px] font-mono">
            <span className="tracking-tighter text-slate-500 font-serif text-[8px]">
              |||| | ||||| || ||| |||| | ||
            </span>
            <span className="font-bold font-mono text-slate-900 bg-red-50 px-2 py-0.5 rounded border border-red-300 shadow-sm">
              {certNumber ? `Cert #${certNumber}` : "CERTIFIED"}
            </span>
          </div>
        </div>
      );
    }

    // 2. CGC SIGNATURE SERIES (Canonical Rich Gold/Yellow Label)
    if (gradingCompany === "CGC" && isYellowLabel) {
      return (
        <div className="relative overflow-hidden rounded-t-lg border-2 border-amber-600 bg-gradient-to-b from-[#F5BA13] via-[#E6A800] to-[#D49500] text-slate-950 p-1.5 shadow-md">
          {/* Top Banner Stripe */}
          <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-amber-700/40 text-[10px] sm:text-[11px] font-black uppercase font-mono">
            <div className="flex items-center gap-1.5">
              <span className="bg-black text-[#F5BA13] font-black text-[9px] px-1.5 py-0.5 rounded">
                CGC
              </span>
              <span className="tracking-wider text-black font-black">SIGNATURE SERIES</span>
            </div>
            {era && <span className="text-[9px] text-black/90 font-bold">{getEraDisplayName(era)}</span>}
          </div>

          {/* Main Label Body: Grade Box on Left, Title / Signatures on Right */}
          <div className="grid grid-cols-12 gap-2 p-1 items-center">
            {/* Authentic White Grade Box */}
            <div className="col-span-4 bg-white border border-amber-700/60 rounded-md flex flex-col items-center justify-center p-1 shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tighter text-black leading-none">
                {grade.toFixed(1)}
              </span>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-amber-950 leading-tight mt-1">
                {pageQuality}
              </span>
            </div>

            {/* Title & Witnessed Signature Details */}
            <div className="col-span-8 flex flex-col justify-center overflow-hidden space-y-0.5">
              <div className="font-black text-[11px] sm:text-xs truncate leading-tight uppercase text-black">
                {title} {issueNumber ? `#${issueNumber}` : ""}
              </div>
              <div className="text-[8.5px] sm:text-[9.5px] text-amber-950 font-mono truncate leading-tight">
                {publisher || "Marvel/DC"} {year ? `• ${year}` : ""}
              </div>
              {signatureDetails ? (
                <div className="text-[8.5px] sm:text-[9.5px] truncate font-black text-black bg-white/70 px-1.5 py-0.5 rounded border border-amber-800/40 shadow-xs">
                  ✍ {signatureDetails}
                </div>
              ) : (
                <div className="text-[8px] truncate font-bold text-black">
                  ★ Witnessed Creator Signature
                </div>
              )}
              {keyComments && (
                <div className="text-[8px] truncate font-semibold text-black/90">
                  {keyComments}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Barcode & Prominent Cert Number */}
          <div className="flex items-center justify-between px-1.5 py-1 bg-black/15 border-t border-amber-700/40 text-[9px] font-mono">
            <span className="tracking-tighter font-serif text-[8px] text-black/80">
              |||| | ||||| || ||| |||| |
            </span>
            <span className="font-black font-mono text-black bg-white/95 px-2 py-0.5 rounded border border-amber-800/50 shadow-sm">
              {certNumber ? `Cert #${certNumber}` : "CGC VERIFIED"}
            </span>
          </div>
        </div>
      );
    }

    // 3. CGC UNIVERSAL (Canonical Deep Rich CGC Blue Label)
    if (gradingCompany === "CGC") {
      return (
        <div className="relative overflow-hidden rounded-t-lg border-2 border-[#0B3064] bg-gradient-to-b from-[#18488E] via-[#154284] to-[#0E3269] text-white p-1.5 shadow-md">
          {/* Top Banner Stripe */}
          <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-white/20 text-[10px] sm:text-[11px] font-black uppercase font-mono">
            <div className="flex items-center gap-1.5">
              <span className="bg-white text-[#154284] font-black text-[9px] px-1.5 py-0.5 rounded">
                CGC
              </span>
              <span className="tracking-wider text-white font-black">UNIVERSAL GRADE</span>
            </div>
            {era && <span className="text-[9px] text-white/90 font-bold">{getEraDisplayName(era)}</span>}
          </div>

          {/* Main Label Body: Grade Box on Left, Title / Cert on Right */}
          <div className="grid grid-cols-12 gap-2 p-1 items-center">
            {/* Authentic White Grade Box */}
            <div className="col-span-4 bg-white border border-blue-950 rounded-md flex flex-col items-center justify-center p-1 shadow-inner">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tighter text-[#154284] leading-none">
                {grade.toFixed(1)}
              </span>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-slate-800 leading-tight mt-1">
                {pageQuality}
              </span>
            </div>

            {/* Title & Key Comments */}
            <div className="col-span-8 flex flex-col justify-center overflow-hidden space-y-0.5">
              <div className="font-black text-[11px] sm:text-xs truncate leading-tight uppercase text-white">
                {title} {issueNumber ? `#${issueNumber}` : ""}
              </div>
              <div className="text-[9px] sm:text-[10px] text-blue-200 font-mono truncate leading-tight">
                {publisher || "Marvel/DC"} {year ? `• ${year}` : ""}
              </div>
              {keyComments && (
                <div className="text-[8.5px] sm:text-[9.5px] truncate font-bold text-amber-300 leading-tight">
                  ★ {keyComments}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Barcode & Prominent Cert Number */}
          <div className="flex items-center justify-between px-1.5 py-1 bg-black/25 border-t border-white/15 text-[9px] font-mono">
            <span className="tracking-tighter font-serif text-[8px] text-white/80">
              |||| | ||||| || ||| |||| |
            </span>
            <span className="font-black font-mono text-cyan-200 bg-blue-950/90 px-2 py-0.5 rounded border border-blue-400/50 shadow-sm">
              {certNumber ? `Cert #${certNumber}` : "CGC UNIVERSAL"}
            </span>
          </div>
        </div>
      );
    }

    // 4. CBCS (Universal Blue or Verified Signature Gold)
    if (gradingCompany === "CBCS") {
      const isCbcsGold = isYellowLabel;
      return (
        <div
          className={`relative overflow-hidden rounded-t-lg border-2 p-1.5 shadow-md ${
            isCbcsGold
              ? "border-[#997300] bg-gradient-to-b from-[#D4AF37] via-[#C59B27] to-[#B8860B] text-slate-950"
              : "border-[#004D73] bg-gradient-to-b from-[#006699] via-[#0E4B75] to-[#063352] text-white"
          }`}
        >
          {/* Top Stripe */}
          <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-black/20 text-[10px] sm:text-[11px] font-black uppercase font-mono">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-black text-[9px] px-1.5 py-0.5 rounded ${
                  isCbcsGold ? "bg-black text-[#D4AF37]" : "bg-white text-[#006699]"
                }`}
              >
                CBCS
              </span>
              <span className="tracking-wider font-black">
                {isCbcsGold ? "VERIFIED SIGNATURE" : "UNIVERSAL GRADE"}
              </span>
            </div>
            {era && <span className="text-[9px] opacity-90">{getEraDisplayName(era)}</span>}
          </div>

          {/* Grade & Title */}
          <div className="grid grid-cols-12 gap-2 p-1 items-center">
            <div className="col-span-4 bg-white rounded-md flex flex-col items-center justify-center p-1 shadow-inner border border-slate-400">
              <span
                className={`text-2xl sm:text-3xl font-black font-mono tracking-tighter leading-none ${
                  isCbcsGold ? "text-[#997300]" : "text-[#006699]"
                }`}
              >
                {grade.toFixed(1)}
              </span>
              <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-tight text-slate-700 leading-tight mt-1">
                {pageQuality}
              </span>
            </div>
            <div className="col-span-8 flex flex-col justify-center overflow-hidden space-y-0.5">
              <div className="font-black text-[11px] sm:text-xs truncate leading-tight uppercase">
                {title} {issueNumber ? `#${issueNumber}` : ""}
              </div>
              <div className="text-[9px] sm:text-[10px] opacity-80 font-mono truncate leading-tight">
                {publisher || "Marvel/DC"} {year ? `• ${year}` : ""}
              </div>
              {signatureDetails && (
                <div className="text-[8.5px] sm:text-[9.5px] truncate font-bold text-amber-950 bg-yellow-100/90 px-1.5 py-0.5 rounded">
                  ✍ {signatureDetails}
                </div>
              )}
              {keyComments && (
                <div className="text-[8.5px] sm:text-[9.5px] truncate font-semibold opacity-95">
                  ★ {keyComments}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Cert Strip */}
          <div className="flex items-center justify-between px-1.5 py-1 bg-black/25 border-t border-black/15 text-[9px] font-mono">
            <span className="tracking-tighter font-serif text-[8px] opacity-80">
              |||| | ||||| || ||| |||| |
            </span>
            <span className="font-black font-mono px-2 py-0.5 rounded bg-black/20 shadow-sm">
              {certNumber ? `Cert #${certNumber}` : "CBCS VERIFIED"}
            </span>
          </div>
        </div>
      );
    }

    // 5. PGX (Forest Green Label)
    if (gradingCompany === "PGX") {
      return (
        <div className="relative overflow-hidden rounded-t-lg border-2 border-[#1B5E20] bg-gradient-to-b from-[#2E7D32] via-[#1B5E20] to-[#0D3813] text-white p-1.5 shadow-md">
          <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-white/20 text-[10px] sm:text-[11px] font-black uppercase font-mono">
            <div className="flex items-center gap-1.5">
              <span className="bg-white text-[#1B5E20] font-black text-[9px] px-1.5 py-0.5 rounded">
                PGX
              </span>
              <span className="tracking-wider text-white font-black">CERTIFIED GRADE</span>
            </div>
            <span className="text-[9px] text-green-200">{pageQuality}</span>
          </div>
          <div className="grid grid-cols-12 gap-2 p-1 items-center">
            <div className="col-span-4 bg-white rounded-md flex flex-col items-center justify-center p-1 shadow-inner border border-green-900">
              <span className="text-2xl sm:text-3xl font-black font-mono text-[#1B5E20] leading-none">
                {grade.toFixed(1)}
              </span>
            </div>
            <div className="col-span-8 flex flex-col justify-center overflow-hidden space-y-0.5">
              <div className="font-black text-[11px] sm:text-xs truncate leading-tight uppercase text-white">
                {title} {issueNumber ? `#${issueNumber}` : ""}
              </div>
              {keyComments && (
                <div className="text-[8.5px] sm:text-[9.5px] truncate font-bold text-green-200">
                  ★ {keyComments}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-1.5 py-1 bg-black/25 border-t border-white/15 text-[9px] font-mono">
            <span className="tracking-tighter font-serif text-[8px] text-white/80">|||| | ||||| |||| |</span>
            <span className="font-black text-green-200 bg-green-950/80 px-2 py-0.5 rounded border border-green-500/40">
              {certNumber ? `Cert #${certNumber}` : "PGX REGISTRY"}
            </span>
          </div>
        </div>
      );
    }

    // 6. EGS (European Grading Service - Blue/Silver)
    return (
      <div className="relative overflow-hidden rounded-t-lg border-2 border-[#1E3A8A] bg-gradient-to-b from-[#1E40AF] to-[#0F172A] text-white p-1.5 shadow-md">
        <div className="flex items-center justify-between px-1.5 py-0.5 border-b border-white/20 text-[10px] sm:text-[11px] font-black uppercase font-mono">
          <span className="bg-white text-blue-900 font-black text-[9px] px-1.5 py-0.5 rounded">EGS</span>
          <span className="tracking-wider">CERTIFIED AUTHENTIC</span>
          <span className="text-[9px] font-bold text-amber-300">{grade.toFixed(1)}</span>
        </div>
        <div className="p-1 text-[11px] font-black uppercase truncate text-white">{title}</div>
        <div className="flex justify-between px-1.5 py-1 text-[8px] font-mono bg-black/25">
          <span>EUROPEAN REGISTRY</span>
          <span>{certNumber ? `Cert #${certNumber}` : "EGS CERT"}</span>
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      className={`relative select-none flex flex-col rounded-2xl border-[3px] border-slate-400/40 bg-gradient-to-b from-white/10 via-slate-900/70 to-black/95 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.9)] backdrop-blur-md transition ${
        onClick ? "cursor-zoom-in hover:scale-[1.015] hover:border-cyan-400/90 group" : "hover:border-slate-300/80"
      } ${sizeClasses} ${className}`}
      style={{
        boxShadow:
          "0 14px 36px -4px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.3), inset 0 -3px 6px rgba(0,0,0,0.85)",
      }}
      title={onClick ? "Click to view full high-resolution front inspection" : undefined}
    >
      {/* Acrylic Hanger Tab Notch at top */}
      <div className="mx-auto -mt-3.5 mb-1 h-2.5 w-16 rounded-t-md border-t border-x border-slate-300/50 bg-white/15 backdrop-blur-sm" />

      {/* DISTINCTIVE CERTIFIED SLAB LABEL HEADER */}
      {renderLabelHeader()}

      {/* RECESSED ACRYLIC ARCHIVAL WELL (HIGH-VISIBILITY MAIN COMIC COVER WITH eBAY-STYLE ZOOM LOUPE) */}
      <div
        ref={wellRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative mt-2 flex-1 overflow-hidden rounded-md border-2 border-slate-700/70 bg-slate-950 shadow-inner aspect-[2/3] flex items-center justify-center min-h-[260px] sm:min-h-[300px] cursor-crosshair"
        style={{
          boxShadow: "inset 0 3px 8px rgba(0,0,0,0.95), 0 1px 3px rgba(255,255,255,0.15)",
        }}
      >
        {/* Archival Inner Well Mount Rim */}
        <div className="absolute inset-1.5 rounded-sm border border-slate-700/50 pointer-events-none z-10" />

        {/* Acrylic Light Reflection Sheen */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10"
          style={{ mixBlendMode: "overlay" }}
        />

        {currentDisplayImage && currentDisplayImage.trim().length > 0 ? (
          /* HIGH VISIBILITY SELLER COVER IMAGE WITH DYNAMIC eBAY ZOOM LENS */
          <div className="relative w-full h-full overflow-hidden flex items-center justify-center">
            <img
              src={uprezEbayImage(currentDisplayImage)}
              alt={title}
              className="w-full h-full object-contain rounded-[1px] select-none p-2"
              style={{
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                transform: isZooming ? `scale(${zoomScale})` : "scale(1)",
                transition: isZooming ? "none" : "transform 0.25s ease-out",
                imageRendering: "-webkit-optimize-contrast",
                filter: "contrast(1.03) saturate(1.02)",
              }}
              loading="lazy"
            />

            {/* eBay-Style Crosshair / Loupe Reticle Overlay */}
            {isZooming && (
              <div
                className="absolute w-24 h-24 rounded-full border-2 border-cyan-400 bg-cyan-400/10 pointer-events-none shadow-[0_0_20px_rgba(34,211,238,0.6)] z-20 flex items-center justify-center"
                style={{
                  left: `calc(${zoomPos.x}% - 48px)`,
                  top: `calc(${zoomPos.y}% - 48px)`,
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-300" />
              </div>
            )}
          </div>
        ) : (
          /* CERTIFIED REGISTRY FALLBACK IF NO SELLER PHOTO */
          <div className="w-full h-full p-3 flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-400">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2 shadow">
              <span className="text-xl">🛡️</span>
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-200 font-mono">
              {gradingCompany} CERTIFIED SLAB
            </div>
            <div className="text-[9px] font-mono font-bold text-amber-400 mt-1">
              Grade {grade.toFixed(1)} Encapsulated
            </div>
            {certNumber && (
              <div className="text-[8px] font-mono text-cyan-400 mt-1.5 bg-cyan-950/70 border border-cyan-500/40 px-1.5 py-0.5 rounded">
                Cert #{certNumber}
              </div>
            )}
            <div className="text-[7.5px] text-slate-500 mt-2.5 leading-tight uppercase font-medium max-w-[140px]">
              Certified Slab · Verified on {gradingCompany} Registry
            </div>
          </div>
        )}

        {/* Floating eBay Zoom Controls Pill Bar */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 z-30"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={toggleLoupeLock}
            className={`px-2 py-0.5 rounded text-[8.5px] font-mono font-bold border transition shadow ${
              isLoupeLocked
                ? "bg-cyan-500 text-slate-950 border-cyan-400 ring-1 ring-cyan-300"
                : "bg-black/75 text-cyan-300 border-cyan-500/50 hover:bg-black/90"
            }`}
            title="Lock zoom loupe in place to inspect defect"
          >
            {isLoupeLocked ? "🔒 PINNED" : "🔍 LOUPE"}
          </button>
          {isZooming && (
            <button
              type="button"
              onClick={cycleZoomScale}
              className="px-1.5 py-0.5 rounded text-[8.5px] font-mono font-bold bg-black/80 text-amber-300 border border-amber-500/50 hover:bg-black/95 shadow"
              title="Cycle magnification factor"
            >
              {zoomScale}x
            </button>
          )}
        </div>

        {/* Live Loupe Coordinate / Inspection Banner */}
        {isZooming && (
          <div className="absolute bottom-2 inset-x-2 bg-black/85 border border-cyan-500/60 rounded px-2 py-1 text-[8px] font-mono text-cyan-300 flex items-center justify-between z-30 shadow-md backdrop-blur-sm pointer-events-none">
            <span className="flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping inline-block" />
              eBay Loupe {zoomScale}x
            </span>
            <span className="text-slate-400">
              Spine/Corners @ {Math.round(zoomPos.x)}% : {Math.round(zoomPos.y)}%
            </span>
          </div>
        )}

        {/* Inspection Hover Overlay (When not zooming) */}
        {!isZooming && onClick && (
          <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none z-10">
            <span className="text-[9px] font-mono font-bold text-cyan-300 bg-slate-900/95 border border-cyan-500/80 px-2.5 py-1.5 rounded-md shadow-lg flex items-center gap-1.5 uppercase tracking-wider">
              <span>🔍</span> Hover to Zoom • Click to Expand
            </span>
          </div>
        )}
      </div>

      {/* MULTI-IMAGE THUMBNAIL GALLERY SELECTOR (IF MULTIPLE SELLER PHOTOS EXIST) */}
      {allImages.length > 1 && (
        <div
          className="mt-2 flex items-center justify-center gap-1.5 px-1.5 py-1 bg-black/70 rounded-md border border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {allImages.slice(0, 5).map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImageIndex(i)}
              className={`w-7 h-9 rounded overflow-hidden border-2 transition ${
                activeImageIndex === i
                  ? "border-cyan-400 ring-1 ring-cyan-400 scale-105"
                  : "border-slate-700 opacity-60 hover:opacity-100"
              }`}
              title={`View Photo #${i + 1}`}
            >
              <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
          {allImages.length > 5 && (
            <span className="text-[8px] font-mono text-slate-400 ml-1">
              +{allImages.length - 5}
            </span>
          )}
        </div>
      )}

      {/* BOTTOM SLAB RIM: PRISMATIC MICRO-HOLOGRAM SECURITY BADGE */}
      <div className="mt-1.5 flex items-center justify-between px-1.5 text-[8px] font-mono text-slate-400">
        <span className="text-[7px] tracking-tight text-slate-500 font-bold">ARCHIVAL WELL</span>

        {/* Micro-Hologram Security Badge */}
        <div
          className="px-2 py-0.5 rounded-[3px] text-[7.5px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 border border-white/25"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #ec4899, #06b6d4, #10b981)",
            color: "#0a0a0a",
            textShadow: "0 0 1px rgba(255,255,255,0.7)",
          }}
          title="Official tamper-evident micro-hologram security seal"
        >
          <span>✪</span>
          <span>{gradingCompany} SEAL</span>
        </div>

        <span className="text-[7px] tracking-tight text-slate-500 font-bold">UV PROTECTED</span>
      </div>
    </div>
  );
}
