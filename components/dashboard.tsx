"use client";

import React, { useState, useTransition } from "react";
import { Button } from "@heroui/button";
import { Progress } from "@heroui/progress";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/modal";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input } from "@heroui/input";
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  LogInIcon,
  BanknoteIcon,
  WalletIcon,
} from "lucide-react";
import { createMonth, deleteMonth } from "@/actions/month";
import type { BudgetMonth } from "@/types/index";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardProps {
  initialMonths: BudgetMonth[];
  userId: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CURRENT_YEAR = new Date().getFullYear();

// ─── Component ────────────────────────────────────────────────────────────────

export default function Dashboard({ initialMonths, userId }: DashboardProps) {
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [isPending, startTransition] = useTransition();

  const [months, setMonths] = useState<BudgetMonth[]>(initialMonths);
  const [formError, setFormError] = useState<string | null>(null);

  const [newMonth, setNewMonth] = useState({
    monthName: "",
    year: String(CURRENT_YEAR),
    cashInitial: "",
    mpInitial: "",
  });

  // Derive "active" month: most recently created (first in list)
  const activeMonthId = months[0]?.id ?? null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreateMonth = (onClose: () => void) => {
    setFormError(null);

    const { monthName, year, cashInitial, mpInitial } = newMonth;
    if (!monthName || !year) {
      setFormError("El nombre del mes y el año son requeridos.");
      return;
    }

    const cash = parseFloat(cashInitial) || 0;
    const mp = parseFloat(mpInitial) || 0;

    startTransition(async () => {
      const result = await createMonth({
        userId,
        monthName: `${monthName} ${year}`,
        cashInitial: cash,
        mpInitial: mp,
      });

      if (!result.success || !result.data) {
        setFormError(result.error ?? "Error al crear el periodo.");
        return;
      }

      setMonths((prev) => [result.data!, ...prev]);
      setNewMonth({ monthName: "", year: String(CURRENT_YEAR), cashInitial: "", mpInitial: "" });
      onClose();
    });
  };

  const handleDelete = (monthId: string) => {
    startTransition(async () => {
      const result = await deleteMonth(monthId, userId);
      if (result.success) {
        setMonths((prev) => prev.filter((m) => m.id !== monthId));
      }
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Resumen de Meses</h1>
          <p className="text-gray-500">Gestiona y organiza tus periodos financieros.</p>
        </div>
        <Button
          onPress={onOpen}
          className="bg-black text-white font-semibold w-full md:w-auto"
          startContent={<PlusIcon size={18} />}
          radius="full"
          size="lg"
        >
          Crear Nuevo Mes
        </Button>
      </div>

      {/* Month Grid */}
      {months.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
          <WalletIcon size={48} strokeWidth={1.2} />
          <p className="text-lg font-medium">Sin periodos aún</p>
          <p className="text-sm">Creá tu primer mes para empezar a registrar gastos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {months.map((month) => {
            const isActive = month.id === activeMonthId;
            const total = month.cash_initial + month.mp_initial;

            return (
              <Card key={month.id} className="shadow-sm border border-gray-100 p-2">
                <CardHeader className="flex justify-between items-start pb-0">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {isActive ? "En Curso" : "Cerrado"}
                    </span>
                    <h3 className="text-xl font-bold">{month.month_name}</h3>
                    <Chip
                      size="sm"
                      color={isActive ? "success" : "default"}
                      variant="flat"
                      className="mt-1 md:hidden"
                    >
                      {isActive ? "ACTIVO" : "CERRADO"}
                    </Chip>
                  </div>

                  {/* Desktop badge / actions */}
                  <div className="hidden md:flex items-center gap-2">
                    {isActive ? (
                      <Chip color="success" variant="flat" size="sm">Activo</Chip>
                    ) : (
                      <>
                        <Button isIconOnly variant="light" size="sm">
                          <PencilIcon size={16} className="text-gray-400" />
                        </Button>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          isLoading={isPending}
                          onPress={() => handleDelete(month.id)}
                        >
                          <TrashIcon size={16} className="text-danger" />
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Mobile actions */}
                  <div className="flex md:hidden gap-1">
                    <Button isIconOnly variant="light" size="sm">
                      <PencilIcon size={16} className="text-gray-400" />
                    </Button>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      isLoading={isPending}
                      onPress={() => handleDelete(month.id)}
                    >
                      <TrashIcon size={16} className="text-danger" />
                    </Button>
                  </div>
                </CardHeader>

                <CardBody className="py-4 gap-3">
                  {/* Budget breakdown */}
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <BanknoteIcon size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-500">Efectivo</span>
                      <span className="text-sm font-semibold">
                        ${month.cash_initial.toLocaleString("es-AR")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <WalletIcon size={14} className="text-blue-400" />
                      <span className="text-sm text-gray-500">MP</span>
                      <span className="text-sm font-semibold">
                        ${month.mp_initial.toLocaleString("es-AR")}
                      </span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">
                      ${total.toLocaleString("es-AR")}
                    </span>
                    <span className="text-xs text-gray-500">Presupuesto total</span>
                  </div>

                  {isActive && (
                    <Progress size="sm" value={0} color="default" className="mt-1" />
                  )}

                  <Divider className="my-1 md:hidden" />
                </CardBody>

                <CardFooter className="flex justify-between md:justify-start items-center gap-2 pt-0">
                  {isActive ? (
                    <>
                      <Button
                        className="bg-gray-200 text-gray-700 font-medium flex-1 md:flex-none"
                        startContent={<LogInIcon size={16} />}
                        variant="flat"
                      >
                        Entrar
                      </Button>
                      <div className="hidden md:flex gap-1">
                        <Button isIconOnly variant="light" size="sm">
                          <PencilIcon size={16} />
                        </Button>
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          isLoading={isPending}
                          onPress={() => handleDelete(month.id)}
                        >
                          <TrashIcon size={16} />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      variant="bordered"
                      className="flex-1 md:flex-none"
                      startContent={<EyeIcon size={16} />}
                    >
                      Ver Detalles
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal: Crear Nuevo Mes */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" backdrop="blur">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Crear Nuevo Periodo</ModalHeader>
              <ModalBody className="gap-4">
                {/* Month + Year */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">Mes</label>
                    <select
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                      value={newMonth.monthName}
                      onChange={(e) => setNewMonth({ ...newMonth, monthName: e.target.value })}
                    >
                      <option value="">Seleccionar...</option>
                      {MONTH_NAMES.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <Input
                      label="Año"
                      type="number"
                      variant="bordered"
                      value={newMonth.year}
                      min={2020}
                      max={2099}
                      onChange={(e) => setNewMonth({ ...newMonth, year: e.target.value })}
                    />
                  </div>
                </div>

                {/* Cash budget */}
                <Input
                  label="Presupuesto en Efectivo"
                  placeholder="0.00"
                  type="number"
                  min={0}
                  startContent={
                    <div className="flex items-center gap-1 text-default-400">
                      <BanknoteIcon size={14} />
                      <span className="text-small">$</span>
                    </div>
                  }
                  variant="bordered"
                  value={newMonth.cashInitial}
                  onChange={(e) => setNewMonth({ ...newMonth, cashInitial: e.target.value })}
                />

                {/* MercadoPago budget */}
                <Input
                  label="Presupuesto en MercadoPago"
                  placeholder="0.00"
                  type="number"
                  min={0}
                  startContent={
                    <div className="flex items-center gap-1 text-blue-400">
                      <WalletIcon size={14} />
                      <span className="text-small">$</span>
                    </div>
                  }
                  variant="bordered"
                  value={newMonth.mpInitial}
                  onChange={(e) => setNewMonth({ ...newMonth, mpInitial: e.target.value })}
                />

                {/* Total preview */}
                {(newMonth.cashInitial || newMonth.mpInitial) && (
                  <div className="bg-gray-50 rounded-xl px-4 py-3 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Presupuesto total</span>
                    <span className="font-bold text-gray-900">
                      ${(
                        (parseFloat(newMonth.cashInitial) || 0) +
                        (parseFloat(newMonth.mpInitial) || 0)
                      ).toLocaleString("es-AR")}
                    </span>
                  </div>
                )}

                {formError && (
                  <p className="text-danger text-sm">{formError}</p>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose} isDisabled={isPending}>
                  Cancelar
                </Button>
                <Button
                  className="bg-black text-white"
                  onPress={() => handleCreateMonth(onClose)}
                  isLoading={isPending}
                >
                  Crear Mes
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}