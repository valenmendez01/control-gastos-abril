"use server";

import { turso } from "@/lib/turso";
import { Category } from "@/types";

// EJEMPLO: Leer categorías
export async function getCategories(userId: string): Promise<Category[]> {
  try {
    const { rows } = await turso.execute({
      sql: "SELECT * FROM categories WHERE user_id = ?",
      args: [userId],
    });
    
    // Transformar los rows al tipo Category
    return rows as unknown as Category[];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

// EJEMPLO: Crear categoría
export async function createCategory(data: { id: string, userId: string, name: string, icon: string, color: string }) {
  try {
    await turso.execute({
      sql: "INSERT INTO categories (id, user_id, name, icon, color) VALUES (?, ?, ?, ?, ?)",
      args: [data.id, data.userId, data.name, data.icon, data.color],
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating category:", error);
    return { success: false, error: "No se pudo crear la categoría" };
  }
}