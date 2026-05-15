// Публичная цена и форматирование для сайта и баннеров демо
export const DEFAULT_SERVICE_PRICE_RUB = 4900;

/** Стоимость доступа после демо (руб.), из NEXT_PUBLIC_SERVICE_PRICE_RUB или 4900 */
export function getServicePriceRub(): number {
  const raw = process.env.NEXT_PUBLIC_SERVICE_PRICE_RUB?.trim();
  if (!raw) return DEFAULT_SERVICE_PRICE_RUB;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_SERVICE_PRICE_RUB;
}

/** «3 900 ₽» для отображения на сайте */
export function formatServicePriceRub(amount = getServicePriceRub()): string {
  return `${amount.toLocaleString("ru-RU")} ₽`;
}
