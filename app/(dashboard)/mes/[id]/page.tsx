import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { turso } from "@/lib/turso";
import { MonthDetailsClient } from "@/components/month-details";
import { getMonthDetails, getCategoriesByUser } from "@/actions/expense";

export default async function MonthPage({
  params,
}: {
  params: { id: string };
}) {
  // 1. Verificar sesión
  const cookieStore = await cookies();
  const userId = cookieStore.get("session_user_id")?.value;
  if (!userId) redirect("/login");

  // 2. Obtener datos del mes (nombre + presupuestos iniciales)
  const monthResult = await turso.execute({
    sql: `SELECT * FROM budget_months WHERE id = ? AND user_id = ?`,
    args: [params.id, userId],
  });

  if (monthResult.rows.length === 0) redirect("/dashboard");

  const month = monthResult.rows[0];

  // 3. Obtener detalles (gastos, totales, categorías)
  const [detailsResult, categoriesResult] = await Promise.all([
    getMonthDetails(params.id, userId),
    getCategoriesByUser(userId),
  ]);

  if (!detailsResult.success || !detailsResult.data) redirect("/dashboard");

  const details = detailsResult.data;
  const categories = categoriesResult.data ?? [];

  return (
    <div className="p-4 md:p-6 w-full">
      <MonthDetailsClient
        monthId={params.id}
        monthName={month.month_name as string}
        cashInitial={month.cash_initial as number}
        mpInitial={month.mp_initial as number}
        userId={userId}
        initialExpenses={details.expenses}
        initialTotals={details.totals}
        initialByCategory={details.byCategory}
        categories={categories}
      />
    </div>
  );
}