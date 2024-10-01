import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import OrderForm from "./pages/OrderForm";
import OrderFile from "./pages/OrderFile";
import HomePage from "./pages/HomePage";
import PartyFile from "./pages/PartyFile";
import PartyProfilePage from "./pages/PartyProfilePage";
import BrokerTransportPage from "./pages/BrokerTransportPage";
import OrderList from "./pages/OrderList";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/order-form" element={<OrderForm />} />
        <Route path="/order-file" element={<OrderFile />} />
        <Route path="/party-file" element={<PartyFile />} />
        <Route path="/party-profiles" element={<PartyProfilePage />} />
        <Route path="/broker-transport" element={<BrokerTransportPage />} />
        <Route path="/order-list" element={<OrderList />} />
        <Route path="/order-form/:orderId" element={<OrderForm />} />
      </Routes>
    </Router>
  </StrictMode>
);
