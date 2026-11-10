import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { DEFAULT_SELLER_SLUG, getHealth } from "./api.js";
import Navbar from "./components/Navbar.jsx";
import AssistantDrawer from "./components/AssistantDrawer.jsx";
import PayPalCheckoutModal from "./components/PayPalCheckoutModal.jsx";
import StorefrontPage from "./pages/StorefrontPage.jsx";
import ListingDetailPage from "./pages/ListingDetailPage.jsx";
import CreateListingPage from "./pages/CreateListingPage.jsx";
import SellerDashboardPage from "./pages/SellerDashboardPage.jsx";
import CheckoutReturnPage from "./pages/CheckoutReturnPage.jsx";

export default function App() {
  const [sellerSlug, setSellerSlug] = useState(DEFAULT_SELLER_SLUG);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [currentListings, setCurrentListings] = useState([]);
  const [checkoutItems, setCheckoutItems] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [backendHealth, setBackendHealth] = useState(null);

  useEffect(() => {
    getHealth()
      .then((h) => setBackendHealth(h))
      .catch(() => setBackendHealth(null));
  }, []);

  const handleStartCheckout = (items) => {
    setCheckoutItems(items);
    setCheckoutOpen(true);
  };

  const handleConfirmCartCheckout = (items) => {
    setAssistantOpen(false);
    setCheckoutItems(items);
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = () => {
    setRefreshTrigger((n) => n + 1);
  };

  return (
    <div>
      <Navbar
        sellerSlug={sellerSlug}
        onSellerSlugChange={setSellerSlug}
        onOpenAssistant={() => setAssistantOpen(true)}
        backendHealth={backendHealth}
      />

      <Routes>
        <Route
          path="/"
          element={<Navigate to={`/shop/${sellerSlug}`} replace />}
        />
        <Route
          path="/shop/:sellerSlug"
          element={
            <StorefrontPage
              sellerSlug={sellerSlug}
              onSelectSellerSlug={setSellerSlug}
              onOpenAssistant={() => setAssistantOpen(true)}
              onStartCheckout={handleStartCheckout}
              onListingsLoaded={setCurrentListings}
              refreshTrigger={refreshTrigger}
            />
          }
        />
        <Route
          path="/shop/:sellerSlug/listings/:listingId"
          element={
            <ListingDetailPage
              onStartCheckout={handleStartCheckout}
              onOpenAssistant={() => setAssistantOpen(true)}
              refreshTrigger={refreshTrigger}
            />
          }
        />
        <Route
          path="/seller/:slug/new"
          element={
            <CreateListingPage
              sellerSlug={sellerSlug}
              onListingPublished={() => setRefreshTrigger((n) => n + 1)}
            />
          }
        />
        <Route
          path="/seller/:slug/dashboard"
          element={
            <SellerDashboardPage
              sellerSlug={sellerSlug}
              refreshTrigger={refreshTrigger}
            />
          }
        />
        <Route
          path="/checkout/success"
          element={
            <CheckoutReturnPage
              onOrderCaptured={() => setRefreshTrigger((n) => n + 1)}
            />
          }
        />
        <Route
          path="/checkout/cancelled"
          element={<CheckoutReturnPage cancelled />}
        />
        <Route
          path="*"
          element={<Navigate to={`/shop/${sellerSlug}`} replace />}
        />
      </Routes>

      {/* Floating AI Assistant FAB */}
      <button
        type="button"
        className="assistant-fab"
        onClick={() => setAssistantOpen(true)}
      >
        <Sparkles size={19} />
        <span>Munshi AI (EN / اردو)</span>
      </button>

      {/* AI Assistant Drawer */}
      <AssistantDrawer
        isOpen={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        sellerSlug={sellerSlug}
        listings={currentListings}
        onConfirmCartCheckout={handleConfirmCartCheckout}
      />

      {/* PayPal Sandbox Checkout Modal */}
      <PayPalCheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={checkoutItems}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
