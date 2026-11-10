import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CreditCard,
  Sparkles,
  Package,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Tag,
} from "lucide-react";
import {
  getShopListing,
  formatMoney,
  DEFAULT_SELLER_SLUG,
} from "../api.js";

const FALLBACK_IMAGE =
  "https://res.cloudinary.com/demo/image/upload/sample.jpg";

export default function ListingDetailPage({
  onStartCheckout,
  onOpenAssistant,
  refreshTrigger,
}) {
  const { sellerSlug = DEFAULT_SELLER_SLUG, listingId } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activePhoto, setActivePhoto] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariants, setSelectedVariants] = useState({});

  const loadListing = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getShopListing(sellerSlug, listingId);
      setListing(data.listing);
      if (Array.isArray(data.listing?.variants)) {
        const defaults = {};
        for (const v of data.listing.variants) {
          if (v.name && Array.isArray(v.options) && v.options[0]) {
            defaults[v.name] = v.options[0];
          }
        }
        setSelectedVariants(defaults);
      }
    } catch (err) {
      setError(err.message || "Listing not found");
    } finally {
      setLoading(false);
    }
  }, [sellerSlug, listingId]);

  useEffect(() => {
    loadListing();
  }, [loadListing, refreshTrigger]);

  if (loading) {
    return (
      <main className="container" style={{ padding: "40px 20px" }}>
        <div className="empty-state">Loading product details...</div>
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="container" style={{ padding: "40px 20px" }}>
        <div className="notice-bar danger">
          <AlertCircle size={18} />
          <span>{error || "Listing not found"}</span>
        </div>
        <Link to={`/shop/${sellerSlug}`} className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Storefront</span>
        </Link>
      </main>
    );
  }

  const photos =
    Array.isArray(listing.photo_urls) && listing.photo_urls.length > 0
      ? listing.photo_urls
      : [listing.image_url || FALLBACK_IMAGE];

  const stock = Number(listing.stock_quantity ?? 0);
  const isSoldOut = stock <= 0;
  const isDemoSeed =
    Array.isArray(listing.tags) &&
    (listing.tags.includes("seed") || listing.tags.includes("demo"));

  return (
    <main className="container">
      <div style={{ marginTop: 20 }}>
        <Link to={`/shop/${sellerSlug}`} className="btn btn-secondary btn-sm">
          <ArrowLeft size={15} />
          <span>Back to /{sellerSlug}</span>
        </Link>
      </div>

      <div className="detail-layout">
        {/* Left: Photo Gallery */}
        <div>
          <div className="gallery-main">
            <img
              src={photos[activePhoto] || FALLBACK_IMAGE}
              alt={listing.title}
              onError={(e) => {
                e.currentTarget.src = FALLBACK_IMAGE;
              }}
            />
          </div>

          {photos.length > 1 && (
            <div className="gallery-thumbs">
              {photos.map((url, idx) => (
                <button
                  key={idx}
                  type="button"
                  className={`gallery-thumb ${
                    activePhoto === idx ? "active" : ""
                  }`}
                  onClick={() => setActivePhoto(idx)}
                >
                  <img src={url} alt={`${listing.title} view ${idx + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Info & PayPal Buy Box */}
        <div className="detail-panel">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 12,
            }}
          >
            <span className="badge badge-neutral">
              {listing.category || "General"}
            </span>
            {isSoldOut ? (
              <span className="badge badge-danger">Sold Out</span>
            ) : (
              <span className="badge badge-success">
                <CheckCircle2 size={12} />
                <span>{stock} in stock</span>
              </span>
            )}
            {isDemoSeed && (
              <span className="badge badge-brand">Demo Seed Data</span>
            )}
          </div>

          <h1 style={{ margin: "0 0 10px", fontSize: "1.75rem" }}>
            {listing.title}
          </h1>

          <div
            style={{
              fontSize: "1.65rem",
              fontWeight: 800,
              color: "var(--brand-dark)",
              marginBottom: 16,
            }}
          >
            {formatMoney(listing.price_cents, listing.currency)}
          </div>

          <p
            style={{
              color: "var(--text-muted)",
              fontSize: "0.96rem",
              lineHeight: 1.65,
              marginBottom: 20,
            }}
          >
            {listing.description}
          </p>

          {/* Variants */}
          {Array.isArray(listing.variants) && listing.variants.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              {listing.variants.map((v, idx) => (
                <div key={idx} style={{ marginBottom: 12 }}>
                  <div
                    style={{
                      fontSize: "0.84rem",
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    {v.name}:{" "}
                    <span style={{ color: "var(--brand-dark)" }}>
                      {selectedVariants[v.name] || ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(v.options || []).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        className={`category-pill ${
                          selectedVariants[v.name] === opt ? "active" : ""
                        }`}
                        onClick={() =>
                          setSelectedVariants((prev) => ({
                            ...prev,
                            [v.name]: opt,
                          }))
                        }
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {Array.isArray(listing.tags) && listing.tags.length > 0 && (
            <div style={{ marginBottom: 22 }}>
              <div
                style={{
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  color: "var(--text-light)",
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Tag size={13} />
                <span>Grounded Tags</span>
              </div>
              <div className="tag-row">
                {listing.tags.map((t) => (
                  <span key={t} className="tag-chip">
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quantity & PayPal Checkout */}
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 20,
              marginTop: 10,
            }}
          >
            {!isSoldOut && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <label
                  htmlFor="detail-qty"
                  style={{ fontWeight: 600, fontSize: "0.9rem" }}
                >
                  Quantity:
                </label>
                <input
                  id="detail-qty"
                  type="number"
                  min={1}
                  max={stock}
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(
                      Math.max(1, Math.min(stock, Number(e.target.value) || 1))
                    )
                  }
                  className="form-control"
                  style={{ width: 90 }}
                />
                <span
                  style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}
                >
                  Total:{" "}
                  <strong>
                    {formatMoney(
                      Number(listing.price_cents) * quantity,
                      listing.currency
                    )}
                  </strong>
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-paypal btn-lg"
                style={{ flex: 1 }}
                disabled={isSoldOut}
                onClick={() =>
                  onStartCheckout([{ ...listing, quantity: Number(quantity) }])
                }
              >
                <CreditCard size={18} />
                <span>
                  {isSoldOut
                    ? "Sold Out — Unavailable"
                    : "Buy with PayPal Sandbox"}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={onOpenAssistant}
              >
                <Sparkles size={18} />
                <span>Ask AI (EN / اردو)</span>
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: "0.8rem",
                color: "var(--text-light)",
              }}
            >
              <ShieldCheck size={15} color="var(--brand)" />
              <span>
                Price &amp; stock are verified directly from PostgreSQL before
                PayPal order creation.
              </span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
