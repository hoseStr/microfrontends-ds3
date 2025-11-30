// micro2/src/services/storage.js
export const LS_INVENTORY = "inventory_db";
export const LS_ORDERS = "orders_db";

export function readJSON(key, fallback) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : fallback;
}

export function writeJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadInventory() {
  return readJSON(LS_INVENTORY, []);
}

export function loadOrders() {
  return readJSON(LS_ORDERS, []);
}

export function saveOrders(orders) {
  writeJSON(LS_ORDERS, orders);
}
