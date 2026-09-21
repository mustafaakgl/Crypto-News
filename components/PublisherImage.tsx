"use client";

import { useState } from "react";
import type { NewsItem } from "@/lib/news";

// Both publishers' image CDNs resize on request (CoinDesk's Sanity via w/h
// query params, Decrypt's image proxy via an "rs:fill:W:H" path segment), so
// ask for the size actually shown instead of downloading the original.
function sized(url: string, width: number): string {
  const height = Math.round((width * 9) / 16);
  if (url.includes("cdn.sanity.io/")) {
    const u = new URL(url);
    u.searchParams.set("w", String(width));
    u.searchParams.set("h", String(height));
    return u.toString();
  }
  if (url.includes("img.decrypt.co/")) return url.replace(/\/rs:fill:\d+:\d+(:\d+)*\//, `/rs:fill:${width}:${height}:1:0/`);
  return url;
}

// Loaded straight from the publisher (a plain <img>, not next/image), so the
// photo is never copied onto or cached by this server; falls back to the
// local cover if the publisher's image is missing or fails to load.
export function PublisherImage({ item, width, className = "" }: { item: NewsItem; width: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = item.showPublisherImage && item.imageUrl && !failed ? sized(item.imageUrl, width) : "/cover-placeholder.svg";
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
