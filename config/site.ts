export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "Turnos",
  description: "Gestión de mis gastos mensuales",
  navItems: [
    {
      label: "Dashboard",
      href: "/",
    },
    {
      label: "Categorías",
      href: "/categorias",
    },
  ],
  navMenuItems: [
    {
      label: "Dashboard",
      href: "/",
    },
    {
      label: "Categorías",
      href: "/categorias",
    },
  ],
};
