export const ORDER_STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Reçue",
  PREPARING: "En préparation",
  SHIPPED: "Expédiée",
  DELIVERED: "Livrée",
  CANCELLED: "Annulée",
  FAILED: "Échouée",
};

export function orderStatusLabel(status: string) {
  return ORDER_STATUS_LABELS[status] ?? status;
}
