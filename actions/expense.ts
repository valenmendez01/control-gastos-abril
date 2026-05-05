"use server";

import { turso as db } from "@/lib/turso";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import type { Expense, Category, ActionResult } from "@/types/index";

// ─── Categorías ───────────────────────────────────────────────────────────────

export async function getCategories(): Promise<ActionResult<Category[]>> {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM categories ORDER BY name ASC`,
      args: [],
    });

    const categories = result.rows.map((row) => ({
      id: row.id as string,
      user_id: "",          // compatibilidad si el tipo lo requiere, sino sacarlo
      name: row.name as string,
      icon: row.icon as string | null,
      color: row.color as string,
    }));

    return { success: true, data: categories };
  } catch (err) {
    console.error("[getCategories]", err);
    return { success: false, error: "No se pudieron obtener las categorías." };
  }
}

// ─── Gastos ───────────────────────────────────────────────────────────────────

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_color: string;
  category_icon: string | null;
}

export interface MonthDetails {
  // ✅ Nuevo: datos del mes incluidos en el resultado
  month: {
    month_name: string;
    is_active: boolean;
    cash_initial: number;
    mp_initial: number;
  };
  expenses: ExpenseWithCategory[];
  totals: {
    cash_spent: number;
    mp_spent: number;
    total_spent: number;
    cash_available: number;
    mp_available: number;
    total_available: number;
  };
  byCategory: {
    category_id: string;
    category_name: string;
    category_color: string;
    category_icon: string | null;
    total: number;
  }[];
}

export async function getMonthDetails(
  monthId: string,
  userId: string
): Promise<ActionResult<MonthDetails>> {
  try {
    // Verificar que el mes pertenece al usuario
    const monthCheck = await db.execute({
      sql: `SELECT * FROM budget_months WHERE id = ? AND user_id = ?`,
      args: [monthId, userId],
    });

    if (monthCheck.rows.length === 0) {
      return { success: false, error: "Periodo no encontrado." };
    }

    const monthRow = monthCheck.rows[0];
    const cashInitial = monthRow.cash_initial as number;
    const mpInitial = monthRow.mp_initial as number;

    // Gastos con info de categoría
    const expensesResult = await db.execute({
      sql: `SELECT 
              e.*,
              c.name as category_name,
              c.color as category_color,
              c.icon as category_icon
            FROM expenses e
            LEFT JOIN categories c ON e.category_id = c.id
            WHERE e.month_id = ?
            ORDER BY e.date DESC`,
      args: [monthId],
    });

    const expenses: ExpenseWithCategory[] = expensesResult.rows.map((row) => ({
      id: row.id as string,
      month_id: row.month_id as string,
      category_id: (row.category_id as string | null) ?? "",
      description: row.description as string,
      amount: row.amount as number,
      payment_method: row.payment_method as "efectivo" | "mercadopago",
      type: (row.type as "expense" | "income") ?? "expense",
      date: row.date as string,
      category_name: (row.category_name as string) ?? "Sin categoría",
      category_color: (row.category_color as string) ?? "#64748b",
      category_icon: row.category_icon as string | null,
    }));

    // Totales
    const cashSpent = expenses
      .filter((e) => e.payment_method === "efectivo" && e.type === "expense")
      .reduce((acc, e) => acc + e.amount, 0);

    const mpSpent = expenses
      .filter((e) => e.payment_method === "mercadopago" && e.type === "expense")
      .reduce((acc, e) => acc + e.amount, 0);

    const cashIncome = expenses
      .filter((e) => e.payment_method === "efectivo" && e.type === "income")
      .reduce((acc, e) => acc + e.amount, 0);

    const mpIncome = expenses
      .filter((e) => e.payment_method === "mercadopago" && e.type === "income")
      .reduce((acc, e) => acc + e.amount, 0);

    // Agrupado por categoría
    const categoryMap = new Map<
      string,
      {
        category_id: string;
        category_name: string;
        category_color: string;
        category_icon: string | null;
        total: number;
      }
    >();

    for (const e of expenses) {
      if (e.type === "income" || !e.category_id) continue;
      const existing = categoryMap.get(e.category_id);
      if (existing) {
        existing.total += e.amount;
      } else {
        categoryMap.set(e.category_id, {
          category_id: e.category_id,
          category_name: e.category_name,
          category_color: e.category_color,
          category_icon: e.category_icon,
          total: e.amount,
        });
      }
    }

    const byCategory = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total
    );

    return {
      success: true,
      data: {
        // ✅ Se incluye month — ya no hace falta el query extra en page.tsx
        month: {
          month_name: monthRow.month_name as string,
          is_active: Boolean(monthRow.is_active),
          cash_initial: cashInitial,
          mp_initial: mpInitial,
        },
        expenses,
        totals: {
          cash_spent: cashSpent,
          mp_spent: mpSpent,
          total_spent: cashSpent + mpSpent,
          cash_available: cashInitial - cashSpent + cashIncome,
          mp_available: mpInitial - mpSpent + mpIncome,
          total_available: cashInitial + mpInitial - cashSpent - mpSpent + cashIncome + mpIncome,
        },
        byCategory,
      },
    };
  } catch (err) {
    console.error("[getMonthDetails]", err);
    return { success: false, error: "No se pudieron obtener los detalles." };
  }
}

export interface CreateExpenseInput {
  monthId: string;
  categoryId: string | null;
  description: string;
  amount: number;
  paymentMethod: "efectivo" | "mercadopago";
  type: "expense" | "income";
}

export async function createExpense(
  input: CreateExpenseInput,
  userId: string
): Promise<ActionResult<Expense>> {
  const { monthId, categoryId, description, amount, paymentMethod, type } = input;

  if (!description.trim()) {
    return { success: false, error: "La descripción es requerida." };
  }
  if (amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a 0." };
  }
  if (type === "expense" && !categoryId) {  // solo obligatorio en gastos
    return { success: false, error: "Seleccioná una categoría." };
  }

  try {
    const check = await db.execute({
      sql: `SELECT id FROM budget_months WHERE id = ? AND user_id = ?`,
      args: [monthId, userId],
    });
    if (check.rows.length === 0) {
      return { success: false, error: "Periodo no encontrado." };
    }

    const id = nanoid();

    await db.execute({
      sql: `INSERT INTO expenses (id, month_id, category_id, description, amount, payment_method, type)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [id, monthId, categoryId, description.trim(), amount, paymentMethod, type],
    });

    const result = await db.execute({
      sql: `SELECT * FROM expenses WHERE id = ?`,
      args: [id],
    });

    const row = result.rows[0];
    const expense: Expense = {
      id: row.id as string,
      month_id: row.month_id as string,
      category_id: (row.category_id as string | null) ?? "",
      description: row.description as string,
      amount: row.amount as number,
      payment_method: row.payment_method as "efectivo" | "mercadopago",
      type: (row.type as "expense" | "income") ?? "expense",
      date: row.date as string,
    };

    revalidatePath(`/mes/${monthId}`);
    return { success: true, data: expense };
  } catch (err) {
    console.error("[createExpense]", err);
    return { success: false, error: "No se pudo registrar el gasto." };
  }
}

export async function deleteExpense(
  expenseId: string,
  userId: string
): Promise<ActionResult> {
  try {
    const check = await db.execute({
      sql: `SELECT e.id FROM expenses e
            JOIN budget_months m ON e.month_id = m.id
            WHERE e.id = ? AND m.user_id = ?`,
      args: [expenseId, userId],
    });

    if (check.rows.length === 0) {
      return { success: false, error: "Gasto no encontrado." };
    }

    const expenseRow = await db.execute({
      sql: `SELECT month_id FROM expenses WHERE id = ?`,
      args: [expenseId],
    });
    const monthId = expenseRow.rows[0]?.month_id as string;

    await db.execute({
      sql: `DELETE FROM expenses WHERE id = ?`,
      args: [expenseId],
    });

    revalidatePath(`/mes/${monthId}`);
    return { success: true };
  } catch (err) {
    console.error("[deleteExpense]", err);
    return { success: false, error: "No se pudo eliminar el gasto." };
  }
}