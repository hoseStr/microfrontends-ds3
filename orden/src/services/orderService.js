// orderService.js - Servicio mejorado para gestión de órdenes (Micro 2)

const LS_ORDERS = "orders_db";
const LS_INVENTORY = "inventory_db";

// 📝 Estados de órdenes
export const ORDER_STATUS = {
  PENDIENTE_PAGO: "PENDIENTE_PAGO",
  COMPLETADA: "COMPLETADA",
  CANCELADA: "CANCELADA",
  EN_PREPARACION: "EN_PREPARACION", // Opcional para futuro
};

// 📝 Eventos que Micro 2 emite
const EVENTS_TO_EMIT = {
  SALE_CREATED: "SALE_CREATED",
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
};

// 📝 Eventos que Micro 2 escucha
const EVENTS_TO_LISTEN = {
  SALE_PAID: "SALE_PAID",
  SALE_CANCELLED: "SALE_CANCELLED",
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
};

// ==============================================
// UTILIDADES
// ==============================================

/**
 * Genera un ID único con prefijo
 */
export const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Obtiene timestamp ISO actual
 */
export const nowISO = () => new Date().toISOString();

/**
 * Formatea moneda en formato colombiano
 */
export const money = (n) => `$${Number(n).toLocaleString("es-CO")}`;

/**
 * Emite un evento personalizado
 */
function emit(eventName, detail = {}) {
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
  console.log(`📡 [Micro 2] Evento emitido: ${eventName}`, detail);
}

// ==============================================
// GESTIÓN DE STORAGE
// ==============================================

/**
 * Carga todas las órdenes desde localStorage
 */
function loadOrders() {
  try {
    const raw = localStorage.getItem(LS_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("❌ Error al cargar órdenes:", error);
    return [];
  }
}

/**
 * Carga inventario desde localStorage
 */
function loadInventory() {
  try {
    const raw = localStorage.getItem(LS_INVENTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("❌ Error al cargar inventario:", error);
    return [];
  }
}

/**
 * Guarda órdenes y emite evento de actualización
 */
function saveOrdersAndNotify(orders, reason = "unknown") {
  try {
    localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
    emit(EVENTS_TO_EMIT.ORDER_UPDATED, { 
      reason, 
      timestamp: nowISO(),
      totalOrders: orders.length 
    });
    console.log(`💾 [Micro 2] Órdenes guardadas: ${orders.length} registros`);
  } catch (error) {
    console.error("❌ Error al guardar órdenes:", error);
    throw new Error("No se pudieron guardar las órdenes");
  }
}

// ==============================================
// VALIDACIONES
// ==============================================

/**
 * Valida que haya stock suficiente para un carrito
 */
export function validateStock(cart, inventory) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return { ok: false, missing: [], error: "Carrito vacío" };
  }

  const missing = cart
    .map((item) => {
      const product = inventory.find((p) => p.id === item.productId);
      const available = product?.stock ?? 0;

      if (item.qty > available) {
        return {
          productId: item.productId,
          name: item.name || "Producto desconocido",
          requested: item.qty,
          available,
        };
      }
      return null;
    })
    .filter(Boolean);

  return {
    ok: missing.length === 0,
    missing,
  };
}

/**
 * Valida la estructura de un carrito
 */
