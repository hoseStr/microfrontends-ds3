import React from "react";
import InventoryList from "./components/InventoryList";
import "./App.css"
import ProductSelector from "./components/ProductSelector";

export default function App() {
  return (
    <div style={{ padding: 20 }}>
      <InventoryList/>
    </div>
  );
}
