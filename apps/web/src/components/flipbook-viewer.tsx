"use client";

import { useState } from "react";
import type { CataloguePage } from "@/lib/api";

/// Placeholder contractuel (CDC) : navigation page à page, sans l'animation
/// de tournage de page. Une vraie librairie flipbook (react-pageflip ou
/// équivalent) pourra remplacer ce composant sans changer son usage.
export function FlipbookViewer({ pages }: { pages: CataloguePage[] }) {
  const [index, setIndex] = useState(0);
  const sorted = [...pages].sort((a, b) => a.pageNumber - b.pageNumber);
  const current = sorted[index];

  if (sorted.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed border-border font-body text-sm text-foreground/60">
        Aucune page disponible pour ce catalogue.
      </div>
    );
  }

  return (
    <div>
      <div className="aspect-[3/4] w-full overflow-hidden rounded-lg border border-border bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element -- domaines de page non connus à l'avance (Cloudinary en Phase 7). */}
        <img
          src={current.imageUrl}
          alt={current.altText ?? `Page ${current.pageNumber}`}
          className="h-full w-full object-contain"
        />
      </div>
      <div className="mt-3 flex items-center justify-between font-body text-sm">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
        >
          Précédent
        </button>
        <span className="text-foreground/60">
          Page {current.pageNumber} / {sorted.length}
        </span>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(sorted.length - 1, i + 1))}
          disabled={index === sorted.length - 1}
          className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
