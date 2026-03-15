"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

interface PromotionData {
  id: string;
  name: string;
  type: string;
  value: number;
  freeItemId: string | null;
  promoCode: string | null;
  minOrderAmount: number | null;
  maxUses: number | null;
  timesUsed: number;
  startsAt: string;
  endsAt: string | null;
  isActive: boolean;
  targetAudience: string;
  displayOnStorefront: boolean;
  displayOnCheckout: boolean;
  createdAt: string;
}

interface FormState {
  name: string;
  type: string;
  value: string;
  promoCode: string;
  minOrderAmount: string;
  maxUses: string;
  startsAt: string;
  endsAt: string;
  targetAudience: string;
  displayOnStorefront: boolean;
  displayOnCheckout: boolean;
}

const emptyForm: FormState = {
  name: "",
  type: "percentage",
  value: "",
  promoCode: "",
  minOrderAmount: "",
  maxUses: "",
  startsAt: new Date().toISOString().slice(0, 16),
  endsAt: "",
  targetAudience: "all",
  displayOnStorefront: true,
  displayOnCheckout: true,
};

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function formatDiscountValue(type: string, value: number): string {
  if (type === "percentage") return `${value}% off`;
  if (type === "fixed_amount") return `${formatPrice(value)} off`;
  return "Free item";
}

