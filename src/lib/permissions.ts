// Матрица прав: владелец и ADMIN vs STAFF для API админки
import type { OrgRole } from "@prisma/client";

/** Ключи действий, которые проверяются в requireOrganization */
export type OrgPermission = "services" | "schedule" | "bookings" | "organization_settings";

/** Роль в контексте запроса: владелец организации или участник с OrgRole */
export type EffectiveOrgRole = "OWNER" | OrgRole;

const MATRIX: Record<EffectiveOrgRole, Record<OrgPermission, boolean>> = {
  OWNER: {
    services: true,
    schedule: true,
    bookings: true,
    organization_settings: true,
  },
  ADMIN: {
    services: true,
    schedule: true,
    bookings: true,
    organization_settings: true,
  },
  STAFF: {
    services: false,
    schedule: true,
    bookings: true,
    organization_settings: false,
  },
};

/** Проверка, разрешено ли действие для роли */
export function hasOrgPermission(role: EffectiveOrgRole, permission: OrgPermission): boolean {
  return MATRIX[role][permission] === true;
}
