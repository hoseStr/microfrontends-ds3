import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const LS_INVENTORY = "inventory_db";
const LS_ORDERS = "orders_db";

const nowISO = () => new Date().toISOString();
const makeId = (p) => `${p}-${Date.now()}`;
const money = (n) => `$${Number(n).toLocaleString("es-CO")}`;

function loadInventory() {
  const raw = localStorage.getItem(LS_INVENTORY);
  return raw ? JSON.parse(raw) : [];
}

function loadOrders() {
  const raw = localStorage.getItem(LS_ORDERS);
  return raw ? JSON.parse(raw) : [];
}

function saveOrders(orders) {
  localStorage.setItem(LS_ORDERS, JSON.stringify(orders));
}

function statusInfo(stock) {
  if (stock <= 0) return { label: "AGOTADO", cls: "red", bar: "rgba(239,68,68,.85)" };
  if (stock <= 5) return { label: "BAJO STOCK", cls: "amber", bar: "rgba(245,158,11,.85)" };
  return { label: "DISPONIBLE", cls: "green", bar: "rgba(22,163,74,.85)" };
}

export default function App() {
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);

  // qty por producto (para cada card)
  const [qtyById, setQtyById] = useState({});
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setProducts(loadInventory());
    setOrders(loadOrders());
  }, []);

  // refrescar cuando inventario cambie (por eventos o por storage)
  useEffect(() => {
    const reload = () => {
      setProducts(loadInventory());
      setOrders(loadOrders());
    };

    const onStorage = (e) => {
      if (e.key === LS_INVENTORY || e.key === LS_ORDERS) reload();
    };

    const onSalePaid = () => setTimeout(reload, 200);

    window.addEventListener("storage", onStorage);
    window.addEventListener("SALE_PAID", onSalePaid);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("SALE_PAID", onSalePaid);
    };
  }, []);

  // escuchar eventos de ventas
  useEffect(() => {
    const onPaid = (e) => {
      const { orderId } = e.detail || {};
      if (!orderId) return;
      setOrders((prev) => {
        const next = prev.map((o) => (o.orderId === orderId ? { ...o, status: "COMPLETADA" } : o));
        saveOrders(next);
        return next;
      });
      setMsg(`✅ Pago confirmado: Orden ${orderId} COMPLETADA.`);
    };

    const onCancelled = (e) => {
      const { orderId, reason } = e.detail || {};
      if (!orderId) return;
      setOrders((prev) => {
        const next = prev.map((o) => (o.orderId === orderId ? { ...o, status: "CANCELADA" } : o));
        saveOrders(next);
        return next;
      });
      setMsg(`⚠️ Venta cancelada: Orden ${orderId} CANCELADA. ${reason || ""}`.trim());
    };

    window.addEventListener("SALE_PAID", onPaid);
    window.addEventListener("SALE_CANCELLED", onCancelled);
    return () => {
      window.removeEventListener("SALE_PAID", onPaid);
      window.removeEventListener("SALE_CANCELLED", onCancelled);
    };
  }, []);

  const maxStock = useMemo(() => Math.max(1, ...products.map((p) => p.stock ?? 0)), [products]);

  const total = useMemo(() => cart.reduce((acc, it) => acc + it.qty * it.price, 0), [cart]);

  if (products.length === 0) {
    return (
      <div className="orders-page">
        <div className="shell">
          <div className="topbar">
            <div>
              <h1>Órdenes (micro2)</h1>
              <p className="sub">
                No hay inventario cargado. Entra primero al microfrontend de <b>Inventario</b>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const addToCart = (p) => {
    setMsg("");
    const q = Number(qtyById[p.id] ?? 1);
    if (!Number.isFinite(q) || q <= 0) return setMsg("Cantidad inválida.");

    const already = cart.find((c) => c.productId === p.id);
    const requested = (already?.qty || 0) + q;

    if (requested > p.stock) {
      return setMsg(`Stock insuficiente: ${p.name}. Disponible: ${p.stock}.`);
    }

    setCart((prev) => {
      if (already) {
        return prev.map((c) => (c.productId === p.id ? { ...c, qty: c.qty + q } : c));
      }
      return [...prev, { productId: p.id, name: p.name, qty: q, price: p.price }];
    });

    setQtyById((prev) => ({ ...prev, [p.id]: 1 }));
  };

  const removeItem = (productId) => setCart((prev) => prev.filter((x) => x.productId !== productId));

  const createOrder = () => {
    setMsg("");
    if (cart.length === 0) return setMsg("Agrega productos antes de crear la orden.");

    // re-validar stock con lo último del storage
    const latestInv = loadInventory();
    const missing = cart
      .map((it) => {
        const p = latestInv.find((x) => x.id === it.productId);
        const available = p?.stock ?? 0;
        return it.qty > available ? { ...it, available } : null;
      })
      .filter(Boolean);

    if (missing.length) {
      return setMsg(
        "No hay stock suficiente: " +
          missing.map((m) => `${m.name} (solicitas ${m.qty}, hay ${m.available})`).join(" • ")
      );
    }

    const orderId = makeId("ORD");
    const order = {
      orderId,
      createdAt: nowISO(),
      status: "PENDIENTE_PAGO",
      items: cart,
      total,
      message: "Tu orden ha sido tomada. En unos momentos comenzaremos a prepararla.",
    };

    setOrders((prev) => {
      const next = [...prev, order];
      saveOrders(next);
      return next;
    });

    // evento para ventas
    const sale = {
      saleId: makeId("SALE"),
      orderId,
      total,
      status: "PENDIENTE_PAGO",
      createdAt: nowISO(),
    };
    window.dispatchEvent(new CustomEvent("SALE_CREATED", { detail: sale }));

    setCart([]);
    setMsg(`✅ Orden ${orderId} creada. Ventas debe procesar el pago.`);
  };

  return (
    <div className="orders-page">
      <div className="shell">
        <div className="topbar">
          <div>
            <h1>Ordenes</h1>
            <p className="sub">
              Productos vienen de <code>inventory_db</code>, la orden queda en <code>orders_db</code>, y emitimos{" "}
              <code>SALE_CREATED</code>.
            </p>
          </div>
          <div className="pill">{products.length} productos</div>
        </div>

        {msg ? <div className="msg">{msg}</div> : null}

        <div className="section">
          <h2>Productos</h2>
          <div className="grid">
            {products.map((p) => {
              const info = statusInfo(p.stock ?? 0);
              const progress = Math.min(100, Math.round(((p.stock ?? 0) / maxStock) * 100));
              const q = qtyById[p.id] ?? 1;

              return (
                <div className="card" key={p.id}>
                  <div className="card-img">
                    {p.image ? <img src={p.image} alt={p.name} /> : <div style={{ fontSize: 34 }}>📦</div>}
                  </div>

                  <div className="card-body">
                    <p className="title"><b>{p.name}</b></p>

                    <div className="meta">
                      <span>ID: {p.id}</span>
                      <span>Precio: {money(p.price)}</span>
                    </div>

                    <span className={`badge ${info.cls}`}>{info.label}</span>

                    <div className="meta" style={{ marginTop: -4 }}>
                      <span className="small">{p.stock} unidades</span>
                    </div>

                    <div className="stockbar">
                      <div style={{ width: `${progress}%`, background: info.bar }} />
                    </div>

                    <div className="actions">
                      <input
                        className="qty"
                        type="number"
                        min={1}
                        value={q}
                        onChange={(e) => setQtyById((prev) => ({ ...prev, [p.id]: e.target.value }))}
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

        <div className="section">
          <div className="split">
            <div>
              <h2>Carrito</h2>
              {cart.length === 0 ? (
                <p className="small">No hay productos en el carrito.</p>
              ) : (
                <>
                  <div className="list">
                    {cart.map((it) => (
                      <div className="row" key={it.productId}>
                        <div>
                          <strong>{it.name}</strong>
                          <div className="small">
                            {it.qty} x {money(it.price)} = <b>{money(it.qty * it.price)}</b>
                          </div>
                        </div>
                        <button className="btn btn-danger" onClick={() => removeItem(it.productId)}>
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="totalbox">
                    <span>Total</span>
                    <span>{money(total)}</span>
                  </div>

                  <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={createOrder}>
                    Crear orden (validar stock)
                  </button>
                </>
              )}
            </div>

            <div>
              <h2>Órdenes</h2>
              {orders.length === 0 ? (
                <p className="small">No hay órdenes aún.</p>
              ) : (
                <div className="list">
                  {orders
                    .slice()
                    .reverse()
                    .map((o) => (
                      <div className="row" key={o.orderId} style={{ alignItems: "flex-start" }}>
                        <div>
                          <strong>#{o.orderId}</strong>
                          <div className="small">
                            Estado: <b>{o.status}</b> • Total: <b>{money(o.total)}</b>
                          </div>
                          <div className="small">{o.message}</div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
