"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MenuCategory, MenuItem } from "@/types";

export default function MenuManagementPage() {
  const { data: session } = useSession();
  const [menu, setMenu] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState("");

  const merchantId = session?.user?.merchantId;

  const fetchMenu = useCallback(async () => {
    if (!merchantId) return;
    try {
      const res = await fetch(`/api/square/catalog?merchantId=${merchantId}`);
      if (res.ok) {
        const data = await res.json();
        setMenu(data.menu || []);
      }
    } catch (err) {
      console.error("Failed to fetch menu:", err);
    } finally {
      setLoading(false);
    }
  }, [merchantId]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await fetch("/api/square/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, action: "sync" }),
      });
      await fetchMenu();
    } finally {
      setSyncing(false);
    }
  };

  const handleUpdateItem = async (itemId: string, updates: Record<string, unknown>) => {
    try {
      await fetch("/api/admin/menu/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, itemId, ...updates }),
      });
      await fetchMenu();
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  };

  const filteredMenu = search
    ? menu
        .map((cat) => ({
          ...cat,
          items: cat.items.filter(
            (item) =>
              item.name.toLowerCase().includes(search.toLowerCase()) ||
              item.description?.toLowerCase().includes(search.toLowerCase())
          ),
        }))
        .filter((cat) => cat.items.length > 0)
    : menu;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? "Syncing..." : "Sync from Square"}
        </Button>
      </div>

      <div className="mb-6">
        <Input
          placeholder="Search menu items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filteredMenu.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">
              {search
                ? "No items match your search."
                : "No menu items found. Sync your menu from Square to get started."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {filteredMenu.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{category.name}</span>
                  <span className="text-sm font-normal text-gray-400">
                    {category.items.length} item{category.items.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-4 py-3"
                    >
                      <div className="flex items-center gap-3">
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-sm text-gray-500">
                            {item.variations.length > 1
                              ? `${item.variations.length} variations`
                              : `$${(item.variations[0]?.priceCents / 100).toFixed(2)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.isFeatured && (
                          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                            Featured
                          </span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedItem(item)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleUpdateItem(item.id, {
                              isVisible: !item.isAvailable,
                            })
                          }
                        >
                          {item.isAvailable ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Item Modal */}
      {selectedItem && (
        <ItemEditModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={(updates) => {
            handleUpdateItem(selectedItem.id, updates);
            setSelectedItem(null);
          }}
        />
      )}
    </div>
  );
}

function ItemEditModal({
  item,
  onClose,
  onSave,
}: {
  item: MenuItem;
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => void;
}) {
  const [displayName, setDisplayName] = useState(item.name);
  const [description, setDescription] = useState(item.description || "");
  const [isFeatured, setIsFeatured] = useState(item.isFeatured);
  const [spicyLevel, setSpicyLevel] = useState(item.spicyLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Edit Item</h2>

        <div className="space-y-4">
          <Input
            label="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary"
            />
            <span className="text-sm font-medium text-gray-700">Featured Item</span>
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Spicy Level (0-5)
            </label>
            <input
              type="range"
              min={0}
              max={5}
              value={spicyLevel}
              onChange={(e) => setSpicyLevel(Number(e.target.value))}
              className="w-full"
            />
            <div className="text-center text-sm text-gray-500">
              {spicyLevel === 0 ? "Not spicy" : "\uD83C\uDF36\uFE0F".repeat(spicyLevel)}
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave({
                displayName,
                displayDescription: description,
                isFeatured,
                spicyLevel,
              })
            }
            className="flex-1"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
