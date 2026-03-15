"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type Step = "connect" | "locations" | "customize" | "complete";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" /></div>}>
      <OnboardingContent />
    </Suspense>
  );
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stepParam = searchParams.get("step") as Step | null;
  const merchantParam = searchParams.get("merchant");
  const errorParam = searchParams.get("error");

  const [step, setStep] = useState<Step>(stepParam || "connect");
  const [merchantId, setMerchantId] = useState(merchantParam || "");
  const [locations, setLocations] = useState<Array<{
    id: string;
    name: string;
    squareLocationId: string;
    isActive: boolean;
    onlineOrdering: boolean;
  }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (stepParam) setStep(stepParam);
    if (merchantParam) setMerchantId(merchantParam);
  }, [stepParam, merchantParam]);

  useEffect(() => {
    if (step === "locations" && merchantId) {
      fetchLocations();
    }
  }, [step, merchantId]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLocations = async () => {
    try {
      const res = await fetch(`/api/admin/locations?merchantId=${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    }
  };

  const handleConnectSquare = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/square/oauth");
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  };

  const handleToggleLocation = async (locationId: string, enabled: boolean) => {
    try {
      await fetch(`/api/admin/locations/${locationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onlineOrdering: enabled }),
      });
      setLocations((prev) =>
        prev.map((loc) =>
          loc.id === locationId ? { ...loc, onlineOrdering: enabled } : loc
        )
      );
    } catch (err) {
      console.error("Failed to toggle location:", err);
    }
  };

  const handleSyncMenu = async () => {
    setLoading(true);
    try {
      await fetch("/api/square/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, action: "sync" }),
      });
      setStep("complete");
    } catch {
      // Continue anyway
      setStep("complete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center">
      <div className="w-full max-w-lg">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {(["connect", "locations", "customize", "complete"] as Step[]).map(
            (s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    step === s
                      ? "bg-primary text-white"
                      : (["connect", "locations", "customize", "complete"].indexOf(step) >
                        i)
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {["connect", "locations", "customize", "complete"].indexOf(step) > i
                    ? "\u2713"
                    : i + 1}
                </div>
                {i < 3 && (
                  <div
                    className={`h-0.5 w-8 ${
                      ["connect", "locations", "customize", "complete"].indexOf(step) > i
                        ? "bg-green-500"
                        : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            )
          )}
        </div>

        {/* Error */}
        {errorParam && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {errorParam === "oauth_failed"
              ? "Failed to connect to Square. Please try again."
              : errorParam === "invalid_state"
              ? "Security validation failed. Please try again."
              : `Error: ${errorParam}`}
          </div>
        )}

        {/* Step: Connect Square */}
        {step === "connect" && (
          <Card>
            <CardHeader>
              <CardTitle>Connect Your Square Account</CardTitle>
              <CardDescription>
                Link your Square POS to start accepting online orders. We&apos;ll
                import your menu, locations, and customer data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleConnectSquare}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Connecting..." : "Connect Square POS"}
              </Button>
              <p className="mt-4 text-center text-xs text-gray-400">
                You&apos;ll be redirected to Square to authorize access.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Step: Select Locations */}
        {step === "locations" && (
          <Card>
            <CardHeader>
              <CardTitle>Select Locations</CardTitle>
              <CardDescription>
                Choose which locations should accept online orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <p className="py-4 text-center text-gray-500">
                  Loading locations...
                </p>
              ) : (
                <div className="space-y-3">
                  {locations.map((loc) => (
                    <label
                      key={loc.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={loc.onlineOrdering}
                        onChange={(e) =>
                          handleToggleLocation(loc.id, e.target.checked)
                        }
                        className="h-4 w-4 rounded border-gray-300 text-primary"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{loc.name}</p>
                        <p className="text-sm text-gray-500">
                          {loc.squareLocationId}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              <Button
                onClick={() => setStep("customize")}
                className="mt-6 w-full"
                disabled={!locations.some((l) => l.onlineOrdering)}
              >
                Continue
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Customize */}
        {step === "customize" && (
          <Card>
            <CardHeader>
              <CardTitle>Import Your Menu</CardTitle>
              <CardDescription>
                We&apos;ll sync your menu from Square. You can customize it later
                in the Menu section.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleSyncMenu}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? "Syncing menu..." : "Sync Menu from Square"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <CardTitle>You&apos;re All Set!</CardTitle>
              <CardDescription>
                Your online ordering is ready. You can now customize your
                storefront, manage your menu, and start accepting orders.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={() => router.push("/admin/dashboard")}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => router.push("/admin/storefront")}
                variant="outline"
                className="w-full"
              >
                Customize Storefront
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
