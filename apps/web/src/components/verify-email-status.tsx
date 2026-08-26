"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export function VerifyEmailStatus() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    )
      .then((response) => setState(response.ok ? "ok" : "error"))
      .catch(() => setState("error"));
  }, [token]);

  if (state === "loading") {
    return <p className="font-body text-sm text-foreground/70">Vérification en cours…</p>;
  }

  if (state === "ok") {
    return (
      <div className="font-body text-sm">
        <p>Email vérifié — votre compte est actif.</p>
        <Link href="/connexion" className="mt-3 inline-block underline">
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <p className="font-body text-sm text-red-700">
      Lien invalide ou expiré. Recommencez l&apos;inscription si besoin.
    </p>
  );
}
