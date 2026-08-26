import type { Metadata } from "next";
import { listCatalogues } from "@/lib/api";
import { CatalogueCard } from "@/components/catalogue-card";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Catalogues",
  description: "Toutes les collections Couture Dynamic Pro en catalogues consultables et partageables.",
};

export default async function CataloguesPage() {
  const { catalogues } = await listCatalogues();

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Catalogues</h1>
      {catalogues.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="Aucun catalogue publié pour le moment." />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {catalogues.map((catalogue) => (
            <CatalogueCard key={catalogue.id} catalogue={catalogue} />
          ))}
        </div>
      )}
    </section>
  );
}
