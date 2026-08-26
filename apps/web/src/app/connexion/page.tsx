import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    <section className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Connexion</h1>
      <div className="mt-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
      <p className="font-body mt-4 text-sm text-foreground/70">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="underline">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}
