"use client";

import React, { useState } from "react";
import { ComicEra, GradingCompany } from "@/lib/sniper/types";
import { getEraDisplayName } from "@/lib/sniper/anti-bullshit";

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

  // Combine main image and any gallery photos
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (imageUrl) list.push(imageUrl);
    if (galleryImages && galleryImages.length > 0) {
      for (const img of galleryImages) {
        if (!list.includes(img)) list.push(img);
      }
    }
    return list;
  }, [imageUrl, galleryImages]);

  const currentDisplayImage = allImages[activeImageIndex] || imageUrl;

  // Size styling presets
  const sizeClasses = {
    sm: "w-40 max-w-[160px]",
    md: "w-52 max-w-[208px]",
    lg: "w-64 max-w-[256px]",
    xl: "w-80 max-w-[320px]",
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

  /**
   * Authentic Grading Company Label Styling
   */
  const renderLabelHeader = () => {
    // 1. PSA CARD/COMIC SLAB (Iconic Red Border on Crisp White Background)
    if (gradingCompany === "PSA") {
      return (
        <div className="relative overflow-hidden rounded-t-md border-2 border-[#DC2626] bg-white text-slate-950 p-1.5 shadow-md">
          {/* Top Row: Red PSA Logo + PSA Grade Descriptor */}
          <div className="flex items-center justify-between border-b border-red-200 pb-1">
            <div className="flex items-center gap-1">
              <span className="bg-[#DC2626] text-white font-black text-[9px] px-1.5 py-0.2 rounded font-sans tracking-tight">
                PSA
              </span>
              <span className="text-[7.5px] font-mono font-bold text-red-700 tracking-wider">
                CERTIFIED AUTHENTIC
              </span>
            </div>
            <span className="text-xs font-black font-mono text-[#DC2626]">
              {getPsaGradeDescriptor(grade)}
            </span>
          </div>

          {/* Book Details */}
          <div className="py-1">
            <div className="font-black text-[9px] uppercase leading-tight truncate text-slate-900">
              {title}
            </div>
            <div className="text-[7.5px] text-slate-600 font-mono truncate leading-tight">
              {publisher || "Universal"} {year ? `• ${year}` : ""}
            </div>
            {keyComments && (
              <div className="text-[7px] text-red-700 font-bold truncate leading-tight mt-0.5">
                ★ {keyComments}
              </div>
            )}
          </div>

          {/* Bottom Barcode & Prominent Cert Number */}
          <div className="flex items-center justify-between pt-0.5 border-t border-slate-200 text-[8px] font-mono">
            <span className="tracking-tighter text-slate-400 font-serif text-[6px]">
              |||| | ||||| || ||| ||| |
            </span>
            <span className="font-bold font-mono text-slate-900 bg-red-50 px-1 rounded border border-red-200">
              {certNumber ? `Cert #${certNumber}` : "CERTIFIED"}
            </span>
          </div>
        </div>
      );
    }

    // 2. CGC SIGNATURE SERIES (Canonical Rich Gold/Yellow Label)
    if (gradingCompany === "CGC" && isYellowLabel) {
      return (
        <div className="relative overflow-hidden rounded-t-md border border-amber-600 bg-gradient-to-b from-[#F5BA13] via-[#E6A800] to-[#D49500] text-slate-950 p-1 shadow-md">
          {/* Top Banner Stripe */}
          <div className="flex items-center justify-between px-1 py-0.5 border-b border-amber-700/30 text-[9px] font-black uppercase font-mono">
            <div className="flex items-center gap-1">
              <span className="bg-black text-[#F5BA13] font-black text-[8px] px-1 rounded">
                CGC
              </span>
              <span className="tracking-wider text-black font-black">SIGNATURE SERIES</span>
            </div>
            {era && <span className="text-[7.5px] text-black/80 font-bold">{getEraDisplayName(era)}</span>}
          </div>

          {/* Main Label Body: Grade Box on Left, Title / Signatures on Right */}
          <div className="grid grid-cols-12 gap-1.5 p-1 items-center">
            {/* Authentic White Grade Box */}
            <div className="col-span-4 bg-white border border-amber-700/50 rounded flex flex-col items-center justify-center p-0.5 shadow-inner">
              <span className="text-xl font-black font-mono tracking-tighter text-black leading-none">
                {grade.toFixed(1)}
              </span>
              <span className="text-[6.5px] font-black uppercase tracking-tight text-amber-900 leading-tight mt-0.5">
                {pageQuality}
              </span>
            </div>

            {/* Title & Witnessed Signature Details */}
            <div className="col-span-8 flex flex-col justify-center overflow-hidden">
              <div className="font-black text-[9px] truncate leading-tight uppercase text-black">
                {title}
              </div>
              {signatureDetails ? (
                <div className="text-[7px] truncate font-bold text-black mt-0.5 bg-amber-200/80 px-1 rounded border border-amber-500/40">
                  ✍ {signatureDetails}
                </div>
              ) : (
                <div className="text-[7px] truncate font-bold text-black mt-0.5">
                  ★ Witnessed Creator Signature
                </div>
              )}
              {keyComments && (
                <div className="text-[6.5px] truncate font-semibold text-black/90 mt-0.5">
                  {keyComments}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Barcode & Prominent Cert Number */}
          <div className="flex items-center justify-between px-1 py-0.5 bg-black/10 border-t border-amber-700/30 text-[7.5px] font-mono">
            <span className="tracking-tighter font-serif text-[6px] text-black/70">
              |||| | ||||| || ||| |
            </span>
            <span className="font-black font-mono text-black bg-white/80 px-1 rounded border border-amber-700/40">
              {certNumber ? `Cert #${certNumber}` : "CGC VERIFIED"}
            </span>
          </div>
        </div>
      );
    }

    // 3. CGC UNIVERSAL (Canonical Deep Rich CGC Blue Label)
    if (gradingCompany === "CGC") {
      return (
        <div className="relative overflow-hidden rounded-t-md border border-[#0B3064] bg-gradient-to-b from-[#18488E] via-[#154284] to-[#0E3269] text-white p-1 shadow-md">
          {/* Top Banner Stripe */}
          <div className="flex items-center justify-between px-1 py-0.5 border-b border-white/20 text-[9px] font-black uppercase font-mono">
            <div className="flex items-center gap-1">
              <span className="bg-white text-[#154284] font-black text-[8px] px-1 rounded">
                CGC
              </span>
              <span className="tracking-wider text-white font-black">UNIVERSAL GRADE</span>
            </div>
            {era && <span className="text-[7.5px] text-white/80 font-bold">{getEraDisplayName(era)}</span>}
          </div>

          {/* Main Label Body: Grade Box on Left, Title / Cert on Right */}
          <div className="grid grid-cols-12 gap-1.5 p-1 items-center">
            {/* Authentic White Grade Box */}
            <div className="col-span-4 bg-white border border-blue-950 rounded flex flex-col items-center justify-center p-0.5 shadow-inner">
              <span className="text-xl font-black font-mono tracking-tighter text-[#154284] leading-none">
                {grade.toFixed(1)}
              </span>
              <span className="text-[6.5px] font-black uppercase tracking-tight text-slate-800 leading-tight mt-0.5">
                {pageQuality}
              </span>
            </div>

            {/* Title & Key Comments */}
            <div className="col-span-8 flex flex-col justify-center overflow-hidden">
              <div className="font-black text-[9px] truncate leading-tight uppercase text-white">
                {title}
              </div>
              <div className="text-[7.5px] text-blue-200 font-mono truncate leading-tight">
                {publisher || "Marvel/DC"} {year ? `• ${year}` : ""}
              </div>
              {keyComments && (
                <div className="text-[7px] truncate font-bold text-amber-300 leading-tight mt-0.5">
                  ★ {keyComments}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Barcode & Prominent Cert Number */}
          <div className="flex items-center justify-between px-1 py-0.5 bg-black/20 border-t border-white/10 text-[7.5px] font-mono">
            <span className="tracking-tighter font-serif text-[6px] text-white/70">
              |||| | ||||| || ||| |
            </span>
            <span className="font-bold font-mono text-cyan-200 bg-blue-950/80 px-1 rounded border border-blue-400/40">
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
          className={`relative overflow-hidden rounded-t-md border p-1 shadow-md ${
            isCbcsGold
              ? "border-[#997300] bg-gradient-to-b from-[#D4AF37] via-[#C59B27] to-[#B8860B] text-slate-950"
              : "border-[#004D73] bg-gradient-to-b from-[#006699] via-[#0E4B75] to-[#063352] text-white"
          }`}
        >
          {/* Top Stripe */}
          <div className="flex items-center justify-between px-1 py-0.5 border-b border-black/20 text-[9px] font-black uppercase font-mono">
            <div className="flex items-center gap-1">
              <span
                className={`font-black text-[8px] px-1 rounded ${
                  isCbcsGold ? "bg-black text-[#D4AF37]" : "bg-white text-[#006699]"
                }`}
              >
                CBCS
              </span>
              <span className="tracking-wider font-black">
                {isCbcsGold ? "VERIFIED SIGNATURE" : "UNIVERSAL GRADE"}
              </span>
            </div>
            {era && <span className="text-[7.5px] opacity-80">{getEraDisplayName(era)}</span>}
          </div>

          {/* Grade & Title */}
          <div className="grid grid-cols-12 gap-1.5 p-1 items-center">
            <div className="col-span-4 bg-white rounded flex flex-col items-center justify-center p-0.5 shadow-inner border border-slate-400">
              <span
                className={`text-xl font-black font-mono tracking-tighter leading-none ${
                  isCbcsGold ? "text-[#997300]" : "text-[#006699]"
                }`}
              >
                {grade.toFixed(1)}
              </span>
              <span className="text-[6.5px] font-black uppercase tracking-tight text-slate-700 leading-tight mt-0.5">
                {pageQuality}
              </span>
            </div>
            <div className="col-span-8 flex flex-col justify-center overflow-hidden">
              <div className="font-black text-[9px] truncate leading-tight uppercase">
                {title}
              </div>
              {signatureDetails && (
                <div className="text-[7px] truncate font-bold text-amber-950 mt-0.5 bg-yellow-100/90 px-1 rounded">
                  ✍ {signatureDetails}
                </div>
              )}
              {keyComments && (
                <div className="text-[7px] truncate font-semibold opacity-90 mt-0.5">
                  ★ {keyComments}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Cert Strip */}
          <div className="flex items-center justify-between px-1 py-0.5 bg-black/20 border-t border-black/10 text-[7.5px] font-mono">
            <span className="tracking-tighter font-serif text-[6px] opacity-70">
              |||| | ||||| || ||| |
            </span>
            <span className="font-bold font-mono px-1 rounded bg-black/10">
              {certNumber ? `Cert #${certNumber}` : "CBCS VERIFIED"}
            </span>
          </div>
        </div>
      );
    }

    // 5. PGX (Forest Green Label)
    if (gradingCompany === "PGX") {
      return (
        <div className="relative overflow-hidden rounded-t-md border border-[#1B5E20] bg-gradient-to-b from-[#2E7D32] via-[#1B5E20] to-[#0D3813] text-white p-1 shadow-md">
          <div className="flex items-center justify-between px-1 py-0.5 border-b border-white/20 text-[9px] font-black uppercase font-mono">
            <div className="flex items-center gap-1">
              <span className="bg-white text-[#1B5E20] font-black text-[8px] px-1 rounded">
                PGX
              </span>
              <span className="tracking-wider text-white font-black">CERTIFIED GRADE</span>
            </div>
            <span className="text-[7.5px] text-green-200">{pageQuality}</span>
          </div>
          <div className="grid grid-cols-12 gap-1.5 p-1 items-center">
            <div className="col-span-4 bg-white rounded flex flex-col items-center justify-center p-0.5 shadow-inner border border-green-900">
              <span className="text-xl font-black font-mono text-[#1B5E20] leading-none">
                {grade.toFixed(1)}
              </span>
            </div>
            <div className="col-span-8 flex flex-col justify-center overflow-hidden">
              <div className="font-black text-[9px] truncate leading-tight uppercase text-white">
                {title}
              </div>
              {keyComments && (
                <div className="text-[7px] truncate font-bold text-green-200 mt-0.5">
                  ★ {keyComments}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between px-1 py-0.5 bg-black/20 border-t border-white/10 text-[7.5px] font-mono">
            <span className="tracking-tighter font-serif text-[6px] text-white/70">|||| | ||||| |</span>
            <span className="font-bold text-green-200">
              {certNumber ? `Cert #${certNumber}` : "PGX REGISTRY"}
            </span>
          </div>
        </div>
      );
    }

    // 6. EGS (European Grading Service - Blue/Silver)
    return (
      <div className="relative overflow-hidden rounded-t-md border border-[#1E3A8A] bg-gradient-to-b from-[#1E40AF] to-[#0F172A] text-white p-1 shadow-md">
        <div className="flex items-center justify-between px-1 py-0.5 border-b border-white/20 text-[9px] font-black uppercase font-mono">
          <span className="bg-white text-blue-900 font-black text-[8px] px-1 rounded">EGS</span>
          <span className="tracking-wider">CERTIFIED AUTHENTIC</span>
          <span className="text-[8px] font-bold text-amber-300">{grade.toFixed(1)}</span>
        </div>
        <div className="p-1 text-[8.5px] font-black uppercase truncate text-white">{title}</div>
        <div className="flex justify-between px-1 py-0.5 text-[7px] font-mono bg-black/20">
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
      className={`relative select-none flex flex-col rounded-xl border-[2.5px] border-slate-400/40 bg-gradient-to-b from-white/10 via-slate-900/60 to-black/90 p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-md transition ${
        onClick ? "cursor-zoom-in hover:scale-[1.02] hover:border-cyan-400/80 group" : "hover:border-slate-300/70"
      } ${sizeClasses} ${className}`}
      style={{
        boxShadow:
          "0 10px 28px -4px rgba(0,0,0,0.8), inset 0 1px 2px rgba(255,255,255,0.25), inset 0 -2px 4px rgba(0,0,0,0.8)",
      }}
      title={onClick ? "Click to view full high-resolution front inspection" : undefined}
    >
      {/* Acrylic Hanger Tab Notch at top */}
      <div className="mx-auto -mt-2.5 mb-1 h-2 w-12 rounded-t-md border-t border-x border-slate-300/40 bg-white/10 backdrop-blur-sm" />

      {/* DISTINCTIVE CERTIFIED SLAB LABEL HEADER */}
      {renderLabelHeader()}

      {/* RECESSED ACRYLIC ARCHIVAL WELL (HIGH-VISIBILITY MAIN COMIC COVER) */}
      <div
        className="relative mt-1 flex-1 overflow-hidden rounded-sm border-2 border-slate-700/60 bg-slate-950 shadow-inner aspect-[2/3] flex items-center justify-center min-h-[220px]"
        style={{
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.9), 0 1px 2px rgba(255,255,255,0.1)",
        }}
      >
        {/* Archival Inner Well Mount Rim */}
        <div className="absolute inset-1 rounded-sm border border-slate-700/40 pointer-events-none" />

        {/* Acrylic Light Reflection Sheen */}
        <div
          className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"
          style={{ mixBlendMode: "overlay" }}
        />

        {currentDisplayImage && currentDisplayImage.trim().length > 0 ? (
          /* HIGH VISIBILITY SELLER COVER IMAGE */
          <img
            src={currentDisplayImage}
            alt={title}
            className="w-full h-full object-cover rounded-[1px] transition duration-300"
            loading="lazy"
          />
        ) : (
          /* CERTIFIED REGISTRY FALLBACK IF NO SELLER PHOTO */
          <div className="w-full h-full p-2.5 flex flex-col items-center justify-center text-center bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 text-slate-400">
            <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-1.5 shadow">
              <span className="text-base">🛡️</span>
            </div>
            <div className="text-[9px] font-black uppercase tracking-wider text-slate-200 font-mono">
              {gradingCompany} CERTIFIED SLAB
            </div>
            <div className="text-[8px] font-mono font-bold text-amber-400 mt-0.5">
              Grade {grade.toFixed(1)} Encapsulated
            </div>
            {certNumber && (
              <div className="text-[7px] font-mono text-cyan-400 mt-1 bg-cyan-950/60 border border-cyan-500/30 px-1 rounded">
                Cert #{certNumber}
              </div>
            )}
            <div className="text-[6.5px] text-slate-500 mt-2 leading-tight uppercase font-medium max-w-[120px]">
              Certified Slab · Verified on {gradingCompany} Registry
            </div>
          </div>
        )}

        {/* Inspection Hover Overlay */}
        {onClick && (
          <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity pointer-events-none z-10">
            <span className="text-[8px] font-mono font-bold text-cyan-300 bg-slate-900/95 border border-cyan-500/80 px-2 py-1 rounded shadow flex items-center gap-1 uppercase tracking-wider">
              <span>🔍</span> Inspect High-Res
            </span>
          </div>
        )}
      </div>

      {/* MULTI-IMAGE THUMBNAIL GALLERY SELECTOR (IF MULTIPLE SELLER PHOTOS EXIST) */}
      {allImages.length > 1 && (
        <div
          className="mt-1 flex items-center justify-center gap-1 px-1 py-0.5 bg-black/60 rounded border border-slate-800"
          onClick={(e) => e.stopPropagation()}
        >
          {allImages.slice(0, 4).map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveImageIndex(i)}
              className={`w-6 h-7 rounded overflow-hidden border transition ${
                activeImageIndex === i
                  ? "border-cyan-400 ring-1 ring-cyan-400 scale-105"
                  : "border-slate-700 opacity-60 hover:opacity-100"
              }`}
              title={`View Photo #${i + 1}`}
            >
              <img src={img} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
          {allImages.length > 4 && (
            <span className="text-[7px] font-mono text-slate-400 ml-0.5">
              +{allImages.length - 4}
            </span>
          )}
        </div>
      )}

      {/* BOTTOM SLAB RIM: PRISMATIC MICRO-HOLOGRAM SECURITY BADGE */}
      <div className="mt-1 flex items-center justify-between px-1 text-[7px] font-mono text-slate-400">
        <span className="text-[6px] tracking-tight text-slate-500">ARCHIVAL WELL</span>

        {/* Micro-Hologram Security Badge */}
        <div
          className="px-1.5 py-0.5 rounded-[2px] text-[6.5px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1 border border-white/20"
          style={{
            background: "linear-gradient(135deg, #f59e0b, #ec4899, #06b6d4, #10b981)",
            color: "#0a0a0a",
            textShadow: "0 0 1px rgba(255,255,255,0.6)",
          }}
          title="Official tamper-evident micro-hologram security seal"
        >
          <span>✪</span>
          <span>{gradingCompany} SEAL</span>
        </div>

        <span className="text-[6px] tracking-tight text-slate-500">UV PROTECTED</span>
      </div>
    </div>
  );
}
