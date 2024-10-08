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
import {
  AuthenticateWithRedirectCallback,
  ClerkProvider,
} from "@clerk/clerk-react";
import ProtectedRoute from "./pages/ProtectedRoute";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import OrderPreviewPage from "./pages/OrderPreviewPage";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Publishable Key");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/order-form"
            element={
              <ProtectedRoute>
                <OrderForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-preview/:orderId"
            element={<OrderPreviewPage />}
          />
          <Route
            path="/order-file"
            element={
              <ProtectedRoute>
                <OrderFile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/party-file"
            element={
              <ProtectedRoute>
                <PartyFile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/party-profiles"
            element={
              <ProtectedRoute>
                <PartyProfilePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/broker-transport"
            element={
              <ProtectedRoute>
                <BrokerTransportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-list"
            element={
              <ProtectedRoute>
                <OrderList />
              </ProtectedRoute>
            }
          />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />
          <Route
            path="/sign-in/sso-callback"
            element={<AuthenticateWithRedirectCallback />}
          />
        </Routes>
      </Router>
    </ClerkProvider>
  </StrictMode>
);
