import Link from "next/link";
import { db } from "@/lib/db";

export default async function HomePage() {
  let merchants: { slug: string; name: string }[] = [];

  try {
    merchants = await db.merchant.findMany({
      where: { subscriptionStatus: "active" },
      select: { slug: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch {
    // Database may not be connected yet during development
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-primary text-3xl font-bold text-white">
          S
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Square Ordering
        </h1>
        <p className="mt-2 text-gray-600">
          Online ordering powered by Square POS
        </p>

        <div className="mt-8 space-y-3">
          <Link
            href="/admin/onboarding"
            className="flex w-full items-center justify-center rounded-xl bg-primary px-6 py-3.5 font-medium text-white transition-colors hover:bg-primary/90"
          >
            Set Up Your Restaurant
          </Link>
          <Link
            href="/admin/dashboard"
            className="flex w-full items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Merchant Login
          </Link>
        </div>

        {merchants.length > 0 && (
          <div className="mt-10">
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-gray-400">
              Restaurants
            </h2>
            <div className="space-y-2">
              {merchants.map((m) => (
                <Link
                  key={m.slug}
                  href={`/${m.slug}`}
                  className="block rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-gray-900 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  {m.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
