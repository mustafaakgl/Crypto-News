"use client";

import { usePathname } from "next/navigation";
import { Modal } from "@/components/Modal";
import { SaveButton } from "@/components/SaveButton";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import { relativeTime } from "@/lib/time";
import { localeFromPathname } from "@/lib/i18n/locale";
import { getDictionary } from "@/lib/i18n/getDictionary";

export function SavedPanel() {
  const { savedPanelOpen, closeSavedPanel, savedItems, openDetail } = useNewsInteraction();
  const dict = getDictionary(localeFromPathname(usePathname()));

  return (
    <Modal open={savedPanelOpen} onClose={closeSavedPanel} titleId="saved-panel-title">
      <div className="flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-4">
          <h2 id="saved-panel-title" className="font-serif text-xl font-700">
            {dict.saved.heading(savedItems.length)}
          </h2>
          <button
            type="button"
            onClick={closeSavedPanel}
            aria-label={dict.common.close}
            className="shrink-0 border border-ink/30 px-2 py-1 text-xs text-ink/60 hover:border-ink hover:text-ink"
          >
            {dict.common.close}
          </button>
        </div>

        <div className="px-5 py-4">
          {savedItems.length === 0 ? (
            <p className="text-sm text-ink/50 py-4">{dict.saved.empty}</p>
          ) : (
            <ul className="divide-y divide-rule">
              {savedItems.map((item) => (
                <li key={item.id} className="py-3 flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      closeSavedPanel();
                      openDetail(item);
                    }}
                    className="text-left flex-1"
                  >
                    <h3 className="font-serif text-base font-700 leading-snug hover:underline decoration-accent decoration-2 underline-offset-2">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-[11px] text-ink/50">
                      {item.sourceName} &middot; {relativeTime(item.publishedAt)}
                    </p>
                  </button>
                  <SaveButton item={item} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
}
