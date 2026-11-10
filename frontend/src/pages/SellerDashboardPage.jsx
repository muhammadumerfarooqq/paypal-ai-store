import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Package,
  PlusCircle,
  ShieldCheck,
  TrendingUp,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  DEFAULT_SELLER_SLUG,
  getSellerOrders,
  getRestockSuggestions,
  getShopListings,
  getSellerDrafts,
  captureCheckoutOrder,
  formatMoney,
} from "../api.js";

export default function SellerDashboardPage({
  sellerSlug: propSlug,
  refreshTrigger,
}) {
  const { slug: paramSlug } = useParams();
  const activeSlug = paramSlug || propSlug || DEFAULT_SELLER_SLUG;

  const [orders, setOrders] = useState([]);
  const [aiSummary, setAiSummary] = useState("");
  const [restock, setRestock] = useState({ disclaimer: "", suggestions: [] });
  const [publishedListings, setPublishedListings] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [capturingId, setCapturingId] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [ordersData, restockData, shopData, draftsData] = await Promise.all(
        [
          getSellerOrders(activeSlug),
          getRestockSuggestions(activeSlug),
          getShopListings(activeSlug),
          getSellerDrafts(activeSlug),
        ]
      );
      setOrders(ordersData.orders || []);
      setAiSummary(ordersData.summary || "");
      setRestock({
        disclaimer:
          restockData.disclaimer ||
          "Rule-based hints only, not a predictive model.",
        suggestions: restockData.suggestions || [],
      });
      setPublishedListings(shopData.listings || []);
      setDrafts(draftsData.drafts || []);
    } catch (err) {
      setError(err.message || "Failed to load seller dashboard");
    } finally {
      setLoading(false);
    }
  }, [activeSlug]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard, refreshTrigger]);

  const handleCaptureOrder = async (paypalOrderId) => {
    if (!paypalOrderId) return;
    setCapturingId(paypalOrderId);
    setError("");
    try {
      await captureCheckoutOrder({ paypalOrderId });
      await loadDashboard();
    } catch (err) {
      setError(
        err.message ||
          "Could not capture order (buyer must approve in PayPal Sandbox first)."
      );
    } finally {
      setCapturingId("");
    }
  };

  // Code-computed KPIs (never invented by AI)
  const paidOrders = orders.filter((o) => o.status === "paid");
  const paidRevenueCents = paidOrders.reduce(
    (sum, o) => sum + Number(o.amount_cents || 0),
    0
  );
  const paidUnits = paidOrders.reduce(
    (sum, o) => sum + Number(o.quantity || 1),
    0
  );

  return (
    <main className="container" style={{ padding: "28px 20px 60px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 22,
        }}
      >
        <div>
          <span className="badge badge-brand" style={{ marginBottom: 6 }}>
            Seller Dashboard • /{activeSlug}
          </span>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>
            Orders, AI Summary &amp; Restock Rules
          </h1>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={loadDashboard}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
            <span>Refresh Data</span>
          </button>
          <Link
            to={`/seller/${activeSlug}/new`}
            className="btn btn-primary btn-sm"
          >
            <PlusCircle size={15} />
            <span>New Listing from Photos</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="notice-bar danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Code-Computed KPI Cards */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Orders (All Statuses)</div>
          <div className="kpi-value">{orders.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Paid Orders (Captured)</div>
          <div className="kpi-value" style={{ color: "var(--success)" }}>
            {paidOrders.length}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Paid Revenue (DB Computed)</div>
          <div className="kpi-value">
            {formatMoney(paidRevenueCents, "USD")}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Units Sold (Paid)</div>
          <div className="kpi-value">{paidUnits}</div>
        </div>
      </section>

      {/* AI Order Summary + Rule-Based Restock Suggestions */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 20,
          marginBottom: 24,
        }}
      >
        {/* AI Order Summary Card */}
        <section className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={19} color="var(--brand)" />
              <h2 style={{ margin: 0, fontSize: "1.12rem" }}>
                AI Order Summary
              </h2>
            </div>
            <span className="badge badge-brand">
              <ShieldCheck size={12} />
              <span>Numbers Computed in Code</span>
            </span>
          </div>

          <div
            style={{
              background: "var(--surface-alt)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              fontSize: "0.95rem",
              lineHeight: 1.6,
            }}
          >
            {loading ? (
              "Generating order summary..."
            ) : (
              aiSummary || "No order summary available yet."
            )}
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: "0.78rem",
              color: "var(--text-light)",
            }}
          >
            Counts, revenue, units sold, and best-seller rankings are calculated
            in JavaScript (`computeOrderFacts`), then turned into prose by
            Gemini with a numeric grounding guard.
          </div>
        </section>

        {/* Restock Suggestions Card */}
        <section className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <TrendingUp size={19} color="var(--warning)" />
              <h2 style={{ margin: 0, fontSize: "1.12rem" }}>
                Restock Suggestions
              </h2>
            </div>
            <span className="badge badge-warning">Rule-Based Hints</span>
          </div>

          <div
            className="notice-bar warning"
            style={{ margin: "0 0 12px", padding: "8px 12px" }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span style={{ fontSize: "0.82rem" }}>
              <strong>Honest Disclaimer:</strong> {restock.disclaimer} (Triggers
              when stock ≤ 5 or ≥ 3 units sold in 7 days.)
            </span>
          </div>

          {restock.suggestions.length === 0 ? (
            <div
              style={{
                padding: 16,
                background: "var(--surface-alt)",
                borderRadius: "var(--radius-md)",
                fontSize: "0.9rem",
                color: "var(--text-muted)",
              }}
            >
              All published listings currently have healthy stock (&gt; 5 units)
              and normal 7-day velocity.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {restock.suggestions.map((s) => (
                <div
                  key={s.listingId}
                  style={{
                    padding: 12,
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface-alt)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      marginBottom: 4,
                    }}
                  >
                    <span>{s.title}</span>
                    <span className="badge badge-danger">
                      {s.stockQuantity} left • {s.soldRecently} sold (7d)
                    </span>
                  </div>
                  <div
                    style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}
                  >
                    {s.recommendation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Orders List Table */}
      <section className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>
            Orders History ({orders.length})
          </h2>
          <span style={{ fontSize: "0.8rem", color: "var(--text-light)" }}>
            Real-time PayPal Sandbox orders &amp; webhook captures
          </span>
        </div>

        {orders.length === 0 ? (
          <div className="empty-state" style={{ padding: 28 }}>
            No orders recorded for /{activeSlug} yet.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>PayPal Order ID</th>
                  <th>Capture ID</th>
                  <th>Paid At</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>
                      {o.status === "paid" ? (
                        <span className="badge badge-success">
                          <CheckCircle2 size={12} />
                          <span>PAID</span>
                        </span>
                      ) : o.status === "refunded" ? (
                        <span className="badge badge-warning">REFUNDED</span>
                      ) : o.status === "created" ? (
                        <span className="badge badge-neutral">
                          <Clock size={12} />
                          <span>CREATED</span>
                        </span>
                      ) : (
                        <span className="badge badge-danger">
                          {o.status.toUpperCase()}
                        </span>
                      )}
                    </td>
                    <td>
                      <strong>{o.listing_title}</strong>
                    </td>
                    <td>{o.quantity}</td>
                    <td>{formatMoney(o.amount_cents, o.currency)}</td>
                    <td>
                      <code>{o.paypal_order_id || "—"}</code>
                    </td>
                    <td>
                      {o.paypal_capture_id ? (
                        <code>{o.paypal_capture_id}</code>
                      ) : o.status === "created" && o.paypal_order_id ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={capturingId === o.paypal_order_id}
                          onClick={() => handleCaptureOrder(o.paypal_order_id)}
                        >
                          {capturingId === o.paypal_order_id
                            ? "Capturing..."
                            : "Capture Approved Order"}
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                      {o.paid_at
                        ? new Date(o.paid_at).toLocaleString()
                        : "Pending approval"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Published Inventory & Drafts */}
      <section className="card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "1.15rem" }}>
            Storefront Inventory ({publishedListings.length} Published,{" "}
            {drafts.length} Drafts)
          </h2>
          <Link
            to={`/seller/${activeSlug}/new`}
            className="btn btn-secondary btn-sm"
          >
            Manage Drafts / Add New
          </Link>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Price</th>
                <th>Live Stock</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {publishedListings.map((l) => (
                <tr key={l.id}>
                  <td>
                    <strong>{l.title}</strong>
                  </td>
                  <td>{l.category}</td>
                  <td>{formatMoney(l.price_cents, l.currency)}</td>
                  <td>
                    <span
                      className={`badge ${
                        l.stock_quantity === 0
                          ? "badge-danger"
                          : l.stock_quantity <= 5
                          ? "badge-warning"
                          : "badge-success"
                      }`}
                    >
                      <Package size={12} />
                      <span>{l.stock_quantity} left</span>
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/shop/${activeSlug}/listings/${l.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      <span>Open</span>
                      <ExternalLink size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
