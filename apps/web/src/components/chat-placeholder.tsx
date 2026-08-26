"use client";

import { useState } from "react";

/// Chat réel (Socket.IO/Redis, RG11) : Phase 7. Ce placeholder ne persiste
/// rien — il annonce honnêtement l'indisponibilité plutôt que de simuler
/// une conversation qui n'existe pas encore.
export function ChatPlaceholder() {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {open && (
        <div className="mb-2 w-64 rounded-lg border border-border bg-background p-4 shadow-lg">
          <p className="font-heading text-sm text-peche-fonce">Chat C.D.P</p>
          <p className="font-body mt-2 text-sm text-foreground/70">
            Le chat en direct arrive bientôt. En attendant, utilisez la page{" "}
            <a href="/contact" className="underline">
              Contact / devis
            </a>
            .
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full bg-peche-fonce px-4 py-3 font-body text-sm text-ivoire shadow-lg"
        aria-expanded={open}
      >
        {open ? "Fermer" : "Discuter"}
      </button>
    </div>
  );
}
