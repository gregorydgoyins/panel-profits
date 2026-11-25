"use client";

import { Clock3, Settings2, X } from "lucide-react";
import * as React from "react";
import type { MarketIndexRecord } from "@/lib/market/indices";

type ClockChoice = { label: string; zone: string; market?: string; firmId?: string };
const MAX_USER_CLOCKS = 6;

const FIRM_HOME_OFFICES: Record<string, ClockChoice> = {
  arnveld: { label: "Athens", zone: "Europe/Athens", market: "HOME OFFICE" },
  calmonte: { label: "Xi'an", zone: "Asia/Shanghai", market: "HOME OFFICE" },
  holtercroft: { label: "Rome", zone: "Europe/Rome", market: "HOME OFFICE" },
  sestriere: { label: "Ravenna", zone: "Europe/Rome", market: "HOME OFFICE" },
  khamsin: { label: "Cairo", zone: "Africa/Cairo", market: "HOME OFFICE" },
  valdris: { label: "Oslo", zone: "Europe/Oslo", market: "HOME OFFICE" },
  orontea: { label: "Istanbul", zone: "Europe/Istanbul", market: "HOME OFFICE" },
  nalvera: { label: "Varanasi", zone: "Asia/Kolkata", market: "HOME OFFICE" },
  carantec: { label: "Dublin", zone: "Europe/Dublin", market: "HOME OFFICE" },
  irodori: { label: "Kyoto", zone: "Asia/Tokyo", market: "HOME OFFICE" },
  vestmark: { label: "Mexico City", zone: "America/Mexico_City", market: "HOME OFFICE" },
  talua: { label: "Honolulu", zone: "Pacific/Honolulu", market: "HOME OFFICE" },
  okafor: { label: "Lagos", zone: "Africa/Lagos", market: "HOME OFFICE" },
  adanko: { label: "Accra", zone: "Africa/Accra", market: "HOME OFFICE" },
  cavendara: { label: "Yazd", zone: "Asia/Tehran", market: "HOME OFFICE" },
  lacoste: { label: "Bandiagara", zone: "Africa/Bamako", market: "HOME OFFICE" },
  schwarzenberg: { label: "Cusco", zone: "America/Lima", market: "HOME OFFICE" },
  cairn: { label: "Port-au-Prince", zone: "America/Port-au-Prince", market: "HOME OFFICE" },
  harborside: { label: "Beirut", zone: "Asia/Beirut", market: "HOME OFFICE" },
  dundeen: { label: "Krakow", zone: "Europe/Warsaw", market: "HOME OFFICE" },
  rhein: { label: "Berlin", zone: "Europe/Berlin", market: "HOME OFFICE" },
  seine: { label: "Riga", zone: "Europe/Riga", market: "HOME OFFICE" },
  penhaligon: { label: "Wellington", zone: "Pacific/Auckland", market: "HOME OFFICE" },
  vantage: { label: "Helsinki", zone: "Europe/Helsinki", market: "HOME OFFICE" },
  cormorant: { label: "Lhasa, Tibet", zone: "Asia/Shanghai", market: "HOME OFFICE" },
};

const CITY_CHOICES: ClockChoice[] = [
  { label: "New York", zone: "America/New_York", market: "NYSE" },
  { label: "New York", zone: "America/New_York", market: "NASDAQ" },
  { label: "London", zone: "Europe/London", market: "LSE" },
  { label: "Tokyo", zone: "Asia/Tokyo", market: "JPX / NIKKEI" },
  { label: "Hong Kong", zone: "Asia/Hong_Kong", market: "HKEX / HANG SENG" },
  { label: "Toronto", zone: "America/Toronto", market: "TSX" },
  { label: "Los Angeles", zone: "America/Los_Angeles", market: "PACIFIC" },
  { label: "Chicago", zone: "America/Chicago", market: "CME" },
  { label: "San Francisco", zone: "America/Los_Angeles", market: "WEST COAST" },
  { label: "Boston", zone: "America/New_York", market: "EAST COAST" },
  { label: "Miami", zone: "America/New_York", market: "EAST COAST" },
  { label: "Dallas", zone: "America/Chicago", market: "CENTRAL" },
  { label: "Seattle", zone: "America/Los_Angeles", market: "NORTHWEST" },
  { label: "Vancouver", zone: "America/Vancouver", market: "TSX VENTURE" },
  { label: "Montreal", zone: "America/Toronto", market: "CANADA EAST" },
  { label: "Mexico City", zone: "America/Mexico_City", market: "BMV" },
  { label: "Sao Paulo", zone: "America/Sao_Paulo", market: "B3" },
  { label: "Frankfurt", zone: "Europe/Berlin", market: "XETRA" },
  { label: "Paris", zone: "Europe/Paris", market: "EURONEXT" },
  { label: "Amsterdam", zone: "Europe/Amsterdam", market: "EURONEXT" },
  { label: "Milan", zone: "Europe/Rome", market: "BORSA ITALIANA" },
  { label: "Madrid", zone: "Europe/Madrid", market: "BME" },
  { label: "Zurich", zone: "Europe/Zurich", market: "SIX" },
  { label: "Stockholm", zone: "Europe/Stockholm", market: "NASDAQ NORDIC" },
  { label: "Oslo", zone: "Europe/Oslo", market: "OSLO BORS" },
  { label: "Singapore", zone: "Asia/Singapore", market: "SGX" },
  { label: "Sydney", zone: "Australia/Sydney", market: "ASX" },
  { label: "Seoul", zone: "Asia/Seoul", market: "KRX" },
  { label: "Shanghai", zone: "Asia/Shanghai", market: "SSE" },
  { label: "Shenzhen", zone: "Asia/Shanghai", market: "SZSE" },
  { label: "Mumbai", zone: "Asia/Kolkata", market: "NSE / BSE" },
  { label: "Dubai", zone: "Asia/Dubai", market: "DFM / ADX" },
  { label: "Abu Dhabi", zone: "Asia/Dubai", market: "ADX" },
  { label: "Taipei", zone: "Asia/Taipei", market: "TWSE" },
  { label: "Johannesburg", zone: "Africa/Johannesburg", market: "JSE" },
];

