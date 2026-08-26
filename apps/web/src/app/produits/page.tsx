import type { Metadata } from "next";
import { listProduits } from "@/lib/api";
import { ProduitCard } from "@/components/produit-card";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Boutique",
  description: "Le prêt-à-porter et les créations exclusives Couture Dynamic Pro.",
};

export default async function ProduitsPage() {
  const { produits } = await listProduits();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Boutique</h1>
      {produits.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="Aucun produit disponible pour le moment." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {produits.map((produit) => (
            <ProduitCard key={produit.id} produit={produit} />
          ))}
        </div>
      )}
    </section>
  );
}
