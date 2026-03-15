"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────

interface NotificationSettings {
  id: string;
  newOrderEmail: boolean;
  newOrderSound: boolean;
  dailySummaryEmail: boolean;
  weeklyReportEmail: boolean;
  lowStockAlerts: boolean;
  alertRecipients: string[];
}

interface TeamMember {
  id: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface HoursEntry {
  id: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  useSquareHours: boolean;
}

interface LocationWithHours {
  id: string;
  name: string;
  onlineOrderingHours: HoursEntry[];
}

const TABS = ["Notifications", "Team", "Business Hours"] as const;
type Tab = (typeof TABS)[number];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const ROLES = ["owner", "manager", "staff", "viewer"] as const;

// ── Toggle switch ──────────────────────────────────────

function Toggle({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-primary" : "bg-gray-200"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ── Main page ──────────────────────────────────────────

export default function SettingsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<Tab>("Notifications");

  if (!session?.user || session.user.userType !== "merchant") {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-gray-500">Please sign in to view settings.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Notifications" && <NotificationsTab />}
      {activeTab === "Team" && <TeamTab currentUserId={session.user.id} />}
      {activeTab === "Business Hours" && <BusinessHoursTab />}
    </div>
  );
}

// ── Notifications tab ──────────────────────────────────

function NotificationsTab() {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [newRecipient, setNewRecipient] = useState("");

  const fetchSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings");
    if (res.ok) {
      const data = await res.json();
      setSettings(data.notificationSettings);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        newOrderEmail: settings.newOrderEmail,
        newOrderSound: settings.newOrderSound,
        dailySummaryEmail: settings.dailySummaryEmail,
        weeklyReportEmail: settings.weeklyReportEmail,
        lowStockAlerts: settings.lowStockAlerts,
        alertRecipients: settings.alertRecipients,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      setSettings(data.notificationSettings);
      setMessage("Settings saved.");
    } else {
      setMessage("Failed to save settings.");
    }
  };

  const addRecipient = () => {
    if (!settings || !newRecipient.trim()) return;
    if (settings.alertRecipients.includes(newRecipient.trim())) return;
    setSettings({
      ...settings,
      alertRecipients: [...settings.alertRecipients, newRecipient.trim()],
    });
    setNewRecipient("");
  };

