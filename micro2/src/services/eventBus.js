// micro2/src/services/eventBus.js
export const EVENTS = {
  SALE_CREATED: "SALE_CREATED",
  SALE_PAID: "SALE_PAID",
  SALE_CANCELLED: "SALE_CANCELLED",
};

export function emit(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

export function on(eventName, handler) {
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
