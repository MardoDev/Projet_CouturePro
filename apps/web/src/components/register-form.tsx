"use client";

import { useState } from "react";

const isProduction = process.env.NODE_ENV === "production";

export function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ firstName, lastName, email, password }),
      });
      const body = await response.json();

      if (response.status === 409) {
        setError("Un compte existe déjà avec cet email.");
        return;
      }
      if (response.status === 400 && body.error === "WEAK_PASSWORD") {
        setError(`Le mot de passe doit contenir au moins ${body.minLength} caractères.`);
        return;
      }
      if (!response.ok) {
        setError("Une erreur est survenue, réessayez.");
        return;
      }

      setDone(true);
      // Sans prestataire d'email dans la stack (CLAUDE.md), l'API renvoie le
      // lien de vérification directement en environnement non-production.
      if (!isProduction && body.devEmailVerificationToken) {
        setDevLink(`/verification-email?token=${body.devEmailVerificationToken}`);
      }
    } catch {
      setError("Une erreur est survenue, réessayez.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="font-body text-sm">
        <p>Compte créé. Vérifiez votre email pour l&apos;activer.</p>
        {devLink && (
          <p className="mt-3 rounded-md border border-dashed border-border p-3 text-foreground/70">
            Environnement de développement — aucun email n&apos;est réellement envoyé :{" "}
            <a href={devLink} className="underline">
              cliquez ici pour vérifier
            </a>
            .
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className="font-body text-sm">
            Prénom
          </label>
          <input
            id="firstName"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
          />
        </div>
        <div>
          <label htmlFor="lastName" className="font-body text-sm">
            Nom
          </label>
          <input
            id="lastName"
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="email" className="font-body text-sm">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="font-body text-sm">
          Mot de passe (8 caractères minimum)
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-md border border-border px-3 py-2 font-body text-sm"
        />
      </div>
      {error && <p className="font-body text-sm text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-peche-fonce px-6 py-2 font-body text-sm text-ivoire disabled:opacity-50"
      >
        {loading ? "Création…" : "Créer mon compte"}
      </button>
    </form>
  );
}
