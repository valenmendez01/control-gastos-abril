"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody } from "@heroui/card";
import { Select, SelectItem } from "@heroui/select";
import { Divider } from "@heroui/divider";
import { Modal, ModalContent, ModalHeader, ModalBody, useDisclosure } from "@heroui/modal";
import { Progress } from "@heroui/progress";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Pagination } from "@heroui/pagination";
import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/table";
import { Switch } from "@heroui/switch";
import {
  Plus,
  Wallet,
  Smartphone,
  Trash2,
  ArrowLeft,
  ShoppingCart,
  Utensils,
  Car,
  Heart,
  Tv,
  Zap,
  Shirt,
  MoreHorizontal,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { createExpense, deleteExpense, type ExpenseWithCategory } from "@/actions/expense";
import { toggleMonthStatus } from "@/actions/month";
import type { Category } from "@/types/index";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ReactNode> = {
  ShoppingCart: <ShoppingCart size={16} />,
  Utensils: <Utensils size={16} />,
  Car: <Car size={16} />,
  Heart: <Heart size={16} />,
  Tv: <Tv size={16} />,
  Zap: <Zap size={16} />,
  Shirt: <Shirt size={16} />,
  MoreHorizontal: <MoreHorizontal size={16} />,
};

function CategoryIcon({ icon, color }: { icon: string | null; color: string }) {
  return (
    <div
      className="p-2 rounded-lg flex items-center justify-center"
      style={{ backgroundColor: `${color}20`, color }}
    >
      {icon && ICON_MAP[icon] ? ICON_MAP[icon] : <MoreHorizontal size={16} />}
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Totals {
  cash_spent: number;
  mp_spent: number;
  total_spent: number;
  cash_available: number;
  mp_available: number;
  total_available: number;
}

interface CategoryTotal {
  category_id: string;
  category_name: string;
  category_color: string;
  category_icon: string | null;
  total: number;
}

interface MonthDetailsProps {
  monthId: string;
  monthName: string;
  isActive: boolean;
  cashInitial: number;
  mpInitial: number;
  userId: string;
  initialExpenses: ExpenseWithCategory[];
  initialTotals: Totals;
  initialByCategory: CategoryTotal[];
  categories: Category[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MonthDetailsClient({
  monthId,
  monthName,
  isActive: initialIsActive,
  cashInitial,
  mpInitial,
  userId,
  initialExpenses,
  initialTotals,
  initialByCategory,
  categories,
}: MonthDetailsProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isPending, startTransition] = useTransition();

  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>(initialExpenses);
  const [totals, setTotals] = useState<Totals>(initialTotals);
  const [byCategory, setByCategory] = useState<CategoryTotal[]>(initialByCategory);

  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    amount: "",
    description: "",
    categoryId: "",
    paymentMethod: "efectivo" as "efectivo" | "mercadopago",
  });

  const [isActive, setIsActive] = useState(initialIsActive);
  const [isSwitchPending, startSwitchTransition] = useTransition();

  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  const handleToggleStatus = (selected: boolean) => {
    setIsActive(selected); // Optimistic update
    startSwitchTransition(async () => {
      const res = await toggleMonthStatus(monthId, userId, selected);
      if (!res.success) {
        setIsActive(!selected); // Revertir si falla
        console.error(res.error);
      }
    });
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const totalInitial = cashInitial + mpInitial;
  const spentPercent = totalInitial > 0
    ? Math.min((totals.total_spent / totalInitial) * 100, 100)
    : 0;

  const cashPercent = cashInitial > 0
    ? Math.min((totals.cash_spent / cashInitial) * 100, 100)
    : 0;

  const mpPercent = mpInitial > 0
    ? Math.min((totals.mp_spent / mpInitial) * 100, 100)
    : 0;

  const isOverBudget = totals.total_available < 0;

  const totalPages = Math.max(1, Math.ceil(expenses.length / ITEMS_PER_PAGE));
  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return expenses.slice(start, start + ITEMS_PER_PAGE);
  }, [expenses, currentPage]);

  // Reset to page 1 when expenses change (e.g. after add/delete)
  useEffect(() => {
    setCurrentPage(1);
  }, [expenses.length]);

  // ── Recalculate totals from expenses (client-side optimistic) ────────────────

  function recalculate(newExpenses: ExpenseWithCategory[]) {
    const cashSpent = newExpenses
      .filter((e) => e.payment_method === "efectivo")
      .reduce((acc, e) => acc + e.amount, 0);
    const mpSpent = newExpenses
      .filter((e) => e.payment_method === "mercadopago")
      .reduce((acc, e) => acc + e.amount, 0);

    setTotals({
      cash_spent: cashSpent,
      mp_spent: mpSpent,
      total_spent: cashSpent + mpSpent,
      cash_available: cashInitial - cashSpent,
      mp_available: mpInitial - mpSpent,
      total_available: cashInitial + mpInitial - cashSpent - mpSpent,
    });

    // Recalculate by category
    const map = new Map<string, CategoryTotal>();
    for (const e of newExpenses) {
      const existing = map.get(e.category_id);
      if (existing) {
        existing.total += e.amount;
      } else {
        map.set(e.category_id, {
          category_id: e.category_id,
          category_name: e.category_name,
          category_color: e.category_color,
          category_icon: e.category_icon,
          total: e.amount,
        });
      }
    }
    setByCategory(Array.from(map.values()).sort((a, b) => b.total - a.total));
  }

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ amount: "", description: "", categoryId: "", paymentMethod: "efectivo" });
    setFormError(null);
  };

  const handleCreate = (onClose?: () => void) => {
    setFormError(null);
    const amount = parseFloat(form.amount);

    if (!form.description.trim()) {
      setFormError("La descripción es requerida.");
      return;
    }
    if (!amount || amount <= 0) {
      setFormError("Ingresá un monto válido.");
      return;
    }
    if (!form.categoryId) {
      setFormError("Seleccioná una categoría.");
      return;
    }

    startTransition(async () => {
      const result = await createExpense(
        {
          monthId,
          categoryId: form.categoryId,
          description: form.description,
          amount,
          paymentMethod: form.paymentMethod,
        },
        userId
      );

      if (!result.success || !result.data) {
        setFormError(result.error ?? "Error al guardar el gasto.");
        return;
      }

      // Optimistic update: find category info
      const cat = categories.find((c) => c.id === form.categoryId);
      const newExpense: ExpenseWithCategory = {
        ...result.data,
        category_name: cat?.name ?? "Sin categoría",
        category_color: cat?.color ?? "#64748b",
        category_icon: cat?.icon ?? null,
      };

      const updated = [newExpense, ...expenses];
      setExpenses(updated);
      recalculate(updated);
      resetForm();
      onClose?.();
    });
  };

  const handleDelete = (expenseId: string) => {
    startTransition(async () => {
      const result = await deleteExpense(expenseId, userId);
      if (result.success) {
        const updated = expenses.filter((e) => e.id !== expenseId);
        setExpenses(updated);
        recalculate(updated);
      }
    });
  };

  // ── Expense Form (shared desktop/mobile) ─────────────────────────────────────

  const renderExpenseForm = (onClose?: () => void) => (
    <div className="flex flex-col gap-4">
      <Input
        type="number"
        label="Monto"
        placeholder="0.00"
        min={0}
        startContent={<span className="text-default-400 text-small">$</span>}
        size="lg"
        variant="bordered"
        value={form.amount}
        onChange={(e) => setForm({ ...form, amount: e.target.value })}
      />
      <Input
        type="text"
        label="Descripción"
        placeholder="Ej: Cena con amigos"
        variant="bordered"
        value={form.description}
        onChange={(e) => setForm({ ...form, description: e.target.value })}
      />
      <Select
        id="category-select"
        aria-label="Categoría"
        label="Categoría"
        placeholder="Seleccionar..."
        variant="bordered"
        // Usa un Set (formato requerido por la librería) o un array vacío
        selectedKeys={form.categoryId ? new Set([form.categoryId]) : new Set([])}
        onSelectionChange={(keys) => {
          // keys es un Set, tomamos el primer valor (o string vacío si lo deseleccionan)
          const val = Array.from(keys)[0]?.toString() || "";
          setForm({ ...form, categoryId: val });
        }}
      >
        {categories.map((cat) => (
          <SelectItem
            key={cat.id.toString()} // Asegura que el key sea un string
            textValue={cat.name} // textValue es buena práctica para accesibilidad y búsqueda
            startContent={
              <div style={{ color: cat.color }}>
                {cat.icon && ICON_MAP[cat.icon] ? ICON_MAP[cat.icon] : <MoreHorizontal size={16} />}
              </div>
            }
          >
            {cat.name}
          </SelectItem>
        ))}
      </Select>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold text-default-500 uppercase tracking-wide">
          Medio de Pago
        </span>
        <div className="flex gap-2">
          <Button
            variant={form.paymentMethod === "efectivo" ? "solid" : "flat"}
            color={form.paymentMethod === "efectivo" ? "default" : "default"}
            className={`flex-1 font-medium ${form.paymentMethod === "efectivo" ? "bg-black text-white" : ""}`}
            startContent={<Wallet size={16} />}
            onPress={() => setForm({ ...form, paymentMethod: "efectivo" })}
          >
            Efectivo
          </Button>
          <Button
            variant={form.paymentMethod === "mercadopago" ? "solid" : "flat"}
            color={form.paymentMethod === "mercadopago" ? "primary" : "default"}
            className="flex-1 font-medium"
            startContent={<Smartphone size={16} />}
            onPress={() => setForm({ ...form, paymentMethod: "mercadopago" })}
          >
            MP
          </Button>
        </div>
      </div>

      {formError && (
        <p className="text-danger text-sm flex items-center gap-1">
          <AlertCircle size={14} /> {formError}
        </p>
      )}

      <Button
        className="bg-black text-white w-full mt-2 font-semibold"
        size="lg"
        isLoading={isPending}
        onPress={() => handleCreate(onClose)}
      >
        Guardar Gasto
      </Button>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div className="flex items-start gap-3 flex-1">
          <Link href="/">
            <Button isIconOnly variant="light" size="sm" className="mt-1">
              <ArrowLeft size={18} />
            </Button>
          </Link>
          <div className="flex flex-1 items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{monthName}</h1>
              <p className="text-default-500 text-sm">Control de presupuesto y gastos del mes.</p>
            </div>
            <Switch 
              isSelected={isActive} 
              onValueChange={handleToggleStatus}
              isDisabled={isSwitchPending}
              color="success"
              size="sm"
            >
              <span className="text-sm font-medium ml-1">
                {isActive ? "Activo" : "Inactivo"}
              </span>
            </Switch>
          </div>
        </div>
        <Button
          className="bg-black text-white lg:hidden"
          endContent={<Plus size={18} />}
          onPress={onOpen}
        >
          Nuevo
        </Button>
      </div>

      {/* Layout principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Columna principal ── */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Tarjetas de resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Disponible */}
            <Card className={`${isOverBudget ? "bg-danger" : "bg-black"} text-white`}>
              <CardBody className="py-5">
                <span className="text-xs font-bold text-white/60 uppercase tracking-wider">
                  {isOverBudget ? "⚠ Excedido" : "Total restante"}
                </span>
                <h2 className="text-3xl font-bold mt-1">
                  ${fmt(Math.abs(totals.total_available))}
                  {isOverBudget && <span className="text-lg"> de más</span>}
                </h2>
                <Progress
                  size="sm"
                  value={spentPercent}
                  color={isOverBudget ? "danger" : "default"}
                  className="mt-3 opacity-50"
                />
                <span className="text-xs text-white/50 mt-1">
                  ${fmt(totals.total_spent)} gastados de ${fmt(totalInitial)}
                </span>
              </CardBody>
            </Card>

            {/* Efectivo */}
            <Card>
              <CardBody className="py-5">
                <div className="flex items-center gap-2 text-default-500">
                  <Wallet size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">Efectivo disponible</span>
                </div>
                <h2 className={`text-2xl font-bold mt-1 ${totals.cash_available < 0 ? "text-danger" : ""}`}>
                  ${fmt(Math.abs(totals.cash_available))}
                  {totals.cash_available < 0 && <span className="text-sm text-danger"> excedido</span>}
                </h2>
                <Progress size="sm" value={cashPercent} color={cashPercent >= 100 ? "danger" : "default"} className="mt-2" />
                <span className="text-xs text-default-400 mt-1">
                  ${fmt(totals.cash_spent)} / ${fmt(cashInitial)}
                </span>
              </CardBody>
            </Card>

            {/* MercadoPago */}
            <Card>
              <CardBody className="py-5">
                <div className="flex items-center gap-2 text-default-500">
                  <Smartphone size={16} />
                  <span className="text-xs font-bold uppercase tracking-wider">MP disponible</span>
                </div>
                <h2 className="text-2xl font-bold mt-1">
                  ${fmt(Math.abs(totals.mp_available))}
                  {totals.mp_available < 0 && <span className="text-sm opacity-80"> excedido</span>}
                </h2>
                <Progress size="sm" value={mpPercent} color={mpPercent >= 100 ? "danger" : "default"} className="mt-2 opacity-60" />
                <span className="text-xs text-default-400 mt-1">
                  ${fmt(totals.mp_spent)} / ${fmt(mpInitial)}
                </span>
              </CardBody>
            </Card>
          </div>

          {/* Resumen por categorías */}
          {byCategory.length > 0 && (
            <Card>
              <CardBody>
                <h3 className="font-semibold text-lg mb-6">Por Categorías</h3>
                <div className="flex flex-col gap-5">
                  {byCategory.map((cat) => {
                    const pct = Math.min((cat.total / totalInitial) * 100, 100);
                    return (
                      <div key={cat.category_id}>
                        <div className="flex justify-between text-sm mb-2 font-medium">
                          <span className="flex items-center gap-2">
                            <span style={{ color: cat.category_color }}>
                              {cat.category_icon && ICON_MAP[cat.category_icon]
                                ? ICON_MAP[cat.category_icon]
                                : <MoreHorizontal size={16} />}
                            </span>
                            {cat.category_name}
                          </span>
                          <span className="font-semibold text-right">
                            ${fmt(cat.total)} <span className="text-default-400 font-normal ml-1">- {Math.round(pct)}%</span>
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          size="sm"
                          style={{ "--progress-indicator-color": cat.category_color } as React.CSSProperties}
                          aria-label={cat.category_name}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Lista de gastos */}
          <Card>
            <CardBody>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">
                  Gastos
                  <Chip size="sm" variant="flat" className="ml-2 text-xs">{expenses.length}</Chip>
                </h3>
              </div>

              <Table
                aria-label="Lista de gastos"
                removeWrapper
                bottomContent={
                  <div className="flex w-full justify-center">
                    <Pagination
                      isCompact
                      showControls
                      showShadow
                      color="default"
                      page={currentPage}
                      total={totalPages}
                      onChange={setCurrentPage}
                    />
                  </div>
                }
                classNames={{
                  table: "min-h-[360px]",
                  td: "align-top",
                }}
              >
                <TableHeader>
                  <TableColumn>GASTO</TableColumn>
                  <TableColumn>FECHA</TableColumn>
                  <TableColumn>MÉTODO</TableColumn>
                  <TableColumn className="text-right">MONTO</TableColumn>
                  <TableColumn className="w-10"> </TableColumn>
                </TableHeader>
                <TableBody
                  items={paginatedExpenses}
                  emptyContent={
                    <div className="flex flex-col items-center py-8 text-default-400 gap-2">
                      <TrendingDown size={40} strokeWidth={1.2} />
                      <p className="font-medium">Sin gastos registrados</p>
                      <p className="text-sm">Agregá tu primer gasto del mes.</p>
                    </div>
                  }
                >
                  {(expense) => (
                    <TableRow key={expense.id} className="group">
                      <TableCell>
                        <div className="flex gap-3 items-center min-w-0">
                          <CategoryIcon icon={expense.category_icon} color={expense.category_color} />
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{expense.description}</p>
                            <p className="text-xs text-default-500">{expense.category_name}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-default-500 whitespace-nowrap">
                          {formatDate(expense.date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="sm"
                          variant="flat"
                          color={expense.payment_method === "efectivo" ? "default" : "primary"}
                          className="text-[10px]"
                        >
                          {expense.payment_method === "efectivo" ? "Efectivo" : "MP"}
                        </Chip>
                      </TableCell>
                      <TableCell className="text-right">
                        <p className="font-bold text-sm">-${fmt(expense.amount)}</p>
                      </TableCell>
                      <TableCell>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => handleDelete(expense.id)}
                        >
                          <Trash2 size={14} className="text-danger" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {/* ── Sidebar Desktop: Formulario ── */}
        <div className="hidden lg:block lg:col-span-1">
          <Card className="sticky top-6">
            <CardBody className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-black text-white p-1.5 rounded-full">
                  <Plus size={14} />
                </div>
                <h3 className="text-xl font-semibold">Nuevo Gasto</h3>
              </div>
              {renderExpenseForm()}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal Mobile */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="bottom" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Registrar Gasto</ModalHeader>
              <ModalBody className="pb-6">
                {renderExpenseForm(onClose)}
              </ModalBody>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}