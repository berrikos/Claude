"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LocationData {
  id: string;
  name: string;
  squareLocationId: string;
  isActive: boolean;
  onlineOrdering: boolean;
  pickupEnabled: boolean;
  curbsideEnabled: boolean;
  address: {
    addressLine1?: string;
    locality?: string;
    administrativeDistrictLevel1?: string;
  } | null;
}

export default function LocationsPage() {
  const { data: session } = useSession();
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loading, setLoading] = useState(true);

  const merchantId = session?.user?.merchantId;

  const fetchLocations = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/admin/locations?merchantId=${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setLocations(data.locations || []);
      }
    } catch (err) {
      console.error("Failed to fetch locations:", err);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleToggle = async (id: string, field: string, value: boolean) => {
    try {
      await fetch(`/api/admin/locations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      setLocations((prev) =>
        prev.map((loc) => (loc.id === id ? { ...loc, [field]: value } : loc))
      );
    } catch (err) {
      console.error("Failed to update location:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Locations</h1>

      {locations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              No locations found. Connect your Square account to import locations.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((loc) => (
            <Card key={loc.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{loc.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      loc.onlineOrdering
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {loc.onlineOrdering ? "Online" : "Offline"}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loc.address && (
                  <p className="mb-4 text-sm text-gray-500">
                    {[
                      loc.address.addressLine1,
                      loc.address.locality,
                      loc.address.administrativeDistrictLevel1,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}

                <div className="space-y-3">
                  <Toggle
                    label="Online Ordering"
                    checked={loc.onlineOrdering}
                    onChange={(v) => handleToggle(loc.id, "onlineOrdering", v)}
                  />
                  <Toggle
                    label="Pickup"
                    checked={loc.pickupEnabled}
                    onChange={(v) => handleToggle(loc.id, "pickupEnabled", v)}
                  />
                  <Toggle
                    label="Curbside"
                    checked={loc.curbsideEnabled}
                    onChange={(v) => handleToggle(loc.id, "curbsideEnabled", v)}
                  />
                </div>

                <div className="mt-4">
                  <Button variant="outline" size="sm" className="w-full">
                    Configure Hours
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
