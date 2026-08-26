import Link from "next/link";
import type { Catalogue } from "@/lib/api";

export function CatalogueCard({ catalogue }: { catalogue: Catalogue }) {
  return (
    <Link
      href={`/catalogues/${catalogue.slug}`}
      className="group block overflow-hidden rounded-lg border border-border bg-background"
    >
      <div className="aspect-[3/4] w-full bg-muted">
        {catalogue.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- domaines de couverture non connus à l'avance (Cloudinary en Phase 7) ; next/image exigerait de les whitelister un par un.
          <img
            src={catalogue.coverUrl}
            alt={catalogue.title}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-body text-sm text-muted-foreground">
            Pas de couverture
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-heading text-base text-peche-fonce">{catalogue.title}</h3>
        {catalogue.description && (
          <p className="font-body mt-1 line-clamp-2 text-sm text-foreground/70">
            {catalogue.description}
          </p>
        )}
      </div>
    </Link>
  );
}
