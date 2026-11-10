import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Store,
  PlusCircle,
  LayoutDashboard,
  MessageSquare,
  Sparkles,
  CheckCircle2,
} from "lucide-react";

export default function Navbar({
  sellerSlug,
  onSellerSlugChange,
  onOpenAssistant,
  backendHealth,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const [slugInput, setSlugInput] = useState(sellerSlug);

  const handleSlugSubmit = (e) => {
    e.preventDefault();
    const cleaned = slugInput.trim().toLowerCase() || "demo-boutique";
    setSlugInput(cleaned);
    onSellerSlugChange(cleaned);
    if (location.pathname.startsWith("/shop/")) {
      navigate(`/shop/${cleaned}`);
    } else if (location.pathname.includes("/new")) {
      navigate(`/seller/${cleaned}/new`);
    } else if (location.pathname.includes("/dashboard")) {
      navigate(`/seller/${cleaned}/dashboard`);
    }
  };

  const isShop =
    location.pathname === "/" || location.pathname.startsWith("/shop/");
  const isNew = location.pathname.includes("/new");
  const isDashboard = location.pathname.includes("/dashboard");

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to={`/shop/${sellerSlug}`} className="brand-logo">
          <span className="brand-mark">M</span>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>Munshi</span>
              <span className="brand-subtitle">PayPal AI Store</span>
            </div>
            <div
              style={{
                fontSize: "0.73rem",
                fontWeight: 500,
                color: "var(--text-light)",
              }}
            >
              Photos → AI Listing → PayPal Sandbox
            </div>
          </div>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          <Link
            to={`/shop/${sellerSlug}`}
            className={`nav-link ${isShop ? "active" : ""}`}
          >
            <Store size={17} />
            <span>Storefront</span>
          </Link>

          <Link
            to={`/seller/${sellerSlug}/new`}
            className={`nav-link ${isNew ? "active" : ""}`}
          >
            <PlusCircle size={17} />
            <span>Photo → AI Listing</span>
          </Link>

          <Link
            to={`/seller/${sellerSlug}/dashboard`}
            className={`nav-link ${isDashboard ? "active" : ""}`}
          >
            <LayoutDashboard size={17} />
            <span>Seller Dashboard</span>
          </Link>
        </nav>

        <div className="nav-actions">
          <form onSubmit={handleSlugSubmit} className="seller-switcher">
            <span>Shop:</span>
            <input
              type="text"
              value={slugInput}
              onChange={(e) => setSlugInput(e.target.value)}
              onBlur={handleSlugSubmit}
              aria-label="Seller slug"
              placeholder="demo-boutique"
            />
          </form>

          {backendHealth?.ok && (
            <span
              className="badge badge-success"
              title="Connected to Express API & Neon Postgres"
            >
              <CheckCircle2 size={13} />
              <span>API Live</span>
            </span>
          )}

          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenAssistant}
          >
            <Sparkles size={15} />
            <span>Ask Munshi AI (EN / اردو)</span>
          </button>
        </div>
      </div>
    </header>
  );
}
