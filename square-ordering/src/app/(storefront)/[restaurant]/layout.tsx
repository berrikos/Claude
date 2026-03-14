import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { StorefrontHeader } from "@/components/storefront/header";
import { CartFloatingButton } from "@/components/cart/floating-button";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ restaurant: string }>;
}

export default async function StorefrontLayout({ children, params }: LayoutProps) {
  const { restaurant } = await params;

  const merchant = await db.merchant.findUnique({
    where: { slug: restaurant },
    include: {
      branding: true,
      locations: {
        where: { isActive: true, onlineOrdering: true },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!merchant) {
    notFound();
  }

  const branding = merchant.branding;

  return (
    <div
      className="min-h-screen bg-white"
      style={{
        "--color-primary": branding?.primaryColor || "#E23744",
        "--color-accent": branding?.accentColor || "#FF8A00",
      } as React.CSSProperties}
    >
      <a href="#main-content" className="skip-nav">
        Skip to main content
      </a>
      <StorefrontHeader
        merchantName={merchant.name}
        logoUrl={branding?.logoUrl || null}
        locations={merchant.locations.map((l) => ({
          id: l.id,
          name: l.name,
        }))}
      />
      <main id="main-content" className="pb-24 lg:pb-8">
        {children}
      </main>
      <CartFloatingButton />
    </div>
  );
}
