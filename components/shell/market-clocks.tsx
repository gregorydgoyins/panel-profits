"use client";

import { Clock3, Settings2, X } from "lucide-react";
import * as React from "react";

type ClockChoice = { label: string; zone: string; market?: string };

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
  { label: "New York", zone: "America/New_York", market: "NYSE / NASDAQ" },
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
  { label: "London", zone: "Europe/London", market: "LSE / EUROPE" },
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

function choiceKey(choice: ClockChoice) {
  return `${choice.label}-${choice.market || choice.zone}`;
}

const DEFAULT_ZONES = CITY_CHOICES.slice(0, 4).map(choiceKey);

function formatClock(date: Date, zone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function selectedChoice(key: string) {
  return CITY_CHOICES.find((choice) => choiceKey(choice) === key);
}

export function MarketClocks() {
  const [mounted, setMounted] = React.useState(false);
  const [now, setNow] = React.useState<Date | null>(null);
  const [homeZone, setHomeZone] = React.useState("America/New_York");
  const [homeLabel, setHomeLabel] = React.useState("HOME OFFICE");
  const [zones, setZones] = React.useState(DEFAULT_ZONES);
  const [barometersVisible, setBarometersVisible] = React.useState(false);
  const [clockRailVisible, setClockRailVisible] = React.useState(true);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const load = () => {
      setNow(new Date());
      const connectedFirm = localStorage.getItem("pp-connected-firm") || "arnveld";
      const homeOffice = FIRM_HOME_OFFICES[connectedFirm] || FIRM_HOME_OFFICES.arnveld;
      setHomeZone(homeOffice.zone);
      setHomeLabel(homeOffice.label.toUpperCase());
      setBarometersVisible(localStorage.getItem("pp-barometers-visible") === "true");
      setClockRailVisible(localStorage.getItem("pp-clock-rail-visible") !== "false");
      try {
        const saved = JSON.parse(localStorage.getItem("pp-market-clock-zones") || "null");
        if (Array.isArray(saved)) {
          const keys = saved.map((value) => {
            const oldChoice = CITY_CHOICES.find((choice) => choice.zone === value || choiceKey(choice) === value);
            return oldChoice ? choiceKey(oldChoice) : null;
          }).filter((value): value is string => Boolean(value));
          if (keys.length) setZones([...new Set(keys)].slice(0, 4));
        }
      } catch {}
    };
    load();
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    window.addEventListener("pp-clock-settings", load);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("pp-clock-settings", load);
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
  const clocks = [{ label: homeLabel, zone: homeZone }, ...zones.map((key) => selectedChoice(key)).filter((choice): choice is ClockChoice => Boolean(choice))];

  if (!mounted) {
    return (
      <div className="relative border-b border-slate-800/70 bg-[#07090d] px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto whitespace-nowrap text-[11px] uppercase tracking-[0.12em]">
          <div className="flex shrink-0 items-center gap-2 border-r border-slate-800 pr-3 text-cyan-300">
            <Clock3 className="h-3.5 w-3.5" /> MARKET CLOCKS
          </div>
          {clocks.map((clock, index) => (
            <div key={`${clock.zone}-${index}`} className={`flex shrink-0 items-center gap-2 ${index === 0 ? "text-amber-200" : "text-slate-400"}`}>
              <span className="text-slate-600">{index === 0 ? "HOME" : "MARKET"}</span>
              <span>{clock.label}</span>
              <span className="font-mono text-slate-200">--:--:--</span>
            </div>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-2 border-l border-slate-800 pl-3 text-emerald-300">
            <span>WORLD / UTC</span>
            <span className="font-mono text-slate-100">--:--:--</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative border-b border-slate-800/70 bg-[#07090d] px-4 py-1.5 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center gap-4 overflow-x-auto whitespace-nowrap text-[11px] uppercase tracking-[0.12em]">
        <div className="flex shrink-0 items-center gap-2 border-r border-slate-800 pr-3 text-cyan-300">
          <Clock3 className="h-3.5 w-3.5" /> MARKET CLOCKS
        </div>
        {clocks.map((clock, index) => (
          <div key={`${clock.zone}-${index}`} className={`flex shrink-0 items-center gap-2 ${index === 0 ? "text-amber-200" : "text-slate-400"}`}>
            <span className="text-slate-600">{index === 0 ? "HOME" : "MARKET"}</span>
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
      {barometersVisible && <div aria-label="Market barometers" className="mx-auto mt-1 flex max-w-7xl items-center gap-4 overflow-x-auto whitespace-nowrap border-t border-slate-800/60 pt-1 text-[9px] uppercase tracking-[0.12em] text-slate-500">
        <span className="text-amber-300">MARKET BAROMETERS</span>
        <span>CE70 <b className="text-amber-200">DEFINED / NOT POPULATED</b></span>
        <span>PPIX-60 <b className="text-amber-200">DEFINED / NOT POPULATED</b></span>
        <span>PPIX COMPOSITE <b className="text-amber-200">SPECIFICATION INCOMPLETE</b></span>
        <span>PPIX 100 <b className="text-amber-200">DEFINED / NOT POPULATED</b></span>
      </div>}
      {open && <div className="!absolute right-4 top-full z-50 mt-2 max-h-[calc(100vh-6rem)] w-[min(720px,calc(100vw-2rem))] overflow-y-auto border border-cyan-300/40 bg-[#0b1018] p-4 shadow-2xl trading-rimlight-hover sm:right-6 lg:right-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3"><div><p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">Market clock settings</p><p className="mt-1 text-xs text-slate-500">Home office plus four market zones</p></div><button type="button" aria-label="Close market clock settings" onClick={() => setOpen(false)} className="text-slate-500 hover:text-white"><X className="h-4 w-4" /></button></div>
        <div className="mt-3 border border-slate-800 bg-[#070a0f] p-3"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Home Office</p><p className="mt-2 text-sm text-amber-200">{homeLabel}</p><p className="mt-1 text-[10px] leading-4 text-slate-600">Current firm office time.</p></div>
        <div className="mt-4"><p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Visible market zones</p><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">{CITY_CHOICES.map((choice) => { const key = choiceKey(choice); return <label key={key} className="flex min-w-0 items-start gap-2 text-xs text-slate-300"><input type="checkbox" checked={zones.includes(key)} disabled={!zones.includes(key) && zones.length >= 4} onChange={(event) => saveZones(event.target.checked ? [...zones, key].slice(0, 4) : zones.filter((zone) => zone !== key))} className="mt-0.5 shrink-0 accent-cyan-300" /><span className="min-w-0">{choice.label}<span className="block truncate text-[9px] text-slate-600">{choice.market}</span></span></label>; })}</div></div>
        <label className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-3 text-xs text-slate-300"><span>Show market barometers</span><input type="checkbox" checked={barometersVisible} onChange={(event) => toggleBarometers(event.target.checked)} className="accent-amber-300" /></label>
      </div>}
    </div>
  );
}
