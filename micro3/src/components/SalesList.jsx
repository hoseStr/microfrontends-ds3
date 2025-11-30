import React, { useState, useEffect } from "react";
import { salesService } from "../services/salesService.js";
import "./SalesList.css";

const EVENTS = {
  SALE_CREATED: "SALE_CREATED",
  SALE_PAID: "SALE_PAID",
  SALE_CANCELLED: "SALE_CANCELLED",
};

const SalesList = () => {
  const [sales, setSales] = useState([]);
  const [msg, setMsg] = useState(null);

  const refreshSales = () => {
    console.log("🔄 Refrescando ventas...");
    const allSales = salesService.getAll();
    console.log("📊 Ventas cargadas:", allSales.length);
    setSales(allSales);
  };

  // 🔥 SOLUCIÓN: Revisar orders_db directamente
  const syncOrdersToSales = () => {
    try {
      console.log("🔄 Sincronizando órdenes con ventas...");
      
      // Leer órdenes desde orders_db (creadas por Micro 2)
      const ordersRaw = localStorage.getItem('orders_db');
      if (!ordersRaw) {
        console.log("📭 No hay órdenes en orders_db");
        return;
      }
      
      const orders = JSON.parse(ordersRaw);
      console.log(`📦 Órdenes encontradas: ${orders.length}`);
      
      // Obtener ventas existentes
      const existingSales = salesService.getAll();
      const existingOrderIds = new Set(existingSales.map(s => s.orderId));
      
      // Filtrar órdenes que NO tienen venta asociada
      const newOrders = orders.filter(order => !existingOrderIds.has(order.orderId));
      
      if (newOrders.length === 0) {
        console.log("✅ Todas las órdenes ya tienen ventas asociadas");
        return;
      }
      
      console.log(`📥 Procesando ${newOrders.length} órdenes nuevas...`);
      
      // Crear ventas para cada orden nueva
      let created = 0;
      newOrders.forEach(order => {
        try {
          // Construir payload compatible con salesService
          const salePayload = {
            saleId: `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            orderId: order.orderId,
            total: order.total,
            status: order.status || "PENDIENTE_PAGO",
            items: order.items || [],
            createdAt: order.createdAt || new Date().toISOString(),
          };
          
          const newSale = salesService.createFromOrder(salePayload);
          if (newSale) {
            console.log(`✅ Venta creada para orden: ${order.orderId}`);
            created++;
          }
        } catch (error) {
          console.error(`❌ Error creando venta para ${order.orderId}:`, error);
        }
      });
      
      if (created > 0) {
        setMsg({ 
          type: "success", 
          text: `✅ ${created} nueva(s) venta(s) sincronizada(s) desde Órdenes` 
        });
        refreshSales();
      }
      
    } catch (error) {
      console.error("❌ Error en syncOrdersToSales:", error);
    }
  };

  useEffect(() => {
    console.log("🚀 [Micro 3] Iniciando componente SalesList");
    
    // Cargar ventas existentes
    refreshSales();
    
    // Sincronizar al inicio
    syncOrdersToSales();

    // 🔥 Polling cada 2 segundos para sincronizar automáticamente
    const pollingInterval = setInterval(() => {
      syncOrdersToSales();
    }, 2000);

    // Listener para cambios en LA MISMA pestaña/puerto
    const handleSalesUpdated = (e) => {
      console.log("✅ SALES_DB_UPDATED recibido:", e.detail);
      refreshSales();
    };

    // Listener para SALE_CREATED (solo funciona en mismo puerto)
    const handleSaleCreated = (event) => {
      try {
        const payload = event.detail;
        console.log("📥 SALE_CREATED recibido:", payload);
        
        if (!payload || !payload.orderId) {
          console.error("❌ Payload inválido:", payload);
          return;
        }

        const newSale = salesService.createFromOrder(payload);

        if (newSale) {
          console.log("✅ Venta creada:", newSale);
          setMsg({ 
            type: "success", 
            text: `✅ Nueva Venta (${payload.orderId}) registrada.` 
          });
        }
        
      } catch (err) {
        console.error("❌ Error al procesar SALE_CREATED:", err);
      }
    };

    window.addEventListener("SALES_DB_UPDATED", handleSalesUpdated);
    window.addEventListener(EVENTS.SALE_CREATED, handleSaleCreated);

    console.log("✅ Event listeners configurados + Polling activo cada 2s");

    return () => {
      window.removeEventListener("SALES_DB_UPDATED", handleSalesUpdated);
      window.removeEventListener(EVENTS.SALE_CREATED, handleSaleCreated);
      clearInterval(pollingInterval);
      console.log("🧹 Event listeners y polling removidos");
    };
  }, []);

  useEffect(() => {
    if (msg) {
      const timer = setTimeout(() => setMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const handlePaySale = (saleId) => {
    try {
      console.log("💳 Procesando pago para:", saleId);
      const paidSale = salesService.processPayment(saleId);
      
      window.dispatchEvent(
        new CustomEvent(EVENTS.SALE_PAID, {
          detail: {
            saleId: paidSale.id,
            orderId: paidSale.orderId,
            products: paidSale.products,
          },
        })
      );
      
      setMsg({ type: "success", text: "✅ Pago exitoso. Stock descontado." });

    } catch (err) {
      console.error("❌ Error al pagar:", err);
      setMsg({ 
        type: "error", 
        text: `❌ ${err.message}` 
      });
    }
  };

  const handleCancelSale = (saleId) => {
    try {
      console.log("🚫 Cancelando venta:", saleId);
      const cancelledSale = salesService.cancelSale(saleId);
      
      window.dispatchEvent(
        new CustomEvent(EVENTS.SALE_CANCELLED, {
          detail: {
            saleId: cancelledSale.id,
            orderId: cancelledSale.orderId,
            reason: "Cancelada por usuario",
          },
        })
      );
      
      setMsg({ type: "info", text: "⚠️ Venta cancelada." });
      
    } catch (err) {
      console.error("❌ Error al cancelar:", err);
      setMsg({ type: "error", text: `❌ ${err.message}` });
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case "PENDIENTE_PAGO": 
        return { label: "⏳ Pendiente de Pago", color: "#d69e2e", bg: "#fefcbf" };
      case "PAGADA": 
        return { label: "✅ Pagada", color: "#38a169", bg: "#c6f6d5" };
      case "CANCELADA": 
        return { label: "❌ Cancelada", color: "#e53e3e", bg: "#fed7d7" };
      default: 
        return { label: status, color: "gray", bg: "#edf2f7" };
    }
  };

  return (
    <div className="sales-container">
      <header className="sales-header">
        <h2 className="sales-title">💰 Micro 3: Gestión de Ventas</h2>
        <div className="sales-stats">
          <span>Total Ventas: {sales.length}</span>
          <span>Recaudado: ${sales.filter(s=>s.status === 'PAGADA').reduce((a,b)=>a+b.total,0).toLocaleString()}</span>
        </div>
      </header>

      {msg && (
        <div className={`sales-msg sales-msg-${msg.type}`}>
          {msg.text}
        </div>
      )}

      {sales.length === 0 ? (
        <div className="sales-empty">
          <p>📭 No hay ventas registradas</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px', color: '#9ca3af' }}>
            Crea una orden para visualizarlas aqui
          </p>
        </div>
      ) : (
        <div className="sales-grid">
          {sales.map((sale) => {
            const info = getStatusInfo(sale.status);
            
            return (
              <div key={sale.id} className="sales-card">
                <div className="sales-card-header">
                  <span className="sales-id">
                    Venta: {sale.id?.split('-')[1] || sale.id}
                  </span>
                  <span 
                    className="sales-badge" 
                    style={{ backgroundColor: info.bg, color: info.color }}
                  >
                    {info.label}
                  </span>
                </div>
                
                <div className="sales-card-body">
                  <p className="sales-order-info">
                    Orden Asociada: <b>{sale.orderId}</b>
                  </p>
                  
                  <div className="sales-products-list">
                    {sale.products && sale.products.length > 0 ? (
                      sale.products.map((p, i) => (
                        <div key={i} className="sales-product-row">
                          <span>{p.qty}x {p.name}</span>
                          <span>${((p.price || 0) * (p.qty || 0)).toLocaleString()}</span>
                        </div>
                      ))
                    ) : (
                      <div className="sales-product-row">
                        <span>⚠️ Sin productos</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="sales-total-row">
                    <span>Total</span>
                    <span>${(sale.total || 0).toLocaleString()}</span>
                  </div>
                </div>

                {sale.status === "PENDIENTE_PAGO" && (
                  <div className="sales-actions">
                    <button 
                      onClick={() => handlePaySale(sale.id)}
                      className="sales-btn-pay"
                    >
                      💳 Pagar
                    </button>
                    <button 
                      onClick={() => handleCancelSale(sale.id)}
                      className="sales-btn-cancel"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
                
                {sale.status === "PAGADA" && sale.paidAt && (
                   <p className="sales-date-info">
                     Pagado el: {new Date(sale.paidAt).toLocaleString('es-CO')}
                   </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SalesList;