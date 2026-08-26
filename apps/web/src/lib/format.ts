/// XAF n'a pas de décimale (ISO 4217) : Intl le sait déjà et n'affichera
/// jamais ",00" — priceAmount est en XAF entiers, jamais en centimes.
export function formatPrice(amount: number, currency: string = "XAF") {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(amount);
}

export function lowestActivePrice(variantes: { priceAmount: number; status: string }[]) {
  const active = variantes.filter((v) => v.status === "ACTIVE");
  if (active.length === 0) return null;
  return Math.min(...active.map((v) => v.priceAmount));
}
