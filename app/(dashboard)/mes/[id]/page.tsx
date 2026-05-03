import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { MonthDetailsClient } from "@/components/month-details";
import { getMonthDetails, getCategories } from "@/actions/expense";
import { MonthDetailsSkeleton } from "@/components/skeletons";

// Componente async que carga los datos pesados
async function MonthContent({ id, userId }: { id: string; userId: string }) {
  const [detailsResult, categoriesResult] = await Promise.all([
    getMonthDetails(id, userId),
    getCategories(),
  ]);

  if (!detailsResult.success || !detailsResult.data) redirect("/dashboard");

  const { month, expenses, totals, byCategory } = detailsResult.data;
  const categories = categoriesResult.data ?? [];

  return (
    <MonthDetailsClient
      monthId={id}
      monthName={month.month_name}
      isActive={month.is_active}
      cashInitial={month.cash_initial}
      mpInitial={month.mp_initial}
      userId={userId}
      initialExpenses={expenses}
      initialTotals={totals}
      initialByCategory={byCategory}
      categories={categories}
    />
  );
}

export default async function MonthPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // 1. Verificar sesión
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;
  if (!userId) redirect("/login");

  return (
    <div className="p-4 md:p-6 w-full">
      {/* El layout se envía inmediatamente, el contenido streamea */}
      <Suspense fallback={<MonthDetailsSkeleton />}>
        <MonthContent id={id} userId={userId} />
      </Suspense>
    </div>
  );
}