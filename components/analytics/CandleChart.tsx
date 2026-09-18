"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
} from "lightweight-charts";
import type { Candle } from "@/lib/klines";

export type SrLevel = {
  price: number;
  title: string;
  color: string;
};

export type CandleChartHandle = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

export const CandleChart = forwardRef<CandleChartHandle, { candles: Candle[]; srLevels: SrLevel[]; showSr: boolean }>(
  function CandleChart({ candles, srLevels, showSr }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
    const priceLinesRef = useRef<IPriceLine[]>([]);

    useImperativeHandle(ref, () => ({
      zoomIn: () => scaleVisibleRange(0.8),
      zoomOut: () => scaleVisibleRange(1.25),
      resetZoom: () => chartRef.current?.timeScale().fitContent(),
    }));

    function scaleVisibleRange(factor: number) {
      const timeScale = chartRef.current?.timeScale();
      const range = timeScale?.getVisibleLogicalRange();
      if (!timeScale || !range) return;
      const center = (range.from + range.to) / 2;
      const half = ((range.to - range.from) / 2) * factor;
      timeScale.setVisibleLogicalRange({ from: center - half, to: center + half });
    }

    // Mount once.
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const chart = createChart(container, {
        width: container.clientWidth,
        height: 420,
        layout: {
          background: { color: "#ffffff" },
          textColor: "#111111",
          attributionLogo: true, // required attribution per lightweight-charts license
        },
        grid: {
          vertLines: { color: "#e5e2da" },
          horzLines: { color: "#e5e2da" },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: "#e5e2da",
        },
        // The page must stay scrollable over the chart: mouse wheel and
        // one-finger vertical touch both fall through to normal page scroll.
        // Horizontal one-finger drag still pans the chart, and two-finger
        // pinch still zooms it — those are unambiguous chart gestures.
        handleScroll: {
          mouseWheel: false,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: false,
        },
        handleScale: {
          mouseWheel: false,
          pinch: true,
          axisPressedMouseMove: true,
          axisDoubleClickReset: true,
        },
      });
      chartRef.current = chart;

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: "#0a7a34",
        downColor: "#b3261e",
        borderVisible: false,
        wickUpColor: "#0a7a34",
        wickDownColor: "#b3261e",
        priceScaleId: "right",
      });
      candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.08, bottom: 0.3 } });
      candleSeriesRef.current = candleSeries;

      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "#fdc800",
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });
      volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      volumeSeriesRef.current = volumeSeries;

      const resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (entry) chart.resize(entry.contentRect.width, 420);
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
        chart.remove();
        chartRef.current = null;
        candleSeriesRef.current = null;
        volumeSeriesRef.current = null;
      };
    }, []);

    // Update data when candles change.
    useEffect(() => {
      if (!candleSeriesRef.current || !volumeSeriesRef.current) return;

      candleSeriesRef.current.setData(
        candles.map((c) => ({
          time: (c.openTime / 1000) as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeSeriesRef.current.setData(
        candles.map((c) => ({
          time: (c.openTime / 1000) as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? "rgba(10,122,52,0.5)" : "rgba(179,38,30,0.5)",
        }))
      );

      chartRef.current?.timeScale().fitContent();
    }, [candles]);

    // Toggle S/R price lines.
    useEffect(() => {
      const series = candleSeriesRef.current;
      if (!series) return;

      priceLinesRef.current.forEach((line) => series.removePriceLine(line));
      priceLinesRef.current = [];

      if (showSr) {
        for (const level of srLevels) {
          const line = series.createPriceLine({
            price: level.price,
            color: level.color,
            lineWidth: 1,
            lineStyle: 2, // dashed
            axisLabelVisible: true,
            title: level.title,
          });
          priceLinesRef.current.push(line);
        }
      }
    }, [srLevels, showSr]);

    return <div ref={containerRef} className="w-full" />;
  }
);
