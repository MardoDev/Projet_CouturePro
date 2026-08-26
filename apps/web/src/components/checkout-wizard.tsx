"use client";

import { useState } from "react";
import Link from "next/link";
import type { Commande, Panier } from "@/lib/api";
import { formatPrice } from "@/lib/format";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type Step = "adresse" | "recapitulatif" | "confirmation";

type Address = { line1: string; line2: string; city: string; notes: string };

/// Zones/tarifs/preuve de livraison : décision C.D.P en attente (voir
/// GUIDE-VIBE-CODING.md). Cette adresse est capturée telle quelle, sans
/// frais de livraison ni validation de zone — RG6/RG7 uniquement.
export function CheckoutWizard({ panier }: { panier: Panier }) {
  const [step, setStep] = useState<Step>("adresse");
  const [address, setAddress] = useState<Address>({
    line1: "",
    line2: "",
    city: "",
    notes: "",
  });
  const [addressError, setAddressError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<Commande | null>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  function handleAddressSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!address.line1.trim() || !address.city.trim()) {
      setAddressError("Adresse et ville sont obligatoires.");
      return;
    }
    setAddressError(null);
    setStep("recapitulatif");
  }

  async function handleConfirm() {
    setLoading(true);
    setSubmitError(null);
    try {
      const response = await fetch(`${API_URL}/api/v1/commandes`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ shippingAddressJson: address }),
      });
      const body = await response.json();
      if (!response.ok) {
        setSubmitError(
          body.error === "INSUFFICIENT_STOCK"
            ? "Stock insuffisant pour un des articles — retournez au panier."
            : "Impossible de finaliser la commande, réessayez.",
        );
        return;
      }
      setOrder(body.commande);
      setStep("confirmation");
    } catch {
      setSubmitError("Une erreur est survenue, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "confirmation" && order) {
    return (
      <div className="font-body text-sm">
        <p className="text-lg font-medium">Commande confirmée.</p>
        <p className="mt-2 text-foreground/70">
          Référence : {order.id} — {formatPrice(order.totalAmount, order.currency)}
        </p>
        <p className="mt-4 text-foreground/60">
          Le paiement en ligne arrive dans une prochaine mise à jour ; vous serez recontacté
          pour finaliser le règlement.
        </p>
        <Link href="/compte/commandes" className="mt-4 inline-block underline">
          Voir mes commandes
        </Link>
      </div>
    );
  }

  if (step === "recapitulatif") {
    return (
      <div>
        <h2 className="font-heading text-lg text-peche-fonce">Récapitulatif</h2>
        <ul className="font-body mt-3 space-y-1 text-sm text-foreground/80">
          {panier.items.map((item) => (
            <li key={item.id}>
              {item.quantity} × {item.produitName} ({item.size}, {item.color}) —{" "}
              {formatPrice(item.lineTotalAmount, item.currency)}
            </li>
          ))}
        </ul>
        <p className="font-body mt-3 font-medium">
          Total : {formatPrice(panier.totalAmount, panier.currency ?? "XAF")}
        </p>

        <div className="mt-4 rounded-md border border-border p-3 font-body text-sm text-foreground/70">
          <p>{address.line1}</p>
          {address.line2 && <p>{address.line2}</p>}
          <p>{address.city}</p>
        </div>

        {submitError && <p className="font-body mt-3 text-sm text-red-700">{submitError}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setStep("adresse")}
            className="rounded-md border border-border px-4 py-2 font-body text-sm"
          >
            Modifier l&apos;adresse
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-md bg-peche-fonce px-6 py-2 font-body text-sm text-ivoire disabled:opacity-50"
          >
            {loading ? "Confirmation…" : "Confirmer la commande"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleAddressSubmit} className="space-y-4">
      <div>
        <label htmlFor="line1" className="font-body text-sm">
          Adresse
        </label>
        <input
          id="line1"
          value={address.line1}
          onChange={(e) => setAddress((a) => ({ ...a, line1: e.target.value }))}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      <div>
        <label htmlFor="line2" className="font-body text-sm">
          Complément (optionnel)
        </label>
        <input
          id="line2"
          value={address.line2}
          onChange={(e) => setAddress((a) => ({ ...a, line2: e.target.value }))}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      <div>
        <label htmlFor="city" className="font-body text-sm">
          Ville
        </label>
        <input
          id="city"
          value={address.city}
          onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      <div>
        <label htmlFor="notes" className="font-body text-sm">
          Notes de livraison (optionnel)
        </label>
        <textarea
          id="notes"
          rows={2}
          value={address.notes}
          onChange={(e) => setAddress((a) => ({ ...a, notes: e.target.value }))}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      {addressError && <p className="font-body text-sm text-red-700">{addressError}</p>}
      <button
        type="submit"
        className="rounded-md bg-peche-fonce px-6 py-2 font-body text-sm text-ivoire"
      >
        Continuer
      </button>
    </form>
  );
}