export function validateCart(cart) {
  const errors = [];

  if (!Array.isArray(cart)) {
    errors.push("El carrito debe ser un array");
    return { valid: false, errors };
  }

  if (cart.length === 0) {
    errors.push("El carrito está vacío");
    return { valid: false, errors };
  }

  cart.forEach((item, index) => {
    if (!item.productId) errors.push(`Item ${index}: falta productId`);
    if (!item.name) errors.push(`Item ${index}: falta nombre`);
    if (!item.price || item.price <= 0) errors.push(`Item ${index}: precio inválido`);
    if (!item.qty || item.qty <= 0) errors.push(`Item ${index}: cantidad inválida`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ==============================================
// CONSTRUCTORES
// ==============================================

/**
 * Construye un objeto de orden
 */
export function buildOrder({ cart, total, customerId = null }) {
  const orderId = makeId("ORD");
  
  return {
    orderId,
    customerId,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    status: ORDER_STATUS.PENDIENTE_PAGO,
    items: cart.map(item => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      price: item.price,
      subtotal: item.qty * item.price,
    })),
    total,
    message: "Tu orden ha sido tomada. En unos momentos comenzaremos a prepararla.",
  };
}

/**
 * Construye un payload de venta para Micro 3
 */
export function buildSalePayload({ orderId, cart, total }) {
  return {
    saleId: makeId("SALE"),
    orderId,
    total,
    status: ORDER_STATUS.PENDIENTE_PAGO,
    items: cart.map(item => ({
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      price: item.price,
    })),
    createdAt: nowISO(),
  };
}

// ==============================================
// SERVICIO PRINCIPAL
// ==============================================

export const orderService = {
  
  /**
   * Obtiene todas las órdenes
   */
  getAll: () => {
    return loadOrders();
  },

  /**
   * Obtiene una orden por ID
   */
  getById: (orderId) => {
    const orders = loadOrders();
    return orders.find(o => o.orderId === orderId) || null;
  },

  /**
   * Obtiene órdenes por estado
   */
  getByStatus: (status) => {
    const orders = loadOrders();
    return orders.filter(o => o.status === status);
  },

  /**
   * Crea una nueva orden y emite evento para Micro 3
   */
  createOrder: ({ cart, customerId = null }) => {
    console.log("📝 [Micro 2] Creando nueva orden...");

    // Validar carrito
    const cartValidation = validateCart(cart);
    if (!cartValidation.valid) {
      const errorMsg = `Carrito inválido: ${cartValidation.errors.join(", ")}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    // Validar stock
    const inventory = loadInventory();
    const stockValidation = validateStock(cart, inventory);
    
    if (!stockValidation.ok) {
      const details = stockValidation.missing
        .map(m => `${m.name}: solicitas ${m.requested}, hay ${m.available}`)
        .join(" • ");
      throw new Error(`Stock insuficiente: ${details}`);
    }

    // Calcular total
    const total = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);

    // Construir orden
    const order = buildOrder({ cart, total, customerId });

    // Guardar orden
    const orders = loadOrders();
    const updatedOrders = [order, ...orders];
    saveOrdersAndNotify(updatedOrders, `Orden creada: ${order.orderId}`);

    // Construir payload para venta
    const salePayload = buildSalePayload({
      orderId: order.orderId,
      cart,
      total,
    });

    // Emitir evento para Micro 3
    emit(EVENTS_TO_EMIT.SALE_CREATED, salePayload);
    emit(EVENTS_TO_EMIT.ORDER_CREATED, { orderId: order.orderId, total });

    console.log("✅ [Micro 2] Orden creada exitosamente:", order.orderId);
    return order;
  },

  /**
   * Actualiza el estado de una orden
   */
  updateOrderStatus: (orderId, newStatus, additionalData = {}) => {
    console.log(`🔄 [Micro 2] Actualizando orden ${orderId} a ${newStatus}`);

    const orders = loadOrders();
    const orderIndex = orders.findIndex(o => o.orderId === orderId);

    if (orderIndex === -1) {
      throw new Error(`Orden ${orderId} no encontrada`);
    }

    const updatedOrder = {
      ...orders[orderIndex],
      status: newStatus,
      updatedAt: nowISO(),
      ...additionalData,
    };

    orders[orderIndex] = updatedOrder;
    saveOrdersAndNotify(orders, `Orden ${orderId} actualizada a ${newStatus}`);

    console.log("✅ [Micro 2] Orden actualizada exitosamente");
    return updatedOrder;
  },

  /**
   * Marca una orden como completada
   */
  completeOrder: (orderId) => {
    return orderService.updateOrderStatus(orderId, ORDER_STATUS.COMPLETADA, {
      completedAt: nowISO(),
    });
  },

  /**
   * Cancela una orden
   */
  cancelOrder: (orderId, reason = "Cancelada por usuario") => {
    return orderService.updateOrderStatus(orderId, ORDER_STATUS.CANCELADA, {
      cancelledAt: nowISO(),
      cancelReason: reason,
    });
  },

  /**
   * Obtiene estadísticas de órdenes
   */
  getStats: () => {
    const orders = loadOrders();

    const stats = {
      total: orders.length,
      pendientes: orders.filter(o => o.status === ORDER_STATUS.PENDIENTE_PAGO).length,
      completadas: orders.filter(o => o.status === ORDER_STATUS.COMPLETADA).length,
      canceladas: orders.filter(o => o.status === ORDER_STATUS.CANCELADA).length,
      totalFacturado: orders
        .filter(o => o.status === ORDER_STATUS.COMPLETADA)
        .reduce((sum, o) => sum + o.total, 0),
      promedioOrden: 0,
    };

    if (stats.completadas > 0) {
      stats.promedioOrden = stats.totalFacturado / stats.completadas;
    }

    return stats;
  },

  /**
   * Limpia todas las órdenes (útil para testing)
   */
  clearAll: () => {
    saveOrdersAndNotify([], "Todas las órdenes eliminadas");
    console.log("🗑️ [Micro 2] Base de datos de órdenes limpiada");
  },

  /**
   * Configura los event listeners necesarios
   * DEBE ser llamado al iniciar el microfrontend
   */
  setupEventListeners: () => {
    console.log("🎧 [Micro 2] Configurando event listeners...");

    // Listener para SALE_PAID desde Micro 3
    const handleSalePaid = (event) => {
      try {
        const { orderId } = event.detail || {};
        console.log("💳 [Micro 2] SALE_PAID recibido:", orderId);

        if (!orderId) return;

        orderService.completeOrder(orderId);
      } catch (error) {
        console.error("❌ [Micro 2] Error procesando SALE_PAID:", error);
      }
    };

    // Listener para SALE_CANCELLED desde Micro 3
    const handleSaleCancelled = (event) => {
      try {
        const { orderId, reason } = event.detail || {};
        console.log("🚫 [Micro 2] SALE_CANCELLED recibido:", orderId);

        if (!orderId) return;

        orderService.cancelOrder(orderId, reason);
      } catch (error) {
        console.error("❌ [Micro 2] Error procesando SALE_CANCELLED:", error);
      }
    };

    // Listener para cambios de storage (sincronización entre pestañas)
    const handleStorageChange = (event) => {
      if (event.key === LS_ORDERS) {
        console.log("🔄 [Micro 2] Cambio en orders_db detectado (otra pestaña)");
        emit(EVENTS_TO_EMIT.ORDER_UPDATED, {
          reason: "Storage change from another tab",
          timestamp: nowISO(),
        });
      }
    };

    // Listener para actualizaciones de inventario
    const handleInventoryUpdated = (event) => {
      console.log("📦 [Micro 2] INVENTORY_UPDATED recibido:", event.detail);
      // Aquí podrías recargar productos si es necesario
    };

    window.addEventListener(EVENTS_TO_LISTEN.SALE_PAID, handleSalePaid);
    window.addEventListener(EVENTS_TO_LISTEN.SALE_CANCELLED, handleSaleCancelled);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(EVENTS_TO_LISTEN.INVENTORY_UPDATED, handleInventoryUpdated);

    console.log("✅ [Micro 2] Event listeners configurados correctamente");

    // Retornar función de limpieza
    return () => {
      window.removeEventListener(EVENTS_TO_LISTEN.SALE_PAID, handleSalePaid);
      window.removeEventListener(EVENTS_TO_LISTEN.SALE_CANCELLED, handleSaleCancelled);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(EVENTS_TO_LISTEN.INVENTORY_UPDATED, handleInventoryUpdated);
      console.log("🧹 [Micro 2] Event listeners removidos");
    };
  },
};

// ==============================================
// EXPORTACIONES
// ==============================================

export { EVENTS_TO_EMIT, EVENTS_TO_LISTEN, ORDER_STATUS };
export default orderService;