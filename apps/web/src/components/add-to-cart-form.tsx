"use client";

import { useState } from "react";
import type { Variante } from "@/lib/api";
import { formatPrice } from "@/lib/format";

/// La connexion/inscription (Phase 5, tranche suivante) n'est pas encore
/// câblée : un 401 ici est attendu tant que /connexion n'existe pas. On ne
/// simule pas un ajout réussi qui n'aurait pas eu lieu.
export function AddToCartForm({ variantes }: { variantes: Variante[] }) {
  const active = variantes.filter((v) => v.status === "ACTIVE");
  const [selectedId, setSelectedId] = useState(active[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [state, setState] = useState<"idle" | "loading" | "done" | "auth-required" | "error">(
    "idle",
  );

  const selected = active.find((v) => v.id === selectedId);

  if (active.length === 0) {
    return <p className="font-body text-sm text-foreground/60">Produit indisponible pour le moment.</p>;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setState("loading");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/panier/lignes`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ variantId: selectedId, quantity }),
      });
      if (response.status === 401) {
        setState("auth-required");
        return;
      }
      setState(response.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      {active.length > 1 && (
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="w-full rounded-md border border-border px-3 py-2 font-body text-sm"
          aria-label="Choisir une variante"
        >
          {active.map((v) => (
            <option key={v.id} value={v.id}>
              {v.size} — {v.color}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-center gap-3">
        <label htmlFor="quantity" className="font-body text-sm">
          Quantité
        </label>
        <input
          id="quantity"
          type="number"
          min={1}
          max={selected?.stockQuantity ?? 1}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
          className="w-20 rounded-md border border-border px-2 py-1 font-body text-sm"
        />
      </div>

      {selected && (
        <p className="font-body text-lg font-medium">
          {formatPrice(selected.priceAmount, selected.currency)}
        </p>
      )}

      <button
        type="submit"
        disabled={state === "loading"}
        className="rounded-md bg-peche-fonce px-6 py-2 font-body text-sm text-ivoire disabled:opacity-50"
      >
        {state === "loading" ? "Ajout…" : "Ajouter au panier"}
      </button>

      {state === "done" && (
        <p className="font-body text-sm text-green-700">Ajouté au panier.</p>
      )}
      {state === "auth-required" && (
        <p className="font-body text-sm text-foreground/70">
          La connexion client arrive dans une prochaine mise à jour — impossible d&apos;ajouter
          au panier pour l&apos;instant.
        </p>
      )}
      {state === "error" && (
        <p className="font-body text-sm text-red-700">
          Une erreur est survenue, réessayez.
        </p>
      )}
    </form>
  );
}
