import Link from "next/link";
import { listCatalogues } from "@/lib/api";
import { CatalogueCard } from "@/components/catalogue-card";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { catalogues } = await listCatalogues();
  const featured = catalogues.slice(0, 6);

  return (
    <>
      <section className="bg-ivoire px-4 py-16 text-center sm:px-6">
        <h1 className="font-heading text-3xl text-peche-fonce sm:text-4xl">
          Couture Dynamic Pro
        </h1>
        <p className="font-body mx-auto mt-4 max-w-xl text-foreground/80">
          Votre Style Chic — découvrez nos collections en catalogues partageables et
          commandez vos créations préférées.
        </p>
        <Link
          href="/catalogues"
          className="mt-6 inline-block rounded-md bg-peche-fonce px-6 py-3 font-body text-sm text-ivoire"
        >
          Voir les catalogues
        </Link>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-heading text-2xl text-peche-fonce">Dernières collections</h2>
        {featured.length === 0 ? (
          <div className="mt-6">
            <EmptyState message="Aucun catalogue publié pour le moment — revenez bientôt." />
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((catalogue) => (
              <CatalogueCard key={catalogue.id} catalogue={catalogue} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
