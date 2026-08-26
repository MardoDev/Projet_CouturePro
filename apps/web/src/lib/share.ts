// RG10 (partage traçable) : l'enregistrement du PARTAGE (compteur, réseau,
// contexte) est fait par le back-end en Phase 7 (fonctionnalites-speciales).
// Ici, uniquement la construction des liens de partage sortants — aucune
// donnée n'est encore persistée côté client.
export type ShareNetwork = "WHATSAPP" | "FACEBOOK" | "TWITTER_X" | "COPY";

export function buildShareUrl(network: ShareNetwork, url: string, title: string): string | null {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  switch (network) {
    case "WHATSAPP":
      return `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    case "FACEBOOK":
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    case "TWITTER_X":
      return `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
    case "COPY":
      return null; // géré via navigator.clipboard côté composant client
  }
}
