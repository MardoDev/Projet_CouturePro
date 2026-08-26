"use client";

import { useState } from "react";

/// UC12 (devis) suppose "poursuivre l'échange par chat" — le chat/la
/// conversation persistée (CONVERSATION/MESSAGE) est Phase 7. En attendant,
/// ce formulaire ouvre un e-mail pré-rempli : fonctionnel dès maintenant,
/// honnête sur l'absence de vraie prise en charge côté back-office.
const CONTACT_EMAIL = "contact@cdp-couture.com";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setError("Merci de renseigner votre nom, votre email et votre message.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Adresse email invalide.");
      return;
    }
    setError(null);

    const subject = encodeURIComponent(`Demande de devis — ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="font-body text-sm">
          Nom
        </label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      <div>
        <label htmlFor="email" className="font-body text-sm">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      <div>
        <label htmlFor="message" className="font-body text-sm">
          Votre demande
        </label>
        <textarea
          id="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      {error && <p className="font-body text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        className="rounded-md bg-peche-fonce px-6 py-2 font-body text-sm text-ivoire"
      >
        Envoyer par email
      </button>
    </form>
  );
}