  const removeRecipient = (email: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      alertRecipients: settings.alertRecipients.filter((r) => r !== email),
    });
  };

  if (!settings) {
    return <p className="text-gray-500">Loading...</p>;
  }

  const toggles: Array<{
    key: keyof NotificationSettings;
    label: string;
    description: string;
  }> = [
    {
      key: "newOrderEmail",
      label: "New Order Email",
      description: "Receive an email for every new order",
    },
    {
      key: "newOrderSound",
      label: "New Order Sound",
      description: "Play a notification sound for new orders",
    },
    {
      key: "dailySummaryEmail",
      label: "Daily Summary",
      description: "Receive a daily order summary email",
    },
    {
      key: "weeklyReportEmail",
      label: "Weekly Report",
      description: "Receive a weekly performance report",
    },
    {
      key: "lowStockAlerts",
      label: "Low Stock Alerts",
      description: "Get notified when items are running low",
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Notification Preferences
        </h2>

        <div className="space-y-4">
          {toggles.map((t) => (
            <div key={t.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">{t.label}</p>
                <p className="text-sm text-gray-500">{t.description}</p>
              </div>
              <Toggle
                checked={settings[t.key] as boolean}
                onChange={(val) =>
                  setSettings({ ...settings, [t.key]: val })
                }
              />
            </div>
          ))}
        </div>

        {/* Alert recipients */}
        <div className="mt-8">
          <h3 className="mb-2 text-sm font-semibold text-gray-900">
            Alert Recipients
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            Email addresses that receive alert notifications.
          </p>

          <div className="mb-3 flex gap-2">
            <Input
              type="email"
              placeholder="email@example.com"
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addRecipient();
                }
              }}
            />
            <Button variant="outline" onClick={addRecipient}>
              Add
            </Button>
          </div>

          {settings.alertRecipients.length > 0 ? (
            <ul className="space-y-2">
              {settings.alertRecipients.map((email) => (
                <li
                  key={email}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-700">{email}</span>
                  <button
                    onClick={() => removeRecipient(email)}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No recipients added.</p>
          )}
        </div>

        {/* Save */}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {message && (
            <span
              className={`text-sm ${
                message.includes("Failed") ? "text-red-600" : "text-green-600"
              }`}
            >
              {message}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Team tab ───────────────────────────────────────────

function TeamTab({ currentUserId }: { currentUserId: string }) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    email: "",
    givenName: "",
    familyName: "",
    role: "staff" as string,
    password: "",
  });
  const [addError, setAddError] = useState("");
  const [addLoading, setAddLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    const res = await fetch("/api/admin/settings/team");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async () => {
    if (!addForm.email || !addForm.password || !addForm.role) {
      setAddError("Email, password, and role are required.");
      return;
    }
    setAddLoading(true);
    setAddError("");
    const res = await fetch("/api/admin/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAddLoading(false);
    if (res.ok) {
      setShowAddForm(false);
      setAddForm({
        email: "",
        givenName: "",
        familyName: "",
        role: "staff",
        password: "",
      });
      fetchMembers();
    } else {
      const data = await res.json();
      setAddError(data.error || "Failed to add team member.");
    }
  };

  const updateMember = async (
    memberId: string,
    update: { role?: string; isActive?: boolean }
  ) => {
    const res = await fetch(`/api/admin/settings/team/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (res.ok) {
      fetchMembers();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to update member.");
    }
  };

  const deleteMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team?`)) return;
    const res = await fetch(`/api/admin/settings/team/${memberId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchMembers();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to delete member.");
    }
  };

  if (loading) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Team Members</h2>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel" : "Add Team Member"}
        </Button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <Card>
          <CardContent className="space-y-3 p-6">
            <h3 className="text-sm font-semibold text-gray-900">
              New Team Member
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="First Name"
                value={addForm.givenName}
                onChange={(e) =>
                  setAddForm({ ...addForm, givenName: e.target.value })
                }
              />
              <Input
                label="Last Name"
                value={addForm.familyName}
                onChange={(e) =>
                  setAddForm({ ...addForm, familyName: e.target.value })
                }
              />
            </div>
            <Input
              label="Email"
              type="email"
              value={addForm.email}
              onChange={(e) =>
                setAddForm({ ...addForm, email: e.target.value })
              }
            />
            <Input
              label="Password"
              type="password"
              value={addForm.password}
              onChange={(e) =>
                setAddForm({ ...addForm, password: e.target.value })
              }
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                value={addForm.role}
                onChange={(e) =>
                  setAddForm({ ...addForm, role: e.target.value })
                }
                className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            {addError && (
              <p className="text-sm text-red-600">{addError}</p>
            )}
            <Button onClick={addMember} disabled={addLoading}>
              {addLoading ? "Adding..." : "Add Member"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <p className="text-gray-500">No team members found.</p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => {
            const displayName =
              [member.givenName, member.familyName].filter(Boolean).join(" ") ||
              "Unnamed";
            const isSelf = member.id === currentUserId;
            return (
              <Card key={member.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {displayName}
                        </p>
                        {isSelf && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                            You
                          </span>
                        )}
                        <span
                          className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                            member.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {member.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      <p className="text-xs text-gray-400">
                        Last login:{" "}
                        {member.lastLoginAt
                          ? new Date(member.lastLoginAt).toLocaleDateString()
                          : "Never"}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Role selector */}
                      <select
                        value={member.role}
                        onChange={(e) =>
                          updateMember(member.id, { role: e.target.value })
                        }
                        disabled={isSelf}
                        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r.charAt(0).toUpperCase() + r.slice(1)}
                          </option>
                        ))}
                      </select>

                      {/* Toggle active */}
                      <Toggle
                        checked={member.isActive}
                        onChange={(val) =>
                          updateMember(member.id, { isActive: val })
                        }
                        disabled={isSelf}
                      />

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMember(member.id, displayName)}
                        disabled={isSelf}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Business Hours tab ─────────────────────────────────

function BusinessHoursTab() {
  const [locations, setLocations] = useState<LocationWithHours[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [hours, setHours] = useState<
    Array<{ dayOfWeek: number; openTime: string; closeTime: string }>
  >([]);
  const [useSquareHours, setUseSquareHours] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchLocations = useCallback(async () => {
    const res = await fetch("/api/admin/settings/hours");
    if (res.ok) {
      const data = await res.json();
      setLocations(data.locations);
      if (data.locations.length > 0 && !selectedLocationId) {
        setSelectedLocationId(data.locations[0].id);
      }
    }
    setLoading(false);
  }, [selectedLocationId]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // When selected location changes, populate hours
  useEffect(() => {
    if (!selectedLocationId) return;
    const loc = locations.find((l) => l.id === selectedLocationId);
    if (!loc) return;

    if (loc.onlineOrderingHours.length > 0) {
      setUseSquareHours(loc.onlineOrderingHours[0].useSquareHours);
      setHours(
        loc.onlineOrderingHours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          openTime: h.openTime,
          closeTime: h.closeTime,
        }))
      );
    } else {
      // Default hours for all 7 days
      setUseSquareHours(true);
      setHours(
        DAY_NAMES.map((_, i) => ({
          dayOfWeek: i,
          openTime: "09:00",
          closeTime: "21:00",
        }))
      );
    }
  }, [selectedLocationId, locations]);

  const updateHour = (
    dayOfWeek: number,
    field: "openTime" | "closeTime",
    value: string
  ) => {
    setHours((prev) =>
      prev.map((h) =>
        h.dayOfWeek === dayOfWeek ? { ...h, [field]: value } : h
      )
    );
  };

  const save = async () => {
    if (!selectedLocationId) return;
    setSaving(true);
    setMessage("");
    const res = await fetch("/api/admin/settings/hours", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationId: selectedLocationId, hours }),
    });
    setSaving(false);
    if (res.ok) {
      setMessage("Hours saved.");
      fetchLocations();
    } else {
      setMessage("Failed to save hours.");
    }
  };

  if (loading) {
    return <p className="text-gray-500">Loading...</p>;
  }

  if (locations.length === 0) {
    return <p className="text-gray-500">No locations found.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Location selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          Location
        </label>
        <select
          value={selectedLocationId}
          onChange={(e) => setSelectedLocationId(e.target.value)}
          className="flex h-10 w-full max-w-sm rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      {/* Use Square hours toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                Use Square POS Hours
              </p>
              <p className="text-sm text-gray-500">
                Sync ordering hours with your Square POS business hours
              </p>
            </div>
            <Toggle
              checked={useSquareHours}
              onChange={setUseSquareHours}
            />
          </div>

          {/* Hours grid */}
          {!useSquareHours && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-900">
                Custom Ordering Hours
              </h3>
              <div className="space-y-2">
                {DAY_NAMES.map((day, i) => {
                  const entry = hours.find((h) => h.dayOfWeek === i);
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2"
                    >
                      <span className="w-28 text-sm font-medium text-gray-700">
                        {day}
                      </span>
                      <input
                        type="time"
                        value={entry?.openTime || "09:00"}
                        onChange={(e) =>
                          updateHour(i, "openTime", e.target.value)
                        }
                        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                      <span className="text-sm text-gray-400">to</span>
                      <input
                        type="time"
                        value={entry?.closeTime || "21:00"}
                        onChange={(e) =>
                          updateHour(i, "closeTime", e.target.value)
                        }
                        className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {useSquareHours && (
            <p className="text-sm text-gray-400">
              Ordering hours are synced from your Square POS. Disable the toggle
              above to set custom hours.
            </p>
          )}

          {/* Save */}
          {!useSquareHours && (
            <div className="mt-4 flex items-center gap-3">
              <Button onClick={save} disabled={saving}>
                {saving ? "Saving..." : "Save Hours"}
              </Button>
              {message && (
                <span
                  className={`text-sm ${
                    message.includes("Failed")
                      ? "text-red-600"
                      : "text-green-600"
                  }`}
                >
                  {message}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
