"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AccountSettingsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const restaurant = params.restaurant as string;

  const [givenName, setGivenName] = useState(session?.user?.name?.split(" ")[0] || "");
  const [familyName, setFamilyName] = useState(session?.user?.name?.split(" ").slice(1).join(" ") || "");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("/api/account/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ givenName, familyName, phone }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/${restaurant}/account`}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
      </div>

      <div className="space-y-4">
        <Input
          label="Email"
          value={session?.user?.email || ""}
          disabled
          className="bg-gray-50"
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First Name"
            value={givenName}
            onChange={(e) => setGivenName(e.target.value)}
          />
          <Input
            label="Last Name"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
          />
        </div>
        <Input
          label="Phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {saved && <span className="text-sm text-green-600">Saved!</span>}
        </div>
      </div>
    </div>
  );
}
