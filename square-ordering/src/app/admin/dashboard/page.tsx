import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await auth();
  const merchantId = session!.user.merchantId!;

  const [merchant, orderCounts, recentOrders] = await Promise.all([
    db.merchant.findUnique({
      where: { id: merchantId },
      include: { locations: { where: { isActive: true } } },
    }),
    db.order.groupBy({
      by: ["status"],
      where: { merchantId },
      _count: true,
    }),
    db.order.findMany({
      where: { merchantId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        total: true,
        guestName: true,
        createdAt: true,
      },
    }),
  ]);

  const totalOrders = orderCounts.reduce((sum, g) => sum + g._count, 0);
  const pendingOrders = orderCounts.find((g) => g.status === "pending")?._count || 0;
  const confirmedOrders = orderCounts.find((g) => g.status === "confirmed")?._count || 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        Welcome back{merchant?.name ? `, ${merchant.name}` : ""}
      </h1>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Orders" value={totalOrders.toString()} />
        <StatCard title="Pending" value={pendingOrders.toString()} highlight />
        <StatCard title="Confirmed" value={confirmedOrders.toString()} />
        <StatCard
          title="Locations"
          value={(merchant?.locations.length || 0).toString()}
        />
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No orders yet. Orders will appear here once customers start ordering.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-3 font-medium">Order #</th>
                    <th className="pb-3 font-medium">Customer</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Total</th>
                    <th className="pb-3 text-right font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-3 font-medium">{order.orderNumber}</td>
                      <td className="py-3 text-gray-600">{order.guestName || "Guest"}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            order.status === "confirmed"
                              ? "bg-green-100 text-green-700"
                              : order.status === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : order.status === "ready"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        ${(order.total / 100).toFixed(2)}
                      </td>
                      <td className="py-3 text-right text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  highlight,
}: {
  title: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p
          className={`mt-1 text-3xl font-bold ${
            highlight ? "text-primary" : "text-gray-900"
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
