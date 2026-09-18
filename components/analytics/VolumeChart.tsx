"use client";

import { useEffect, useRef } from "react";
import { createChart, HistogramSeries, type IChartApi, type ISeriesApi, type UTCTimestamp } from "lightweight-charts";
import type { Candle } from "@/lib/klines";

export function VolumeChart({ candles }: { candles: Candle[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 220,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#111111",
        attributionLogo: true,
      },
      grid: {
        vertLines: { color: "#e5e2da" },
        horzLines: { color: "#e5e2da" },
      },
      timeScale: { timeVisible: true, secondsVisible: false },
      rightPriceScale: { borderColor: "#e5e2da" },
      // Same scroll-safety as the main chart: the page must stay scrollable
      // over this chart too.
      handleScroll: { mouseWheel: false, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { mouseWheel: false, pinch: true, axisPressedMouseMove: true, axisDoubleClickReset: true },
    });
    chartRef.current = chart;

    const series = chart.addSeries(HistogramSeries, {
      color: "#fdc800",
      priceFormat: { type: "volume" },
    });
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) chart.resize(entry.contentRect.width, 220);
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current) return;
    seriesRef.current.setData(
      candles.map((c) => ({
        time: (c.openTime / 1000) as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? "rgba(10,122,52,0.6)" : "rgba(179,38,30,0.6)",
      }))
    );
    chartRef.current?.timeScale().fitContent();
  }, [candles]);

  return <div ref={containerRef} className="w-full" />;
}
