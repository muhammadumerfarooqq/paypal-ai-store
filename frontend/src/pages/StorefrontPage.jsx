import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Search,
  Sparkles,
  PlusCircle,
  ShoppingBag,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Package,
  RefreshCw,
} from "lucide-react";
import {
  getShopListings,
  formatMoney,
  DEFAULT_SELLER_SLUG,
} from "../api.js";

const FALLBACK_IMAGE =
  "https://res.cloudinary.com/demo/image/upload/sample.jpg";

export default function StorefrontPage({
  sellerSlug: propSlug,
  onSelectSellerSlug,
  onOpenAssistant,
  onStartCheckout,
  onListingsLoaded,
  refreshTrigger,
}) {
  const { sellerSlug: paramSlug } = useParams();
  const activeSlug = paramSlug || propSlug || DEFAULT_SELLER_SLUG;

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const loadShop = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getShopListings(activeSlug);
      const rows = data.listings || [];
      setListings(rows);
      if (onListingsLoaded) onListingsLoaded(rows);
    } catch (err) {
      setError(err.message || "Could not load storefront listings");
    } finally {
      setLoading(false);
    }
  }, [activeSlug, onListingsLoaded]);

  useEffect(() => {
    if (paramSlug && onSelectSellerSlug && paramSlug !== propSlug) {
      onSelectSellerSlug(paramSlug);
    }
    loadShop();
  }, [paramSlug, propSlug, onSelectSellerSlug, loadShop, refreshTrigger]);

  const categories = [
    "All",
    ...Array.from(
      new Set(listings.map((l) => l.category).filter(Boolean))
    ),
  ];

  const filtered = listings.filter((l) => {
    const matchesCategory =
      selectedCategory === "All" || l.category === selectedCategory;
    const q = search.trim().toLowerCase();
    if (!q) return matchesCategory;
    const inTitle = (l.title || "").toLowerCase().includes(q);
    const inDesc = (l.description || "").toLowerCase().includes(q);
    const inTags = Array.isArray(l.tags)
      ? l.tags.some((t) => String(t).toLowerCase().includes(q))
      : false;
    return matchesCategory && (inTitle || inDesc || inTags);
  });

  return (
    <main className="container">
      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="hero-content">
          <div className="hero-eyebrow">
            <Sparkles size={14} />
            <span>PayPal AI Storefront • /{activeSlug}</span>
          </div>
          <h1 className="hero-title">
            {activeSlug === "demo-boutique"
              ? "Demo Boutique Storefront"
              : `${activeSlug} Storefront`}
          </h1>
          <p className="hero-desc">
            Turn Instagram &amp; WhatsApp product photos into structured
            listings with Gemini Vision, answer buyer questions in English or
            Urdu from verified data only, and accept payments via PayPal
            Sandbox.
          </p>
        </div>

        <div className="hero-actions">
          <button
            type="button"
            className="btn btn-paypal btn-lg"
            onClick={onOpenAssistant}
          >
            <Sparkles size={18} />
            <span>Ask AI / Shop by Chat</span>
          </button>
          <Link
            to={`/seller/${activeSlug}/new`}
            className="btn btn-secondary btn-lg"
          >
            <PlusCircle size={18} />
            <span>Add Listing from Photos</span>
          </Link>
        </div>
      </section>

      {/* Honest Demo Data Notice */}
      {activeSlug === "demo-boutique" && (
        <div className="notice-bar info">
          <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Demo Storefront Notice:</strong> Items tagged{" "}
            <code>demo</code> or <code>seed</code> are demo seed data for the
            PayPal AI Hackathon. All prices and inventory counts are stored in
            Neon Postgres and updated live on PayPal Sandbox checkout.
          </div>
        </div>
      )}

      {/* Search & Category Filter */}
      <div className="shop-toolbar">
        <div className="search-input-wrap">
          <Search size={17} className="search-icon" />
          <input
            type="search"
            placeholder="Search products, categories, or tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="category-pills">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${
                  selectedCategory === cat ? "active" : ""
                }`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadShop}
            title="Refresh listings"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="notice-bar danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Loading / Empty / Grid */}
      {loading ? (
        <div className="empty-state">
          <p style={{ fontWeight: 600 }}>Loading published listings...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag
            size={42}
            style={{ color: "var(--text-light)", marginBottom: 10 }}
          />
          <h3 style={{ margin: "0 0 8px", color: "var(--text)" }}>
            No listings found
          </h3>
          <p style={{ margin: "0 0 18px" }}>
            {listings.length === 0
              ? `No published products for "${activeSlug}" yet.`
              : "No products matched your current filter."}
          </p>
          <Link to={`/seller/${activeSlug}/new`} className="btn btn-primary">
            <PlusCircle size={17} />
            <span>Upload Photos to Create First Listing</span>
          </Link>
        </div>
      ) : (
        <section className="listings-grid">
          {filtered.map((item) => {
            const cover =
              (Array.isArray(item.photo_urls) && item.photo_urls[0]) ||
              item.image_url ||
              FALLBACK_IMAGE;
            const stock = Number(item.stock_quantity ?? 0);
            const isSoldOut = stock <= 0;
            const isLowStock = stock > 0 && stock <= 5;
            const isDemoSeed =
              Array.isArray(item.tags) &&
              (item.tags.includes("seed") || item.tags.includes("demo"));

            return (
              <article key={item.id} className="listing-card">
                <Link
                  to={`/shop/${activeSlug}/listings/${item.id}`}
                  className="listing-card-media"
                >
                  <img
                    src={cover}
                    alt={item.title}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.src = FALLBACK_IMAGE;
                    }}
                  />
                  <div className="listing-card-badges">
                    <span className="badge badge-neutral">
                      {item.category || "General"}
                    </span>
                    {isSoldOut ? (
                      <span className="badge badge-danger">Sold Out</span>
                    ) : isLowStock ? (
                      <span className="badge badge-warning">
                        Only {stock} left
                      </span>
                    ) : (
                      <span className="badge badge-success">
                        {stock} in stock
                      </span>
                    )}
                  </div>
                </Link>

                <div className="listing-card-body">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <Link to={`/shop/${activeSlug}/listings/${item.id}`}>
                      <h2 className="listing-card-title">{item.title}</h2>
                    </Link>
                    {isDemoSeed && (
                      <span
                        className="badge badge-brand"
                        title="Seeded demo product"
                      >
                        Demo Data
                      </span>
                    )}
                  </div>

                  <p className="listing-card-desc">
                    {item.description || "No description provided."}
                  </p>

                  {Array.isArray(item.tags) && item.tags.length > 0 && (
                    <div className="tag-row">
                      {item.tags.slice(0, 5).map((tag) => (
                        <span key={tag} className="tag-chip">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="listing-card-footer">
                    <div>
                      <div className="price-tag">
                        {formatMoney(item.price_cents, item.currency)}
                      </div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-light)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <Package size={12} />
                        <span>
                          {isSoldOut
                            ? "Out of stock"
                            : `${stock} units available`}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      <Link
                        to={`/shop/${activeSlug}/listings/${item.id}`}
                        className="btn btn-secondary btn-sm"
                      >
                        Details
                      </Link>
                      <button
                        type="button"
                        className="btn btn-paypal btn-sm"
                        disabled={isSoldOut}
                        onClick={() =>
                          onStartCheckout([{ ...item, quantity: 1 }])
                        }
                      >
                        <CreditCard size={14} />
                        <span>{isSoldOut ? "Sold Out" : "Buy Now"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
