"use client";

import React, { useEffect, useState } from "react";
import {
  Navbar as HeroUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { ChartNoAxesColumn, LogOut } from "lucide-react";
import { Divider } from "@heroui/divider";
import { Button } from "@heroui/button";
import { logout } from "@/actions/auth";

const NavbarBreadcrumb = dynamic(
  () => import("@/components/navbar-breadcrumb").then((m) => m.NavbarBreadcrumb),
  {
    ssr: false,
    loading: () => <span className="text-sm text-foreground">Resumen</span>,
  }
);

export const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  // SI LA RUTA ES /LOGIN, NO RENDERIZAMOS NADA
  if (pathname === "/login") return null;

  return (
    <HeroUINavbar 
      classNames={{
        base: "z-[100]",
        wrapper: "z-[100]",
        menu: "z-[101]",
        menuItem: "z-[101]",
      }} 
      isMenuOpen={isMenuOpen}
      maxWidth="xl"
      position="sticky"
      onMenuOpenChange={setIsMenuOpen}
      isBordered
    >
      {/* Contenido Superior (Brand y Desktop Nav) */}
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="flex justify-start items-center gap-1" href="/">
            <ChartNoAxesColumn />
          </NextLink>
        </NavbarBrand>
        <div className="hidden lg:flex ml-5">
          <NavbarBreadcrumb />
        </div>
      </NavbarContent>

      {/* Acciones Derecha (Desktop) */}
      <NavbarContent
        className="hidden sm:flex basis-1/5 sm:basis-full"
        justify="end"
      >
        <NavbarItem className="hidden sm:flex gap-2 items-center">
          <ThemeSwitch />
          <form action={logout}>
            <Button 
              isIconOnly 
              color="danger"
              size="sm" 
              variant="light" 
              type="submit"
              aria-label="Cerrar sesión"
            >
              <LogOut size={20} />
            </Button>
          </form>
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
        </NavbarItem>
      </NavbarContent>

      {/* Controles para Móvil */}
      <NavbarContent className="sm:hidden basis-1 pl-4" justify="end">
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      {/* Menú Desplegable Móvil */}
      <NavbarMenu>
        <div className="mx-4 mt-2 flex flex-col gap-2">
          <NavbarMenuItem>
            <NavbarBreadcrumb />
          </NavbarMenuItem>

          {/* Botón de Cerrar Sesión en Móvil */}
          <Divider className="my-2" />
          <NavbarMenuItem>
            <form action={logout} className="w-full">
              <Button 
                fullWidth
                className="justify-start px-0 text-danger" 
                startContent={<LogOut size={20} />} 
                variant="light" 
                type="submit"
              >
                Cerrar Sesión
              </Button>
            </form>
          </NavbarMenuItem>
        </div>
      </NavbarMenu>
    </HeroUINavbar>
  );
};
