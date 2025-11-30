const money = (n) => `$${Number(n).toLocaleString("es-CO")}`;

export default function Cart({ cart, total, onRemove, onCreateOrder }) {
  return (
    <>
      <h3>Carrito</h3>
      {cart.length === 0 ? (
        <p>No hay productos.</p>
      ) : (
        <>
          <ul>
            {cart.map((it) => (
              <li key={it.productId}>
                {it.name} — {it.qty} x {money(it.price)} = <b>{money(it.qty * it.price)}</b>{" "}
                <button onClick={() => onRemove(it.productId)}>Quitar</button>
              </li>
            ))}
          </ul>

          <div><b>Total: {money(total)}</b></div>
          <button onClick={onCreateOrder} style={{ marginTop: 8 }}>
            Crear orden (validar stock)
          </button>
        </>
      )}
    </>
  );
}
