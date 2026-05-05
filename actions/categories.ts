"use server";

import { turso } from "@/lib/turso";
import { Category } from "@/types";

// Leer categorías
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