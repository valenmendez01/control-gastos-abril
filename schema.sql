-- 1. Tabla de Usuarios (Para el login)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Categorías (Globales para todos los usuarios)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT, 
    color TEXT DEFAULT '#64748b'
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
    category_id TEXT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT CHECK(payment_method IN ('efectivo', 'mercadopago')) NOT NULL,
    type TEXT CHECK(type IN ('expense', 'income')) NOT NULL DEFAULT 'expense',
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (month_id) REFERENCES budget_months(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Índices Críticos para búsquedas por usuario y relación
CREATE INDEX IF NOT EXISTS idx_budget_months_user_id ON budget_months(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_expenses_month_id ON expenses(month_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_budget_months_user_created ON budget_months(user_id, created_at DESC);

-- Seed de Categorías por defecto (si no existen)
INSERT OR IGNORE INTO categories (id, name, icon, color) VALUES 
('cat_1', 'Supermercado', 'ShoppingCart', '#10b981'),
('cat_2', 'Comida / Resto', 'Utensils', '#f59e0b'),
('cat_3', 'Transporte', 'Car', '#3b82f6'),
('cat_4', 'Salud', 'Heart', '#ef4444'),
('cat_5', 'Entretenimiento', 'Tv', '#8b5cf6'),
('cat_6', 'Servicios', 'Zap', '#6b7280'),
('cat_7', 'Ropa', 'Shirt', '#ec4899'),
('cat_8', 'Otros', 'MoreHorizontal', '#64748b');

-- Insertar usuario
-- INSERT INTO users (id, email, password_hash) 
-- VALUES ('user_1', 'tu@email.com', '$2b$10$hash_generado_por_bcrypt'); 

-- Generar hash de contraseña con bcrypt (ejemplo en Node.js)
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('TU_PASSWORD', 10).then(h => console.log(h));" 