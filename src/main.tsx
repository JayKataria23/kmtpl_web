import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import OrderForm from "./pages/OrderForm";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <OrderForm />
  </StrictMode>
);
