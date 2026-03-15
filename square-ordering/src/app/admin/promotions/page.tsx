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
}

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function PromotionsPage() {
  const { data: session } = useSession();
  const [promotions, setPromotions] = useState<PromotionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formType, setFormType] = useState("percentage");
  const [formValue, setFormValue] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formMinOrder, setFormMinOrder] = useState("");
  const [formMaxUses, setFormMaxUses] = useState("");
  const [formStartsAt, setFormStartsAt] = useState(new Date().toISOString().slice(0, 10));
  const [formEndsAt, setFormEndsAt] = useState("");
  const [formAudience, setFormAudience] = useState("all");
  const [formStorefront, setFormStorefront] = useState(true);
  const [formCheckout, setFormCheckout] = useState(true);

  const merchantId = session?.user?.merchantId;

  const fetchPromotions = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/admin/promotions?merchantId=${merchantId}`);
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

  const resetForm = () => {
    setFormName("");
    setFormType("percentage");
    setFormValue("");
    setFormCode("");
    setFormMinOrder("");
    setFormMaxUses("");
    setFormStartsAt(new Date().toISOString().slice(0, 10));
    setFormEndsAt("");
    setFormAudience("all");
    setFormStorefront(true);
    setFormCheckout(true);
    setShowForm(false);
  };

  const handleCreate = async () => {
    if (!formName || !formValue) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          type: formType,
          value: formType === "percentage" ? Number(formValue) : Math.round(Number(formValue) * 100),
          promoCode: formCode || null,
          minOrderAmount: formMinOrder ? Math.round(Number(formMinOrder) * 100) : null,
          maxUses: formMaxUses ? Number(formMaxUses) : null,
          startsAt: formStartsAt,
          endsAt: formEndsAt || null,
          targetAudience: formAudience,
          displayOnStorefront: formStorefront,
          displayOnCheckout: formCheckout,
        }),
      });
      if (res.ok) {
        resetForm();
        fetchPromotions();
      }
    } catch (err) {
      console.error("Failed to create promotion:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    try {
      await fetch(`/api/admin/promotions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchPromotions();
    } catch (err) {
      console.error("Failed to toggle promotion:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this promotion?")) return;
    try {
      await fetch(`/api/admin/promotions/${id}`, { method: "DELETE" });
      fetchPromotions();
    } catch (err) {
      console.error("Failed to delete promotion:", err);
    }
  };

  const formatValue = (p: PromotionData) => {
    if (p.type === "percentage") return `${p.value}% off`;
    if (p.type === "fixed_amount") return `${formatPrice(p.value)} off`;
    return "Free item";
  };

  const isExpired = (p: PromotionData) => p.endsAt && new Date(p.endsAt) < new Date();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Promotions</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>Create Promotion</Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-medium">New Promotion</h3>
            <div className="space-y-4">
              <Input
                label="Promotion Name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Summer Special"
                required
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Type</label>
                <div className="flex gap-2">
                  {[
                    { value: "percentage", label: "% Off" },
                    { value: "fixed_amount", label: "$ Off" },
                    { value: "free_item", label: "Free Item" },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setFormType(t.value)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        formType === t.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {formType !== "free_item" && (
                <Input
                  label={formType === "percentage" ? "Discount (%)" : "Discount Amount ($)"}
                  type="number"
                  value={formValue}
                  onChange={(e) => setFormValue(e.target.value)}
                  placeholder={formType === "percentage" ? "15" : "5.00"}
                  required
                />
              )}

              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Input
                    label="Promo Code (optional)"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="SUMMER25"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormCode(generateCode())}
                >
                  Generate
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Min Order ($, optional)"
                  type="number"
                  value={formMinOrder}
                  onChange={(e) => setFormMinOrder(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Max Uses (optional)"
                  type="number"
                  value={formMaxUses}
                  onChange={(e) => setFormMaxUses(e.target.value)}
                  placeholder="Unlimited"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Start Date"
                  type="date"
                  value={formStartsAt}
                  onChange={(e) => setFormStartsAt(e.target.value)}
                  required
                />
                <Input
                  label="End Date (optional)"
                  type="date"
                  value={formEndsAt}
                  onChange={(e) => setFormEndsAt(e.target.value)}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Target Audience</label>
                <select
                  value={formAudience}
                  onChange={(e) => setFormAudience(e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Customers</option>
                  <option value="new">New Customers Only</option>
                  <option value="returning">Returning Customers Only</option>
                </select>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formStorefront}
                    onChange={(e) => setFormStorefront(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show on storefront
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={formCheckout}
                    onChange={(e) => setFormCheckout(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Show at checkout
                </label>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreate} disabled={saving || !formName}>
                  {saving ? "Creating..." : "Create Promotion"}
                </Button>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Promotions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
        </div>
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
            </svg>
            <p className="mt-4 text-gray-500">No promotions yet.</p>
            <Button className="mt-4" onClick={() => setShowForm(true)}>Create Your First Promotion</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map((promo) => (
            <Card key={promo.id} className={`transition-opacity ${!promo.isActive || isExpired(promo) ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{promo.name}</h3>
                      {!promo.isActive && (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Inactive</span>
                      )}
                      {isExpired(promo) && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-600">Expired</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className="font-medium text-primary">{formatValue(promo)}</span>
                      {promo.promoCode && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-xs">
                          {promo.promoCode}
                        </span>
                      )}
                      {promo.minOrderAmount && promo.minOrderAmount > 0 && (
                        <span>Min: {formatPrice(promo.minOrderAmount)}</span>
                      )}
                      <span className="capitalize">{promo.targetAudience} customers</span>
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                      <span>
                        {new Date(promo.startsAt).toLocaleDateString()}
                        {promo.endsAt && ` - ${new Date(promo.endsAt).toLocaleDateString()}`}
                      </span>
                      <span>
                        Used {promo.timesUsed}
                        {promo.maxUses ? `/${promo.maxUses}` : ""} times
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(promo.id, promo.isActive)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                        promo.isActive ? "bg-primary" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
                          promo.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
