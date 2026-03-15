import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

export default async function AnalyticsPage() {
  const session = await auth();
  const merchantId = session!.user.merchantId!;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    todayOrders,
    weekOrders,
    monthOrders,
    allTimeStats,
    popularItems,
    recentOrdersByDay,
  ] = await Promise.all([
    // Today's orders
    db.order.aggregate({
      where: { merchantId, createdAt: { gte: todayStart }, status: { not: "cancelled" } },
      _count: true,
      _sum: { total: true },
    }),
    // This week
    db.order.aggregate({
      where: { merchantId, createdAt: { gte: weekStart }, status: { not: "cancelled" } },
      _count: true,
      _sum: { total: true, tip: true },
    }),
    // This month
    db.order.aggregate({
      where: { merchantId, createdAt: { gte: monthStart }, status: { not: "cancelled" } },
      _count: true,
      _sum: { total: true, tip: true },
    }),
    // All time
    db.order.aggregate({
      where: { merchantId, status: { not: "cancelled" } },
      _count: true,
      _sum: { total: true },
      _avg: { total: true },
    }),
    // Popular items
    db.orderItem.groupBy({
      by: ["name"],
      where: { order: { merchantId, status: { not: "cancelled" } } },
      _sum: { quantity: true },
      _count: true,
      orderBy: { _sum: { quantity: "desc" } },
      take: 10,
    }),
    // Orders per day (last 7 days)
    db.order.groupBy({
      by: ["createdAt"],
      where: { merchantId, createdAt: { gte: weekStart }, status: { not: "cancelled" } },
      _count: true,
      _sum: { total: true },
    }),
  ]);

  const avgOrderValue = allTimeStats._avg?.total || 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Analytics</h1>

      {/* Key Metrics */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Today"
          value={formatPrice(todayOrders._sum.total || 0)}
          subtext={`${todayOrders._count} order${todayOrders._count !== 1 ? "s" : ""}`}
        />
        <MetricCard
          label="This Week"
          value={formatPrice(weekOrders._sum.total || 0)}
          subtext={`${weekOrders._count} orders`}
        />
        <MetricCard
          label="This Month"
          value={formatPrice(monthOrders._sum.total || 0)}
          subtext={`${monthOrders._count} orders`}
        />
        <MetricCard
          label="Avg Order Value"
          value={formatPrice(Math.round(avgOrderValue))}
          subtext={`${allTimeStats._count} total orders`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tips */}
        <Card>
          <CardHeader>
            <CardTitle>Tips</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">This Week</p>
                <p className="text-2xl font-bold">{formatPrice(weekOrders._sum.tip || 0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">This Month</p>
                <p className="text-2xl font-bold">{formatPrice(monthOrders._sum.tip || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Volume Chart (simplified text-based) */}
        <Card>
          <CardHeader>
            <CardTitle>Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 7 }, (_, i) => {
                const date = new Date(todayStart);
                date.setDate(date.getDate() - (6 - i));
                const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
                const dayOrders = recentOrdersByDay.filter(
                  (d) => new Date(d.createdAt).toDateString() === date.toDateString()
                );
                const count = dayOrders.reduce((sum, d) => sum + d._count, 0);
                const maxOrders = Math.max(
                  1,
                  ...recentOrdersByDay.map((d) => d._count)
                );
                const pct = Math.round((count / maxOrders) * 100);

                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-10 text-xs text-gray-500">{dayLabel}</span>
                    <div className="flex-1">
                      <div className="h-6 rounded-full bg-gray-100">
                        <div
                          className="h-6 rounded-full bg-primary/80"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-8 text-right text-xs font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Popular Items */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Popular Items</CardTitle>
          </CardHeader>
          <CardContent>
            {popularItems.length === 0 ? (
              <p className="py-4 text-center text-gray-500">No order data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-3 font-medium">#</th>
                      <th className="pb-3 font-medium">Item</th>
                      <th className="pb-3 text-right font-medium">Qty Sold</th>
                      <th className="pb-3 text-right font-medium">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {popularItems.map((item, idx) => (
                      <tr key={item.name}>
                        <td className="py-3 text-gray-400">{idx + 1}</td>
                        <td className="py-3 font-medium text-gray-900">{item.name}</td>
                        <td className="py-3 text-right">{item._sum.quantity}</td>
                        <td className="py-3 text-right text-gray-500">{item._count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subtext,
}: {
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
        <p className="mt-1 text-xs text-gray-400">{subtext}</p>
      </CardContent>
    </Card>
  );
}
