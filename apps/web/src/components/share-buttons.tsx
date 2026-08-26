"use client";

import { useState } from "react";
import { buildShareUrl, type ShareNetwork } from "@/lib/share";

const NETWORKS: { id: ShareNetwork; label: string }[] = [
  { id: "WHATSAPP", label: "WhatsApp" },
  { id: "FACEBOOK", label: "Facebook" },
  { id: "TWITTER_X", label: "X" },
  { id: "COPY", label: "Copier le lien" },
];

export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick(network: ShareNetwork) {
    if (network === "COPY") {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Presse-papiers indisponible (permissions navigateur) : pas de crash,
        // juste pas de confirmation visuelle.
      }
      return;
    }
    const shareUrl = buildShareUrl(network, url, title);
    if (shareUrl) window.open(shareUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {NETWORKS.map((network) => (
        <button
          key={network.id}
          type="button"
          onClick={() => handleClick(network.id)}
          className="rounded-md border border-border px-3 py-1.5 font-body text-sm hover:bg-muted"
        >
          {network.id === "COPY" && copied ? "Lien copié !" : network.label}
        </button>
      ))}
    </div>
  );
}
