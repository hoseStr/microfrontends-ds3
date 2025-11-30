import React from "react";
import SalesList from "./components/SalesList.jsx";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          maxWidth: '600px',
          margin: '50px auto',
          textAlign: 'center',
          background: 'white',
          borderRadius: '15px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          <span style={{fontSize: '4rem'}}>⚠️</span>
          <h2 style={{color: '#e53e3e', marginTop: '20px'}}>
            Error al cargar el módulo de ventas
          </h2>
          <p style={{color: '#718096', marginTop: '10px'}}>
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              background: '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Recargar página
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <SalesList />
    </ErrorBoundary>
  );
}