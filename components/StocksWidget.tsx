"use client";

import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

const SYMBOLS: Array<[string, string]> = [
  ["Apple", "NASDAQ:AAPL|1D"],
  ["Microsoft", "NASDAQ:MSFT|1D"],
  ["NVIDIA", "NASDAQ:NVDA|1D"],
  ["Coinbase", "NASDAQ:COIN|1D"],
  ["MicroStrategy", "NASDAQ:MSTR|1D"],
];

// Official TradingView "Symbol Overview" embed. Loaded client-side so a
// failure to reach s3.tradingview.com never breaks the rest of the page.
export function StocksWidget({ locale = "en" }: { locale?: Locale }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const dict = getDictionary(locale);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const widgetDiv = document.createElement("div");
    widgetDiv.className = "tradingview-widget-container__widget";
    container.appendChild(widgetDiv);

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js";
    script.async = true;
    script.text = JSON.stringify({
      symbols: SYMBOLS,
      chartOnly: false,
      width: "100%",
      height: "100%",
      locale,
      colorTheme: "light",
      autosize: true,
      showVolume: false,
      showMA: false,
      hideDateRanges: false,
      hideMarketStatus: false,
      hideSymbolLogo: false,
      scalePosition: "right",
      scaleMode: "Normal",
      fontFamily: "-apple-system, BlinkMacSystemFont, Trebuchet MS, Roboto, Ubuntu, sans-serif",
      fontSize: "10",
      noTimeScale: false,
      valuesTracking: "1",
      changeMode: "price-and-percent",
      chartType: "area",
      dateRanges: ["1d|1", "1m|30", "3m|60", "12m|1D"],
    });

    script.onerror = () => setStatus("failed");
    container.appendChild(script);

    const failTimer = window.setTimeout(() => {
      setStatus((s) => (s === "loading" ? "failed" : s));
    }, 8000);

    const observer = new MutationObserver(() => {
      if (widgetDiv.querySelector("iframe")) {
        setStatus("loaded");
        window.clearTimeout(failTimer);
        observer.disconnect();
      }
    });
    observer.observe(widgetDiv, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      window.clearTimeout(failTimer);
      container.innerHTML = "";
    };
  }, [locale]);

  return (
    <div className="border border-ink">
      {status === "failed" && <p className="px-3 py-2 text-xs text-ink/60 border-b border-rule">{dict.stocksWidget.errorNote}</p>}
      <div
        className="tradingview-widget-container"
        style={{ height: 340, opacity: status === "failed" ? 0.3 : 1 }}
      >
        <div ref={containerRef} className="h-full" />
      </div>
      <div className="px-3 py-1.5 text-[11px] text-ink/50 border-t border-rule">
        <a
          href="https://www.tradingview.com/"
          target="_blank"
          rel="noopener nofollow"
          className="hover:text-ink hover:underline"
        >
          {dict.stocksWidget.attribution}
        </a>
        {status === "loading" && <span>{dict.stocksWidget.loadingSuffix}</span>}
      </div>
    </div>
  );
}
