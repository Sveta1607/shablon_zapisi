// Форматирование дат записей в часовом поясе организации для админки
import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";

export function formatOrgDateTime(iso: string | Date, timeZone: string): string {
  return formatInTimeZone(iso, timeZone, "d MMMM yyyy, HH:mm", { locale: ru });
}
