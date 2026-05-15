// Общий список разделов админки для бокового меню и мобильной навигации
import type { EffectiveOrgRole, OrgPermission } from "@/lib/permissions";
import { hasOrgPermission } from "@/lib/permissions";

export type AdminNavIcon = "overview" | "services" | "schedule" | "bookings" | "settings";

export type AdminNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  icon: AdminNavIcon;
  permission?: OrgPermission;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { href: "/admin", label: "Обзор", shortLabel: "Обзор", icon: "overview" },
  { href: "/admin/services", label: "Услуги", shortLabel: "Услуги", icon: "services", permission: "services" },
  { href: "/admin/schedule", label: "Расписание", shortLabel: "График", icon: "schedule", permission: "schedule" },
  { href: "/admin/bookings", label: "Записи", shortLabel: "Записи", icon: "bookings", permission: "bookings" },
  { href: "/admin/settings", label: "Настройки", shortLabel: "Ещё", icon: "settings", permission: "organization_settings" },
];

export function getAdminNavItems(orgRole: EffectiveOrgRole): AdminNavItem[] {
  return ADMIN_NAV_ITEMS.filter((item) => {
    if (!item.permission) return true;
    return hasOrgPermission(orgRole, item.permission);
  });
}

export function orgRoleLabel(orgRole: EffectiveOrgRole): string {
  if (orgRole === "OWNER") return "Владелец";
  if (orgRole === "ADMIN") return "Админ";
  return "Сотрудник";
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/admin" && pathname.startsWith(href));
}
