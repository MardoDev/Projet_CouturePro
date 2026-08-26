import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCatalogue } from "@/lib/api";
import { FlipbookViewer } from "@/components/flipbook-viewer";
import { ShareButtons } from "@/components/share-buttons";

export const dynamic = "force-dynamic";

type Props = { params: { slug: string } };

function siteUrl(path: string) {
  return `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}${path}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getCatalogue(params.slug);
  if (!data) return { title: "Catalogue introuvable" };

  const { catalogue } = data;
  const url = siteUrl(`/catalogues/${catalogue.slug}`);

  return {
    title: catalogue.title,
    description: catalogue.description ?? undefined,
    alternates: { canonical: url },
    openGraph: {
      title: catalogue.title,
      description: catalogue.description ?? undefined,
      url,
      images: catalogue.coverUrl ? [{ url: catalogue.coverUrl, width: 1200, height: 630 }] : undefined,
    },
  };
}

export default async function CataloguePage({ params }: Props) {
  const data = await getCatalogue(params.slug);
  if (!data) notFound();
  const { catalogue } = data;

  return (
    <article className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-3xl text-peche-fonce">{catalogue.title}</h1>
      {catalogue.description && (
        <p className="font-body mt-3 text-foreground/80">{catalogue.description}</p>
      )}

      <div className="mt-8">
        <FlipbookViewer pages={catalogue.pages ?? []} />
      </div>

      <div className="mt-8 border-t border-border pt-6">
        <h2 className="font-heading text-lg text-peche-fonce">Partager ce catalogue</h2>
        <div className="mt-3">
          <ShareButtons
            url={siteUrl(`/catalogues/${catalogue.slug}`)}
            title={catalogue.title}
          />
        </div>
      </div>
    </article>
  );
}
