import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, authCookieHeader } from "@/lib/session";
import { listCommandesServer } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { orderStatusLabel } from "@/lib/labels";
import { EmptyState } from "@/components/empty-state";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Mes commandes" };

export default async function MesCommandesPage() {
  const user = await getSession();
  if (!user) redirect("/connexion?redirect=/compte/commandes");

  const cookieHeader = authCookieHeader();
  const { commandes } = await listCommandesServer(cookieHeader!);

  return (
    <section className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Mes commandes</h1>

      {commandes.length === 0 ? (
        <div className="mt-6">
          <EmptyState message="Aucune commande pour le moment." />
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {commandes.map((commande) => (
            <li key={commande.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center justify-between font-body text-sm">
                <span className="text-foreground/60">
                  {new Date(commande.placedAt).toLocaleDateString("fr-FR")}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {orderStatusLabel(commande.status)}
                </span>
              </div>
              <p className="font-body mt-2 font-medium">
                {formatPrice(commande.totalAmount, commande.currency)}
              </p>
              <ul className="font-body mt-2 text-sm text-foreground/70">
                {commande.lignes.map((ligne) => (
                  <li key={ligne.id}>
                    {ligne.quantity} × {ligne.productNameSnapshot}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
