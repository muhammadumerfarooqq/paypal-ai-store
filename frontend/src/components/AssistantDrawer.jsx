import React, { useState } from "react";
import {
  X,
  Send,
  Sparkles,
  ShoppingCart,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Loader2,
} from "lucide-react";
import {
  askAssistant,
  proposeAssistantCart,
  calculateCartTotal,
  formatMoney,
} from "../api.js";

const SAMPLE_PROMPTS = {
  en: [
    { type: "qa", text: "What products are available and what are their prices?" },
    { type: "qa", text: "What colors or variants does the mug come in?" },
    { type: "qa", text: "Do you offer free international shipping?" },
    { type: "cart", text: "Add 1 Artisan Ceramic Mug to my cart please" },
  ],
  ur: [
    { type: "qa", text: "اس دکان میں کون سی مصنوعات موجود ہیں اور قیمت کیا ہے؟" },
    { type: "qa", text: "مگ میں کون سے رنگ دستیاب ہیں؟" },
    { type: "qa", text: "کیا آپ مفت ڈیلیوری دیتے ہیں؟" },
  ],
};

export default function AssistantDrawer({
  isOpen,
  onClose,
  sellerSlug,
  listings = [],
  onConfirmCartCheckout,
}) {
  const [language, setLanguage] = useState("en");
  const [mode, setMode] = useState("qa"); // "qa" | "cart"
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Assalam-o-Alaikum! I am Munshi, the AI shopping assistant for this store. I answer strictly from verified listing data in English or Urdu (اردو), and I can also prepare a cart proposal for you to confirm before PayPal checkout.",
      meta: { grounded: true },
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (customText, customMode) => {
    const text = (customText ?? input).trim();
    const activeMode = customMode ?? mode;
    if (!text || loading) return;

    const userMsg = {
      id: `u-${Date.now()}`,
      role: "user",
      text,
      lang: language,
    };
    setMessages((prev) => [...prev, userMsg]);
    if (!customText) setInput("");
    setLoading(true);

    try {
      // Check if message looks like a cart request or user selected cart mode
      const looksLikeCart =
        activeMode === "cart" ||
        /\b(add|buy|order|cart|purchase)\b/i.test(text);

      if (looksLikeCart && activeMode === "cart") {
        const proposal = await proposeAssistantCart({
          message: text,
          sellerSlug,
          listings,
        });

        if (!proposal.lineItems || proposal.lineItems.length === 0) {
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: "I couldn't match a specific in-stock product and quantity from that message. Try specifying the exact item name from the storefront (for example: 'Add 1 Artisan Ceramic Mug').",
              meta: { source: "cart-empty" },
            },
          ]);
        } else {
          // Fetch DB-computed cart total
          const dbTotal = await calculateCartTotal({
            lineItems: proposal.lineItems,
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `a-${Date.now()}`,
              role: "assistant",
              text: "I've prepared your cart proposal below. Note that I only proposed the item ID and quantity — the unit prices, stock check, and total below were calculated by the database. Please confirm to proceed to PayPal checkout.",
              cartProposal: {
                requiresConfirmation: proposal.requiresConfirmation,
                dbTotal,
              },
            },
          ]);
        }
      } else {
        const res = await askAssistant({
          question: text,
          language,
          sellerSlug,
          listings,
        });

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            text: res.answer,
            lang: res.language || language,
            meta: {
              known: res.known,
              source: res.source,
              fallbackReason: res.fallbackReason,
              listingIds: res.listingIds || [],
            },
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: err.message || "Something went wrong while contacting the assistant.",
          meta: { error: true },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmProposal = (dbTotal) => {
    const checkoutItems = dbTotal.items.map((it) => {
      const fullListing = listings.find((l) => l.id === it.listingId);
      return {
        id: it.listingId,
        listingId: it.listingId,
        title: it.title,
        price_cents: it.unitPriceCents,
        currency: dbTotal.currency || "USD",
        quantity: it.quantity,
        stock_quantity: fullListing?.stock_quantity ?? 10,
      };
    });
    onConfirmCartCheckout(checkoutItems);
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside
        className="assistant-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Customer AI Assistant"
      >
        <div className="drawer-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={18} color="var(--brand)" />
              <strong style={{ fontSize: "1.02rem" }}>
                Munshi AI Assistant
              </strong>
            </div>
            <div
              style={{
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                marginTop: 2,
              }}
            >
              Answers from listing data only • Never invents prices
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "inline-flex",
                background: "var(--surface)",
                border: "1px solid var(--border-strong)",
                borderRadius: 999,
                padding: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setLanguage("en")}
                style={{
                  border: "none",
                  background:
                    language === "en" ? "var(--brand)" : "transparent",
                  color: language === "en" ? "#fff" : "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ur")}
                style={{
                  border: "none",
                  background:
                    language === "ur" ? "var(--brand)" : "transparent",
                  color: language === "ur" ? "#fff" : "var(--text-muted)",
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                اردو
              </button>
            </div>

            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={onClose}
              aria-label="Close assistant"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Mode Switcher: Product Q&A vs Chat-to-Cart */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
            padding: "10px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <button
            type="button"
            className={`btn btn-sm ${
              mode === "qa" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setMode("qa")}
          >
            <Globe size={14} />
            <span>Ask Question ({language.toUpperCase()})</span>
          </button>
          <button
            type="button"
            className={`btn btn-sm ${
              mode === "cart" ? "btn-primary" : "btn-secondary"
            }`}
            onClick={() => setMode("cart")}
          >
            <ShoppingCart size={14} />
            <span>Chat-to-Cart (AI)</span>
          </button>
        </div>

        {/* Quick Sample Prompts */}
        <div
          style={{
            padding: "10px 20px",
            borderBottom: "1px solid var(--border)",
            background: "#f8fafc",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--text-light)",
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Try a sample prompt:
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {SAMPLE_PROMPTS[language].map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setMode(p.type);
                  handleSend(p.text, p.type);
                }}
                disabled={loading}
                style={{
                  fontSize: "0.76rem",
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: "1px solid var(--border-strong)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
                dir={language === "ur" ? "rtl" : "ltr"}
              >
                {p.type === "cart" ? "🛒 " : "💬 "}
                {p.text}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className="drawer-messages">
          {messages.map((m) => {
            const isUrdu =
              m.lang === "ur" || /[\u0600-\u06FF]/.test(m.text || "");
            return (
              <div
                key={m.id}
                className={`chat-bubble ${m.role}`}
                dir={isUrdu ? "rtl" : "ltr"}
              >
                <div className={isUrdu ? "urdu-text" : ""}>{m.text}</div>

                {m.meta && m.role === "assistant" && (
                  <div
                    dir="ltr"
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginTop: 8,
                      paddingTop: 6,
                      borderTop: "1px solid rgba(15, 23, 42, 0.08)",
                      fontSize: "0.72rem",
                    }}
                  >
                    {m.meta.known === true && (
                      <span className="badge badge-success">
                        <CheckCircle2 size={11} />
                        <span>Grounded in listing data</span>
                      </span>
                    )}
                    {m.meta.known === false && (
                      <span className="badge badge-warning">
                        <AlertTriangle size={11} />
                        <span>Not in listing — safe refusal</span>
                      </span>
                    )}
                    {m.meta.source === "fallback" && (
                      <span className="badge badge-neutral">
                        AI Fallback ({m.meta.fallbackReason || "rate limit"})
                      </span>
                    )}
                  </div>
                )}

                {m.cartProposal?.dbTotal && (
                  <div
                    dir="ltr"
                    style={{
                      marginTop: 12,
                      background: "var(--surface)",
                      border: "1px solid var(--border-strong)",
                      borderRadius: "var(--radius-md)",
                      padding: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 8,
                      }}
                    >
                      <span className="badge badge-brand">
                        <ShieldCheck size={12} />
                        <span>DB-Verified Cart Proposal</span>
                      </span>
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-light)",
                        }}
                      >
                        Human confirmation required
                      </span>
                    </div>

                    {m.cartProposal.dbTotal.items.map((item) => (
                      <div
                        key={item.listingId}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.84rem",
                          padding: "6px 0",
                          borderBottom: "1px solid var(--border)",
                        }}
                      >
                        <span>
                          <strong>{item.title}</strong> × {item.quantity}
                        </span>
                        <span>
                          {formatMoney(
                            item.lineTotalCents,
                            m.cartProposal.dbTotal.currency
                          )}
                        </span>
                      </div>
                    ))}

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontWeight: 800,
                        fontSize: "0.95rem",
                        margin: "10px 0",
                      }}
                    >
                      <span>Total (Computed by Code)</span>
                      <span>
                        {formatMoney(
                          m.cartProposal.dbTotal.totalCents,
                          m.cartProposal.dbTotal.currency
                        )}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="btn btn-paypal btn-sm"
                      style={{ width: "100%" }}
                      onClick={() =>
                        handleConfirmProposal(m.cartProposal.dbTotal)
                      }
                    >
                      <CheckCircle2 size={15} />
                      <span>Confirm Cart &amp; Checkout with PayPal</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="chat-bubble assistant">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Loader2 size={16} className="spin" />
                <span>
                  {mode === "cart"
                    ? "Matching products & computing total in DB..."
                    : "Checking store listings..."}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Input Form */}
        <form
          className="drawer-footer"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              className="form-control"
              dir={language === "ur" && mode === "qa" ? "rtl" : "ltr"}
              placeholder={
                mode === "cart"
                  ? "e.g. Add 1 Artisan Ceramic Mug to my cart..."
                  : language === "ur"
                  ? "یہاں اپنا سوال اردو میں لکھیں..."
                  : "Ask about price, colors, stock, variants..."
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !input.trim()}
            >
              <Send size={16} />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
