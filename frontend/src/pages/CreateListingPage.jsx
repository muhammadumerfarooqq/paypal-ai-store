import React, { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ShieldCheck,
  Image as ImageIcon,
  ArrowRight,
} from "lucide-react";
import {
  CATEGORIES,
  DEFAULT_SELLER_SLUG,
  uploadSellerPhotos,
  createListingDraft,
  updateListingDraft,
  publishListingDraft,
  getSellerDrafts,
} from "../api.js";

const SAMPLE_PRESETS = [
  {
    label: "Sample: Leather Shoes (Cloudinary)",
    urls: ["https://res.cloudinary.com/demo/image/upload/shoes.jpg"],
  },
  {
    label: "Sample: Floral Sample (Cloudinary)",
    urls: ["https://res.cloudinary.com/demo/image/upload/sample.jpg"],
  },
];

export default function CreateListingPage({
  sellerSlug: propSlug,
  onListingPublished,
}) {
  const { slug: paramSlug } = useParams();
  const activeSlug = paramSlug || propSlug || DEFAULT_SELLER_SLUG;
  const navigate = useNavigate();

  const [photoUrls, setPhotoUrls] = useState([]);
  const [customUrlInput, setCustomUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Active draft state
  const [draftId, setDraftId] = useState(null);
  const [aiFallbackUsed, setAiFallbackUsed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Home & Kitchen");
  const [tagsInput, setTagsInput] = useState("");
  const [variants, setVariants] = useState([]);
  const [priceUsd, setPriceUsd] = useState("");
  const [stockQuantity, setStockQuantity] = useState("10");

  // Existing drafts list
  const [existingDrafts, setExistingDrafts] = useState([]);

  useEffect(() => {
    getSellerDrafts(activeSlug)
      .then((res) => setExistingDrafts(res.drafts || []))
      .catch(() => {});
  }, [activeSlug, draftId]);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (files.length + photoUrls.length > 5) {
      setError("Maximum 5 photos allowed per listing.");
      return;
    }

    setError("");
    setUploading(true);
    try {
      const res = await uploadSellerPhotos(activeSlug, files);
      setPhotoUrls((prev) => [...prev, ...(res.photoUrls || [])].slice(0, 5));
    } catch (err) {
      setError(err.message || "Photo upload to Cloudinary failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleAddCustomUrl = () => {
    const trimmed = customUrlInput.trim();
    if (!trimmed) return;
    if (photoUrls.length >= 5) {
      setError("Maximum 5 photos allowed.");
      return;
    }
    setPhotoUrls((prev) => [...prev, trimmed]);
    setCustomUrlInput("");
  };

  const handleGenerateAiDraft = async (urlsOverride) => {
    const targetUrls = urlsOverride || photoUrls;
    if (!targetUrls.length) {
      setError("Upload or select at least 1 product photo first.");
      return;
    }

    setError("");
    setSuccessMsg("");
    setDrafting(true);
    try {
      const res = await createListingDraft(activeSlug, targetUrls);
      const d = res.listing;
      setDraftId(d.id);
      setTitle(d.title || "");
      setDescription(d.description || "");
      setCategory(
        CATEGORIES.includes(d.category) ? d.category : "Home & Kitchen"
      );
      setTagsInput(Array.isArray(d.tags) ? d.tags.join(", ") : "");
      setVariants(
        Array.isArray(d.variants)
          ? d.variants.map((v) => ({
              name: v.name || "",
              optionsText: Array.isArray(v.options) ? v.options.join(", ") : "",
            }))
          : []
      );
      setPriceUsd(d.price_cents ? (d.price_cents / 100).toFixed(2) : "");
      setStockQuantity(String(d.stock_quantity ?? 10));
      setAiFallbackUsed(!d.title);
    } catch (err) {
      setError(err.message || "Could not create AI draft");
    } finally {
      setDrafting(false);
    }
  };

  const buildPatchPayload = () => {
    const parsedPrice = Math.round( parseFloat(priceUsd) * 100 );
    const parsedStock = parseInt(stockQuantity, 10);
    const parsedTags = tagsInput
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const parsedVariants = variants
      .map((v) => ({
        name: v.name.trim(),
        options: v.optionsText
          .split(",")
          .map((o) => o.trim())
          .filter(Boolean),
      }))
      .filter((v) => v.name && v.options.length > 0);

    return {
      title: title.trim(),
      description: description.trim(),
      category,
      tags: parsedTags,
      variants: parsedVariants,
      price_cents:
        !Number.isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : undefined,
      stock_quantity:
        !Number.isNaN(parsedStock) && parsedStock >= 0 ? parsedStock : 0,
    };
  };

  const handleSaveDraft = async () => {
    if (!draftId) return;
    setError("");
    setSuccessMsg("");
    setSaving(true);
    try {
      const patch = buildPatchPayload();
      await updateListingDraft(activeSlug, draftId, patch);
      setSuccessMsg("Draft saved to PostgreSQL.");
    } catch (err) {
      setError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!draftId) return;
    setError("");
    setSuccessMsg("");

    const patch = buildPatchPayload();
    if (!patch.title) {
      setError("Please provide a product title before publishing.");
      return;
    }
    if (!patch.price_cents || patch.price_cents <= 0) {
      setError(
        "You must set a valid price (> $0.00). The AI never sets prices."
      );
      return;
    }

    setPublishing(true);
    try {
      await updateListingDraft(activeSlug, draftId, patch);
      const pubRes = await publishListingDraft(activeSlug, draftId);
      if (onListingPublished) onListingPublished(pubRes.listing);
      navigate(`/shop/${activeSlug}/listings/${pubRes.listing.id}`);
    } catch (err) {
      setError(err.message || "Failed to publish listing");
    } finally {
      setPublishing(false);
    }
  };

  const handleResumeDraft = (d) => {
    setDraftId(d.id);
    setTitle(d.title || "");
    setPriceUsd(d.price_cents ? (d.price_cents / 100).toFixed(2) : "");
    setStockQuantity(String(d.stock_quantity ?? 10));
    if (d.image_url) setPhotoUrls([d.image_url]);
    setAiFallbackUsed(!d.title);
    setSuccessMsg(`Loaded draft #${d.id.slice(0, 8)} for editing.`);
  };

  return (
    <main className="container" style={{ padding: "28px 20px 60px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div>
          <span className="badge badge-brand" style={{ marginBottom: 6 }}>
            <Sparkles size={13} />
            <span>Seller Studio • /{activeSlug}</span>
          </span>
          <h1 style={{ margin: 0, fontSize: "1.75rem" }}>
            Photos → AI Listing Draft → Publish
          </h1>
        </div>
        <Link to={`/shop/${activeSlug}`} className="btn btn-secondary btn-sm">
          View Public Storefront
        </Link>
      </div>

      {/* Step 1: Upload Photos */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 6px", fontSize: "1.18rem" }}>
          Step 1: Upload 1–5 Product Photos (Cloudinary)
        </h2>
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "0.88rem",
            color: "var(--text-muted)",
          }}
        >
          Upload product photos from your device or choose a sample image to
          test Gemini Vision drafting.
        </p>

        <label className="upload-dropzone" style={{ display: "block" }}>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={uploading || photoUrls.length >= 5}
            style={{ display: "none" }}
          />
          {uploading ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontWeight: 600,
              }}
            >
              <Loader2 size={22} className="spin" />
              <span>Uploading photos to Cloudinary...</span>
            </div>
          ) : (
            <div>
              <Upload
                size={28}
                style={{ color: "var(--brand)", marginBottom: 8 }}
              />
              <div style={{ fontWeight: 700, marginBottom: 4 }}>
                Click to select product photos (max 5, up to 8 MB each)
              </div>
              <div style={{ fontSize: "0.82rem", color: "var(--text-light)" }}>
                Uploaded via <code>POST /api/sellers/{activeSlug}/uploads</code>
              </div>
            </div>
          )}
        </label>

        {/* Quick Sample Photos & URL Input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
            marginTop: 14,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {SAMPLE_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setPhotoUrls(preset.urls);
                  handleGenerateAiDraft(preset.urls);
                }}
                disabled={drafting}
              >
                <ImageIcon size={14} />
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flex: 1, maxWidth: 420 }}>
            <input
              type="url"
              className="form-control"
              placeholder="Or paste an image URL (https://...)"
              value={customUrlInput}
              onChange={(e) => setCustomUrlInput(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleAddCustomUrl}
            >
              Add URL
            </button>
          </div>
        </div>

        {/* Selected Photos Preview */}
        {photoUrls.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div
              style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                marginBottom: 8,
                color: "var(--text-muted)",
              }}
            >
              Selected Photos ({photoUrls.length}/5):
            </div>
            <div
              style={{
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {photoUrls.map((url, idx) => (
                <div
                  key={idx}
                  style={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    border: "1px solid var(--border-strong)",
                  }}
                >
                  <img
                    src={url}
                    alt={`Upload ${idx + 1}`}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPhotoUrls((prev) => prev.filter((_, i) => i !== idx))
                    }
                    style={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      background: "rgba(15,23,42,0.75)",
                      color: "#fff",
                      border: "none",
                      borderRadius: "50%",
                      width: 22,
                      height: 22,
                      cursor: "pointer",
                      fontSize: "0.7rem",
                    }}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleGenerateAiDraft()}
                disabled={drafting}
              >
                {drafting ? (
                  <>
                    <Loader2 size={17} className="spin" />
                    <span>Gemini Vision Drafting Listing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={17} />
                    <span>Generate AI Listing Draft</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="notice-bar danger">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="notice-bar success">
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Step 2 & 3: Review AI Draft, Set Price & Stock, Publish */}
      {draftId && (
        <form className="card" onSubmit={handlePublish}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 14,
            }}
          >
            <h2 style={{ margin: 0, fontSize: "1.22rem" }}>
              Step 2: Review AI Draft &amp; Set Price (Draft #
              {draftId.slice(0, 8)})
            </h2>
            <span className="badge badge-warning">
              AI Draft — Please Review Before Publishing
            </span>
          </div>

          {aiFallbackUsed ? (
            <div className="notice-bar warning">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>AI Unavailable / Fallback Mode:</strong> Gemini could
                not draft fields for this photo (rate limit or unreachable
                photo). Please fill in the details manually below.
              </div>
            </div>
          ) : (
            <div className="notice-bar info">
              <ShieldCheck size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>AI Draft Review Notice:</strong> Gemini Vision drafted
                the title, description, category, tags, and variants from what
                is visible in the photos.{" "}
                <strong>
                  The AI has no price or stock field — you must verify the
                  text and set the price &amp; stock below.
                </strong>
              </div>
            </div>
          )}

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="draft-title">
                <span>Product Title *</span>
                <span className="badge badge-brand">AI Drafted</span>
              </label>
              <input
                id="draft-title"
                type="text"
                className="form-control"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Handcrafted Ceramic Coffee Mug"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="draft-category">
                <span>Category *</span>
                <span className="badge badge-brand">AI Drafted</span>
              </label>
              <select
                id="draft-category"
                className="form-control"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="draft-desc">
              <span>Description (Visible Details Only)</span>
              <span className="badge badge-brand">AI Drafted</span>
            </label>
            <textarea
              id="draft-desc"
              rows={3}
              className="form-control"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the product..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="draft-tags">
              <span>Tags (comma-separated)</span>
              <span className="badge badge-brand">AI Drafted</span>
            </label>
            <input
              id="draft-tags"
              type="text"
              className="form-control"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="ceramic, mug, handmade"
            />
          </div>

          {/* Variants Editor */}
          <div className="form-group">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <label style={{ margin: 0 }}>
                Variants (e.g. Color: Sand, Ocean)
              </label>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    { name: "Color", optionsText: "" },
                  ])
                }
              >
                <Plus size={14} />
                <span>Add Variant Group</span>
              </button>
            </div>

            {variants.map((v, idx) => (
              <div
                key={idx}
                style={{
                  display: "flex",
                  gap: 8,
                  marginBottom: 8,
                  alignItems: "center",
                }}
              >
                <input
                  type="text"
                  className="form-control"
                  style={{ maxWidth: 160 }}
                  placeholder="Variant Name (e.g. Color)"
                  value={v.name}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((item, i) =>
                        i === idx ? { ...item, name: e.target.value } : item
                      )
                    )
                  }
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Options comma-separated (e.g. Black, Brown)"
                  value={v.optionsText}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((item, i) =>
                        i === idx
                          ? { ...item, optionsText: e.target.value }
                          : item
                      )
                    )
                  }
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() =>
                    setVariants((prev) => prev.filter((_, i) => i !== idx))
                  }
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>

          {/* Seller-Only Price & Stock Section */}
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "var(--radius-md)",
              padding: 18,
              margin: "18px 0",
            }}
          >
            <div
              style={{
                fontWeight: 700,
                fontSize: "0.95rem",
                color: "#92400e",
                marginBottom: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <ShieldCheck size={18} />
              <span>
                Step 3: Seller-Required Pricing &amp; Inventory (Never Touched
                by AI)
              </span>
            </div>

            <div className="form-grid">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="draft-price">
                  <span>Price in USD ($) *</span>
                  <span className="badge badge-warning">Human Only</span>
                </label>
                <input
                  id="draft-price"
                  type="number"
                  step="0.01"
                  min="0.50"
                  className="form-control"
                  placeholder="e.g. 24.99"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label htmlFor="draft-stock">
                  <span>Initial Stock Quantity *</span>
                  <span className="badge badge-warning">Human Only</span>
                </label>
                <input
                  id="draft-stock"
                  type="number"
                  min="0"
                  step="1"
                  className="form-control"
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving || publishing}
              onClick={handleSaveDraft}
            >
              {saving ? "Saving Draft..." : "Save Draft"}
            </button>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={publishing}
            >
              {publishing ? (
                <>
                  <Loader2 size={18} className="spin" />
                  <span>Publishing to Storefront...</span>
                </>
              ) : (
                <>
                  <span>Publish Listing to /{activeSlug}</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Existing Drafts List */}
      {existingDrafts.length > 0 && (
        <div className="card" style={{ marginTop: 28 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "1.05rem" }}>
            Unpublished Drafts ({existingDrafts.length})
          </h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {existingDrafts.map((d) => (
                  <tr key={d.id}>
                    <td>
                      {d.image_url ? (
                        <img
                          src={d.image_url}
                          alt={d.title || "Draft"}
                          style={{
                            width: 44,
                            height: 44,
                            objectFit: "cover",
                            borderRadius: 6,
                          }}
                        />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <strong>{d.title || "(Untitled AI fallback draft)"}</strong>
                    </td>
                    <td>
                      {d.price_cents
                        ? `$${(d.price_cents / 100).toFixed(2)}`
                        : "Not set"}
                    </td>
                    <td>{d.stock_quantity}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleResumeDraft(d)}
                      >
                        Edit &amp; Publish
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
