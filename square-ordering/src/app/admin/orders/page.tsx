"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentType: string;
  guestName: string | null;
  guestPhone: string | null;
  vehicleInfo: string | null;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  createdAt: string;
  pickupAt: string | null;
  locationName: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    totalPrice: number;
    modifiers: Array<{ name: string }>;
    specialInstructions: string | null;
  }>;
}

const statusTabs = [
  { key: "active", label: "Active" },
  { key: "pending", label: "Pending" },
  { key: "confirmed", label: "Confirmed" },
  { key: "preparing", label: "Preparing" },
  { key: "ready", label: "Ready" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const nextStatus: Record<string, string> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
};

export default function AdminOrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null);

  const merchantId = session?.user?.merchantId;

  const fetchOrders = useCallback(async () => {
    if (!merchantId) return;
    try {
      const status = activeTab === "active" ? "pending,confirmed,preparing,ready" : activeTab;
      const res = await fetch(`/api/admin/orders?merchantId=${merchantId}&status=${status}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch orders:", err);
    } finally {
      setLoading(false);
    }
  }, [merchantId, activeTab]);

  useEffect(() => {
    fetchOrders();
    if (activeTab === "active") {
      const interval = setInterval(fetchOrders, 30000);
      return () => clearInterval(interval);
    }
  }, [fetchOrders, activeTab]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await fetchOrders();
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    } catch (err) {
      console.error("Failed to update order:", err);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Orders</h1>

      {/* Status Tabs */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setLoading(true); }}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            {tab.key === "active" && orders.length > 0 && activeTab === "active" && (
              <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-white">
                {orders.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No {activeTab} orders.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {orders.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setSelectedOrder(order)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">{order.orderNumber}</span>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {order.guestName || "Guest"} &middot; {order.locationName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                      {" "}&middot; {order.fulfillmentType}
                      {order.vehicleInfo && ` (${order.vehicleInfo})`}
                    </p>
                  </div>
                  <p className="text-lg font-bold">{formatPrice(order.total)}</p>
                </div>

                <div className="mt-3 text-sm text-gray-600">
                  {order.items.map((item) => (
                    <span key={item.id} className="mr-2">
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                </div>

                {nextStatus[order.status] && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate(order.id, nextStatus[order.status]);
                      }}
                    >
                      Mark as {nextStatus[order.status]}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Order Detail Slide-over */}
      {selectedOrder && (
        <OrderDetail
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
}

function OrderDetail({
  order,
  onClose,
  onStatusUpdate,
}: {
  order: OrderData;
  onClose: () => void;
  onStatusUpdate: (id: string, status: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">{order.orderNumber}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <StatusBadge status={order.status} />

        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-medium text-gray-500">Customer</h3>
          <p className="font-medium">{order.guestName || "Guest"}</p>
          {order.guestPhone && <p className="text-sm text-gray-600">{order.guestPhone}</p>}
          <p className="mt-1 text-sm capitalize text-gray-500">
            {order.fulfillmentType}
            {order.vehicleInfo && ` - ${order.vehicleInfo}`}
          </p>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 text-sm font-medium text-gray-500">Items</h3>
          <div className="divide-y">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-3">
                <div>
                  <p className="font-medium">{item.quantity}x {item.name}</p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="mt-1 rounded bg-yellow-50 px-2 py-1 text-xs text-yellow-700">
                      Note: {item.specialInstructions}
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium">{formatPrice(item.totalPrice)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-1 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Tax</span>
            <span>{formatPrice(order.tax)}</span>
          </div>
          {order.tip > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500">Tip</span>
              <span>{formatPrice(order.tip)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>

        {nextStatus[order.status] && (
          <div className="mt-6 space-y-2">
            <Button className="w-full" onClick={() => onStatusUpdate(order.id, nextStatus[order.status])}>
              Mark as {nextStatus[order.status]}
            </Button>
            {order.status !== "cancelled" && (
              <Button variant="destructive" className="w-full" onClick={() => onStatusUpdate(order.id, "cancelled")}>
                Cancel Order
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-purple-100 text-purple-700",
    ready: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${colors[status] || "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}
