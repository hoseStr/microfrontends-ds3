const money = (n) => `$${Number(n).toLocaleString("es-CO")}`;

export default function OrdersList({ orders }) {
  return (
    <>
      <h3>Órdenes</h3>
      {orders.length === 0 ? (
        <p>No hay órdenes aún.</p>
      ) : (
        <ul>
          {orders.map((o) => (
            <li key={o.orderId} style={{ marginBottom: 10 }}>
              <b>#{o.orderId}</b> — {o.status} — Total: {money(o.total)}
              <div style={{ opacity: 0.8 }}>{o.message}</div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
