import { redirect } from "next/navigation";
import { auth } from "@/auth";
import DashboardApp from "@/components/dashboard-app";

export default async function CrmPage() {
  const session = await auth();
  if (!session) redirect("/login");
  return <DashboardApp session={session} activeRoute="crm" />;
}
