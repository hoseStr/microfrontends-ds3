# Microfrontend: Inventario

Este módulo es el "dueño de la verdad" sobre los productos y el stock. Se encarga de mostrar el catálogo al administrador y proveer componentes de selección a otros microfrontends.

---

## 1. Exposes del MFE

Si necesitas usar elemento del inventario en tu microfrontend, configura el `webpack.config.js` para consumir `inventarioRemote`.

### A. `<ProductSelector />`
Un componente visual tipo *Dropdown* con buscador, imágenes y validación de stock.
*   **Quién lo usa:** MFE Órdenes.
*   **Uso:**
    ```jsx
    // Importación (con lazy loading)
    const ProductSelector = lazy(() => import('inventarioRemote/ProductSelector'));

    // Renderizado
    <ProductSelector 
      onSelect={(product) => {
         console.log("Producto seleccionado:", product);
         // product = { id, name, price, stock, image }
      }} 
    />
    ```

### B. `<InventoryList />`
La vista completa de administración de stock (Grid con tarjetas).
*   **Quién lo usa:** Shell (para la pestaña "Inventario").

---

## 2. Comunicación (Eventos)

Este microfrontend **escucha** eventos globales del navegador para mantener el stock actualizado sin acoplamiento directo.

### Evento que RECIBE (Input)
**Nombre:** `SALE_PAID`
**Descripción:** Inventario escucha este evento para descontar stock permanentemente. Lo debe disparar **Ventas** cuando el usuario paga.

**Payload esperado (`event.detail`):**
```javascript
{
  productId: 1, // ID del producto (Integer)
  quantity: 2   // Cantidad a restar (Integer)
}
```

**Ejemplo de cómo dispararlo:**
```javascript
const event = new CustomEvent('SALE_PAID', {
  detail: { productId: 1, quantity: 2 }
});
window.dispatchEvent(event);
```

---

## 3. Persistencia de Datos
Este MFE utiliza `localStorage` para simular una base de datos persistente compartida.
*   **Key:** `inventory_db`
*   **Comportamiento:**
    *   Si **Ventas** modifica este localStorage directamente, Inventario se actualiza automáticamente gracias al evento `window.addEventListener('storage', ...)`.

---

## 4. Modelo de Datos (Producto)
Cuando el `<ProductSelector>` devuelve un objeto, tiene esta estructura:

```json
{
  "id": 1,
  "name": "Laptop Gamer Legion",
  "price": 1250,
  "stock": 10,
  "image": "https://url-de-la-imagen..."
}
```