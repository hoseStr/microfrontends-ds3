import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

// ==============================================
// CONSTANTES Y CONFIGURACIÓN
// ==============================================

const LS_INVENTORY = "inventory_db";
const LS_ORDERS = "orders_db";

const EVENTS = {
  SALE_CREATED: "SALE_CREATED",
  SALE_PAID: "SALE_PAID",
  SALE_CANCELLED: "SALE_CANCELLED",
  INVENTORY_UPDATED: "INVENTORY_UPDATED",
};

const ORDER_STATUS = {
  PENDIENTE_PAGO: "PENDIENTE_PAGO",
  COMPLETADA: "COMPLETADA",
  CANCELADA: "CANCELADA",
};

// ==============================================
// UTILIDADES
// ==============================================

const nowISO = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
const money = (n) => `$${Number(n).toLocaleString("es-CO")}`;

/**
 * Emite un evento personalizado
 */
function emit(eventName, detail = {}) {
  const event = new CustomEvent(eventName, { detail });
  window.dispatchEvent(event);
  console.log(`📡 [Micro 2] Evento emitido: ${eventName}`, detail);
}

/**
 * Información de estado según el stock
 */
function statusInfo(stock) {
  if (stock <= 0) return { label: "AGOTADO", cls: "red", bar: "rgba(239,68,68,.85)" };
  if (stock <= 5) return { label: "BAJO STOCK", cls: "amber", bar: "rgba(245,158,11,.85)" };
  return { label: "DISPONIBLE", cls: "green", bar: "rgba(22,163,74,.85)" };
}

// ==============================================
// GESTIÓN DE STORAGE
// ==============================================

function loadInventory() {
  try {
    const raw = localStorage.getItem(LS_INVENTORY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("❌ Error al cargar inventario:", error);
    return [];
  }
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(LS_ORDERS);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("❌ Error al cargar órdenes:", error);
    return [];
  }
}

