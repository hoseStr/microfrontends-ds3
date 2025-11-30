// salesService.js - Servicio mejorado para gestión de ventas (Micro 3)

const LS_SALES = "sales_db";
const LS_INVENTORY = "inventory_db";

// 📝 Eventos que este Micro 3 escucha (de Micro 2)
const EVENTS_TO_LISTEN = {
  SALE_CREATED: "SALE_CREATED",
  ORDER_UPDATED: "ORDER_UPDATED",
};

// 📝 Eventos que este Micro 3 emite
const EVENTS_TO_EMIT = {
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
  SALES_DB_UPDATED: "SALES_DB_UPDATED",
  SALE_PAID: "SALE_PAID",
  SALE_CANCELLED: "SALE_CANCELLED",
};

// ==============================================
// UTILIDADES
// ==============================================

/**
 * Genera un ID único con prefijo
 */
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * Obtiene timestamp ISO actual
 */
const nowISO = () => new Date().toISOString();

/**
 * Emite un evento personalizado en window
 */
function emit(eventName, detail = {}) {
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
  console.log(`📡 [Micro 3] Evento emitido: ${eventName}`, detail);
}

/**
 * Valida la estructura de un payload de venta
 */
function validateSalePayload(payload) {
  const errors = [];
  
  if (!payload) {
    errors.push("El payload está vacío");
    return { valid: false, errors };
  }
  
  if (!payload.orderId) errors.push("Falta orderId");
  if (!payload.total || payload.total <= 0) errors.push("Total inválido");
  if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    errors.push("Items inválidos o vacíos");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// ==============================================
// GESTIÓN DE STORAGE
// ==============================================

/**
 * Carga todas las ventas desde localStorage
 */
function loadSales() {
  try {
    const raw = localStorage.getItem(LS_SALES);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("❌ Error al cargar ventas:", error);
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
 * Guarda ventas y emite evento de actualización
 */
function saveSalesAndNotify(salesList, reason = "unknown") {
  try {
    localStorage.setItem(LS_SALES, JSON.stringify(salesList));
    emit(EVENTS_TO_EMIT.SALES_DB_UPDATED, { 
      reason, 
      timestamp: nowISO(),
      totalSales: salesList.length 
    });
    console.log(`💾 [Micro 3] Ventas guardadas: ${salesList.length} registros`);
  } catch (error) {
    console.error("❌ Error al guardar ventas:", error);
    throw new Error("No se pudieron guardar las ventas");
  }
}

/**
 * Guarda inventario y emite evento de actualización
 */
function saveInventoryAndNotify(inventory, reason = "unknown") {
  try {
    localStorage.setItem(LS_INVENTORY, JSON.stringify(inventory));
    emit(EVENTS_TO_EMIT.INVENTORY_UPDATED, { 
      reason, 
      timestamp: nowISO() 
    });
    console.log(`💾 [Micro 3] Inventario actualizado: ${inventory.length} productos`);
  } catch (error) {
    console.error("❌ Error al guardar inventario:", error);
    throw new Error("No se pudo actualizar el inventario");
  }
}

// ==============================================
// SERVICIO PRINCIPAL
// ==============================================

export const salesService = {
  
  /**
   * Obtiene todas las ventas
   */
  getAll: () => {
    return loadSales();
  },

  /**
   * Obtiene una venta por ID
   */
  getById: (saleId) => {
    const sales = loadSales();
    return sales.find(s => s.id === saleId) || null;
  },

  /**
   * Obtiene ventas por estado
   */
  getByStatus: (status) => {
    const sales = loadSales();
    return sales.filter(s => s.status === status);
  },

  /**
   * Obtiene ventas por orderId
   */
  getByOrderId: (orderId) => {
    const sales = loadSales();
    return sales.find(s => s.orderId === orderId) || null;
  },

  /**
   * Crea una venta desde un payload de orden (Micro 2)
   */
  createFromOrder: (orderPayload) => {
    console.log("🔄 [Micro 3] Procesando creación de venta:", orderPayload);
    
    // Validar payload
    const validation = validateSalePayload(orderPayload);
    if (!validation.valid) {
      const errorMsg = `Payload inválido: ${validation.errors.join(", ")}`;
      console.error("❌", errorMsg);
      throw new Error(errorMsg);
    }

    const sales = loadSales();
    
    // Verificar duplicados por orderId
    const exists = sales.find(s => s.orderId === orderPayload.orderId);
    if (exists) {
      console.warn("⚠️ Venta duplicada detectada para orden:", orderPayload.orderId);
      return exists; // Retornar la existente en lugar de null
    }

    // Mapear items a products con validación
    const products = orderPayload.items.map(item => ({
      productId: item.productId,
      name: item.name || "Sin nombre",
      qty: item.qty || 0,
      price: item.price || 0
    }));

    // Crear nueva venta
    const newSale = {
      id: orderPayload.saleId || makeId("SALE"),
      orderId: orderPayload.orderId,
      total: orderPayload.total,
      status: orderPayload.status || "PENDIENTE_PAGO",
      products,
      createdAt: orderPayload.createdAt || nowISO(),
      updatedAt: nowISO(),
    };

    const updated = [newSale, ...sales];
    saveSalesAndNotify(updated, `Venta creada desde orden ${newSale.orderId}`);
    
    console.log("✅ [Micro 3] Venta creada exitosamente:", newSale.id);
    return newSale;
  },

  /**
   * Procesa el pago de una venta y descuenta del inventario
   */
  processPayment: (saleId) => {
    console.log("💳 [Micro 3] Procesando pago para venta:", saleId);
    
    const sales = loadSales();
    const saleIndex = sales.findIndex(s => s.id === saleId);

    if (saleIndex === -1) {
      throw new Error(`Venta ${saleId} no encontrada`);
    }

    const sale = sales[saleIndex];

    if (sale.status === "PAGADA") {
      throw new Error(`La venta ${saleId} ya fue pagada`);
    }

    if (sale.status === "CANCELADA") {
      throw new Error(`La venta ${saleId} está cancelada`);
    }

    // Descontar stock del inventario
    const inventory = loadInventory();
    let stockInsuficiente = [];

    const updatedInventory = inventory.map(product => {
      const item = sale.products.find(p => p.productId === product.id);
      
      if (item) {
        const newStock = (product.stock || 0) - item.qty;
        
        if (newStock < 0) {
          stockInsuficiente.push({
            name: product.name,
            requested: item.qty,
            available: product.stock || 0
          });
        }
        
        return { ...product, stock: Math.max(0, newStock) };
      }
      
      return product;
    });

    // Validar que haya stock suficiente
    if (stockInsuficiente.length > 0) {
      const detalles = stockInsuficiente.map(
        s => `${s.name}: solicitaste ${s.requested}, hay ${s.available}`
      ).join(" | ");
      throw new Error(`Stock insuficiente: ${detalles}`);
    }

    // Actualizar inventario
    saveInventoryAndNotify(updatedInventory, `Stock descontado por venta ${saleId}`);

    // Actualizar estado de la venta
    sale.status = "PAGADA";
    sale.paidAt = nowISO();
    sale.updatedAt = nowISO();
    sales[saleIndex] = sale;
    
    saveSalesAndNotify(sales, `Pago procesado para venta ${saleId}`);

    // Emitir evento de pago exitoso
    emit(EVENTS_TO_EMIT.SALE_PAID, {
      saleId: sale.id,
      orderId: sale.orderId,
      products: sale.products,
      total: sale.total
    });

    console.log("✅ [Micro 3] Pago procesado exitosamente");
    return sale;
  },

  /**
   * Cancela una venta (no descuenta inventario)
   */
  cancelSale: (saleId, reason = "Cancelada por usuario") => {
    console.log("🚫 [Micro 3] Cancelando venta:", saleId);
    
    const sales = loadSales();
    const sale = sales.find(s => s.id === saleId);

    if (!sale) {
      throw new Error(`Venta ${saleId} no encontrada`);
    }

    if (sale.status === "PAGADA") {
      throw new Error("No se puede cancelar una venta ya pagada");
    }

    if (sale.status === "CANCELADA") {
      console.warn("⚠️ La venta ya estaba cancelada");
      return sale;
    }

    const updated = sales.map((s) =>
      s.id === saleId 
        ? { 
            ...s, 
            status: "CANCELADA", 
            cancelledAt: nowISO(),
            cancelReason: reason,
            updatedAt: nowISO()
          } 
        : s
    );

    saveSalesAndNotify(updated, `Venta cancelada: ${saleId}`);

    const cancelledSale = updated.find(s => s.id === saleId);

    // Emitir evento de cancelación
    emit(EVENTS_TO_EMIT.SALE_CANCELLED, {
      saleId: cancelledSale.id,
      orderId: cancelledSale.orderId,
      reason
    });

    console.log("✅ [Micro 3] Venta cancelada exitosamente");
    return cancelledSale;
  },

  /**
   * Obtiene estadísticas de ventas
   */
  getStats: () => {
    const sales = loadSales();
    
    const stats = {
      total: sales.length,
      pendientes: sales.filter(s => s.status === "PENDIENTE_PAGO").length,
      pagadas: sales.filter(s => s.status === "PAGADA").length,
      canceladas: sales.filter(s => s.status === "CANCELADA").length,
      totalRecaudado: sales
        .filter(s => s.status === "PAGADA")
        .reduce((sum, s) => sum + s.total, 0),
      promedioVenta: 0
    };

    if (stats.pagadas > 0) {
      stats.promedioVenta = stats.totalRecaudado / stats.pagadas;
    }

    return stats;
  },

  /**
   * Limpia todas las ventas (útil para testing)
   */
  clearAll: () => {
    saveSalesAndNotify([], "Todas las ventas eliminadas");
    console.log("🗑️ [Micro 3] Base de datos de ventas limpiada");
  },

  /**
   * Configura los event listeners necesarios
   * DEBE ser llamado al iniciar el microfrontend
   */
  setupEventListeners: () => {
    console.log("🎧 [Micro 3] Configurando event listeners...");

    // Listener para SALE_CREATED desde Micro 2
    const handleSaleCreated = (event) => {
      try {
        const payload = event.detail;
        console.log("📥 [Micro 3] SALE_CREATED recibido:", payload);
        
        salesService.createFromOrder(payload);
      } catch (error) {
        console.error("❌ [Micro 3] Error procesando SALE_CREATED:", error);
      }
    };

    // Listener para cambios de storage (sincronización entre pestañas)
    const handleStorageChange = (event) => {
      if (event.key === LS_SALES) {
        console.log("🔄 [Micro 3] Cambio en sales_db detectado (otra pestaña)");
        emit(EVENTS_TO_EMIT.SALES_DB_UPDATED, { 
          reason: "Storage change from another tab",
          timestamp: nowISO() 
        });
      }
    };

    window.addEventListener(EVENTS_TO_LISTEN.SALE_CREATED, handleSaleCreated);
    window.addEventListener("storage", handleStorageChange);

    console.log("✅ [Micro 3] Event listeners configurados correctamente");

    // Retornar función de limpieza
    return () => {
      window.removeEventListener(EVENTS_TO_LISTEN.SALE_CREATED, handleSaleCreated);
      window.removeEventListener("storage", handleStorageChange);
      console.log("🧹 [Micro 3] Event listeners removidos");
    };
  }
};

// ==============================================
// EXPORTACIONES ADICIONALES
// ==============================================

export { EVENTS_TO_EMIT, EVENTS_TO_LISTEN };
export default salesService;