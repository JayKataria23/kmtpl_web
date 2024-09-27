import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import OrderForm from "./pages/OrderForm";
import OrderFile from "./pages/OrderFile";
import HomePage from "./pages/HomePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/order-form" element={<OrderForm />} />
        <Route path="/order-file" element={<OrderFile />} />
      </Routes>
    </Router>
  </StrictMode>
);
