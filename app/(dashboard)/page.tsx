import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Dashboard from "@/components/dashboard";
import { getMonthsByUser } from "@/actions/month";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;

  if (!userId) {
    redirect("/login");
  }

  const result = await getMonthsByUser(userId);
  const months = result.data ?? [];

  return (
    <div className="h-full w-full">
      <Dashboard initialMonths={months} userId={userId} />
    </div>
  );
}