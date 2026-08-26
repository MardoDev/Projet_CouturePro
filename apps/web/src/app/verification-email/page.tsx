import type { Metadata } from "next";
import { Suspense } from "react";
import { VerifyEmailStatus } from "@/components/verify-email-status";

export const metadata: Metadata = { title: "Vérification email" };

export default function VerificationEmailPage() {
  return (
    <section className="mx-auto max-w-sm px-4 py-16 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Vérification de l&apos;email</h1>
      <div className="mt-6">
        <Suspense>
          <VerifyEmailStatus />
        </Suspense>
      </div>
    </section>
  );
}
