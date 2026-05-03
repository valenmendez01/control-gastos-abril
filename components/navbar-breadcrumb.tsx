"use client";

import { Breadcrumbs, BreadcrumbItem } from "@heroui/breadcrumbs";
import { useBreadcrumbStore } from "@/store/breadcrumb-store";

export const NavbarBreadcrumb = () => {
  const monthName = useBreadcrumbStore((s) => s.monthName);

  return (
    <Breadcrumbs size="lg">
      <BreadcrumbItem href="/">Resumen</BreadcrumbItem>
      {monthName && <BreadcrumbItem>{monthName}</BreadcrumbItem>}
    </Breadcrumbs>
  );
};