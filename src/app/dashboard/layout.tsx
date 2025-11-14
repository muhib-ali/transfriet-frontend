// src/app/dashboard/layout.tsx
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import DashboardFrame from "./_components/dashboard-frame";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In your typing, cookies() is Promise<ReadonlyRequestCookies> → await it
  const cookieStore = await cookies();
  const token = cookieStore.get("access_token");

  if (!token) redirect("/login"); // hard guard

  return <DashboardFrame>{children}</DashboardFrame>;
}
