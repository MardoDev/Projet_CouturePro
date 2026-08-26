import type { Metadata } from "next";
import Link from "next/link";
import { RegisterForm } from "@/components/register-form";

export const metadata: Metadata = { title: "Créer un compte" };

export default function InscriptionPage() {
  return (
    <section className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Créer un compte</h1>
      <div className="mt-6">
        <RegisterForm />
      </div>
      <p className="font-body mt-4 text-sm text-foreground/70">
        Déjà un compte ?{" "}
        <Link href="/connexion" className="underline">
          Se connecter
        </Link>
      </p>
    </section>
  );
}
