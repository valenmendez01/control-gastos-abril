-- 1. Tabla de Usuarios (Para el login)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías (Configurables por el usuario)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    icon TEXT, -- Para guardar el nombre de un icono de Lucide o similar
    color TEXT DEFAULT '#64748b',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Tabla de Meses de Gestión
CREATE TABLE IF NOT EXISTS budget_months (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    month_name TEXT NOT NULL, -- Ej: "Abril 2026" o "2026-04"
    cash_initial REAL DEFAULT 0,
    mp_initial REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Tabla de Gastos
CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    month_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('efectivo', 'mercadopago')) NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (month_id) REFERENCES budget_months(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Índices para mejorar la velocidad de las consultas paginadas y filtros
CREATE INDEX IF NOT EXISTS idx_expenses_month ON expenses(month_id);
CREATE INDEX IF NOT EXISTS idx_budget_months_user ON budget_months(user_id);