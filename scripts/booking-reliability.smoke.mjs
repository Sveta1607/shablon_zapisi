// Быстрый smoke-тест интеграции бронирования: проверяем гонки и идемпотентные повторы через HTTP API
const BASE_URL = process.env.BOOKING_BASE_URL ?? "http://localhost:3002";
const SLUG = process.env.BOOKING_SLUG;
const SERVICE_ID = process.env.BOOKING_SERVICE_ID;
const STARTS_AT_ISO = process.env.BOOKING_STARTS_AT_ISO;

// Явная проверка обязательных параметров, чтобы тест не стартовал с неполными входными данными
if (!SLUG || !SERVICE_ID || !STARTS_AT_ISO) {
  console.error(
    "Set BOOKING_SLUG, BOOKING_SERVICE_ID, BOOKING_STARTS_AT_ISO before running this smoke test."
  );
  process.exit(1);
}

const endpoint = `${BASE_URL}/api/public/${SLUG}/book`;

// Единое тело бронирования для всех сценариев, чтобы сравнение ответов было корректным
const body = {
  serviceId: SERVICE_ID,
  startsAtIso: STARTS_AT_ISO,
  clientName: "Smoke Test",
  clientPhone: "+79990000000",
  notes: "booking reliability smoke",
};

async function createBooking(idempotencyKey) {
  // Отправка запроса в API с опциональным Idempotency-Key для проверки replay-логики
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  return { status: response.status, payload };
}

async function main() {
  // Сценарий 1: два параллельных запроса без ключа — должен выжить только один
  const [a, b] = await Promise.all([createBooking(null), createBooking(null)]);
  const statuses = [a.status, b.status].sort((x, y) => x - y);
  if (!(statuses[0] === 201 && statuses[1] === 409)) {
    throw new Error(`Parallel scenario failed. Got statuses: ${statuses.join(", ")}`);
  }

  // Сценарий 2: повтор запроса с одним Idempotency-Key — ожидаем create + replay
  const key = `smoke-${Date.now()}`;
  const first = await createBooking(key);
  const second = await createBooking(key);
  const idempotentOk = first.status === 201 && second.status === 200 && second.payload?.replayed === true;
  if (!idempotentOk) {
    throw new Error(
      `Idempotency scenario failed. First=${first.status}, second=${second.status}, replayed=${String(
        second.payload?.replayed
      )}`
    );
  }

  // Сценарий 3: конфликт возвращает унифицированный код ошибки для фронта
  if (a.status === 409 && a.payload?.error !== "SLOT_CONFLICT") {
    throw new Error("Conflict payload contract mismatch for first request.");
  }
  if (b.status === 409 && b.payload?.error !== "SLOT_CONFLICT") {
    throw new Error("Conflict payload contract mismatch for second request.");
  }

  console.log("Booking reliability smoke passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
