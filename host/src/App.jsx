import React, { Suspense, lazy, useState } from "react";
import "./App.css";

const Micro1 = lazy(() => import("micro1/App"));
const Micro2 = lazy(() => import("micro2/App"));
const Micro3 = lazy(() => import("micro3/App"));

function App() {
  const [activeRoute, setActiveRoute] = useState("home");

  const routes = [
    { id: "home", name: "Home", component: null },
    { id: "micro1", name: "Inventario", component: Micro1 },
    { id: "micro2", name: "Orden", component: Micro2 },
    { id: "micro3", name: "Ventas", component: Micro3 },
  ];

  const activeRouteData = routes.find((r) => r.id === activeRoute);
  const ActiveComponent = activeRouteData?.component;

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-content">
          <h1 className="header-title">
            Ventas con Microfrontends
          </h1>
          
          <nav className="nav">
            {routes.map((route) => (
              <button
                key={route.id}
                onClick={() => setActiveRoute(route.id)}
                className={`nav-button ${activeRoute === route.id ? "active" : ""}`}
              >
                {route.name}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="main-content">
        {activeRoute === "home" ? (
          <div className="home-container">
            <h2 className="home-title">
              Bienvenido a Ventas con Microfrontends
            </h2>
            <p className="home-description">
              Este proyecto demuestra la arquitectura de microfrontends usando <strong>Webpack Module Federation</strong>.
            </p>
            
            <div className="cards-grid">
              {routes.slice(1).map((route) => (
                <div
                  key={route.id}
                  className="micro-card"
                  onClick={() => setActiveRoute(route.id)}
                >
                  <h3>{route.name}</h3>
                  <p>Click para explorar este microservicio</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="loading-container">
                <div className="loading-spinner" />
                <p className="loading-text">
                  Cargando {activeRouteData?.name}...
                </p>
              </div>
            }
          >
            <div key={activeRoute} className="micro-content">
              {ActiveComponent && <ActiveComponent />}
            </div>
          </Suspense>
        )}
      </main>

      <footer className="footer">
        <p className="footer-text">
          Desarollo de Software III - Grupo 4
        </p>
      </footer>
    </div>
  );
}

export default App;