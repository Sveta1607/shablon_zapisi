// Настройки организации: профиль, контакты, внешний вид, часовой пояс, правила слотов
"use client";

import { useCallback, useEffect, useState } from "react";

type Org = {
  businessName: string;
  description: string;
  phone: string;
  emailContact: string;
  timezone: string;
  accentColor: string;
  pageBackgroundColor: string;
  pageBackgroundImageUrl: string | null;
  logoUrl: string | null;
  minAdvanceHours: number;
  slotStepMinutes: number;
  slug: string;
  publicBookingEnabled: boolean;
  /** Сериализация Prisma: для сброса поля URL логотипа после загрузки файла */
  updatedAt?: string;
};

/** Нормализует hex для API и type=color (только #rrggbb; иначе — безопасный цвет по умолчанию) */
function parseHexOrDefault(s: string | undefined): string {
  if (s && /^#[0-9a-fA-F]{6}$/.test(s)) {
    return s.toLowerCase();
  }
  return "#0d9488";
}

/** Цвет фона витрины (светлый по умолчанию) */
function parsePageBgHex(s: string | undefined): string {
  if (s && /^#[0-9a-fA-F]{6}$/.test(s)) {
    return s.toLowerCase();
  }
  return "#f5f5f4";
}

export default function AdminSettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  // Текст ошибки после PATCH «Сохранить» (сервер отдаёт, например, невалидный URL картинки)
  const [formSaveError, setFormSaveError] = useState<string | null>(null);
  // Цвет витрины: синхронизируется с org, уходит в форму через type=hidden; палитра — нативный type=color
  const [accent, setAccent] = useState("#0d9488");
  // Индикаторы загрузки логотипа с компьютера (сохраняется сразу на сервер, отдельно от кнопки «Сохранить»)
  const [logoUploading, setLogoUploading] = useState(false);
  // Удаление фото с витрины (отдельный запрос с logoUrl: null)
  const [logoRemoving, setLogoRemoving] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  // Поле ссылки: контролируемое, чтобы введённый URL не терялся при сохранении после загрузки файла (uncontrolled+key+FormData)
  const [logoUrlInput, setLogoUrlInput] = useState("");
  // Фон страницы /book: заливка (как акцент) + картинка-фон
  const [pageBg, setPageBg] = useState("#f5f5f4");
  const [pageBgImageInput, setPageBgImageInput] = useState("");
  const [pageBgUploading, setPageBgUploading] = useState(false);
  const [pageBgRemoving, setPageBgRemoving] = useState(false);
  const [pageBgError, setPageBgError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/organization");
    if (res.ok) {
      const data: Org = await res.json();
      setOrg(data);
      setAccent(parseHexOrDefault(data.accentColor));
      setLogoUrlInput(data.logoUrl ?? "");
      setPageBg(parsePageBgHex(data.pageBackgroundColor));
      setPageBgImageInput(data.pageBackgroundImageUrl ?? "");
    }
  }, []);

  // Отправка файла в /api/organization/logo, обновление org и поля пути в форме
  const uploadLogoFromDisk = useCallback(async (file: File) => {
    setLogoUploadError(null);
    setLogoUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/organization/logo", { method: "POST", body: fd });
    setLogoUploading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setLogoUploadError(typeof d.error === "string" ? d.error : "Не удалось загрузить");
      return;
    }
    const data: Org = await res.json();
    setOrg(data);
    setAccent(parseHexOrDefault(data.accentColor));
    setLogoUrlInput(data.logoUrl ?? "");
    setMsg("Логотип сохранён");
    setTimeout(() => setMsg(null), 2000);
  }, []);

  // Снятие картинки с витрины: null в API; файл с диска снимается в PATCH, если путь был /uploads/…
  const removeLogoFromDisplay = useCallback(async () => {
    if (!org?.logoUrl) return;
    if (!window.confirm("Убрать логотип с публичной витрины? Картинка перестанет отображаться у клиентов.")) {
      return;
    }
    setLogoUploadError(null);
    setLogoRemoving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logoUrl: null }),
    });
    setLogoRemoving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setLogoUploadError(typeof d.error === "string" ? d.error : "Не удалось убрать фото");
      return;
    }
    const data: Org = await res.json();
    setOrg(data);
    setLogoUrlInput("");
    setMsg("Фото с витрины убрано");
    setTimeout(() => setMsg(null), 2000);
  }, [org?.logoUrl]);

  // Файл в /api/organization/page-background-image; ответ Prisma пишет pageBackgroundImageUrl, обновляем стейт
  const uploadPageBackgroundFromDisk = useCallback(async (file: File) => {
    setPageBgError(null);
    setPageBgUploading(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/organization/page-background-image", { method: "POST", body: fd });
    setPageBgUploading(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPageBgError(typeof d.error === "string" ? d.error : "Не удалось загрузить фон");
      return;
    }
    const data: Org = await res.json();
    setOrg(data);
    setPageBg(parsePageBgHex(data.pageBackgroundColor));
    setPageBgImageInput(data.pageBackgroundImageUrl ?? "");
    setMsg("Фон витрины обновлён");
    setTimeout(() => setMsg(null), 2000);
  }, []);

  // Сброс URL фона: PATCH; сервер удаляет старый файл в uploads, если путь был локальный
  const removePageBackgroundImage = useCallback(async () => {
    if (!org?.pageBackgroundImageUrl) return;
    if (!window.confirm("Убрать фоновую картинку? Останется только выбранный цвет заливки.")) return;
    setPageBgError(null);
    setPageBgRemoving(true);
    const res = await fetch("/api/organization", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageBackgroundImageUrl: null }),
    });
    setPageBgRemoving(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setPageBgError(typeof d.error === "string" ? d.error : "Не удалось убрать фон");
      return;
    }
    const data: Org = await res.json();
    setOrg(data);
    setPageBgImageInput("");
    setMsg("Фоновое фото убрано");
    setTimeout(() => setMsg(null), 2000);
  }, [org?.pageBackgroundImageUrl]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading || !org) {
    return <p className="text-sm text-stone-500">Загрузка…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="text-stone-600 dark:text-stone-400">Данные бизнеса и параметры публичной записи</p>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          Чтобы <strong>целиком</strong> отключить клиента (и витрину, и вход в админку), выставьте в базе{" "}
          <code className="rounded bg-stone-200 px-1 font-mono dark:bg-stone-700">Organization.suspended = true</code>{" "}
          (например, в Prisma Studio).
        </p>
      </header>

      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}
      {formSaveError ? <p className="text-sm text-red-600">{formSaveError}</p> : null}

      <form
        className="space-y-5 rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900/50"
        onSubmit={async (e) => {
          e.preventDefault();
          setFormSaveError(null);
          const fd = new FormData(e.currentTarget);
          const logoForSave = logoUrlInput.trim();
          // number input без значения в FormData: не подставляем 0 — сохраняем текущие из org
          const numOr = (v: FormDataEntryValue | null, fallback: number) => {
            if (v === null || v === "") {
              return fallback;
            }
            const n = Number(v);
            return Number.isNaN(n) ? fallback : n;
          };
          const res = await fetch("/api/organization", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // String(null) из FormData даёт строку "null" и ломает валидацию
              businessName: String(fd.get("businessName") ?? ""),
              description: String(fd.get("description") ?? ""),
              phone: String(fd.get("phone") ?? ""),
              emailContact: String(fd.get("emailContact") ?? ""),
              timezone: String(fd.get("timezone") ?? ""),
              accentColor: accent,
              pageBackgroundColor: pageBg,
              // Картинки не обязательны: пусто → null, только заливка с pageBg
              pageBackgroundImageUrl: pageBgImageInput.trim() === "" ? null : pageBgImageInput.trim(),
              logoUrl: logoForSave === "" ? null : logoForSave,
              minAdvanceHours: numOr(fd.get("minAdvanceHours"), org.minAdvanceHours),
              slotStepMinutes: numOr(fd.get("slotStepMinutes"), org.slotStepMinutes),
              publicBookingEnabled: fd.get("publicBookingEnabled") === "on",
            }),
          });
          if (res.ok) {
            const data: Org = await res.json();
            setOrg(data);
            setAccent(parseHexOrDefault(data.accentColor));
            setPageBg(parsePageBgHex(data.pageBackgroundColor));
            setPageBgImageInput(data.pageBackgroundImageUrl ?? "");
            setLogoUrlInput(data.logoUrl ?? "");
            setFormSaveError(null);
            setMsg("Сохранено");
            setTimeout(() => setMsg(null), 2000);
          } else {
            // 500-е от Next иногда с HTML: читаем текст и парсим JSON при возможности, всегда показываем код
            const raw = await res.text();
            let message = `Запрос не выполнен (код ${res.status})`;
            try {
              const d = JSON.parse(raw) as { error?: string; message?: string };
              if (typeof d.error === "string" && d.error.length > 0) {
                message = d.error;
              } else if (typeof d.message === "string" && d.message.length > 0) {
                message = d.message;
              } else {
                const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 200);
                if (snippet) {
                  message = `${message}. Ответ: ${snippet}`;
                }
              }
            } catch {
              const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 200);
              if (snippet) {
                message = `Код ${res.status}. ${snippet}`;
              }
            }
            setFormSaveError(message);
            setMsg(null);
          }
        }}
      >
        <div className="flex items-start gap-3 rounded-lg border border-stone-200 bg-stone-50/80 p-3 dark:border-stone-600 dark:bg-stone-900/80">
          <input
            type="checkbox"
            name="publicBookingEnabled"
            id="publicBookingEnabled"
            defaultChecked={org.publicBookingEnabled !== false}
            className="mt-0.5 h-4 w-4"
          />
          <label htmlFor="publicBookingEnabled" className="text-sm">
            <span className="font-medium">Принимать онлайн-записи</span>
            <span className="mt-0.5 block text-xs text-stone-500">
              Если снять галочку, публичная страница /book останется с контактами, но выбрать услугу и время нельзя.
            </span>
          </label>
        </div>
        <div>
          <label className="text-sm font-medium">Название на витрине</label>
          <input
            name="businessName"
            required
            defaultValue={org.businessName}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-900"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Описание</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={org.description}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-900"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Телефон</label>
            <input
              name="phone"
              defaultValue={org.phone}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email для клиентов</label>
            <input
              name="emailContact"
              type="email"
              defaultValue={org.emailContact}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-900"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Часовой пояс (IANA)</label>
          <input
            name="timezone"
            defaultValue={org.timezone}
            placeholder="Europe/Moscow"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-sm dark:border-stone-600 dark:bg-stone-900"
          />
        </div>
        {/* Блок настроек фона /book: цвет из state + URL в state; «Сохранить» уходит вместе с остальными полями */}
        <div className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 dark:border-stone-600 dark:bg-stone-900/40">
          <p className="text-sm font-medium text-stone-900 dark:text-stone-100">Фон экрана записи (/book)</p>
          <p className="mt-0.5 text-xs text-stone-500">Цвет и опциональное фото — <strong>позади</strong> формы, не перекрывают кнопки. Фото приглушается, чтобы оставалось читабельно.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <span className="text-sm font-medium">Цвет заливки</span>
              <p className="mt-0.5 text-xs text-stone-500">Полный фон страницы под картинкой (если есть)</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <label
                  htmlFor="pageBgPicker"
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-white p-1.5 text-sm text-stone-700 shadow-sm dark:border-stone-600 dark:bg-stone-800"
                >
                  <input
                    id="pageBgPicker"
                    type="color"
                    value={pageBg}
                    onChange={(e) => setPageBg(e.target.value.toLowerCase())}
                    className="h-10 w-14 cursor-pointer overflow-hidden rounded border-0 bg-transparent p-0 [color-scheme:light] dark:[color-scheme:dark]"
                    aria-label="Цвет фона витрины"
                  />
                  <span className="pr-1 font-mono text-xs text-stone-500">{pageBg}</span>
                </label>
              </div>
            </div>
            <div>
              <span className="text-sm font-medium">Картинка на фон</span>
              <p className="mt-0.5 text-xs text-stone-500">По ширине экрана, под белыми карточками</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  className="sr-only"
                  id="pageBgFileUpload"
                  disabled={pageBgUploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = "";
                    if (f) void uploadPageBackgroundFromDisk(f);
                  }}
                />
                <label
                  htmlFor="pageBgFileUpload"
                  className={`inline-flex cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 ${
                    pageBgUploading ? "pointer-events-none opacity-50" : "hover:bg-stone-50 dark:hover:bg-stone-800"
                  }`}
                >
                  {pageBgUploading ? "Загрузка…" : "Загрузить с компьютера"}
                </label>
                {org.pageBackgroundImageUrl ? (
                  <button
                    type="button"
                    disabled={pageBgRemoving}
                    onClick={() => void removePageBackgroundImage()}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                  >
                    {pageBgRemoving ? "…" : "Убрать фото"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
          {pageBgError ? <p className="mt-2 text-xs text-red-600">{pageBgError}</p> : null}
          <label className="mt-2 block text-xs font-medium text-stone-600 dark:text-stone-400" htmlFor="pageBgUrlText">
            Или ссылка на картинку
          </label>
          <input
            id="pageBgUrlText"
            type="text"
            value={pageBgImageInput}
            onChange={(e) => setPageBgImageInput(e.target.value)}
            placeholder="https://… (необязательно)"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium">Цвет кнопок на витрине</span>
            <p className="mt-0.5 text-xs text-stone-500">Нажмите на квадрат — откроется палитра, код вводить не нужно</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <input type="hidden" name="accentColor" value={accent} />
              <label
                htmlFor="accentColorPicker"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 bg-stone-50 p-1.5 text-sm text-stone-700 shadow-sm dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200"
              >
                <input
                  id="accentColorPicker"
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value.toLowerCase())}
                  className="h-10 w-14 cursor-pointer overflow-hidden rounded border-0 bg-transparent p-0 [color-scheme:light] dark:[color-scheme:dark]"
                  aria-label="Открыть выбор цвета для кнопок и акцентов на странице записи"
                />
                <span className="pr-1 font-mono text-xs text-stone-500">{accent}</span>
              </label>
            </div>
          </div>
          <div>
            <span className="text-sm font-medium">Логотип</span>
            <p className="mt-0.5 text-xs text-stone-500">
              Загрузка с компьютера (до 2 МБ) или ссылка — что показано на витрине /book
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
                className="sr-only"
                id="logoFileUpload"
                disabled={logoUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.currentTarget.value = "";
                  if (f) void uploadLogoFromDisk(f);
                }}
              />
              <label
                htmlFor="logoFileUpload"
                className={`inline-flex cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-800 shadow-sm dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 ${
                  logoUploading ? "pointer-events-none opacity-50" : "hover:bg-stone-50 dark:hover:bg-stone-800"
                }`}
              >
                {logoUploading ? "Загрузка…" : "Загрузить с компьютера"}
              </label>
            </div>
            {logoUploadError ? <p className="mt-1 text-xs text-red-600">{logoUploadError}</p> : null}
            {org.logoUrl ? (
              <div className="mt-2">
                <p className="text-xs text-stone-500">Сейчас в витрине:</p>
                <div className="mt-1 flex flex-wrap items-end gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={org.logoUrl} alt="" className="h-20 w-auto max-w-full object-contain" />
                  <button
                    type="button"
                    disabled={logoRemoving}
                    onClick={() => void removeLogoFromDisplay()}
                    className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                  >
                    {logoRemoving ? "…" : "Убрать с витрины"}
                  </button>
                </div>
              </div>
            ) : null}
            <label className="mt-2 block text-xs font-medium text-stone-600 dark:text-stone-400" htmlFor="logoUrlText">
              Или ссылка на картинку
            </label>
            <input
              id="logoUrlText"
              type="text"
              value={logoUrlInput}
              onChange={(e) => setLogoUrlInput(e.target.value)}
              inputMode="url"
              autoComplete="off"
              placeholder="https://… (после загрузки файла сюда можно вставить свою ссылку и нажать «Сохранить»)"
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
            />
            {org.logoUrl?.startsWith("/uploads/") ? (
              <p className="mt-0.5 text-xs text-stone-500">Файл на сервере: {org.logoUrl}. Замените ссылку выше, чтобы витрина брала картинку с другого адреса.</p>
            ) : null}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Мин. заблаговременность (часы)</label>
            <input
              name="minAdvanceHours"
              type="number"
              min={0}
              max={168}
              defaultValue={org.minAdvanceHours}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Шаг слота (минуты)</label>
            <input
              name="slotStepMinutes"
              type="number"
              min={5}
              max={120}
              defaultValue={org.slotStepMinutes}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 dark:border-stone-600 dark:bg-stone-900"
            />
          </div>
        </div>
        <p className="text-xs text-stone-500">
          Публичный адрес: <span className="font-mono">/book/{org.slug}</span> (slug задаётся при регистрации)
        </p>
        <button type="submit" className="rounded-lg bg-teal-700 px-5 py-2.5 font-medium text-white shadow-sm hover:bg-teal-600">
          Сохранить
        </button>
      </form>
    </div>
  );
}
