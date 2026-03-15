"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice, formatDate } from "@/lib/utils";

interface CustomerSummary {
  id: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
}

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  totalPrice: number;
  modifiers: Array<{ name: string }>;
}

interface CustomerOrder {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentType: string;
  subtotal: number;
  tax: number;
  tip: number;
  total: number;
  createdAt: string;
  locationName: string;
  items: OrderItem[];
}

interface CustomerDetail {
  id: string;
  email: string;
  givenName: string | null;
  familyName: string | null;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function CustomersPage() {
  const { data: session } = useSession();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerDetail, setCustomerDetail] = useState<CustomerDetail | null>(null);
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const merchantId = session?.user?.merchantId;

  const fetchCustomers = useCallback(async (page = 1) => {
    if (!merchantId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        merchantId,
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/customers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setPagination(data.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 });
      }
    } catch (err) {
      console.error("Failed to fetch customers:", err);
    } finally {
      setLoading(false);
    }
  }, [merchantId, search]);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const fetchCustomerDetail = useCallback(async (customerId: string) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/customers/${customerId}`);
      if (res.ok) {
        const data = await res.json();
        setCustomerDetail(data.customer);
        setCustomerOrders(data.orders || []);
      }
    } catch (err) {
      console.error("Failed to fetch customer detail:", err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleCustomerClick = (customerId: string) => {
    setSelectedCustomerId(customerId);
    fetchCustomerDetail(customerId);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  const customerName = (c: { givenName: string | null; familyName: string | null }) => {
    const parts = [c.givenName, c.familyName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unknown";
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Customers</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
        {search && (
          <Button type="button" variant="outline" onClick={handleClearSearch}>
            Clear
          </Button>
        )}
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
        </div>
      ) : customers.length === 0 ? (
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
                d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
              />
            </svg>
            <p className="mt-4 text-gray-500">
              {search ? "No customers match your search." : "No customers yet."}
            </p>
            {search && (
              <Button variant="outline" className="mt-4" onClick={handleClearSearch}>
                Clear search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Customer Table */}
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs font-medium uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3">Name</th>
                    <th className="px-6 py-3">Email</th>
                    <th className="hidden px-6 py-3 md:table-cell">Phone</th>
                    <th className="px-6 py-3 text-right">Orders</th>
                    <th className="px-6 py-3 text-right">Total Spent</th>
                    <th className="hidden px-6 py-3 lg:table-cell">Last Order</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      onClick={() => handleCustomerClick(customer.id)}
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-medium text-gray-900">
                        {customerName(customer)}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{customer.email}</td>
                      <td className="hidden whitespace-nowrap px-6 py-4 text-gray-600 md:table-cell">
                        {customer.phone || "--"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-gray-600">
                        {customer.orderCount}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right font-medium text-gray-900">
                        {formatPrice(customer.totalSpent)}
                      </td>
                      <td className="hidden whitespace-nowrap px-6 py-4 text-gray-500 lg:table-cell">
                        {customer.lastOrderAt
                          ? formatDate(customer.lastOrderAt)
                          : "--"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1}
                {" "}-{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}
                {" "}of {pagination.total} customers
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchCustomers(pagination.page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchCustomers(pagination.page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Customer Detail Slide-over */}
      {selectedCustomerId && (
        <CustomerDetailPanel
          customer={customerDetail}
          orders={customerOrders}
          loading={detailLoading}
          onClose={() => {
            setSelectedCustomerId(null);
            setCustomerDetail(null);
            setCustomerOrders([]);
          }}
        />
      )}
    </div>
  );
}

function CustomerDetailPanel({
  customer,
  orders,
  loading,
  onClose,
}: {
  customer: CustomerDetail | null;
  orders: CustomerOrder[];
  loading: boolean;
  onClose: () => void;
}) {
  const customerName = customer
    ? [customer.givenName, customer.familyName].filter(Boolean).join(" ") || "Unknown"
    : "";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className="h-full w-full max-w-md overflow-y-auto bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold">Customer Details</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
          </div>
        ) : !customer ? (
          <p className="text-gray-500">Customer not found.</p>
        ) : (
          <>
            {/* Customer Info */}
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {(customer.givenName?.[0] || customer.email[0] || "?").toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{customerName}</p>
                  <p className="text-sm text-gray-500">{customer.email}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Phone</p>
                  <p className="font-medium">{customer.phone || "--"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Joined</p>
                  <p className="font-medium">{formatDate(customer.createdAt)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Orders</p>
                  <p className="font-medium">{customer.orderCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Lifetime Value</p>
                  <p className="font-medium">{formatPrice(customer.totalSpent)}</p>
                </div>
              </div>
            </div>

            {/* Order History */}
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-medium text-gray-500">Order History</h3>
              {orders.length === 0 ? (
                <p className="text-sm text-gray-400">No orders found.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-gray-200 p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{order.orderNumber}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="mt-0.5 text-xs text-gray-400">
                            {formatDate(order.createdAt)} &middot; {order.locationName}
                          </p>
                        </div>
                        <span className="font-medium">{formatPrice(order.total)}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        {order.items.map((item, idx) => (
                          <span key={item.id}>
                            {idx > 0 && ", "}
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
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
