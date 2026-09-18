"use client";

import { useRef } from "react";

export type TabDef<T extends string> = { key: T; label: string };

// WAI-ARIA Tabs pattern (manual activation): https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
// - Roving tabindex: only the selected tab is in the Tab order; Left/Right
//   (and Home/End) move focus among tabs without activating them.
// - Enter/Space activates the focused tab — this comes for free from using
//   native <button> elements, whose default keydown behavior fires onClick.
export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  idPrefix,
  ariaLabel = "Analytics sections",
}: {
  tabs: TabDef<T>[];
  active: T;
  onChange: (key: T) => void;
  idPrefix: string;
  ariaLabel?: string;
}) {
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusTab(index: number) {
    const key = tabs[index]?.key;
    if (key) buttonRefs.current[key]?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent, index: number) {
    switch (e.key) {
      case "ArrowRight":
        e.preventDefault();
        focusTab((index + 1) % tabs.length);
        break;
      case "ArrowLeft":
        e.preventDefault();
        focusTab((index - 1 + tabs.length) % tabs.length);
        break;
      case "Home":
        e.preventDefault();
        focusTab(0);
        break;
      case "End":
        e.preventDefault();
        focusTab(tabs.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex gap-1 overflow-x-auto"
    >
      {tabs.map((tab, index) => {
        const selected = tab.key === active;
        return (
          <button
            key={tab.key}
            ref={(el) => {
              buttonRefs.current[tab.key] = el;
            }}
            role="tab"
            type="button"
            id={`${idPrefix}-tab-${tab.key}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel-${tab.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={`shrink-0 whitespace-nowrap px-4 py-2 text-sm font-semibold border-b-2 ${
              selected
                ? "border-accent text-ink"
                : "border-transparent text-ink/50 hover:text-ink hover:border-ink/30"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
