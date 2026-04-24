// Публичная витрина записи: услуга → дата → время → контакты (без чат-бота, пошаговые экраны)
"use client";

import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { hourGridSlotCount, reservationBlockMinutes, stepGridSlotCount } from "@/lib/slots";

/** Телефон: префикс +7, до 10 цифр после, всего максимум 12 символов */
function formatRuPhoneInput(raw: string): string {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("8")) d = d.slice(1);
  if (d.startsWith("7")) d = d.slice(1);
  d = d.slice(0, 10);
  return "+7" + d;
}

type OrgPublic = {
  businessName: string;
  description: string;
  phone: string;
  emailContact: string;
  timezone: string;
  slotStepMinutes: number;
  accentColor: string;
  logoUrl: string | null;
  publicBookingEnabled: boolean;
  services: { id: string; name: string; durationMinutes: number; priceCents: number | null }[];
};

export default function PublicBookPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [org, setOrg] = useState<OrgPublic | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [startsAtIso, setStartsAtIso] = useState<string | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("+7");
  const [clientEmail, setClientEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const service = useMemo(() => org?.services.find((s) => s.id === serviceId), [org, serviceId]);
  const stepMin = org?.slotStepMinutes ?? 30;

  const loadOrg = useCallback(async () => {
    const res = await fetch(`/api/public/${slug}/org`);
    if (!res.ok) {
      setErr("Страница не найдена");
      return;
    }
    const data = await res.json();
    setOrg(data);
  }, [slug]);

  useEffect(() => {
    loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    if (!serviceId || !dateStr || !org) {
      setSlots([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setSlotLoading(true);
      const res = await fetch(
        `/api/public/${slug}/availability?serviceId=${encodeURIComponent(serviceId)}&date=${encodeURIComponent(dateStr)}`
      );
      const data = await res.json();
      if (!cancelled) {
        setSlots(Array.isArray(data.slots) ? data.slots : []);
        setSlotLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, serviceId, dateStr, org]);

  if (err) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <p className="text-zinc-600">{err}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <p className="text-zinc-500">Загрузка…</p>
      </div>
    );
  }

  const accent = org.accentColor || "#4f46e5";

  // Владелец отключил приём онлайн в настройках — только контакты, без сценария записи
  if (!org.publicBookingEnabled) {
    return (
      <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
        <div className="mx-auto max-w-lg px-4 py-10">
          <header className="mb-8 text-center">
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={org.logoUrl} alt="" className="mx-auto mb-4 h-14 w-auto object-contain" />
            ) : null}
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{org.businessName}</h1>
            {org.description ? (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{org.description}</p>
            ) : null}
          </header>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-700 dark:text-zinc-300">Онлайн-запись сейчас не ведётся.</p>
            {org.phone ? (
              <p className="mt-4 text-base font-medium">
                <a href={`tel:${org.phone}`} className="text-indigo-600" style={{ color: accent }}>
                  {org.phone}
                </a>
              </p>
            ) : null}
            {org.emailContact ? <p className="mt-2 text-sm text-zinc-600">{org.emailContact}</p> : null}
          </div>
          <p className="mt-8 text-center text-xs text-zinc-400">
            <Link href="/" className="hover:underline">
              На главную
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Вы записаны</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Мы ждём вас. При необходимости свяжитесь с нами:</p>
          {org.phone ? (
            <p className="mt-4 font-medium">
              <a href={`tel:${org.phone}`} className="text-indigo-600" style={{ color: accent }}>
                {org.phone}
              </a>
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-lg px-4 py-10">
        <header className="mb-8 text-center">
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logoUrl} alt="" className="mx-auto mb-4 h-14 w-auto object-contain" />
          ) : null}
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{org.businessName}</h1>
          {org.description ? (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-wrap">{org.description}</p>
          ) : null}
        </header>

        <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">1. Услуга</h2>
            <div className="mt-2 space-y-2">
              {org.services.length === 0 ? (
                <p className="text-sm text-zinc-500">Пока нет доступных услуг</p>
              ) : (
                org.services.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setServiceId(s.id);
                      setStartsAtIso(null);
                    }}
                    className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      serviceId === s.id
                        ? "border-transparent text-white"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-600"
                    }`}
                    style={
                      serviceId === s.id
                        ? { backgroundColor: accent, borderColor: accent }
                        : undefined
                    }
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="mt-0.5 block text-xs opacity-80">
                      {s.durationMinutes} мин
                      {s.priceCents != null ? ` · ${(s.priceCents / 100).toLocaleString("ru-RU")} ₽` : ""}
                    </span>
                  </button>
                ))
              )}
            </div>
            {service ? (
              <p className="mt-3 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Занимает {hourGridSlotCount(service.durationMinutes)} час. подряд (60 мин) и {stepGridSlotCount(service.durationMinutes, stepMin)}{" "}
                подряд с шагом {stepMin} мин. Для 121–180 мин — три часа; больше 180 мин — четвёртый час и далее по
                сетке.
              </p>
            ) : null}
          </div>

          {serviceId ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">2. Дата</h2>
              <input
                type="date"
                className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                value={dateStr}
                onChange={(e) => {
                  setDateStr(e.target.value);
                  setStartsAtIso(null);
                }}
              />
              <p className="mt-1 text-xs text-zinc-500">Часовой пояс: {org.timezone}</p>
            </div>
          ) : null}

          {serviceId && dateStr ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">3. Время</h2>
              {slotLoading ? (
                <p className="mt-2 text-sm text-zinc-500">Загрузка слотов…</p>
              ) : slots.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-500">На этот день нет свободных окон</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setStartsAtIso(iso)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        startsAtIso === iso ? "text-white" : "border-zinc-200 dark:border-zinc-600"
                      }`}
                      style={
                        startsAtIso === iso
                          ? { backgroundColor: accent, borderColor: accent }
                          : undefined
                      }
                    >
                      {formatInTimeZone(iso, org.timezone, "HH:mm", { locale: ru })}
                    </button>
                  ))}
                </div>
              )}
              {startsAtIso && service ? (
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">
                  Конец резерва на линии:{" "}
                  {formatInTimeZone(
                    addMinutes(parseISO(startsAtIso), reservationBlockMinutes(service.durationMinutes)),
                    org.timezone,
                    "d MMMM HH:mm",
                    { locale: ru }
                  )}
                  .
                </p>
              ) : null}
            </div>
          ) : null}

          {startsAtIso && service ? (
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">4. Контакты</h2>
              <div className="mt-2 space-y-3">
                <input
                  required
                  placeholder="Имя"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
                <input
                  required
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={12}
                  placeholder="+7XXXXXXXXXX"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-800"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(formatRuPhoneInput(e.target.value))}
                />
                <p className="text-xs text-zinc-500">Формат: +7 и 10 цифр (не больше 12 символов)</p>
                <input
                  type="email"
                  placeholder="Email (необязательно)"
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                <textarea
                  placeholder="Комментарий"
                  rows={2}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-800"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button
                  type="button"
                  disabled={submitting}
                  className="w-full rounded-xl py-3 font-medium text-white disabled:opacity-50"
                  style={{ backgroundColor: accent }}
                  onClick={async () => {
                    const name = clientName.trim();
                    const phone = clientPhone.trim();
                    const email = clientEmail.trim();
                    if (!name) {
                      alert("Укажите имя.");
                      return;
                    }
                    if (!/^\+7[0-9]{10}$/.test(phone)) {
                      alert("Телефон: +7 и 10 цифр (12 символов).");
                      return;
                    }
                    setSubmitting(true);
                    const res = await fetch(`/api/public/${slug}/book`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        serviceId,
                        startsAtIso,
                        clientName: name,
                        clientPhone: phone,
                        clientEmail: email || undefined,
                        notes: notes?.trim() || undefined,
                      }),
                    });
                    setSubmitting(false);
                    if (res.ok) setDone(true);
                    else {
                      const d = await res.json().catch(() => ({}));
                      alert(typeof d.error === "string" ? d.error : "Не удалось записаться");
                    }
                  }}
                >
                  {submitting ? "Отправка…" : "Записаться"}
                </button>
              </div>
            </div>
          ) : null}
        </section>

        <p className="mt-8 text-center text-xs text-zinc-400">
          <Link href="/" className="hover:underline">
            На главную
          </Link>
        </p>
      </div>
    </div>
  );
}
