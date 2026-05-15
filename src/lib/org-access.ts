// Доступ организации: демо 14 суток с регистрации, затем покупка услуги (не подписка)
import { addDays } from "date-fns";

export const DEMO_TRIAL_DAYS = 14;

export type OrgAccessRecord = {
  suspended: boolean;
  createdAt: Date;
  servicePurchasedAt: Date | null;
};

export type OrgAccessPhase = "suspended" | "purchased" | "trial" | "demo_expired";

/** Текущая фаза доступа для организации */
export function getOrganizationAccessPhase(org: OrgAccessRecord, now = new Date()): OrgAccessPhase {
  if (org.suspended) return "suspended";
  if (org.servicePurchasedAt) return "purchased";
  const trialEndsAt = addDays(org.createdAt, DEMO_TRIAL_DAYS);
  if (now < trialEndsAt) return "trial";
  return "demo_expired";
}

/** Публичная витрина принимает записи */
export function isPublicBookingAllowed(org: OrgAccessRecord, now = new Date()): boolean {
  return hasActiveServiceAccess(org, now);
}

/** Полный доступ к панели и онлайн-записи */
export function hasActiveServiceAccess(org: OrgAccessRecord, now = new Date()): boolean {
  const phase = getOrganizationAccessPhase(org, now);
  return phase === "trial" || phase === "purchased";
}

/** Конец демо (null, если уже купили услугу) */
export function getDemoTrialEndsAt(org: OrgAccessRecord): Date | null {
  if (org.servicePurchasedAt) return null;
  return addDays(org.createdAt, DEMO_TRIAL_DAYS);
}

/** Сколько полных суток осталось демо; 0 — последний день или демо уже кончилось */
export function getDemoDaysRemaining(org: OrgAccessRecord, now = new Date()): number {
  const ends = getDemoTrialEndsAt(org);
  if (!ends) return 0;
  const msLeft = ends.getTime() - now.getTime();
  if (msLeft <= 0) return 0;
  return Math.ceil(msLeft / (24 * 60 * 60 * 1000));
}