export default function PromotionsPage() {
  const { data: session } = useSession();
  const [promotions, setPromotions] = useState<PromotionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const merchantId = session?.user?.merchantId;

  const fetchPromotions = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(
        `/api/admin/promotions?merchantId=${merchantId}`
      );
      if (res.ok) {
        const data = await res.json();
        setPromotions(data.promotions || []);
      }
    } catch (err) {
      console.error("Failed to fetch promotions:", err);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const updateForm = (updates: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (promo: PromotionData) => {
    setEditingId(promo.id);
    setForm({
      name: promo.name,
      type: promo.type,
      value:
        promo.type === "fixed_amount"
          ? (promo.value / 100).toFixed(2)
          : String(promo.value),
      promoCode: promo.promoCode || "",
      minOrderAmount: promo.minOrderAmount
        ? (promo.minOrderAmount / 100).toFixed(2)
        : "",
      maxUses: promo.maxUses != null ? String(promo.maxUses) : "",
      startsAt: promo.startsAt.slice(0, 16),
      endsAt: promo.endsAt ? promo.endsAt.slice(0, 16) : "",
      targetAudience: promo.targetAudience,
      displayOnStorefront: promo.displayOnStorefront,
      displayOnCheckout: promo.displayOnCheckout,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.name || (form.type !== "free_item" && !form.value) || !form.startsAt) return;
    setSaving(true);

    const payload = {
      name: form.name,
      type: form.type,
      value:
        form.type === "fixed_amount"
          ? Math.round(parseFloat(form.value) * 100)
          : form.type === "free_item"
            ? 0
            : Number(form.value),
      promoCode: form.promoCode || null,
      minOrderAmount: form.minOrderAmount
        ? Math.round(parseFloat(form.minOrderAmount) * 100)
        : null,
      maxUses: form.maxUses ? Number(form.maxUses) : null,
      startsAt: new Date(form.startsAt).toISOString(),
      endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      targetAudience: form.targetAudience,
      displayOnStorefront: form.displayOnStorefront,
      displayOnCheckout: form.displayOnCheckout,
    };

    try {
      const url = editingId
        ? `/api/admin/promotions/${editingId}`
        : "/api/admin/promotions";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        closeModal();
        await fetchPromotions();
      }
    } catch (err) {
      console.error("Failed to save promotion:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (promo: PromotionData) => {
    try {
      await fetch(`/api/admin/promotions/${promo.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !promo.isActive }),
      });
      await fetchPromotions();
    } catch (err) {
      console.error("Failed to toggle promotion:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
      setDeleteConfirmId(null);
      await fetchPromotions();
    } catch (err) {
      console.error("Failed to delete promotion:", err);
    }
  };

  const isExpired = (promo: PromotionData) =>
    promo.endsAt != null && new Date(promo.endsAt) < new Date();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
        <Button onClick={openCreate}>Create Promotion</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
        </div>
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6h.008v.008H6V6z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No promotions yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first promotion or discount code to attract customers.
            </p>
            <Button className="mt-4" onClick={openCreate}>
              Create Your First Promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => (
            <Card
              key={promo.id}
              className={`transition-opacity ${
                !promo.isActive || isExpired(promo) ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-gray-900">
                        {promo.name}
                      </h3>
                      {!promo.isActive && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          Inactive
                        </span>
                      )}
                      {isExpired(promo) && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
                          Expired
                        </span>
                      )}
                      {promo.displayOnStorefront && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Storefront
                        </span>
                      )}
                      {promo.displayOnCheckout && (
                        <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                          Checkout
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="font-semibold text-primary">
                        {formatDiscountValue(promo.type, promo.value)}
                      </span>
                      {promo.promoCode && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs font-medium">
                          {promo.promoCode}
                        </span>
                      )}
                      {promo.minOrderAmount != null &&
                        promo.minOrderAmount > 0 && (
                          <span>
                            Min: {formatPrice(promo.minOrderAmount)}
                          </span>
                        )}
                      <span className="capitalize">
                        {promo.targetAudience === "all"
                          ? "All customers"
                          : promo.targetAudience === "new"
                            ? "New customers"
                            : "Returning customers"}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        {new Date(promo.startsAt).toLocaleDateString()}
                        {promo.endsAt &&
                          ` - ${new Date(promo.endsAt).toLocaleDateString()}`}
                      </span>
                      <span>
                        Used {promo.timesUsed}
                        {promo.maxUses != null
                          ? `/${promo.maxUses}`
                          : ""}{" "}
                        times
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => handleToggle(promo)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        promo.isActive ? "bg-primary" : "bg-gray-200"
                      }`}
                      role="switch"
                      aria-checked={promo.isActive}
                      aria-label={`Toggle ${promo.name}`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                          promo.isActive
                            ? "translate-x-5"
                            : "translate-x-0"
                        }`}
                      />
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(promo)}
                    >
                      Edit
                    </Button>
                    {deleteConfirmId === promo.id ? (
                      <>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDelete(promo.id)}
                        >
                          Confirm
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteConfirmId(null)}
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(promo.id)}
                        className="text-gray-400 hover:text-red-500"
                        aria-label={`Delete ${promo.name}`}
                      >
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-[10vh]"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingId ? "Edit Promotion" : "Create Promotion"}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="e.g., Summer Sale 20% Off"
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Discount Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { value: "percentage", label: "% Off" },
                      { value: "fixed_amount", label: "$ Off" },
                      { value: "free_item", label: "Free Item" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updateForm({ type: option.value })}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        form.type === option.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.type !== "free_item" && (
                <Input
                  label={
                    form.type === "percentage"
                      ? "Discount Percentage"
                      : "Discount Amount ($)"
                  }
                  type="number"
                  placeholder={
                    form.type === "percentage" ? "e.g., 20" : "e.g., 5.00"
                  }
                  min="0"
                  step={form.type === "percentage" ? "1" : "0.01"}
                  value={form.value}
                  onChange={(e) => updateForm({ value: e.target.value })}
                />
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Promo Code (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateForm({ promoCode: generateCode() })}
                    className="text-xs font-medium text-primary hover:text-primary/80"
                  >
                    Auto-generate
                  </button>
                </div>
                <Input
                  placeholder="e.g., SUMMER20"
                  value={form.promoCode}
                  onChange={(e) =>
                    updateForm({ promoCode: e.target.value.toUpperCase() })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Min Order ($, optional)"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={form.minOrderAmount}
                  onChange={(e) =>
                    updateForm({ minOrderAmount: e.target.value })
                  }
                />
                <Input
                  label="Max Uses (optional)"
                  type="number"
                  placeholder="Unlimited"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => updateForm({ maxUses: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Start Date"
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => updateForm({ startsAt: e.target.value })}
                />
                <Input
                  label="End Date (optional)"
                  type="datetime-local"
                  value={form.endsAt}
                  onChange={(e) => updateForm({ endsAt: e.target.value })}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Target Audience
                </label>
                <select
                  value={form.targetAudience}
                  onChange={(e) =>
                    updateForm({ targetAudience: e.target.value })
                  }
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Customers</option>
                  <option value="new">New Customers</option>
                  <option value="returning">Returning Customers</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.displayOnStorefront}
                    onClick={() =>
                      updateForm({
                        displayOnStorefront: !form.displayOnStorefront,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      form.displayOnStorefront ? "bg-primary" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        form.displayOnStorefront
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">
                    Display on Storefront
                  </span>
                </label>

                <label className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.displayOnCheckout}
                    onClick={() =>
                      updateForm({
                        displayOnCheckout: !form.displayOnCheckout,
                      })
                    }
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      form.displayOnCheckout ? "bg-primary" : "bg-gray-200"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                        form.displayOnCheckout
                          ? "translate-x-5"
                          : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span className="text-sm text-gray-700">
                    Display on Checkout
                  </span>
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button variant="outline" onClick={closeModal}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={
                  saving ||
                  !form.name ||
                  (form.type !== "free_item" && !form.value) ||
                  !form.startsAt
                }
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Save Changes"
                    : "Create Promotion"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