function saveOrders(orders) {
  try {
    localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
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
 * Valida que haya stock suficiente para el carrito
 */
function validateStock(cart, inventory) {
  const missing = cart
    .map((item) => {
      const product = inventory.find((p) => p.id === item.productId);
      const available = product?.stock ?? 0;
      
      if (item.qty > available) {
        return {
          productId: item.productId,
          name: item.name,
          requested: item.qty,
          available
        };
      }
      return null;
    })
    .filter(Boolean);

  return {
    ok: missing.length === 0,
    missing
  };
}

// ==============================================
// COMPONENTE PRINCIPAL
// ==============================================

export default function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [qtyById, setQtyById] = useState({});
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState("info"); // info, success, error, warning

  // ==============================================
  // CARGA INICIAL
  // ==============================================

  useEffect(() => {
    console.log("🚀 [Micro 2] Iniciando microfrontend de Órdenes");
    setProducts(loadInventory());
    setOrders(loadOrders());
  }, []);

  // ==============================================
  // SINCRONIZACIÓN CON OTROS MICROFRONTENDS
  // ==============================================

  useEffect(() => {
    const reload = () => {
      console.log("🔄 [Micro 2] Recargando datos...");
      setProducts(loadInventory());
      setOrders(loadOrders());
    };

    // Cambios desde otras pestañas (storage event)
    const onStorage = (e) => {
      if (e.key === LS_INVENTORY) {
        console.log("📦 [Micro 2] Inventario actualizado (otra pestaña)");
        setProducts(loadInventory());
      }
      if (e.key === LS_ORDERS) {
        console.log("📋 [Micro 2] Órdenes actualizadas (otra pestaña)");
        setOrders(loadOrders());
      }
    };

    // Cambios desde Micro 1 (Inventario)
    const onInventoryUpdated = (e) => {
      console.log("📦 [Micro 2] INVENTORY_UPDATED recibido:", e.detail);
      setTimeout(() => setProducts(loadInventory()), 100);
    };

    // Pago confirmado desde Micro 3 (Ventas)
    const onSalePaid = (e) => {
      const { orderId } = e.detail || {};
      console.log("💳 [Micro 2] SALE_PAID recibido:", orderId);
      
      if (!orderId) return;
      
      setOrders((prev) => {
        const next = prev.map((o) => 
          o.orderId === orderId 
            ? { ...o, status: ORDER_STATUS.COMPLETADA, completedAt: nowISO() } 
            : o
        );
        saveOrders(next);
        return next;
      });
      
      showMessage(`✅ Pago confirmado: Orden ${orderId} COMPLETADA`, "success");
    };

    // Venta cancelada desde Micro 3
    const onSaleCancelled = (e) => {
      const { orderId, reason } = e.detail || {};
      console.log("🚫 [Micro 2] SALE_CANCELLED recibido:", orderId);
      
      if (!orderId) return;
      
      setOrders((prev) => {
        const next = prev.map((o) => 
          o.orderId === orderId 
            ? { 
                ...o, 
                status: ORDER_STATUS.CANCELADA, 
                cancelledAt: nowISO(),
                cancelReason: reason 
              } 
            : o
        );
        saveOrders(next);
        return next;
      });
      
      showMessage(`⚠️ Orden ${orderId} CANCELADA. ${reason || ""}`, "warning");
    };

    // Registrar event listeners
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENTS.INVENTORY_UPDATED, onInventoryUpdated);
    window.addEventListener(EVENTS.SALE_PAID, onSalePaid);
    window.addEventListener(EVENTS.SALE_CANCELLED, onSaleCancelled);

    console.log("✅ [Micro 2] Event listeners configurados");

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENTS.INVENTORY_UPDATED, onInventoryUpdated);
      window.removeEventListener(EVENTS.SALE_PAID, onSalePaid);
      window.removeEventListener(EVENTS.SALE_CANCELLED, onSaleCancelled);
    };
  }, []);

  // ==============================================
  // MENSAJES AUTO-DISMISS
  // ==============================================

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(""), 5000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  // ==============================================
  // CÁLCULOS DERIVADOS
  // ==============================================

  const maxStock = useMemo(() => 
    Math.max(1, ...products.map((p) => p.stock ?? 0)), 
    [products]
  );

  const total = useMemo(() => 
    cart.reduce((acc, item) => acc + item.qty * item.price, 0), 
    [cart]
  );

  const cartItemCount = useMemo(() => 
    cart.reduce((acc, item) => acc + item.qty, 0), 
    [cart]
  );

  // ==============================================
  // FUNCIONES AUXILIARES
  // ==============================================

  function showMessage(text, type = "info") {
    setMsg(text);
    setMsgType(type);
  }

  // ==============================================
  // MANEJO DEL CARRITO
  // ==============================================

  const addToCart = (product) => {
    console.log("🛒 [Micro 2] Agregando al carrito:", product.name);
    setMsg("");
    
    const qty = Number(qtyById[product.id] ?? 1);
    
    // Validaciones
    if (!Number.isFinite(qty) || qty <= 0) {
      return showMessage("⚠️ Cantidad inválida", "warning");
    }

    const existingItem = cart.find((c) => c.productId === product.id);
    const currentQtyInCart = existingItem?.qty || 0;
    const requestedTotal = currentQtyInCart + qty;

    if (requestedTotal > product.stock) {
      return showMessage(
        `⚠️ Stock insuficiente: ${product.name}. Disponible: ${product.stock}, en carrito: ${currentQtyInCart}`,
        "warning"
      );
    }

    // Agregar al carrito
    setCart((prev) => {
      if (existingItem) {
        return prev.map((c) =>
          c.productId === product.id ? { ...c, qty: c.qty + qty } : c
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          qty,
          price: product.price,
        },
      ];
    });

    // Reset cantidad a 1
    setQtyById((prev) => ({ ...prev, [product.id]: 1 }));
    showMessage(`✅ ${product.name} agregado al carrito (${qty} unidades)`, "success");
  };

  const removeItem = (productId) => {
    const item = cart.find(c => c.productId === productId);
    setCart((prev) => prev.filter((x) => x.productId !== productId));
    showMessage(`🗑️ ${item?.name || "Producto"} removido del carrito`, "info");
  };

  const clearCart = () => {
    setCart([]);
    showMessage("🧹 Carrito vaciado", "info");
  };

  const updateCartQty = (productId, newQty) => {
    const qty = Number(newQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      return removeItem(productId);
    }

    const product = products.find(p => p.id === productId);
    if (qty > (product?.stock ?? 0)) {
      return showMessage(`⚠️ Cantidad excede el stock disponible (${product?.stock})`, "warning");
    }

    setCart(prev => 
      prev.map(item => 
        item.productId === productId ? { ...item, qty } : item
      )
    );
  };

  // ==============================================
  // CREACIÓN DE ORDEN
  // ==============================================

  const createOrder = () => {
    console.log("📝 [Micro 2] Creando nueva orden...");
    setMsg("");

    // Validación: carrito vacío
    if (cart.length === 0) {
      return showMessage("⚠️ Agrega productos antes de crear la orden", "warning");
    }

    // Re-validar stock con datos más recientes
    const latestInventory = loadInventory();
    const stockValidation = validateStock(cart, latestInventory);

    if (!stockValidation.ok) {
      const details = stockValidation.missing
        .map((m) => `${m.name}: solicitas ${m.requested}, hay ${m.available}`)
        .join(" • ");
      return showMessage(`❌ Stock insuficiente: ${details}`, "error");
    }

    // Crear orden
    const orderId = makeId("ORD");
    const order = {
      orderId,
      createdAt: nowISO(),
      status: ORDER_STATUS.PENDIENTE_PAGO,
      items: [...cart], // Clonar items
      total,
      message: "Tu orden ha sido tomada. En unos momentos comenzaremos a prepararla.",
    };

    // Guardar orden
    setOrders((prev) => {
      const next = [order, ...prev];
      saveOrders(next);
      return next;
    });

    // Crear payload para la venta (Micro 3)
    const salePayload = {
      saleId: makeId("SALE"),
      orderId,
      total,
      status: ORDER_STATUS.PENDIENTE_PAGO,
      items: [...cart], // Incluir items completos
      createdAt: nowISO(),
    };

    // Emitir evento para Micro 3
    emit(EVENTS.SALE_CREATED, salePayload);

    // Limpiar carrito
    setCart([]);
    setQtyById({});
    
    showMessage(`✅ Orden ${orderId} creada exitosamente. Ir a Ventas para procesar el pago.`, "success");
    console.log("✅ [Micro 2] Orden creada:", order);
  };

  // ==============================================
  // RENDER: ESTADO VACÍO
  // ==============================================

  if (products.length === 0) {
    return (
      <div className="orders-page">
        <div className="shell">
          <div className="topbar">
            <div>
              <h1>⚠️ Sin Inventario</h1>
              <p className="sub">
                No hay inventario cargado. Entra primero al microfrontend de <b>Inventario (Micro 1)</b> para agregar productos.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==============================================
  // RENDER PRINCIPAL
  // ==============================================

  return (
    <div className="orders-page">
      <div className="shell">
        
        {/* TOPBAR */}
        <div className="topbar">
          <div>
            <h1>🛒 Órdenes (Micro 2)</h1>
            <p className="sub">
              Productos desde <code>inventory_db</code> → Orden en <code>orders_db</code> → Emite <code>SALE_CREATED</code>
            </p>
          </div>
          <div className="pill">
            {products.length} productos • {cartItemCount} en carrito
          </div>
        </div>

        {/* MENSAJES */}
        {msg && (
          <div className={`msg msg-${msgType}`}>
            {msg}
          </div>
        )}

        {/* PRODUCTOS DISPONIBLES */}
        <div className="section">
          <h2>📦 Productos Disponibles</h2>
          <div className="grid">
            {products.map((p) => {
              const info = statusInfo(p.stock ?? 0);
              const progress = Math.min(100, Math.round(((p.stock ?? 0) / maxStock) * 100));
              const qty = qtyById[p.id] ?? 1;
              const inCart = cart.find(c => c.productId === p.id);

              return (
                <div className="card" key={p.id}>
                  <div className="card-img">
                    {p.image ? (
                      <img src={p.image} alt={p.name} />
                    ) : (
                      <div style={{ fontSize: 34 }}>📦</div>
                    )}
                  </div>

                  <div className="card-body">
                    <p className="title">
                      <b>{p.name}</b>
                    </p>

                    <div className="meta">
                      <span>ID: {p.id}</span>
                      <span>Precio: {money(p.price)}</span>
                    </div>

                    <span className={`badge ${info.cls}`}>{info.label}</span>

                    <div className="meta" style={{ marginTop: -4 }}>
                      <span className="small">
                        {p.stock} unidades disponibles
                        {inCart && <> • <b>{inCart.qty} en carrito</b></>}
                      </span>
                    </div>

                    <div className="stockbar">
                      <div style={{ width: `${progress}%`, background: info.bar }} />
                    </div>

                    <div className="actions">
                      <input
                        className="qty"
                        type="number"
                        min={1}
                        max={p.stock}
                        value={qty}
                        onChange={(e) =>
                          setQtyById((prev) => ({ ...prev, [p.id]: e.target.value }))
                        }
                        disabled={(p.stock ?? 0) <= 0}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={() => addToCart(p)}
                        disabled={(p.stock ?? 0) <= 0}
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CARRITO Y ÓRDENES */}
        <div className="section">
          <div className="split">
            
            {/* CARRITO */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2>🛒 Carrito</h2>
                {cart.length > 0 && (
                  <button className="btn btn-danger" style={{ fontSize: 12, padding: "4px 8px" }} onClick={clearCart}>
                    Vaciar
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="small">El carrito está vacío. Agrega productos para comenzar.</p>
              ) : (
                <>
                  <div className="list">
                    {cart.map((item) => (
                      <div className="row" key={item.productId}>
                        <div style={{ flex: 1 }}>
                          <strong>{item.name}</strong>
                          <div className="small">
                            <input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => updateCartQty(item.productId, e.target.value)}
                              style={{ width: 50, marginRight: 4 }}
                            />
                            x {money(item.price)} = <b>{money(item.qty * item.price)}</b>
                          </div>
                        </div>
                        <button
                          className="btn btn-danger"
                          onClick={() => removeItem(item.productId)}
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="totalbox">
                    <span>Total</span>
                    <span><b>{money(total)}</b></span>
                  </div>

                  <button
                    className="btn btn-primary"
                    style={{ marginTop: 12, width: "100%" }}
                    onClick={createOrder}
                  >
                    💳 Crear Orden ({cartItemCount} productos)
                  </button>
                </>
              )}
            </div>

            {/* ÓRDENES */}
            <div>
              <h2>📋 Órdenes Recientes</h2>
              {orders.length === 0 ? (
                <p className="small">No hay órdenes aún. Crea tu primera orden.</p>
              ) : (
                <div className="list">
                  {orders.slice(0, 10).map((o) => {
                    const statusEmoji = {
                      [ORDER_STATUS.PENDIENTE_PAGO]: "⏳",
                      [ORDER_STATUS.COMPLETADA]: "✅",
                      [ORDER_STATUS.CANCELADA]: "❌",
                    };

                    return (
                      <div className="row" key={o.orderId} style={{ alignItems: "flex-start" }}>
                        <div>
                          <strong>
                            {statusEmoji[o.status] || "📋"} #{o.orderId}
                          </strong>
                          <div className="small">
                            Estado: <b>{o.status}</b> • Total: <b>{money(o.total)}</b>
                          </div>
                          <div className="small">{o.message}</div>
                          <div className="small" style={{ marginTop: 4, color: "#666" }}>
                            {new Date(o.createdAt).toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}