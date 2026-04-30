export interface User {
  id: string;
  email: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
}

export interface BudgetMonth {
  id: string;
  user_id: string;
  month_name: string;
  cash_initial: number;
  mp_initial: number;
  is_active: boolean;
  created_at: string;
  total_spent?: number;
}

export interface Expense {
  id: string;
  month_id: string;
  category_id: string;
  description: string;
  amount: number;
  payment_method: "efectivo" | "mercadopago";
  date: string;
}

export interface CreateMonthInput {
  userId: string;
  monthName: string;
  cashInitial: number;
  mpInitial: number;
}

export interface ActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}