// Публичная витрина записи: услуга → дата → время → контакты (без чат-бота, пошаговые экраны)
"use client";

import { addMinutes, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ru } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BookingVitrineBackground } from "@/components/book/BookingVitrineBackground";
import { VitrineHomeLink } from "@/components/book/VitrineHomeLink";
import { BookingDateCalendar } from "@/components/book/BookingDateCalendar";
import { reservationBlockMinutes } from "@/lib/slots";

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
  pageBackgroundColor: string;
  pageBackgroundImageUrl: string | null;
  logoUrl: string | null;
  publicBookingEnabled: boolean;
  services: { id: string; name: string; durationMinutes: number; priceCents: number | null }[];
};

export default function PublicBookPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
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
  // Флаги валидации нужны, чтобы подсвечивать незаполненные поля до отправки на сервер
  const [showRequiredHint, setShowRequiredHint] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const service = useMemo(() => org?.services.find((s) => s.id === serviceId), [org, serviceId]);

  // Один раз читаем JSON: и данные витрины, и поле error при 4xx/5xx (раньше любой сбой маскировался как «не найдена»)
  const loadOrg = useCallback(async () => {
    if (!slug || String(slug).trim() === "") {
      setErr("В ссылке не указан адрес витрины. Откройте страницу вида /book/ваш-slug из панели «Скопировать ссылку».");
      return;
    }
    const safeSlug = encodeURIComponent(String(slug));
    // Без кэша: после смены фона в админке страница записи должна сразу подтянуть новые цвет/картинку
    const res = await fetch(`/api/public/${safeSlug}/org`, { cache: "no-store" });
    const data = (await res.json().catch(() => ({}))) as Partial<OrgPublic> & { error?: string };
    if (!res.ok) {
      if (typeof data.error === "string" && data.error.length > 0) {
        setErr(data.error);
        return;
      }
      if (res.status === 404) {
        setErr("Витрина не найдена. Проверьте ссылку или зарегистрируйте организацию.");
        return;
      }
      setErr("Не удалось загрузить витрину. Обновите страницу или проверьте, что dev-сервер запущен.");
      return;
    }
    setOrg(data as OrgPublic);
  }, [slug]);

  useEffect(() => {
    // Загружаем данные витрины по slug при открытии страницы.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadOrg();
  }, [loadOrg]);

  useEffect(() => {
    setCanGoBack(typeof window !== "undefined" && window.history.length > 1);
  }, []);

  useEffect(() => {
    if (!serviceId || !dateStr || !org) {
      // Пока не выбраны услуга и дата, список слотов не запрашиваем и ничего не перерисовываем.
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
        <p className="text-stone-600">{err}</p>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <p className="text-stone-500">Загрузка…</p>
      </div>
    );
  }

  // Акцент витрины: из настроек или тот же бирюзовый, что в теме (новый дефолт в схеме)
  const accent = org.accentColor || "#0d9488";
  // Фон страницы записи: цвет и опциональное фото (за контентом)
  const pageBgRaw = org.pageBackgroundColor ?? "#f5f5f4";
  const pageBg = /^#[0-9a-fA-F]{6}$/.test(pageBgRaw) ? pageBgRaw : "#f5f5f4";
  const pageImg = org.pageBackgroundImageUrl ?? null;
  // При фото-фоне заголовок вне белой карточки — лёгкая подложка, чтобы текст читался
  const headerBox =
    pageImg != null && pageImg !== ""
      ? "rounded-2xl border border-stone-200/80 bg-white/80 px-3 py-4 shadow-sm backdrop-blur dark:border-stone-600/60 dark:bg-stone-900/70"
      : "";

  // Владелец отключил приём онлайн в настройках — только контакты, без сценария записи
  if (!org.publicBookingEnabled) {
    return (
      <BookingVitrineBackground backgroundColor={pageBg} backgroundImageUrl={pageImg}>
        <div className="mx-auto max-w-lg px-4 py-10">
          <header className={`mb-8 text-center ${headerBox}`}>
            {org.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={org.logoUrl}
                alt=""
                className="mx-auto mb-4 w-full max-w-full h-auto max-h-[min(50vh,22rem)] object-contain"
              />
            ) : null}
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{org.businessName}</h1>
            {org.description ? (
              <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">{org.description}</p>
            ) : null}
          </header>
          <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <p className="text-sm text-stone-700 dark:text-stone-300">Онлайн-запись сейчас не ведётся.</p>
            {org.phone ? (
              <p className="mt-4 text-base font-medium">
                <a href={`tel:${org.phone}`} className="font-medium" style={{ color: accent }}>
                  {org.phone}
                </a>
              </p>
            ) : null}
            {org.emailContact ? <p className="mt-2 text-sm text-stone-600">{org.emailContact}</p> : null}
          </div>
          <VitrineHomeLink className="hover:underline" />
        </div>
      </BookingVitrineBackground>
    );
  }

  if (done) {
    return (
      <BookingVitrineBackground backgroundColor={pageBg} backgroundImageUrl={pageImg}>
        <div className="mx-auto flex min-h-full max-w-lg flex-col justify-center px-4 py-16">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">Вы записаны</h1>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Мы ждём вас. При необходимости свяжитесь с нами:</p>
          {org.phone ? (
            <p className="mt-4 font-medium">
              <a href={`tel:${org.phone}`} className="font-medium" style={{ color: accent }}>
                {org.phone}
              </a>
            </p>
          ) : null}
          {/* Назад: владелец — в панель; гость — только если есть история браузера */}
          {(session?.user || canGoBack) ? (
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  if (session?.user) {
                    router.push("/admin");
                  } else {
                    router.back();
                  }
                }}
                className="w-full rounded-xl border-2 border-stone-200 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-800 transition hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700/80"
              >
                {session?.user ? "Назад в панель" : "Назад"}
              </button>
            </div>
          ) : null}
        </div>
        </div>
      </BookingVitrineBackground>
    );
  }

  return (
    <BookingVitrineBackground backgroundColor={pageBg} backgroundImageUrl={pageImg}>
      <div className="mx-auto max-w-lg px-4 py-10">
        <header className={`mb-8 text-center ${headerBox}`}>
          {org.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={org.logoUrl}
              alt=""
              className="mx-auto mb-4 w-full max-w-full h-auto max-h-[min(50vh,22rem)] object-contain"
            />
          ) : null}
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">{org.businessName}</h1>
          {org.description ? (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400 whitespace-pre-wrap">{org.description}</p>
          ) : null}
        </header>

        <section className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">1. Услуга</h2>
            <div className="mt-2 space-y-2">
              {org.services.length === 0 ? (
                <p className="text-sm text-stone-500">Пока нет доступных услуг</p>
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
                        : "border-stone-200 hover:border-stone-300 dark:border-stone-600"
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
          </div>

          {serviceId ? (
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">2. Дата</h2>
              <BookingDateCalendar
                key={dateStr ? dateStr.slice(0, 7) : "pick-date"}
                value={dateStr}
                onChange={(ymd) => {
                  setDateStr(ymd);
                  setStartsAtIso(null);
                }}
                timezone={org.timezone}
                accentColor={accent}
              />
              <p className="mt-1 text-xs text-stone-500">Часовой пояс: {org.timezone}</p>
            </div>
          ) : null}

          {serviceId && dateStr ? (
            <div>
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">3. Время</h2>
              {slotLoading ? (
                <p className="mt-2 text-sm text-stone-500">Загрузка слотов…</p>
              ) : slots.length === 0 ? (
                <p className="mt-2 text-sm text-stone-500">На этот день нет свободных окон</p>
              ) : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {slots.map((iso) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setStartsAtIso(iso)}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${
                        startsAtIso === iso ? "text-white" : "border-stone-200 dark:border-stone-600"
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
                <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">
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
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">4. Контакты</h2>
              <div className="mt-2 space-y-3">
                {/* Подсказка нужна, чтобы явно сообщить пользователю причину блокировки отправки формы */}
                {showRequiredHint ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                    Необходимо заполнить обязательные поля.
                  </p>
                ) : null}
                <input
                  required
                  placeholder="Имя"
                  className={`w-full rounded-lg border bg-white px-3 py-2 dark:bg-stone-800 ${
                    showRequiredHint && !clientName.trim()
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-stone-300 dark:border-stone-600"
                  }`}
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
                  className={`w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm dark:bg-stone-800 ${
                    (showRequiredHint || phoneTouched) && !/^\+7[0-9]{10}$/.test(clientPhone.trim())
                      ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                      : "border-stone-300 dark:border-stone-600"
                  }`}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(formatRuPhoneInput(e.target.value))}
                  onBlur={() => setPhoneTouched(true)}
                />
                <p className="text-xs text-stone-500">Формат: +7 и 10 цифр (не больше 12 символов)</p>
                <input
                  type="email"
                  placeholder="Email (необязательно)"
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-800"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                />
                <textarea
                  placeholder="Комментарий"
                  rows={2}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-800"
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
                    // Локальная проверка нужна, чтобы сразу подсветить пустые поля и не делать лишний API-запрос
                    setPhoneTouched(true);
                    if (!name) {
                      setShowRequiredHint(true);
                      return;
                    }
                    if (!/^\+7[0-9]{10}$/.test(phone)) {
                      setShowRequiredHint(true);
                      return;
                    }
                    // После успешной локальной проверки скрываем подсказку об обязательных полях
                    setShowRequiredHint(false);
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

        <VitrineHomeLink className="hover:underline" />
      </div>
    </BookingVitrineBackground>
  );
}
