import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mon compte" };

export default async function ComptePage() {
  const user = await getSession();
  if (!user) redirect("/connexion?redirect=/compte");

  return (
    <section className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Mon compte</h1>
      <div className="mt-6 space-y-1 font-body text-sm">
        <p>
          {user.firstName} {user.lastName}
        </p>
        <p className="text-foreground/70">{user.email}</p>
      </div>

      <div className="mt-6 flex items-center gap-4">
        <Link href="/compte/commandes" className="underline">
          Mes commandes
        </Link>
        <LogoutButton />
      </div>
    </section>
  );
}
