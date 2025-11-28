import React, { useState, useEffect } from 'react';
import { PRODUCTS_DB } from '../data/products';

const InventoryList = () => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    // 1. Cargar inventario
    const loadInventory = () => {
      const storedData = localStorage.getItem('inventory_db');
      if (storedData) {
        setProducts(JSON.parse(storedData));
      } else {
        setProducts(PRODUCTS_DB);
        localStorage.setItem('inventory_db', JSON.stringify(PRODUCTS_DB));
      }
    };

    loadInventory();
    window.addEventListener('storage', loadInventory);
    
    // Simular delay visual al pagar
    const handleSalePaid = () => setTimeout(loadInventory, 200);
    window.addEventListener('SALE_PAID', handleSalePaid);

    return () => {
      window.removeEventListener('storage', loadInventory);
      window.removeEventListener('SALE_PAID', handleSalePaid);
    };
  }, []);

  const getStockStatus = (stock) => {
    if (stock === 0) return { label: '⛔ AGOTADO', color: '#e53e3e', bg: '#fff5f5', border: '#feb2b2' };
    if (stock < 10) return { label: '⚠️ BAJO STOCK', color: '#d69e2e', bg: '#fffff0', border: '#fefcbf' };
    return { label: '✅ DISPONIBLE', color: '#38a169', bg: '#f0fff4', border: '#9ae6b4' };
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <span style={{fontSize: '2rem'}}>📦</span>
            <div>
                <h2 style={styles.title}>Stock Disponible</h2>
            </div>
        </div>
        <span style={styles.mainBadge}>{products.length} Productos</span>
      </header>
      
      <div style={styles.grid}>
        {products.map((p) => {
          const status = getStockStatus(p.stock);
          
          return (
            <div key={p.id} style={styles.card} className="product-card">
              {/* Imagen */}
              <div style={styles.imageContainer}>
                <img src={p.image} alt={p.name} style={styles.image} />
                <div style={styles.priceTag}>${p.price}</div>
              </div>

              {/* Cuerpo de la tarjeta */}
              <div style={styles.details}>
                <div style={styles.headerRow}>
                    <h3 style={styles.productName}>{p.name}</h3>
                    <span style={styles.id}>ID: {p.id}</span>
                </div>

                <div style={styles.statusContainer}>
                    <span style={styles.statusBadge(status)}>
                        {status.label}
                    </span>
                    <span style={{fontSize: '0.9rem', color: '#4a5568', fontWeight: '600'}}>
                        {p.stock} unid.
                    </span>
                </div>
                
                {/* Barra de progreso */}
                <div style={styles.progressBarBg}>
                  <div style={styles.progressBarFill(p.stock, status.color)} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '40px',
    maxWidth: '1200px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    background: 'white',
    padding: '20px 30px',
    borderRadius: '15px',
    boxShadow: 'var(--card-shadow)',
  },
  title: {
    margin: 0,
    background: 'var(--primary-gradient)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontSize: '1.8rem',
    fontWeight: 'bold',
  },
  badge: {
    background: '#edf2f7',
    color: 'var(--text-dark)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontWeight: '600',
    fontSize: '0.9rem',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '30px',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: 'var(--card-shadow)',
    transition: 'var(--transition)',
    cursor: 'default',
    position: 'relative',
  },
  imageContainer: {
    height: '180px',
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  stockBadge: (stock) => ({
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: stock < 5 ? 'rgba(231, 76, 60, 0.9)' : 'rgba(255, 255, 255, 0.9)',
    color: stock < 5 ? 'white' : '#333',
    padding: '5px 12px',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    backdropFilter: 'blur(5px)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  }),
  details: {
    padding: '20px',
  },
  productName: {
    margin: '0 0 10px 0',
    fontSize: '1.1rem',
    color: 'var(--text-dark)',
  },
  meta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  id: {
    fontSize: '0.85rem',
    color: 'var(--text-light)',
  },
  price: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#667eea',
  },
  statusContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
    marginTop: '15px'
  },
  statusBadge: (status) => ({
    backgroundColor: status.bg,
    color: status.color,
    border: `1px solid ${status.border}`,
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '0.75rem',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
    textTransform: 'uppercase'
  }),
  progressBarBg: {
    height: '8px',
    background: '#edf2f7',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: (stock, color) => ({
    height: '100%',
    width: `${Math.min((stock / 20) * 100, 100)}%`, 
    background: color,
    borderRadius: '4px',
    transition: 'width 0.5s ease',
  }),
};

export default InventoryList;