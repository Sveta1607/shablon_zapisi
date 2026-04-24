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
  logoUrl: string | null;
  minAdvanceHours: number;
  slotStepMinutes: number;
  slug: string;
  publicBookingEnabled: boolean;
};

export default function AdminSettingsPage() {
  const [org, setOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/organization");
    if (res.ok) setOrg(await res.json());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  if (loading || !org) {
    return <p className="text-sm text-zinc-500">Загрузка…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Настройки</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Данные бизнеса и параметры публичной записи</p>
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">
          Чтобы <strong>целиком</strong> отключить клиента (и витрину, и вход в админку), выставьте в базе{" "}
          <code className="rounded bg-zinc-200 px-1 font-mono dark:bg-zinc-700">Organization.suspended = true</code>{" "}
          (например, в Prisma Studio).
        </p>
      </header>

      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <form
        className="space-y-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800/50"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const logoRaw = String(fd.get("logoUrl") ?? "").trim();
          const res = await fetch("/api/organization", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              businessName: String(fd.get("businessName")),
              description: String(fd.get("description")),
              phone: String(fd.get("phone")),
              emailContact: String(fd.get("emailContact")),
              timezone: String(fd.get("timezone")),
              accentColor: String(fd.get("accentColor")),
              logoUrl: logoRaw === "" ? null : logoRaw,
              minAdvanceHours: Number(fd.get("minAdvanceHours")),
              slotStepMinutes: Number(fd.get("slotStepMinutes")),
              publicBookingEnabled: fd.get("publicBookingEnabled") === "on",
            }),
          });
          if (res.ok) {
            setOrg(await res.json());
            setMsg("Сохранено");
            setTimeout(() => setMsg(null), 2000);
          } else {
            setMsg("Ошибка сохранения");
          }
        }}
      >
        <div className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-600 dark:bg-zinc-900">
          <input
            type="checkbox"
            name="publicBookingEnabled"
            id="publicBookingEnabled"
            defaultChecked={org.publicBookingEnabled !== false}
            className="mt-0.5 h-4 w-4"
          />
          <label htmlFor="publicBookingEnabled" className="text-sm">
            <span className="font-medium">Принимать онлайн-записи</span>
            <span className="mt-0.5 block text-xs text-zinc-500">
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
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Описание</label>
          <textarea
            name="description"
            rows={4}
            defaultValue={org.description}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Телефон</label>
            <input
              name="phone"
              defaultValue={org.phone}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Email для клиентов</label>
            <input
              name="emailContact"
              type="email"
              defaultValue={org.emailContact}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">Часовой пояс (IANA)</label>
          <input
            name="timezone"
            defaultValue={org.timezone}
            placeholder="Europe/Moscow"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-600 dark:bg-zinc-900"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Цвет кнопок (#hex)</label>
            <input
              name="accentColor"
              defaultValue={org.accentColor}
              pattern="^#[0-9a-fA-F]{6}$"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="text-sm font-medium">URL логотипа</label>
            <input
              name="logoUrl"
              type="url"
              defaultValue={org.logoUrl ?? ""}
              placeholder="https://…"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
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
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
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
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-600 dark:bg-zinc-900"
            />
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          Публичный адрес: <span className="font-mono">/book/{org.slug}</span> (slug задаётся при регистрации)
        </p>
        <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2.5 font-medium text-white hover:bg-indigo-500">
          Сохранить
        </button>
      </form>
    </div>
  );
}
