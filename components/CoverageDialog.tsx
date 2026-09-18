"use client";

import { useId } from "react";
import { Modal } from "@/components/Modal";
import { useNewsInteraction } from "@/components/NewsInteractionContext";
import type { Story } from "@/lib/newsGrouping/buildStories";
import { relativeTime, clockTime } from "@/lib/time";

export function CoverageDialog({ open, onClose, story }: { open: boolean; onClose: () => void; story: Story }) {
  const { openDetail } = useNewsInteraction();
  const titleId = useId();

  return (
    <Modal open={open} onClose={onClose} titleId={titleId}>
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-rule px-5 py-4">
          <h2 id={titleId} className="font-serif text-lg font-700 leading-snug">
            Coverage · {story.items.length} article{story.items.length === 1 ? "" : "s"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 border border-ink/30 px-2 py-1 text-xs text-ink/60 hover:border-ink hover:text-ink"
          >
            Close
          </button>
        </div>
        <ul className="divide-y divide-rule px-5">
          {story.items.map((item) => (
            <li key={item.id} className="py-3">
              <button
                type="button"
                onClick={() => {
                  openDetail(item);
                  onClose();
                }}
                className="group text-left w-full"
              >
                <p className="text-sm font-600 leading-snug group-hover:underline decoration-accent decoration-2 underline-offset-2">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-ink/60">
                  <span className="font-semibold text-ink/80">{item.sourceName}</span> · {relativeTime(item.publishedAt)} ·{" "}
                  {clockTime(item.publishedAt)}
                </p>
              </button>
            </li>
          ))}
        </ul>
        <div className="px-5 pb-5" />
      </div>
    </Modal>
  );
}
