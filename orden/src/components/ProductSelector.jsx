export default function ProductSelector({
  products,
  selectedId,
  onChangeSelectedId,
  qty,
  onChangeQty,
  onAdd,
}) {
  return (
    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
      <div>
        <div>Producto</div>
        <select value={selectedId} onChange={(e) => onChangeSelectedId(e.target.value)}>
          <option value="">-- seleccionar --</option>
          {products.map((p) => (
            <option key={p.id} value={p.id} disabled={p.stock === 0}>
              {p.name} (stock: {p.stock})
            </option>
          ))}
        </select>
      </div>

      <div>
        <div>Cantidad</div>
        <input type="number" min={1} value={qty} onChange={(e) => onChangeQty(e.target.value)} />
      </div>

      <button onClick={onAdd}>Agregar</button>
    </div>
  );
}
