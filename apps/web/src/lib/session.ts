import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const SESSION_COOKIE_NAME = "cdp_session";

export type SessionUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  firstName: string;
  lastName: string;
};

/// Le cookie de session est posé par l'API (origine séparée) ; sans
/// attribut Domain, un navigateur le renvoie au frontend aussi tant que les
/// deux tournent sur le même host (localhost, ports différents — un port
/// n'entre pas dans la portée d'un cookie). En production sur des
/// sous-domaines distincts, il faudra un cookie Domain=.cdp-couture.com ou
/// un proxy /api — décision de déploiement, Phase 9.
export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const response = await fetch(`${API_URL}/api/auth/me`, {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${token}` },
    cache: "no-store",
  });
  if (!response.ok) return null;

  const { user } = await response.json();
  return user;
}

/// Pour un appel serveur→API authentifié autre que /me (ex. lister les
/// commandes du compte courant lors du SSR).
export function authCookieHeader(): string | null {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  return token ? `${SESSION_COOKIE_NAME}=${token}` : null;
}
