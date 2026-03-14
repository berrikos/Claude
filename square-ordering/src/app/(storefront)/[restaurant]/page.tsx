import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { getMenu } from "@/lib/square-catalog";
import { MenuView } from "@/components/menu/menu-view";
import { HeroSection } from "@/components/storefront/hero-section";

interface PageProps {
  params: Promise<{ restaurant: string }>;
}

export default async function RestaurantPage({ params }: PageProps) {
  const { restaurant } = await params;

  const merchant = await db.merchant.findUnique({
    where: { slug: restaurant },
    include: {
      branding: true,
      locations: {
        where: { isActive: true, onlineOrdering: true },
        orderBy: { name: "asc" },
        take: 1,
      },
    },
  });

  if (!merchant || merchant.locations.length === 0) {
    notFound();
  }

  const location = merchant.locations[0];
  const branding = merchant.branding;

  // Fetch the menu
  let menu: Awaited<ReturnType<typeof getMenu>> = [];
  try {
    menu = await getMenu(merchant.id, location.id);
  } catch {
    menu = [];
  }

  return (
    <>
      {branding?.showHero && (
        <HeroSection
          merchantName={merchant.name}
          heroImageUrl={branding.heroImageUrl}
          heroText={branding.heroText}
          aboutText={branding.showAbout ? branding.aboutText : null}
          announcement={
            branding.announcementActive ? branding.announcementText : null
          }
        />
      )}
      <MenuView
        menu={menu}
        merchantId={merchant.id}
        locationId={location.id}
        menuLayout={(branding?.menuLayout as "grid" | "list" | "compact") || "grid"}
      />
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { restaurant } = await params;
  const merchant = await db.merchant.findUnique({
    where: { slug: restaurant },
  });

  return {
    title: merchant ? `${merchant.name} — Order Online` : "Order Online",
    description: merchant
      ? `Order food online from ${merchant.name}. Pickup available.`
      : "Order food online for pickup.",
  };
}
