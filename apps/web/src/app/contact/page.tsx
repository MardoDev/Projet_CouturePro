import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact / devis",
  description: "Contactez Couture Dynamic Pro pour une demande de devis sur mesure.",
};

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="font-heading text-2xl text-peche-fonce">Contact / devis</h1>
      <p className="font-body mt-2 text-sm text-foreground/70">
        Une question, une demande sur mesure ? Écrivez-nous.
      </p>
      <div className="mt-6">
        <ContactForm />
      </div>
    </section>
  );
}
