import React, { useState } from "react";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  X,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CreditCard,
} from "lucide-react";
import {
  PAYPAL_CLIENT_ID,
  createCheckoutOrder,
  captureCheckoutOrder,
  formatMoney,
} from "../api.js";

export default function PayPalCheckoutModal({
  isOpen,
  onClose,
  items = [],
  onPaymentSuccess,
}) {
  const [quantity, setQuantity] = useState(items[0]?.quantity || 1);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [paidOrders, setPaidOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !items.length) return null;

  const isSingleItem = items.length === 1;
  const primaryItem = items[0];
  const effectiveQty = isSingleItem ? quantity : primaryItem.quantity;
  const maxStock = primaryItem.stock_quantity ?? 20;

  const totalCents = isSingleItem
    ? Number(primaryItem.price_cents) * Number(effectiveQty)
    : items.reduce(
        (sum, it) => sum + Number(it.price_cents) * Number(it.quantity),
        0
      );
  const currency = primaryItem.currency || "USD";

  // Start PayPal order via backend (price always from DB)
  const handleStartRedirectCheckout = async () => {
    setError("");
    setLoading(true);
    try {
      const created = [];
      for (const item of items) {
        const qty = isSingleItem ? effectiveQty : item.quantity;
        const res = await createCheckoutOrder({
          listingId: item.id || item.listingId,
          quantity: qty,
        });
        created.push({
          ...res,
          title: item.title,
          quantity: qty,
        });
      }
      setPendingOrders(created);
      if (created[0]?.approvalUrl) {
        window.open(created[0].approvalUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err.message || "Could not create PayPal sandbox order");
    } finally {
      setLoading(false);
    }
  };

  // Capture after buyer approves in PayPal Sandbox
  const handleCapturePending = async (orderIdToCapture) => {
    setError("");
    setCapturing(true);
    try {
      const targets = orderIdToCapture
        ? [{ paypalOrderId: orderIdToCapture }]
        : pendingOrders;
      const capturedList = [];
      for (const t of targets) {
        const res = await captureCheckoutOrder({
          paypalOrderId: t.paypalOrderId,
        });
        if (res?.order) {
          capturedList.push(res.order);
        }
      }
      setPaidOrders(capturedList);
      if (onPaymentSuccess) {
        onPaymentSuccess(capturedList);
      }
    } catch (err) {
      setError(
        err.message ||
          "Capture failed. Make sure you clicked 'Complete Purchase' in the PayPal Sandbox window first."
      );
    } finally {
      setCapturing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="badge badge-paypal">
              <CreditCard size={14} />
              <span>PayPal Sandbox Checkout</span>
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {paidOrders.length > 0 ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                background: "var(--success-bg)",
                color: "var(--success)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 14,
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ margin: "0 0 8px", fontSize: "1.4rem" }}>
              Payment Confirmed!
            </h2>
            <p
              style={{
                margin: "0 0 18px",
                color: "var(--text-muted)",
                fontSize: "0.92rem",
              }}
            >
              Your PayPal sandbox payment was captured and inventory stock has
              been automatically decremented in Neon Postgres.
            </p>

            {paidOrders.map((ord) => (
              <div
                key={ord.id}
                style={{
                  textAlign: "left",
                  background: "var(--surface-alt)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: 16,
                  marginBottom: 14,
                  fontSize: "0.86rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <strong>Status:</strong>
                  <span className="badge badge-success">
                    {ord.status.toUpperCase()}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <strong>Amount Paid:</strong>
                  <span>{formatMoney(ord.amount_cents, ord.currency)}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <strong>Quantity:</strong>
                  <span>{ord.quantity}</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 6,
                  }}
                >
                  <strong>PayPal Order ID:</strong>
                  <code>{ord.paypal_order_id}</code>
                </div>
                {ord.paypal_capture_id && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <strong>PayPal Capture ID:</strong>
                    <code>{ord.paypal_capture_id}</code>
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: "100%" }}
              onClick={onClose}
            >
              Done &amp; Return to Storefront
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ margin: "0 0 12px", fontSize: "1.2rem" }}>
              Confirm Your Order
            </h3>

            <div className="notice-bar info" style={{ marginTop: 0 }}>
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Database-Authoritative Pricing:</strong> Prices, stock
                checks, and totals come strictly from PostgreSQL (`POST
                /api/checkout`). The AI never sets or alters prices.
              </div>
            </div>

            <div
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                marginBottom: 16,
                background: "var(--surface-alt)",
              }}
            >
              {items.map((item, idx) => {
                const itemQty = isSingleItem ? effectiveQty : item.quantity;
                const lineCents = Number(item.price_cents) * Number(itemQty);
                return (
                  <div
                    key={item.id || item.listingId || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: idx < items.length - 1 ? 10 : 0,
                      marginBottom: idx < items.length - 1 ? 10 : 0,
                      borderBottom:
                        idx < items.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>{item.title}</div>
                      <div
                        style={{
                          fontSize: "0.82rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Unit price: {formatMoney(item.price_cents, currency)}
                      </div>
                    </div>

                    {isSingleItem ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <label
                          htmlFor="checkout-qty"
                          style={{
                            fontSize: "0.82rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          Qty:
                        </label>
                        <input
                          id="checkout-qty"
                          type="number"
                          min={1}
                          max={Math.max(1, maxStock)}
                          value={quantity}
                          onChange={(e) =>
                            setQuantity(
                              Math.max(
                                1,
                                Math.min(
                                  maxStock,
                                  Number(e.target.value) || 1
                                )
                              )
                            )
                          }
                          className="form-control"
                          style={{ width: 70, padding: "6px 8px" }}
                        />
                      </div>
                    ) : (
                      <div style={{ fontWeight: 600 }}>
                        × {itemQty} = {formatMoney(lineCents, currency)}
                      </div>
                    )}
                  </div>
                );
              })}

              <div
                style={{
                  borderTop: "1px solid var(--border-strong)",
                  marginTop: 12,
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontWeight: 800,
                  fontSize: "1.1rem",
                }}
              >
                <span>Total (DB Verified)</span>
                <span>{formatMoney(totalCents, currency)}</span>
              </div>
            </div>

            {error && (
              <div className="notice-bar danger">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Embedded PayPal Smart Buttons (when Client ID is set and single item) */}
            {PAYPAL_CLIENT_ID && isSingleItem && (
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  Option 1: Instant PayPal Sandbox Smart Button
                </div>
                <PayPalScriptProvider
                  options={{
                    clientId: PAYPAL_CLIENT_ID,
                    currency: currency || "USD",
                    intent: "capture",
                  }}
                >
                  <PayPalButtons
                    style={{ layout: "vertical", shape: "rect", label: "pay" }}
                    createOrder={async () => {
                      setError("");
                      const res = await createCheckoutOrder({
                        listingId: primaryItem.id || primaryItem.listingId,
                        quantity: effectiveQty,
                      });
                      setPendingOrders([
                        {
                          ...res,
                          title: primaryItem.title,
                          quantity: effectiveQty,
                        },
                      ]);
                      return res.paypalOrderId;
                    }}
                    onApprove={async (data) => {
                      await handleCapturePending(data.orderID);
                    }}
                    onError={(err) => {
                      setError(
                        err?.message ||
                          "PayPal popup encountered an issue. You can also use Option 2 below."
                      );
                    }}
                  />
                </PayPalScriptProvider>
              </div>
            )}

            {/* Option 2: Direct PayPal Sandbox Approval Link + Capture */}
            <div
              style={{
                borderTop: PAYPAL_CLIENT_ID ? "1px solid var(--border)" : "none",
                paddingTop: PAYPAL_CLIENT_ID ? 14 : 0,
              }}
            >
              {PAYPAL_CLIENT_ID && (
                <div
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                  }}
                >
                  Option 2: Open PayPal Sandbox Approval Tab &amp; Capture
                </div>
              )}

              {!pendingOrders.length ? (
                <button
                  type="button"
                  className="btn btn-paypal"
                  style={{ width: "100%" }}
                  disabled={loading}
                  onClick={handleStartRedirectCheckout}
                >
                  {loading ? (
                    <>
                      <Loader2 size={17} className="spin" />
                      <span>Creating PayPal Sandbox Order...</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink size={17} />
                      <span>
                        Create PayPal Order &amp; Open Sandbox Checkout
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div
                  style={{
                    background: "#fffbeb",
                    border: "1px solid #fde68a",
                    borderRadius: "var(--radius-md)",
                    padding: 14,
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: "#92400e",
                      marginBottom: 10,
                    }}
                  >
                    Step 1: Approve payment in PayPal Sandbox
                  </div>
                  {pendingOrders.map((po) => (
                    <div
                      key={po.paypalOrderId}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        marginBottom: 10,
                        fontSize: "0.84rem",
                      }}
                    >
                      <span>
                        Order <code>{po.paypalOrderId}</code> ({po.title} ×{" "}
                        {po.quantity})
                      </span>
                      <a
                        href={po.approvalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                      >
                        <span>Open PayPal</span>
                        <ExternalLink size={13} />
                      </a>
                    </div>
                  ))}

                  <div
                    style={{
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: "#92400e",
                      margin: "12px 0 8px",
                    }}
                  >
                    Step 2: After approving in PayPal, click to capture &amp;
                    update stock:
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                    disabled={capturing}
                    onClick={() => handleCapturePending()}
                  >
                    {capturing ? (
                      <>
                        <Loader2 size={17} className="spin" />
                        <span>Capturing Payment...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={17} />
                        <span>Capture Approved Payment Now</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
