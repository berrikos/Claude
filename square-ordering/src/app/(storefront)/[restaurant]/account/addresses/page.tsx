"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Address {
  id: string;
  label: string;
  address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    zip: string;
  };
  isDefault: boolean;
}

export default function AddressesPage() {
  const { data: session } = useSession();
  const params = useParams();
  const restaurant = params.restaurant as string;
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/account/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (err) {
      console.error("Failed to fetch addresses:", err);
    }
  }, []);

  useEffect(() => {
    if (session?.user) fetchAddresses();
  }, [session, fetchAddresses]);

  const handleAdd = async () => {
    try {
      await fetch("/api/account/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label || "Home",
          address: { line1, line2, city, state, zip },
        }),
      });
      setShowForm(false);
      setLabel(""); setLine1(""); setLine2(""); setCity(""); setState(""); setZip("");
      fetchAddresses();
    } catch (err) {
      console.error("Failed to add address:", err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      fetchAddresses();
    } catch (err) {
      console.error("Failed to delete address:", err);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href={`/${restaurant}/account`} className="text-gray-400 hover:text-gray-600">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
      </div>

      {addresses.length === 0 && !showForm && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="mb-4 text-gray-500">No saved addresses.</p>
          <Button onClick={() => setShowForm(true)}>Add Address</Button>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="mb-4 space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-start justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium text-gray-900">
                  {addr.label}
                  {addr.isDefault && (
                    <span className="ml-2 text-xs text-primary">Default</span>
                  )}
                </p>
                <p className="text-sm text-gray-500">
                  {addr.address.line1}
                  {addr.address.line2 && `, ${addr.address.line2}`}
                </p>
                <p className="text-sm text-gray-500">
                  {addr.address.city}, {addr.address.state} {addr.address.zip}
                </p>
              </div>
              <button
                onClick={() => handleDelete(addr.id)}
                className="text-gray-400 hover:text-red-500"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {!showForm && addresses.length > 0 && (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          Add Address
        </Button>
      )}

      {showForm && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 font-medium">New Address</h3>
          <div className="space-y-3">
            <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Home, Work, etc." />
            <Input label="Address Line 1" value={line1} onChange={(e) => setLine1(e.target.value)} required />
            <Input label="Address Line 2" value={line2} onChange={(e) => setLine2(e.target.value)} />
            <div className="grid grid-cols-3 gap-2">
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} required />
              <Input label="State" value={state} onChange={(e) => setState(e.target.value)} required />
              <Input label="ZIP" value={zip} onChange={(e) => setZip(e.target.value)} required />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAdd}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
