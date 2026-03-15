import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";

export default async function FavoritesPage({
  params,
}: {
  params: Promise<{ restaurant: string }>;
}) {
  const session = await auth();
  const { restaurant } = await params;

  if (!session?.user || session.user.userType !== "customer") {
    redirect(`/login?callbackUrl=/${restaurant}/account/favorites`);
  }

  const favorites = await db.favoriteItem.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={`/${restaurant}/account`}
          className="text-gray-400 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Favorites</h1>
      </div>

      {favorites.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="mb-2 text-gray-500">No favorites yet.</p>
          <p className="text-sm text-gray-400">
            Tap the heart icon on menu items to save them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="rounded-lg border p-4 text-center transition-colors hover:bg-gray-50"
            >
              <p className="font-medium text-gray-900">{fav.itemName}</p>
              <p className="mt-1 text-xs text-gray-400">
                Added {new Date(fav.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
