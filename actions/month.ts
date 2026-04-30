"use server";

import { turso as db } from "@/lib/turso";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import type { BudgetMonth, CreateMonthInput, ActionResult } from "@/types/index";

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function getMonthsByUser(
  userId: string
): Promise<ActionResult<BudgetMonth[]>> {
  try {
    // Agregamos un LEFT JOIN para sumar los gastos de cada mes
    const result = await db.execute({
      sql: `SELECT m.*, COALESCE(SUM(e.amount), 0) as total_spent 
            FROM budget_months m
            LEFT JOIN expenses e ON m.id = e.month_id
            WHERE m.user_id = ?
            GROUP BY m.id
            ORDER BY m.created_at DESC`,
      args: [userId],
    });

    const months = result.rows.map((row) => ({
      id: row.id as string,
      user_id: row.user_id as string,
      month_name: row.month_name as string,
      cash_initial: row.cash_initial as number,
      mp_initial: row.mp_initial as number,
      is_active: Boolean(row.is_active),
      created_at: row.created_at as string,
      total_spent: row.total_spent as number,
    }));

    return { success: true, data: months };
  } catch (err) {
    console.error("[getMonthsByUser]", err);
    return { success: false, error: "No se pudieron obtener los periodos." };
  }
}

export async function createMonth(
  input: CreateMonthInput
): Promise<ActionResult<BudgetMonth>> {
  const { userId, monthName, cashInitial, mpInitial } = input;

  if (!monthName.trim()) {
    return { success: false, error: "El nombre del mes es requerido." };
  }

  if (cashInitial < 0 || mpInitial < 0) {
    return { success: false, error: "Los presupuestos no pueden ser negativos." };
  }

  try {
    const id = nanoid();

    // 1. Desactivar cualquier mes que esté activo para este usuario
    await db.execute({
      sql: `UPDATE budget_months SET is_active = 0 WHERE user_id = ? AND is_active = 1`,
      args: [input.userId],
    });

    // 2. Insertar el nuevo mes (que por defecto en tu SQL tiene is_active = 1)
    await db.execute({
      sql: `INSERT INTO budget_months (id, user_id, month_name, cash_initial, mp_initial)
            VALUES (?, ?, ?, ?, ?)`,
      args: [id, input.userId, input.monthName.trim(), input.cashInitial, input.mpInitial],
    });

    const result = await db.execute({
      sql: `SELECT * FROM budget_months WHERE id = ?`,
      args: [id],
    });

    const row = result.rows[0];
    const month: BudgetMonth = {
      id: row.id as string,
      user_id: row.user_id as string,
      month_name: row.month_name as string,
      cash_initial: row.cash_initial as number,
      mp_initial: row.mp_initial as number,
      is_active: true,
      created_at: row.created_at as string,
    };

    revalidatePath("/dashboard");
    return { success: true, data: month };
  } catch (err) {
    console.error("[createMonth]", err);
    return { success: false, error: "No se pudo crear el periodo." };
  }
}

export async function deleteMonth(
  monthId: string,
  userId: string
): Promise<ActionResult> {
  try {
    // Verify ownership before deleting
    const check = await db.execute({
      sql: `SELECT id FROM budget_months WHERE id = ? AND user_id = ?`,
      args: [monthId, userId],
    });

    if (check.rows.length === 0) {
      return { success: false, error: "Periodo no encontrado." };
    }

    await db.execute({
      sql: `DELETE FROM budget_months WHERE id = ?`,
      args: [monthId],
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err) {
    console.error("[deleteMonth]", err);
    return { success: false, error: "No se pudo eliminar el periodo." };
  }
}

export async function updateMonth(
  monthId: string,
  userId: string,
  input: Partial<Omit<CreateMonthInput, "userId">>
): Promise<ActionResult<BudgetMonth>> {
  try {
    const check = await db.execute({
      sql: `SELECT id FROM budget_months WHERE id = ? AND user_id = ?`,
      args: [monthId, userId],
    });

    if (check.rows.length === 0) {
      return { success: false, error: "Periodo no encontrado." };
    }

    const fields: string[] = [];
    const args: (string | number)[] = [];

    if (input.monthName !== undefined) {
      fields.push("month_name = ?");
      args.push(input.monthName.trim());
    }
    if (input.cashInitial !== undefined) {
      fields.push("cash_initial = ?");
      args.push(input.cashInitial);
    }
    if (input.mpInitial !== undefined) {
      fields.push("mp_initial = ?");
      args.push(input.mpInitial);
    }

    if (fields.length === 0) {
      return { success: false, error: "No hay campos para actualizar." };
    }

    args.push(monthId);
    await db.execute({
      sql: `UPDATE budget_months SET ${fields.join(", ")} WHERE id = ?`,
      args,
    });

    const result = await db.execute({
      sql: `SELECT * FROM budget_months WHERE id = ?`,
      args: [monthId],
    });

    const row = result.rows[0];
    const month: BudgetMonth = {
      id: row.id as string,
      user_id: row.user_id as string,
      month_name: row.month_name as string,
      cash_initial: row.cash_initial as number,
      mp_initial: row.mp_initial as number,
      is_active: true,
      created_at: row.created_at as string,
    };

    revalidatePath("/dashboard");
    return { success: true, data: month };
  } catch (err) {
    console.error("[updateMonth]", err);
    return { success: false, error: "No se pudo actualizar el periodo." };
  }
}

export async function toggleMonthStatus(
  monthId: string,
  userId: string,
  isActive: boolean
): Promise<ActionResult> {
  try {
    const check = await db.execute({
      sql: `SELECT id FROM budget_months WHERE id = ? AND user_id = ?`,
      args: [monthId, userId],
    });

    if (check.rows.length === 0) return { success: false, error: "No encontrado" };

    await db.execute({
      sql: `UPDATE budget_months SET is_active = ? WHERE id = ?`,
      args: [isActive ? 1 : 0, monthId],
    });

    revalidatePath(`/mes/${monthId}`);
    return { success: true };
  } catch (err) {
    return { success: false, error: "Error al actualizar estado" };
  }
}