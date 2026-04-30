"use server";

import { turso } from "@/lib/turso";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(formData: FormData) {
  // Obtenemos los datos según los "name" de tus inputs[cite: 1]
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Por favor, completa todos los campos." };
  }

  try {
    // 1. Buscamos al usuario en Turso[cite: 1]
    const { rows } = await turso.execute({
      sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });

    const user = rows[0];

    // 2. Validamos existencia y contraseña[cite: 1]
    if (!user) {
      return { error: "Usuario no encontrado." };
    }

    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password_hash as string
    );

    if (!isPasswordCorrect) {
      return { error: "Contraseña incorrecta." };
    }

    // 3. Establecemos la cookie de sesión
    const cookieStore = await cookies();
    cookieStore.set("session_user_id", user.id as string, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
      path: "/",
    });

  } catch (err) {
    console.error("Error en login:", err);
    return { error: "Ocurrió un error inesperado. Intenta de nuevo." };
  }

  // 4. Si todo sale bien, redirigimos al home
  redirect("/");
}

export async function logout() {
  const cookieStore = await cookies();
  
  // Eliminamos la cookie de sesión que definimos en el login
  cookieStore.delete("session_user_id");
  
  // Redirigimos al usuario a la página de login
  // El middleware se encargará de que no pueda volver atrás sin loguearse
  redirect("/login");
}