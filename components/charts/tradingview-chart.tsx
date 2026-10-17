"use client";

import * as React from "react";
import {
  createChart,
  LineStyle,
  AreaSeries,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import {
  Activity,
  Layers,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import type {
  TradingViewCandle,
  TradingViewPoint,
  PriceChartingBenchmarks,
  CgcSaleObservation,
} from "@/lib/pricing/market-pricing-resolver";

interface TradingViewChartProps {
  ticker: string;
  series: string;
  issueNumber: string;
  currentPrice: number;
  deltaPercent: number;
  areaData: TradingViewPoint[];
  candlestickData: TradingViewCandle[];
  volumeData: Array<{ time: string; value: number; color: string }>;
  pricecharting?: PriceChartingBenchmarks;
  cgcSales?: CgcSaleObservation[];
  height?: number;
}

export function TradingViewChart({
  ticker,
  series,
  issueNumber,
  currentPrice,
  deltaPercent,
  areaData,
  candlestickData,
  volumeData,
  pricecharting,
  cgcSales = [],
  height = 380,
}: TradingViewChartProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const chartRef = React.useRef<IChartApi | null>(null);
  const activeSeriesRef = React.useRef<ISeriesApi<any> | null>(null);
  const volumeSeriesRef = React.useRef<ISeriesApi<any> | null>(null);

  const [chartType, setChartType] = React.useState<"AREA" | "CANDLESTICK" | "LADDER" | "TERMINAL">("AREA");
  const [timeframe, setTimeframe] = React.useState<"30D" | "90D" | "1Y" | "ALL">("ALL");
  const [hoveredPrice, setHoveredPrice] = React.useState<number | null>(null);
  const [hoveredDate, setHoveredDate] = React.useState<string | null>(null);

  const isPositive = deltaPercent >= 0;
  const trendColor = isPositive ? "#10b981" : "#f43f5e";

  // Comic sales are irregular. A timeframe means calendar days, never a count of trades.
  const since = React.useMemo(() => {
    if (timeframe === "ALL") return null;
    const days = timeframe === "30D" ? 30 : timeframe === "90D" ? 90 : 365;
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  }, [timeframe]);
  const filteredCandles = React.useMemo(() => candlestickData.filter(p => !since || String(p.time) >= since), [candlestickData, since]);
  const filteredArea = React.useMemo(() => areaData.filter(p => !since || String(p.time) >= since), [areaData, since]);
  const filteredVolume = React.useMemo(() => volumeData.filter(p => !since || String(p.time) >= since), [volumeData, since]);

  // Initialize and update Lightweight Charts canvas
  React.useEffect(() => {
    if (chartType === "TERMINAL" || !containerRef.current) return;

    // Clean up previous instance
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.65)",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: {
          color: "rgba(255, 255, 255, 0.4)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#181E2B",
        },
        horzLine: {
          color: "rgba(255, 255, 255, 0.4)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#181E2B",
        },
      },
    });

    chartRef.current = chart;

    // 1. Add Volume Series at bottom
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "", // Overlay on separate scale
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeries.setData(filteredVolume as any);
    volumeSeriesRef.current = volumeSeries;

    // 2. Add Primary Asset Series according to chartType
    if (chartType === "CANDLESTICK") {
      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#10b981",
        downColor: "#f43f5e",
        borderVisible: false,
        wickUpColor: "#10b981",
        wickDownColor: "#f43f5e",
      });
      candleSeries.setData(filteredCandles as any);
      activeSeriesRef.current = candleSeries;
    } else if (chartType === "LADDER") {
      // Area base series
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: "#10b981",
        topColor: "rgba(16, 185, 129, 0.25)",
        bottomColor: "rgba(16, 185, 129, 0.02)",
        lineWidth: 2,
        priceLineVisible: false,
      });
      areaSeries.setData(filteredArea as any);
      activeSeriesRef.current = areaSeries;

      // Add Exchange Grade 8.0 Benchmark line if available
      if (pricecharting?.grade80) {
        const line80 = chart.addSeries(LineSeries, {
          color: "#f59e0b",
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          title: "8.0 Benchmark",
        });
        line80.setData(
          filteredArea.map((p) => ({ time: p.time as any, value: pricecharting.grade80! }))
        );
      }

      // Add RAW Benchmark line if available
      if (pricecharting?.raw) {
        const lineRaw = chart.addSeries(LineSeries, {
          color: "#94a3b8",
          lineWidth: 1,
          lineStyle: LineStyle.Dotted,
          title: "RAW Benchmark",
        });
        lineRaw.setData(
          filteredArea.map((p) => ({ time: p.time as any, value: pricecharting.raw! }))
        );
      }
    } else {
      // Default: High-Definition Area Series
      const areaSeries = chart.addSeries(AreaSeries, {
        lineColor: trendColor,
        topColor: `${trendColor}40`,
        bottomColor: `${trendColor}02`,
        lineWidth: 2,
        priceLineVisible: false,
        crosshairMarkerRadius: 5,
        crosshairMarkerBorderColor: "#FFF",
        crosshairMarkerBackgroundColor: trendColor,
      });
      areaSeries.setData(filteredArea as any);
      activeSeriesRef.current = areaSeries;
    }

    // Subscribe to crosshair move for interactive tooltips
    chart.subscribeCrosshairMove((param) => {
      if (param.time && param.seriesData && activeSeriesRef.current) {
        const data = param.seriesData.get(activeSeriesRef.current) as any;
        if (data) {
          const val = data.value !== undefined ? data.value : data.close;
          setHoveredPrice(val);
          setHoveredDate(String(param.time));
        }
      } else {
        setHoveredPrice(null);
        setHoveredDate(null);
      }
    });

    chart.timeScale().fitContent();

    // Responsive width observer
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w && chartRef.current) {
        chartRef.current.applyOptions({ width: w });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, [chartType, filteredArea, filteredCandles, filteredVolume, trendColor, height, pricecharting]);

  return (
    <div className="rounded-xl border border-slate-800 bg-[#070A11] p-5 shadow-2xl overflow-hidden select-none">
      {/* Top Header & Interactive Parameter Controls */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              {ticker} · TRADINGVIEW VALUATION ENGINE
            </span>
            <span className="inline-flex items-center gap-1 rounded bg-emerald-950/60 border border-emerald-500/40 px-1.5 py-0.2 text-[9px] font-mono text-emerald-300">
              <Activity className="h-2.5 w-2.5 animate-pulse" /> LIVE STREAM
            </span>
          </div>

          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-3xl font-mono font-bold tracking-tight text-slate-100">
              {`$${(hoveredPrice ?? currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-semibold ${
                isPositive ? "text-emerald-400 bg-emerald-950/60 border border-emerald-500/30" : "text-rose-400 bg-rose-950/60 border border-rose-500/30"
              }`}
            >
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isPositive ? `+${deltaPercent}%` : `${deltaPercent}%`}
            </span>
            {hoveredDate && (
              <span className="text-[11px] font-mono text-slate-500 hidden md:inline">
                {hoveredDate}
              </span>
            )}
          </div>
        </div>

        {/* View Mode & Timeframe Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chart View Mode Buttons */}
          <div className="flex items-center rounded-lg border border-slate-800 bg-[#0B0F1A] p-0.5">
            <button
              onClick={() => setChartType("AREA")}
              className={`rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                chartType === "AREA"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Area
            </button>
            <button
              onClick={() => setChartType("CANDLESTICK")}
              className={`rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                chartType === "CANDLESTICK"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Candles
            </button>
            <button
              onClick={() => setChartType("LADDER")}
              className={`rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                chartType === "LADDER"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Overlay Multi-Grade Benchmarks"
            >
              Ladder
            </button>
            <button
              onClick={() => setChartType("TERMINAL")}
              className={`rounded px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                chartType === "TERMINAL"
                  ? "bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Full TradingView Workstation"
            >
              Terminal
            </button>
          </div>

          {/* Timeframe Chips */}
          {chartType !== "TERMINAL" && (
            <div className="flex items-center rounded-lg border border-slate-800 bg-[#0B0F1A] p-0.5">
              {(["30D", "90D", "1Y", "ALL"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`rounded px-2 py-1 text-[10px] font-mono uppercase transition-colors ${
                    timeframe === tf
                      ? "bg-slate-800 text-slate-100 font-bold"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chart Stage */}
      <div className="relative mt-4">
        {chartType === "TERMINAL" ? (
          /* Full TradingView Advanced Financial Embed */
          <div className="w-full rounded-lg overflow-hidden border border-slate-800 bg-[#04060A]" style={{ height: `${height}px` }}>
            <iframe
              src={`https://s.tradingview.com/widgetembed/?frameElementId=tradingview_widget&symbol=INDEX:SPX&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=070A11&studies=%5B%5D&theme=dark&style=1&timezone=exchange&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=comicbookstockexchange.com&utm_medium=widget&utm_campaign=chart`}
              className="w-full h-full border-0"
              title="TradingView Financial Terminal"
            />
          </div>
        ) : (
          /* Native High-Performance TradingView Lightweight Chart */
          <div ref={containerRef} className="w-full" style={{ height: `${height}px` }} />
        )}
      </div>

      {/* Institutional Data Sources & Provenance Footer */}
      <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[11px] font-mono">
        {/* Source Badges */}
        <div className="flex items-center gap-2 flex-wrap text-slate-400">
          <span className="flex items-center gap-1.5 rounded bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 text-emerald-300 font-medium">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Exchange Secondary Benchmark
          </span>
          <span className="flex items-center gap-1.5 rounded bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 text-cyan-300 font-medium">
            <Layers className="h-3 w-3 text-cyan-400" />
            CGC Universal Census & Completed Sales
          </span>
          {cgcSales.length > 0 && (
            <span className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-slate-300">
              {cgcSales.length} Verified Sales Recorded
            </span>
          )}
        </div>

        {/* Powered by TradingView Attribution */}
        <div className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors">
          <a
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-emerald-300"
          >
            <span>Powered by TradingView</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
