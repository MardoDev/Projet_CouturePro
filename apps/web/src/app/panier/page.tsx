import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, authCookieHeader } from "@/lib/session";
import { getPanierServer } from "@/lib/api";
import { CartView } from "@/components/cart-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Panier" };

export default async function PanierPage() {
  const user = await getSession();
  if (!user) redirect("/connexion?redirect=/panier");

  const cookieHeader = authCookieHeader();
  const { panier } = await getPanierServer(cookieHeader!);

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Panier</h1>
      <div className="mt-6">
        <CartView initialPanier={panier} />
      </div>
    </section>
  );
}
