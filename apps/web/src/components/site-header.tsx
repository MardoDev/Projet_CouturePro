import Link from "next/link";
import { getSession } from "@/lib/session";

const NAV_LINKS = [
  { href: "/catalogues", label: "Catalogues" },
  { href: "/produits", label: "Boutique" },
  { href: "/contact", label: "Contact" },
];

export async function SiteHeader() {
  const user = await getSession();

  return (
    <header className="border-b border-border bg-ivoire">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="font-heading text-xl text-peche-fonce">
          Couture Dynamic Pro
        </Link>
        <nav className="hidden gap-6 sm:flex" aria-label="Navigation principale">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-body text-sm text-foreground/80 hover:text-peche-fonce"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/panier" className="font-body text-sm hover:text-peche-fonce" aria-label="Panier">
            Panier
          </Link>
          <Link
            href={user ? "/compte" : "/connexion"}
            className="font-body text-sm hover:text-peche-fonce"
            aria-label="Mon compte"
          >
            {user ? user.firstName : "Connexion"}
          </Link>
        </div>
      </div>
      {/* Nav mobile : simple liste empilée, pas de menu burger en Phase 5 —
          suffisant pour 3 liens, à revoir si le menu grandit. */}
      <nav
        className="flex gap-4 overflow-x-auto border-t border-border px-4 py-2 sm:hidden"
        aria-label="Navigation principale (mobile)"
      >
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="font-body whitespace-nowrap text-sm">
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
