import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminSidebar } from "@/components/admin/sidebar";

export const metadata = {
  title: "Admin Portal | Order Online",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.userType !== "merchant") {
    redirect("/login?admin=true");
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar
        merchantId={session.user.merchantId!}
        userName={session.user.name || session.user.email}
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
