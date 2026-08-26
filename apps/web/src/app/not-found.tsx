import Link from "next/link";

export default function NotFound() {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Page introuvable</h1>
      <p className="font-body mt-3 text-foreground/70">
        Ce contenu n&apos;existe pas ou n&apos;est plus disponible.
      </p>
      <Link href="/" className="mt-6 inline-block underline">
        Retour à l&apos;accueil
      </Link>
    </section>
  );
}
