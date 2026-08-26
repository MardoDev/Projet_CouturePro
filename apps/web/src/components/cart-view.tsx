"use client";

import { useState } from "react";
import Link from "next/link";
import type { Panier } from "@/lib/api";
import { formatPrice } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export function CartView({ initialPanier }: { initialPanier: Panier }) {
  const [panier, setPanier] = useState(initialPanier);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function updateQuantity(ligneId: string, quantity: number) {
    setPendingId(ligneId);
    const response = await fetch(`${API_URL}/api/v1/panier/lignes/${ligneId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ quantity }),
    });
    if (response.ok) {
      const body = await response.json();
      setPanier(body.panier);
    }
    setPendingId(null);
  }

  async function removeLine(ligneId: string) {
    setPendingId(ligneId);
    const response = await fetch(`${API_URL}/api/v1/panier/lignes/${ligneId}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (response.ok) {
      const body = await response.json();
      setPanier(body.panier);
    }
    setPendingId(null);
  }

  if (panier.items.length === 0) {
    return <p className="font-body text-sm text-foreground/60">Votre panier est vide.</p>;
  }

  return (
    <div>
      <ul className="divide-y divide-border">
        {panier.items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-4 py-4">
            <div className="font-body text-sm">
              <p className="font-medium">{item.produitName}</p>
              <p className="text-foreground/60">
                {item.size} — {item.color}
              </p>
              <p className="text-foreground/60">
                {formatPrice(item.unitPriceAmount, item.currency)} × {item.quantity}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={item.availableStock}
                value={item.quantity}
                disabled={pendingId === item.id}
                onChange={(e) => updateQuantity(item.id, Math.max(1, Number(e.target.value)))}
                className="w-16 rounded-md border border-border px-2 py-1 font-body text-sm"
              />
              <button
                type="button"
                disabled={pendingId === item.id}
                onClick={() => removeLine(item.id)}
                className="font-body text-sm text-red-700 underline disabled:opacity-50"
              >
                Retirer
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="font-body font-medium">Total</span>
        <span className="font-body text-lg font-medium">
          {formatPrice(panier.totalAmount, panier.currency ?? "XAF")}
        </span>
      </div>

      <Link
        href="/checkout"
        className="mt-6 block rounded-md bg-peche-fonce px-6 py-3 text-center font-body text-sm text-ivoire"
      >
        Passer commande
      </Link>
    </div>
  );
}
