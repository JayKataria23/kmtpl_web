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
import BhiwandiList from "./pages/BhiwandiList"; // Import the new page
import {
  AuthenticateWithRedirectCallback,
  ClerkProvider,
} from "@clerk/clerk-react";
import ProtectedRoute from "./pages/ProtectedRoute";
import SignInPage from "./pages/sign-in";
import SignUpPage from "./pages/sign-up";
import OrderPreviewPage from "./pages/OrderPreviewPage";
import BhiwandiListPrint from "./pages/BhiwandiListPrint";
import DispatchList from "./pages/DispatchList";
import CreateChallan from "./pages/CreateChallan";
import ChallanView from "./pages/ChallanView";
import ChallanList from "./pages/ChallanList";
import EditChallan from "./pages/EditChallan";
import FastOrderForm from "./pages/FastOrderForm";
import PartyDispatchList from "./pages/PartyDispatchList";
import PartOrderFile from "./pages/PartOrderFile";
import DyeingBook from "./pages/DyeingBook";
import SalesRegister from "./pages/SalesRegister";

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
            path="/fast-order-form"
            element={
              <ProtectedRoute>
                <FastOrderForm />
              </ProtectedRoute>
            }
          />
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
          <Route path="/challan-view/:challanId" element={<ChallanView />} />
          <Route path="/sales-register" element={<SalesRegister />} />
          <Route path="/challan-edit/:challanId" element={<EditChallan />} />
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
            path="/part-order-file"
            element={
              <ProtectedRoute>
                <PartOrderFile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dyeing-book"
            element={
              <ProtectedRoute>
                <DyeingBook />
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
            path="/challan-list"
            element={
              <ProtectedRoute>
                <ChallanList />
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
          <Route
            path="/bhiwandi-list" // Add the new route
            element={
              <ProtectedRoute>
                <BhiwandiList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatch-list" // Add the new route
            element={
              <ProtectedRoute>
                <DispatchList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/party-dispatch-list" // Add the new route
            element={
              <ProtectedRoute>
                <PartyDispatchList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-challan" // Add the new route
            element={
              <ProtectedRoute>
                <CreateChallan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bhiwandi-list-print/:date"
            element={<BhiwandiListPrint />}
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
