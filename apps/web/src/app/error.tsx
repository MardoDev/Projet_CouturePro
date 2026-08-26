"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Une erreur est survenue</h1>
      <p className="font-body mt-3 text-foreground/70">
        Le service est momentanément indisponible. Réessayez dans un instant.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-md bg-peche-fonce px-6 py-2 font-body text-sm text-ivoire"
      >
        Réessayer
      </button>
    </section>
  );
}
