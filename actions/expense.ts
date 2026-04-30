"use server";

import { turso as db } from "@/lib/turso";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import type { Expense, Category, ActionResult } from "@/types/index";

// ─── Categorías ───────────────────────────────────────────────────────────────

export async function getCategoriesByUser(
  userId: string
): Promise<ActionResult<Category[]>> {
  try {
    const result = await db.execute({
      sql: `SELECT * FROM categories WHERE user_id = ? ORDER BY name ASC`,
      args: [userId],
    });

    const categories = result.rows.map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      name: row.name as string,
      icon: row.icon as string | null,
      color: row.color as string,
    }));

    // Si el usuario no tiene categorías, creamos unas por defecto
    if (categories.length === 0) {
      await seedDefaultCategories(userId);
      return getCategoriesByUser(userId);
    }

    return { success: true, data: categories };
  } catch (err) {
    console.error("[getCategoriesByUser]", err);
    return { success: false, error: "No se pudieron obtener las categorías." };
  }
}

async function seedDefaultCategories(userId: string) {
  const defaults = [
    { name: "Supermercado", icon: "ShoppingCart", color: "#10b981" },
    { name: "Comida / Resto", icon: "Utensils", color: "#f59e0b" },
    { name: "Transporte", icon: "Car", color: "#3b82f6" },
    { name: "Salud", icon: "Heart", color: "#ef4444" },
    { name: "Entretenimiento", icon: "Tv", color: "#8b5cf6" },
    { name: "Servicios", icon: "Zap", color: "#6b7280" },
    { name: "Ropa", icon: "Shirt", color: "#ec4899" },
    { name: "Otros", icon: "MoreHorizontal", color: "#64748b" },
  ];

  for (const cat of defaults) {
    await db.execute({
      sql: `INSERT INTO categories (id, user_id, name, icon, color) VALUES (?, ?, ?, ?, ?)`,
      args: [nanoid(), userId, cat.name, cat.icon, cat.color],
    });
  }
}

// ─── Gastos ───────────────────────────────────────────────────────────────────

export interface ExpenseWithCategory extends Expense {
  category_name: string;
  category_color: string;
  category_icon: string | null;
}

export interface MonthDetails {
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

    const month = monthCheck.rows[0];
    const cashInitial = month.cash_initial as number;
    const mpInitial = month.mp_initial as number;

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
      category_id: row.category_id as string,
      description: row.description as string,
      amount: row.amount as number,
      payment_method: row.payment_method as "efectivo" | "mercadopago",
      date: row.date as string,
      category_name: (row.category_name as string) ?? "Sin categoría",
      category_color: (row.category_color as string) ?? "#64748b",
      category_icon: row.category_icon as string | null,
    }));

    // Totales
    const cashSpent = expenses
      .filter((e) => e.payment_method === "efectivo")
      .reduce((acc, e) => acc + e.amount, 0);

    const mpSpent = expenses
      .filter((e) => e.payment_method === "mercadopago")
      .reduce((acc, e) => acc + e.amount, 0);

    // Agrupado por categoría
    const categoryMap = new Map<
      string,
      { category_id: string; category_name: string; category_color: string; category_icon: string | null; total: number }
    >();

    for (const e of expenses) {
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
        expenses,
        totals: {
          cash_spent: cashSpent,
          mp_spent: mpSpent,
          total_spent: cashSpent + mpSpent,
          cash_available: cashInitial - cashSpent,
          mp_available: mpInitial - mpSpent,
          total_available: cashInitial + mpInitial - cashSpent - mpSpent,
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
  categoryId: string;
  description: string;
  amount: number;
  paymentMethod: "efectivo" | "mercadopago";
}

export async function createExpense(
  input: CreateExpenseInput,
  userId: string
): Promise<ActionResult<Expense>> {
  const { monthId, categoryId, description, amount, paymentMethod } = input;

  if (!description.trim()) {
    return { success: false, error: "La descripción es requerida." };
  }
  if (amount <= 0) {
    return { success: false, error: "El monto debe ser mayor a 0." };
  }

  try {
    // Verificar que el mes pertenece al usuario
    const check = await db.execute({
      sql: `SELECT id FROM budget_months WHERE id = ? AND user_id = ?`,
      args: [monthId, userId],
    });
    if (check.rows.length === 0) {
      return { success: false, error: "Periodo no encontrado." };
    }

    const id = nanoid();

    await db.execute({
      sql: `INSERT INTO expenses (id, month_id, category_id, description, amount, payment_method)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [id, monthId, categoryId, description.trim(), amount, paymentMethod],
    });

    const result = await db.execute({
      sql: `SELECT * FROM expenses WHERE id = ?`,
      args: [id],
    });

    const row = result.rows[0];
    const expense: Expense = {
      id: row.id as string,
      month_id: row.month_id as string,
      category_id: row.category_id as string,
      description: row.description as string,
      amount: row.amount as number,
      payment_method: row.payment_method as "efectivo" | "mercadopago",
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
    // Verificar ownership a través del mes
    const check = await db.execute({
      sql: `SELECT e.id FROM expenses e
            JOIN budget_months m ON e.month_id = m.id
            WHERE e.id = ? AND m.user_id = ?`,
      args: [expenseId, userId],
    });

    if (check.rows.length === 0) {
      return { success: false, error: "Gasto no encontrado." };
    }

    // Obtener month_id antes de borrar para revalidar
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