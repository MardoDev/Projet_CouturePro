import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduit } from "@/lib/api";
import { AddToCartForm } from "@/components/add-to-cart-form";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProduit(params.slug);
  if (!data) return { title: "Produit introuvable" };

  return {
    title: data.produit.name,
    description: data.produit.description ?? undefined,
  };
}

export default async function ProduitPage({ params }: Props) {
  const data = await getProduit(params.slug);
  if (!data) notFound();
  const { produit } = data;

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="font-body text-xs uppercase tracking-wide text-foreground/50">
        {produit.category}
      </p>
      <h1 className="font-heading text-3xl text-peche-fonce">{produit.name}</h1>
      {produit.description && (
        <p className="font-body mt-3 text-foreground/80">{produit.description}</p>
      )}

      <AddToCartForm variantes={produit.variantes} />
    </article>
  );
}
