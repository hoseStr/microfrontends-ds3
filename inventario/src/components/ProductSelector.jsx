import React, { useState, useEffect } from 'react';
import { PRODUCTS_DB } from '../data/products';

const ProductSelector = ({ onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [products, setProducts] = useState(PRODUCTS_DB);

  // Cargamos stock real del localStorage para mostrar disponibilidad real en el selector
  useEffect(() => {
    const stored = localStorage.getItem('inventory_db');
    if (stored) setProducts(JSON.parse(stored));
  }, []);

  const handleSelect = (product) => {
    if (product.stock === 0) return; // No dejar seleccionar agotados
    setSelected(product);
    setIsOpen(false);
    if (onSelect) onSelect(product);
  };

  return (
    <div style={styles.wrapper}>
      <label style={styles.label}>Producto:</label>
      
      {/* Caja Principal (Lo que se ve cerrado) */}
      <div 
        style={styles.trigger} 
        onClick={() => setIsOpen(!isOpen)}
      >
        {selected ? (
          <div style={styles.selectedItem}>
            <img src={selected.image} alt="" style={styles.thumb} />
            <span style={{flex: 1}}>{selected.name}</span>
            <span style={styles.priceTag}>${selected.price}</span>
          </div>
        ) : (
          <span style={{color: '#a0aec0'}}>-- Selecciona un producto --</span>
        )}
        <span style={{marginLeft: '10px', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)'}}>▼</span>
      </div>

      {/* Lista Desplegable (Lo que se ve abierto) */}
      {isOpen && (
        <div style={styles.dropdown}>
          {products.map((p) => (
            <div 
              key={p.id} 
              onClick={() => handleSelect(p)}
              style={{
                ...styles.option,
                opacity: p.stock === 0 ? 0.5 : 1,
                cursor: p.stock === 0 ? 'not-allowed' : 'pointer'
              }}
              onMouseEnter={(e) => {
                if(p.stock > 0) e.currentTarget.style.background = '#f7fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
              }}
            >
              <img src={p.image} alt="" style={styles.optionThumb} />
              <div style={styles.optionDetails}>
                <div style={styles.optionName}>{p.name}</div>
                <div style={styles.optionMeta}>
                    ID: {p.id} • Stock: 
                    <span style={{
                        color: p.stock < 5 ? '#e53e3e' : '#48bb78', 
                        fontWeight: 'bold', 
                        marginLeft: '4px'
                    }}>
                        {p.stock === 0 ? 'AGOTADO' : p.stock}
                    </span>
                </div>
              </div>
              <div style={styles.optionPrice}>${p.price}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const styles = {
  wrapper: {
    position: 'relative',
    marginBottom: '15px',
    fontFamily: 'Segoe UI, sans-serif'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#4a5568',
    fontSize: '0.9rem'
  },
  trigger: {
    background: 'white',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: 'white',
    borderRadius: '12px',
    marginTop: '8px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid #edf2f7'
  },
  selectedItem: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    gap: '10px'
  },
  thumb: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    objectFit: 'cover'
  },
  priceTag: {
    background: '#ebf8ff',
    color: '#3182ce',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '0.9rem'
  },
  option: {
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    borderBottom: '1px solid #edf2f7',
    transition: 'background 0.2s'
  },
  optionThumb: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    objectFit: 'cover',
    marginRight: '12px'
  },
  optionDetails: {
    flex: 1
  },
  optionName: {
    fontWeight: '600',
    color: '#2d3748',
    fontSize: '0.95rem'
  },
  optionMeta: {
    fontSize: '0.8rem',
    color: '#718096',
    marginTop: '2px'
  },
  optionPrice: {
    fontWeight: 'bold',
    color: '#667eea'
  }
};

export default ProductSelector;