// Клиентская часть: обновление списка после добавления/удаления участника
"use client";

import { useState } from "react";
import type { EffectiveOrgRole } from "@/lib/permissions";

export type MemberRow = {
  id: string;
  role: string;
  createdAt: string;
  user: { id: string; email: string; name: string | null };
};

type Props = {
  initialOwner: { email: string; name: string | null } | null;
  initialMembers: MemberRow[];
  currentRole: EffectiveOrgRole;
};

export function TeamClient({ initialOwner, initialMembers, currentRole }: Props) {
  const [owner, setOwner] = useState(initialOwner);
  const [members, setMembers] = useState<MemberRow[]>(initialMembers);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"ADMIN" | "STAFF">("STAFF");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/organization/members");
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "Ошибка загрузки");
      return;
    }
    setOwner(data.owner ?? null);
    setMembers(Array.isArray(data.members) ? data.members : []);
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Команда</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Приглашайте только тех, кто уже зарегистрировался с тем же email. Владелец добавляет участников.
        </p>
      </header>

      {loading ? <p className="text-sm text-stone-500">Обновление…</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {owner ? (
        <section className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/50">
          <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Владелец</h2>
          <p className="mt-2 text-sm">
            {owner.name ? `${owner.name} · ` : ""}
            {owner.email}
          </p>
        </section>
      ) : null}

      <section className="rounded-2xl border border-stone-200 bg-white/90 p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900/50">
        <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">Участники</h2>
        <ul className="mt-3 space-y-2">
          {members.length === 0 ? (
            <li className="text-sm text-stone-500">Пока только владелец</li>
          ) : (
            members.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-stone-100 px-3 py-2 text-sm dark:border-stone-700"
              >
                <span>
                  {m.user.name ? `${m.user.name} · ` : ""}
                  {m.user.email}{" "}
                  <span className="text-stone-500">({m.role === "ADMIN" ? "Админ" : "Сотрудник"})</span>
                </span>
                {currentRole === "OWNER" ? (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-red-600 hover:underline"
                    onClick={async () => {
                      if (!confirm("Убрать из команды?")) return;
                      const r = await fetch(`/api/organization/members/${m.id}`, { method: "DELETE" });
                      if (!r.ok) {
                        const d = await r.json().catch(() => ({}));
                        alert(typeof d.error === "string" ? d.error : "Ошибка");
                        return;
                      }
                      void load();
                    }}
                  >
                    Удалить
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>

        {currentRole === "OWNER" ? (
          <form
            className="mt-6 space-y-3 border-t border-stone-100 pt-6 dark:border-stone-700"
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmitting(true);
              setError(null);
              const res = await fetch("/api/organization/members", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), role }),
              });
              const data = await res.json().catch(() => ({}));
              setSubmitting(false);
              if (!res.ok) {
                setError(typeof data.error === "string" ? data.error : "Не удалось добавить");
                return;
              }
              setEmail("");
              void load();
            }}
          >
            <h3 className="text-sm font-semibold">Добавить по email</h3>
            <input
              type="email"
              required
              placeholder="email коллеги"
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800"
              value={role}
              onChange={(e) => setRole(e.target.value as "ADMIN" | "STAFF")}
            >
              <option value="STAFF">Сотрудник (записи и расписание)</option>
              <option value="ADMIN">Админ (+ услуги и настройки)</option>
            </select>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-teal-700 py-2 text-sm font-medium text-white hover:bg-teal-600 disabled:opacity-50"
            >
              {submitting ? "Добавление…" : "Добавить"}
            </button>
          </form>
        ) : (
          <p className="mt-4 text-xs text-stone-500">Только владелец может приглашать участников.</p>
        )}
      </section>
    </div>
  );
}
