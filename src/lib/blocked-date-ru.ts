// Подпись закрытой даты в админке: русские названия, календарная дата без сдвига по UTC
import { format } from "date-fns";
import { ru } from "date-fns/locale";

/**
 * YYYY-MM-DD → «понедельник, 12 января 2026».
 * Парсинг через локальную дату (не parseISO), чтобы день недели не «плыл» из-за UTC.
 * Локаль ru: названия дней/месяцев на русском; отображение согласовано с привычкой «неделя с понедельника».
 */
export function formatBlockedDateLongRu(dateStr: string): string {
  const p = dateStr.split("-").map((x) => Number(x));
  if (p.length !== 3 || p.some((n) => !Number.isInteger(n) || n <= 0)) {
    return dateStr;
  }
  const [y, m, day] = p;
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) {
    return dateStr;
  }
  const s = format(d, "EEEE, d MMMM yyyy", { locale: ru });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
