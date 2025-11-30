// micro2/src/services/orderService.js
export const nowISO = () => new Date().toISOString();
export const makeId = (p) => `${p}-${Date.now()}`;

export function validateStock(cart, inventory) {
  const missing = cart
    .map((it) => {
      const p = inventory.find((x) => x.id === it.productId);
      const available = p?.stock ?? 0;
      return it.qty > available ? { ...it, available } : null;
    })
    .filter(Boolean);

  return { ok: missing.length === 0, missing };
}

export function buildOrder({ cart, total }) {
  const orderId = makeId("ORD");
  return {
    orderId,
    createdAt: nowISO(),
    status: "PENDIENTE_PAGO",
    items: cart,
    total,
    message: "Tu orden ha sido tomada. En unos momentos comenzaremos a prepararla.",
  };
}

export function buildSale({ orderId, total }) {
  return {
    saleId: makeId("SALE"),
    orderId,
    total,
    status: "PENDIENTE_PAGO",
    createdAt: nowISO(),
  };
}
