import Link from "next/link";
import type { Produit } from "@/lib/api";
import { formatPrice, lowestActivePrice } from "@/lib/format";

export function ProduitCard({ produit }: { produit: Produit }) {
  const price = lowestActivePrice(produit.variantes);
  const currency = produit.variantes[0]?.currency ?? "XAF";

  return (
    <Link
      href={`/produits/${produit.slug}`}
      className="block overflow-hidden rounded-lg border border-border bg-background p-3"
    >
      <h3 className="font-heading text-base text-peche-fonce">{produit.name}</h3>
      <p className="font-body mt-1 text-xs uppercase tracking-wide text-foreground/50">
        {produit.category}
      </p>
      <p className="font-body mt-2 text-sm font-medium">
        {price !== null ? formatPrice(price, currency) : "Indisponible"}
      </p>
    </Link>
  );
}