const HOME_OFFICE_CHOICES: ClockChoice[] = Object.entries(FIRM_HOME_OFFICES).map(([firmId, choice]) => ({
  ...choice,
  firmId,
}));

function choiceKey(choice: ClockChoice) {
  return choice.firmId ? `firm:${choice.firmId}` : `${choice.label}-${choice.market || choice.zone}`;
}

const LEGACY_DEFAULT_ZONES = CITY_CHOICES.slice(0, 4).map(choiceKey);
const DEFAULT_ZONES = [
  CITY_CHOICES[0], // NYSE / New York
  CITY_CHOICES[2], // LSE / London
  CITY_CHOICES[3], // JPX / Nikkei / Tokyo
  CITY_CHOICES.find((choice) => choice.market === "DFM / ADX"), // Dubai
].filter((choice): choice is ClockChoice => Boolean(choice)).map(choiceKey);

function formatClock(date: Date, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function selectedChoice(key: string) {
  return [...HOME_OFFICE_CHOICES, ...CITY_CHOICES].find((choice) => choiceKey(choice) === key);
}

function choiceDisplayLabel(choice: ClockChoice) {
  return choice.firmId ? `${choice.firmId.toUpperCase()} · ${choice.label}` : choice.label;
}

function HomeOfficeGroup({
  playerName,
  roleTitle,
  firmName,
  homeLabel,
  time,
}: {
  playerName?: string;
  roleTitle?: string | null;
  firmName?: string | null;
  homeLabel: string;
  time: string;
}) {
  const identity = [playerName, roleTitle, firmName].filter(Boolean) as string[];

  return (
    <div className="markets-rimlight-hover flex min-w-max shrink-0 items-center gap-2 rounded bg-cyan-300/[0.04] px-2 py-1 text-cyan-200">
      {identity.length > 0 && (
        <div className="flex min-w-max flex-col justify-center border-r border-cyan-200/20 pr-2 text-[8px] leading-[1.15] tracking-[0.08em] normal-case">
          {identity.map((line) => <span key={line} className="whitespace-nowrap">{line}</span>)}
        </div>
      )}
      <div className="flex shrink-0 items-center gap-2 text-[11px] uppercase tracking-[0.12em]">
        <span className="text-slate-500">HOME OFFICE</span>
        <span>{homeLabel}</span>
        <span className="font-mono text-slate-200">{time}</span>
      </div>
    </div>
  );
}

interface MarketClocksProps {
  playerName?: string;
  firmName?: string | null;
  roleTitle?: string | null;
  indices?: MarketIndexRecord[];
}

export function MarketClocks({ playerName, firmName, roleTitle, indices = [] }: MarketClocksProps) {
  const [mounted, setMounted] = React.useState(false);
  const [now, setNow] = React.useState<Date | null>(null);
  const [homeZone, setHomeZone] = React.useState("America/New_York");
  const [homeLabel, setHomeLabel] = React.useState("HOME OFFICE");
  const [connectedFirm, setConnectedFirm] = React.useState("arnveld");
  const [zones, setZones] = React.useState(DEFAULT_ZONES);
  const [barometersVisible, setBarometersVisible] = React.useState(false);
  const [clockRailVisible, setClockRailVisible] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const load = () => {
      setNow(new Date());
      const requestedFirm = localStorage.getItem("pp-connected-firm") || "arnveld";
      const nextConnectedFirm = FIRM_HOME_OFFICES[requestedFirm] ? requestedFirm : "arnveld";
      const homeOffice = FIRM_HOME_OFFICES[nextConnectedFirm];
      setConnectedFirm(nextConnectedFirm);
      setHomeZone(homeOffice.zone);
      setHomeLabel(String(homeOffice?.label || "NEW YORK").toUpperCase());
      setBarometersVisible(localStorage.getItem("pp-barometers-visible") === "true");
      setClockRailVisible(localStorage.getItem("pp-clock-rail-visible") !== "false");
      try {
        const saved = JSON.parse(localStorage.getItem("pp-market-clock-zones") || "null");
        if (Array.isArray(saved)) {
          const keys = saved.map((value) => {
            const oldChoice = [...HOME_OFFICE_CHOICES, ...CITY_CHOICES].find((choice) => choice.zone === value || choiceKey(choice) === value);
            return oldChoice ? choiceKey(oldChoice) : null;
          }).filter((value): value is string => Boolean(value));
          const uniqueKeys = [...new Set(keys)].slice(0, MAX_USER_CLOCKS);
          const isLegacyDefault = uniqueKeys.length === LEGACY_DEFAULT_ZONES.length && uniqueKeys.every((key) => LEGACY_DEFAULT_ZONES.includes(key));
          if (uniqueKeys.length) setZones(isLegacyDefault ? DEFAULT_ZONES : uniqueKeys);
        }
      } catch {}
    };
    load();
    const interval = window.setInterval(() => setNow(new Date()), 60000);
    window.addEventListener("pp-clock-settings", load);
    const openSettings = () => setOpen(true);
    window.addEventListener("pp-open-market-clock-settings", openSettings);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pp-clock-settings", load);
      window.removeEventListener("pp-open-market-clock-settings", openSettings);
    };
  }, []);

  if (!clockRailVisible) return null;

  function saveZones(next: string[]) {
    setZones(next);
    localStorage.setItem("pp-market-clock-zones", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("pp-clock-settings"));
  }

  function toggleBarometers(value: boolean) {
    setBarometersVisible(value);
    localStorage.setItem("pp-barometers-visible", String(value));
  }

  const renderedTime = mounted && now ? now : new Date(0);
  const homeIdentity = [playerName, roleTitle, firmName].filter(Boolean).join(" · ");
  const clocks = [{ label: homeLabel, zone: homeZone }, ...zones.map((key) => selectedChoice(key)).filter((choice): choice is ClockChoice => Boolean(choice))];

  if (!mounted) {
    return (
      <div className="relative border-b border-slate-800/70 bg-[#07090d] py-1.5">
        <div className="pp-shell-frame flex items-center gap-4 overflow-x-auto whitespace-nowrap text-[11px] uppercase tracking-[0.12em]">
          <div className="flex shrink-0 items-center gap-2 border-r border-slate-800 pr-3 text-cyan-300">
            <Clock3 className="h-3.5 w-3.5" /> MARKET CLOCKS
          </div>
          <HomeOfficeGroup playerName={playerName} roleTitle={roleTitle} firmName={firmName} homeLabel={homeLabel} time="--:--" />
          {clocks.slice(1).map((clock, index) => (
            <div key={`${clock.zone}-${index + 1}`} className="flex shrink-0 items-center gap-2 text-slate-400">
              <span className="text-slate-500">{clock.market || "WORLD"}</span>
              <span>{clock.label}</span>
              <span className="font-mono text-slate-200">--:--</span>
            </div>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-slate-800 pl-3 text-emerald-300">
            <span>WORLD / UTC</span>
            <span className="font-mono text-slate-100">--:--</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-slate-800/70 bg-[#07090d] py-1.5">
      <div className="pp-shell-frame flex items-center gap-4 overflow-x-auto whitespace-nowrap text-[11px] uppercase tracking-[0.12em]">
        <div className="flex shrink-0 items-center gap-2 border-r border-slate-800 pr-3 text-cyan-300">
          <Clock3 className="h-3.5 w-3.5" /> MARKET CLOCKS
        </div>
        <HomeOfficeGroup playerName={playerName} roleTitle={roleTitle} firmName={firmName} homeLabel={homeLabel} time={formatClock(renderedTime, homeZone)} />
        {clocks.slice(1).map((clock, index) => (
          <div key={`${clock.zone}-${index + 1}`} className="flex shrink-0 items-center gap-2 text-slate-400" title={clock.market}>
            <span className="text-slate-500">{clock.market || "WORLD"}</span>
            <span>{clock.label}</span>
            <span className="font-mono text-slate-200">{formatClock(renderedTime, clock.zone)}</span>
          </div>
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-slate-800 pl-3 text-emerald-300">
          <span>WORLD / UTC</span>
          <span className="font-mono text-slate-100">{formatClock(renderedTime, "UTC")}</span>
          <button type="button" aria-label="Configure market clocks" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="ml-1 rounded border border-slate-700 p-1 text-slate-400 hover:border-cyan-300 hover:text-cyan-200"><Settings2 className="h-3 w-3" /></button>
        </div>
      </div>
      {barometersVisible && (
        <div aria-label="Market barometers" className="pp-shell-frame mt-1 flex items-center gap-4 overflow-x-auto whitespace-nowrap border-t border-slate-800/60 pt-1 text-[9px] uppercase tracking-[0.12em] text-slate-500">
          <span className="text-cyan-400">MARKET BAROMETERS</span>
          {indices.length > 0 ? (
            indices.map((idx) => {
              const hasValue = idx.currentValue !== null && Number.isFinite(idx.currentValue);
              const pct = idx.percentChange;
              const hasPct = pct !== null && Number.isFinite(pct);
              const pctPositive = (pct ?? 0) >= 0;
              return (
                <span key={idx.indexCode} className="inline-flex items-center gap-1.5" title={idx.description}>
                  <span className="text-slate-400">{idx.indexCode}</span>
                  {hasValue ? (
                    <>
                      <b className="font-mono text-slate-100">
                        {idx.currentValue!.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </b>
                      {hasPct && (
                        <span className={`font-mono ${pctPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {pctPositive ? "+" : ""}{pct!.toFixed(2)}%
                        </span>
                      )}
                    </>
                  ) : (
                    <b className="text-slate-500">{idx.status.replace(/_/g, " ")}</b>
                  )}
                </span>
              );
            })
          ) : (
            <span className="text-slate-500">NO LIVE INDEX OBSERVATIONS AVAILABLE</span>
          )}
        </div>
      )}
      {open && <div className="!absolute right-4 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] w-[min(720px,calc(100vw-2rem))] overflow-y-auto border border-cyan-300/40 bg-[#0b1018] p-4 shadow-2xl trading-rimlight-hover sm:right-6 lg:right-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3"><div><p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">Market clock settings</p><p className="mt-1 text-xs text-slate-500">Home office plus up to six market or world clocks</p></div><button type="button" aria-label="Close market clock settings" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="mt-3 markets-rimlight-hover bg-cyan-300/[0.03] p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Home Office</p><p className="mt-2 text-sm text-cyan-200">{homeLabel}</p>{homeIdentity && <p className="mt-1 text-[10px] leading-4 text-slate-400">{homeIdentity}</p>}<p className="mt-1 text-[10px] leading-4 text-slate-600">The fixed office clock for the connected firm.</p></div>
        <div className="mt-4 border-t border-slate-800 pt-4"><div className="flex items-baseline justify-between gap-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Firm home offices</p><span className="text-[9px] text-slate-600">25 available · connected office is fixed</span></div><div className="mt-2 grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">{HOME_OFFICE_CHOICES.map((choice) => { const key = choiceKey(choice); const isConnected = choice.firmId === connectedFirm; const checked = isConnected || zones.includes(key); return <label key={key} className={`flex min-w-0 items-start gap-2 text-xs ${isConnected ? "text-cyan-200" : "text-slate-300"}`}><input type="checkbox" checked={checked} disabled={isConnected || (!checked && zones.length >= MAX_USER_CLOCKS)} onChange={(event) => saveZones(event.target.checked ? [...zones, key].slice(0, MAX_USER_CLOCKS) : zones.filter((zone) => zone !== key))} className="mt-0.5 shrink-0 accent-cyan-300" /><span className="min-w-0 truncate">{choiceDisplayLabel(choice)}<span className="block truncate text-[9px] text-slate-600">{isConnected ? "CONNECTED HOME OFFICE" : "HOME OFFICE"}</span></span></label>; })}</div></div>
        <div className="mt-4"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Visible market zones · {zones.length}/{MAX_USER_CLOCKS}</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{CITY_CHOICES.map((choice) => { const key = choiceKey(choice); return <label key={key} className="flex min-w-0 items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={zones.includes(key)} disabled={!zones.includes(key) && zones.length >= MAX_USER_CLOCKS} onChange={(event) => saveZones(event.target.checked ? [...zones, key].slice(0, MAX_USER_CLOCKS) : zones.filter((zone) => zone !== key))} className="mt-0.5 shrink-0 accent-cyan-300" /><span className="min-w-0">{choice.label}<span className="block truncate text-[9px] text-slate-600">{choice.market}</span></span></label>; })}</div></div>
        <label className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs text-slate-300"><span>Show market barometers</span><input type="checkbox" checked={barometersVisible} onChange={(event) => toggleBarometers(event.target.checked)} className="accent-cyan-400" /></label>
      </div>}
    </div>
  );
}
