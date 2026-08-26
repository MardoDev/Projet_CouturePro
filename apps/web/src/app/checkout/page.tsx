import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, authCookieHeader } from "@/lib/session";
import { getPanierServer } from "@/lib/api";
import { CheckoutWizard } from "@/components/checkout-wizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Commande" };

export default async function CheckoutPage() {
  const user = await getSession();
  if (!user) redirect("/connexion?redirect=/checkout");

  const cookieHeader = authCookieHeader();
  const { panier } = await getPanierServer(cookieHeader!);

  if (panier.items.length === 0) {
    redirect("/panier");
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Passer commande</h1>
      <div className="mt-6">
        <CheckoutWizard panier={panier} />
      </div>
    </section>
  );
}
