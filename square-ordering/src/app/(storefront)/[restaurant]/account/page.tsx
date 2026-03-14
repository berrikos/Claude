import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export default async function AccountPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const session = await auth();
  const { restaurant } = await params;

  if (!session?.user || session.user.userType !== "customer") {
    redirect(`/login?callbackUrl=/${restaurant}/account`);
  }

  const [user, recentOrders, favorites] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      include: { addresses: true },
    }),
    db.order.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { items: true, location: { select: { name: true } } },
    }),
    db.favoriteItem.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      {/* Profile Header */}
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
          {(user?.givenName?.[0] || user?.email[0] || "?").toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {[user?.givenName, user?.familyName].filter(Boolean).join(" ") || "My Account"}
          </h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <QuickLink href={`/${restaurant}/account/orders`} label="Orders" count={recentOrders.length} />
        <QuickLink href={`/${restaurant}/account/favorites`} label="Favorites" count={favorites.length} />
        <QuickLink href={`/${restaurant}/account/addresses`} label="Addresses" count={user?.addresses.length || 0} />
        <QuickLink href={`/${restaurant}/account/settings`} label="Settings" />
      </div>

      {/* Recent Orders */}
      <section className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
          <Link
            href={`/${restaurant}/account/orders`}
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <p className="text-gray-500">No orders yet. Start ordering!</p>
            <Link
              href={`/${restaurant}`}
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              Browse menu
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentOrders.slice(0, 3).map((order) => (
              <Link
                key={order.id}
                href={`/${restaurant}/account/orders/${order.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {order.orderNumber}
                    </p>
                    <p className="text-sm text-gray-500">
                      {order.location.name} &middot;{" "}
                      {new Date(order.createdAt).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatPrice(order.total)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Favorites */}
      {favorites.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Favorites</h2>
            <Link
              href={`/${restaurant}/account/favorites`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {favorites.slice(0, 4).map((fav) => (
              <div
                key={fav.id}
                className="rounded-lg border p-3 text-center"
              >
                <p className="truncate text-sm font-medium text-gray-900">
                  {fav.itemName}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function QuickLink({
  href,
  label,
  count,
}: {
  href: string;
  label: string;
  count?: number;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center rounded-lg border p-4 transition-colors hover:bg-gray-50"
    >
      <span className="text-lg font-bold text-gray-900">{count ?? "-"}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-purple-100 text-purple-700",
    ready: "bg-green-100 text-green-700",
    completed: "bg-gray-100 text-gray-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        colors[status] || "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}
