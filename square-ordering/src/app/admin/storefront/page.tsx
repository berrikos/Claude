"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface BrandingData {
  id: string;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  logoUrl: string | null;
  heroImageUrl: string | null;
  heroText: string | null;
  menuLayout: string;
  fontPair: string;
  announcementText: string | null;
  announcementActive: boolean;
}

export default function StorefrontPage() {
  const { data: session } = useSession();
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const merchantId = session?.user?.merchantId;

  const fetchBranding = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/admin/branding?merchantId=${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setBranding(data.branding);
      }
    } catch (err) {
      console.error("Failed to fetch branding:", err);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  const handleSave = async () => {
    if (!branding || !merchantId) return;
    setSaving(true);
    try {
      await fetch("/api/admin/branding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, ...branding }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof BrandingData, value: string | boolean) => {
    if (branding) setBranding({ ...branding, [key]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      </div>
    );
  }

  if (!branding) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Storefront</h1>
        <p className="text-gray-500">Connect your Square account first to customize your storefront.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Storefront Customization</h1>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600">Saved!</span>}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Colors */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Colors</CardTitle>
            <CardDescription>Customize the colors of your storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ColorPicker label="Primary Color" value={branding.primaryColor} onChange={(v) => update("primaryColor", v)} />
            <ColorPicker label="Accent Color" value={branding.accentColor} onChange={(v) => update("accentColor", v)} />
            <ColorPicker label="Text Color" value={branding.textColor} onChange={(v) => update("textColor", v)} />
          </CardContent>
        </Card>

        {/* Layout */}
        <Card>
          <CardHeader>
            <CardTitle>Menu Layout</CardTitle>
            <CardDescription>Choose how your menu items are displayed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {(["grid", "list", "compact"] as const).map((layout) => (
                <button
                  key={layout}
                  onClick={() => update("menuLayout", layout)}
                  className={`rounded-lg border-2 p-4 text-center transition-colors ${
                    branding.menuLayout === layout
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="mb-2">
                    {layout === "grid" && (
                      <div className="mx-auto grid w-12 grid-cols-2 gap-1">
                        {[1, 2, 3, 4].map((i) => (<div key={i} className="h-4 rounded bg-gray-300" />))}
                      </div>
                    )}
                    {layout === "list" && (
                      <div className="mx-auto flex w-12 flex-col gap-1">
                        {[1, 2, 3].map((i) => (<div key={i} className="h-3 rounded bg-gray-300" />))}
                      </div>
                    )}
                    {layout === "compact" && (
                      <div className="mx-auto grid w-12 grid-cols-3 gap-0.5">
                        {[1, 2, 3, 4, 5, 6].map((i) => (<div key={i} className="h-3 rounded bg-gray-300" />))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium capitalize">{layout}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>Add your logo and hero image.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input label="Logo URL" value={branding.logoUrl || ""} onChange={(e) => update("logoUrl", e.target.value)} placeholder="https://..." />
            <Input label="Hero Image URL" value={branding.heroImageUrl || ""} onChange={(e) => update("heroImageUrl", e.target.value)} placeholder="https://..." />
            <Input label="Hero Text" value={branding.heroText || ""} onChange={(e) => update("heroText", e.target.value)} placeholder="Welcome to our restaurant!" />
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card>
          <CardHeader>
            <CardTitle>Announcement Banner</CardTitle>
            <CardDescription>Display a banner at the top of your storefront.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={branding.announcementActive}
                onChange={(e) => update("announcementActive", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary"
              />
              <span className="text-sm font-medium text-gray-700">Show announcement</span>
            </label>
            <Input
              label="Banner Text"
              value={branding.announcementText || ""}
              onChange={(e) => update("announcementText", e.target.value)}
              placeholder="e.g., Free delivery on orders over $30!"
            />
          </CardContent>
        </Card>

        {/* Font */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Typography</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Font Pair</label>
              <select
                value={branding.fontPair}
                onChange={(e) => update("fontPair", e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="inter-system">Inter + System (Default)</option>
                <option value="poppins-inter">Poppins + Inter</option>
                <option value="playfair-lato">Playfair Display + Lato</option>
                <option value="roboto-opensans">Roboto + Open Sans</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded border"
      />
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1" />
      </div>
    </div>
  );
}
