// Client API minimal — appelle le backend Express (Phase 4). Pas de
// bibliothèque de fetching (SWR/React Query) : les pages publiques sont des
// Server Components, un fetch() direct suffit et reste SSR/SEO-friendly.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(status: number, code?: string) {
    super(code ?? `API_ERROR_${status}`);
    this.status = status;
    this.code = code;
  }
}

/// `cache: "no-store"` : les catalogues/produits changent via le
/// back-office (Phase 6), pas de revalidation statique tant qu'une
/// stratégie de cache n'est pas explicitement décidée.
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.error);
  }

  return response.json() as Promise<T>;
}

/// Renvoie `null` au lieu de lever sur 404 — pratique pour les pages
/// publiques qui doivent afficher `notFound()` plutôt qu'une erreur 500.
async function apiFetchOrNull<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    return await apiFetch<T>(path, init);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
}

export type Collection = {
  id: string;
  name: string;
  season: string;
  year: number;
  description: string | null;
  status: string;
  coverUrl: string | null;
  createdAt: string;
};

export type CataloguePage = {
  id: string;
  pageNumber: number;
  imageUrl: string;
  altText: string | null;
};

export type Catalogue = {
  id: string;
  collectionId: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  status: string;
  publishedAt: string | null;
  pdfUrl: string | null;
  qrUrl: string | null;
  pages?: CataloguePage[];
};

export type Variante = {
  id: string;
  sku: string;
  size: string;
  color: string;
  priceAmount: number;
  currency: string;
  stockQuantity: number;
  status: string;
};

export type Produit = {
  id: string;
  collectionId: string | null;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  status: string;
  variantes: Variante[];
};

export function listCollections() {
  return apiFetch<{ collections: Collection[] }>("/api/v1/collections");
}

export function listCatalogues() {
  return apiFetch<{ catalogues: Catalogue[] }>("/api/v1/catalogues");
}

export function getCatalogue(slug: string) {
  return apiFetchOrNull<{ catalogue: Catalogue }>(
    `/api/v1/catalogues/${encodeURIComponent(slug)}`,
  );
}

export function listProduits() {
  return apiFetch<{ produits: Produit[] }>("/api/v1/produits");
}

export function getProduit(slug: string) {
  return apiFetchOrNull<{ produit: Produit }>(`/api/v1/produits/${encodeURIComponent(slug)}`);
}

// --- Ressources authentifiées : appelées depuis un Server Component avec le
// cookie de session transmis explicitement (voir apps/web/src/lib/session.ts),
// ou depuis un Client Component avec `credentials: "include"` directement.

export type CartItem = {
  id: string;
  variantId: string;
  quantity: number;
  produitName: string;
  sku: string;
  size: string;
  color: string;
  unitPriceAmount: number;
  currency: string;
  lineTotalAmount: number;
  variantStatus: string;
  availableStock: number;
};

export type Panier = {
  id: string;
  status: string;
  items: CartItem[];
  totalAmount: number;
  currency: string | null;
  currencyConflict: boolean;
};

export type LigneCommande = {
  id: string;
  variantId: string | null;
  productNameSnapshot: string;
  skuSnapshot: string;
  priceAmount: number;
  quantity: number;
};

export type Commande = {
  id: string;
  status: string;
  totalAmount: number;
  currency: string;
  shippingAddressJson: Record<string, unknown>;
  placedAt: string;
  lignes: LigneCommande[];
};

export function getPanierServer(cookieHeader: string) {
  return apiFetch<{ panier: Panier }>("/api/v1/panier", {
    headers: { cookie: cookieHeader },
  });
}

export function listCommandesServer(cookieHeader: string) {
  return apiFetch<{ commandes: Commande[] }>("/api/v1/commandes", {
    headers: { cookie: cookieHeader },
  });
}
