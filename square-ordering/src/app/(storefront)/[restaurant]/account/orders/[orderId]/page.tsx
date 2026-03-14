import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ restaurant: string; orderId: string }>;
}) {
  const session = await auth();
  const { restaurant, orderId } = await params;

  if (!session?.user || session.user.userType !== "customer") {
    redirect(`/login?callbackUrl=/${restaurant}/account/orders`);
  }

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      location: { select: { name: true, address: true } },
    },
  });

  if (!order || order.userId !== session.user.id) {
    notFound();
  }

  const statusSteps = ["pending", "confirmed", "preparing", "ready", "completed"];
  const currentStepIndex = statusSteps.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/${restaurant}/account/orders`}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Order {order.orderNumber}
        </h1>
      </div>

      {/* Status Tracker */}
      {!isCancelled && (
        <div className="mb-8 rounded-lg border p-6">
          <div className="flex items-center justify-between">
            {statusSteps.map((step, i) => (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                      i <= currentStepIndex
                        ? "bg-primary text-white"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i < currentStepIndex ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span className="mt-1 text-[10px] capitalize text-gray-500">
                    {step}
                  </span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div
                    className={`mx-1 h-0.5 flex-1 ${
                      i < currentStepIndex ? "bg-primary" : "bg-gray-200"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isCancelled && (
        <div className="mb-8 rounded-lg bg-red-50 p-4">
          <p className="font-medium text-red-700">Order Cancelled</p>
          {order.cancelledReason && (
            <p className="mt-1 text-sm text-red-600">{order.cancelledReason}</p>
          )}
        </div>
      )}

      {/* Order Details */}
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 font-medium text-gray-900">Order Details</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Location</span>
            <span>{order.location.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Type</span>
            <span className="capitalize">{order.fulfillmentType}</span>
          </div>
          {order.pickupAt && (
            <div className="flex justify-between">
              <span className="text-gray-500">Pickup Time</span>
              <span>
                {new Date(order.pickupAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-500">Ordered</span>
            <span>
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="mb-6 rounded-lg border p-4">
        <h2 className="mb-3 font-medium text-gray-900">Items</h2>
        <div className="divide-y">
          {order.items.map((item) => {
            const mods = (item.modifiers as Array<{ name: string; priceCents: number }>) || [];
            return (
              <div key={item.id} className="flex justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">
                    {item.quantity}x {item.name}
                  </p>
                  {mods.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {mods.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  {item.specialInstructions && (
                    <p className="text-xs italic text-gray-400">
                      &quot;{item.specialInstructions}&quot;
                    </p>
                  )}
                </div>
                <p className="text-sm font-medium">
                  {formatPrice(item.totalPrice)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Totals */}
      <div className="rounded-lg border p-4">
        <div className="space-y-2 text-sm">
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
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>-{formatPrice(order.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2 text-base font-bold">
            <span>Total</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Reorder */}
      {order.status === "completed" && (
        <div className="mt-6 text-center">
          <Link
            href={`/${restaurant}`}
            className="inline-flex rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white hover:bg-primary/90"
          >
            Order Again
          </Link>
        </div>
      )}
    </div>
  );
}
