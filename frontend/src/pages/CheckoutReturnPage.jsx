import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import {
  captureCheckoutOrder,
  formatMoney,
  DEFAULT_SELLER_SLUG,
} from "../api.js";

export default function CheckoutReturnPage({
  cancelled = false,
  onOrderCaptured,
}) {
  const [searchParams] = useSearchParams();
  const paypalOrderId =
    searchParams.get("paypalOrderId") || searchParams.get("token");

  const [status, setStatus] = useState(
    cancelled ? "cancelled" : paypalOrderId ? "capturing" : "idle"
  );
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (cancelled || !paypalOrderId) return;

    let mounted = true;
    captureCheckoutOrder({ paypalOrderId })
      .then((res) => {
        if (!mounted) return;
        setOrder(res.order);
        setStatus("paid");
        if (onOrderCaptured) onOrderCaptured(res.order);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Could not capture PayPal order");
        setStatus("error");
      });

    return () => {
      mounted = false;
    };
  }, [cancelled, paypalOrderId, onOrderCaptured]);

  return (
    <main className="container" style={{ padding: "48px 20px" }}>
      <div className="card" style={{ maxWidth: 560, margin: "0 auto" }}>
        {status === "capturing" && (
          <div style={{ textAlign: "center", padding: 24 }}>
            <Loader2
              size={36}
              className="spin"
              style={{ color: "var(--brand)", marginBottom: 12 }}
            />
            <h2 style={{ margin: "0 0 8px" }}>
              Finalizing PayPal Sandbox Capture...
            </h2>
            <p style={{ color: "var(--text-muted)", margin: 0 }}>
              Order ID: <code>{paypalOrderId}</code>
            </p>
          </div>
        )}

        {status === "paid" && order && (
          <div style={{ textAlign: "center" }}>
            <CheckCircle2
              size={48}
              style={{ color: "var(--success)", marginBottom: 10 }}
            />
            <h1 style={{ margin: "0 0 8px", fontSize: "1.5rem" }}>
              Order Confirmed &amp; Paid!
            </h1>
            <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
              Payment captured via PayPal Sandbox and stock updated in Neon
              Postgres.
            </p>

            <div
              style={{
                textAlign: "left",
                background: "var(--surface-alt)",
                padding: 16,
                borderRadius: "var(--radius-md)",
                marginBottom: 20,
                fontSize: "0.9rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>Amount Paid:</strong>
                <span>{formatMoney(order.amount_cents, order.currency)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>Quantity:</strong>
                <span>{order.quantity}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <strong>PayPal Order ID:</strong>
                <code>{order.paypal_order_id}</code>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <strong>PayPal Capture ID:</strong>
                <code>{order.paypal_capture_id}</code>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link
                to={`/shop/${DEFAULT_SELLER_SLUG}`}
                className="btn btn-primary"
              >
                Continue Shopping
              </Link>
              <Link
                to={`/seller/${DEFAULT_SELLER_SLUG}/dashboard`}
                className="btn btn-secondary"
              >
                View Seller Dashboard
              </Link>
            </div>
          </div>
        )}

        {(status === "cancelled" || status === "error") && (
          <div style={{ textAlign: "center" }}>
            <AlertCircle
              size={44}
              style={{ color: "var(--danger)", marginBottom: 10 }}
            />
            <h2 style={{ margin: "0 0 8px" }}>
              {status === "cancelled"
                ? "Checkout Cancelled"
                : "Capture Incomplete"}
            </h2>
            <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
              {error ||
                "Your PayPal Sandbox checkout was cancelled before completion."}
            </p>
            <Link
              to={`/shop/${DEFAULT_SELLER_SLUG}`}
              className="btn btn-secondary"
            >
              <ArrowLeft size={16} />
              <span>Return to Storefront</span>
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
