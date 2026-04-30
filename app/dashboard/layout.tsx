"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { API_URL, ApiAuthError, apiFetch, clearSession } from "@/lib/api";

const STORAGE_KEY = "oson_uy_developer_name";
const TOKEN_KEY = "oson_uy_token";
const getInitialName = () =>
  typeof window === "undefined" ? "" : (window.localStorage.getItem(STORAGE_KEY) ?? "");
const getInitialToken = () =>
  typeof window === "undefined" ? "" : (window.localStorage.getItem(TOKEN_KEY) ?? "");

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [developerName, setDeveloperName] = useState(getInitialName);
  const [draftName, setDraftName] = useState(getInitialName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(getInitialToken);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      try {
        setError(null);
        const endpoint = isRegister ? "register" : "login";
        const data = await apiFetch<{
          token: string;
          developer: { name: string };
        }>(`/auth/${endpoint}`, {
          method: "POST",
          body: JSON.stringify(
            isRegister
              ? { name: draftName.trim(), email: email.trim(), password }
              : { email: email.trim(), password },
          ),
        });
        window.localStorage.setItem(STORAGE_KEY, data.developer.name);
        window.localStorage.setItem(TOKEN_KEY, data.token);
        setDeveloperName(data.developer.name);
        setToken(data.token);
        setCheckingSession(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка авторизации");
      }
    })();
  };

  const logout = () => {
    clearSession();
    setDeveloperName("");
    setToken("");
    setCheckingSession(false);
  };

  useEffect(() => {
    void (async () => {
      if (!token) {
        setCheckingSession(false);
        return;
      }
      try {
        await apiFetch<{ developerId: number }>("/auth/me");
      } catch (err) {
        if (err instanceof ApiAuthError) {
          logout();
        }
      } finally {
        setCheckingSession(false);
      }
    })();
  }, [token]);

  return (
    <div className="min-h-screen bg-linear-to-b from-white to-slate-50">
      <header className="border-b border-blue-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-[#1E3A8A]">Oson Uy Dashboard</h1>
            <p className="text-xs text-slate-500">
              {developerName
                ? `Застройщик: ${developerName}`
                : "Введите имя застройщика для начала работы"}
            </p>
          </div>
          <nav className="flex flex-wrap gap-2">
            <Link
              href="/dashboard/leads"
              className="rounded-xl bg-[#1E3A8A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3C55BE]"
            >
              Leads
            </Link>
            <Link
              href="/dashboard/projects"
              className="rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Projects
            </Link>
            <Link
              href="/dashboard/apartments"
              className="rounded-xl bg-slate-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-600"
            >
              Apartments
            </Link>
            <Link
              href="/dashboard/billing"
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-500"
            >
              Billing
            </Link>
            <Link
              href="/dashboard/profile"
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
            >
              Profile
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-300"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">
        {!checkingSession && developerName && token ? children : null}
      </main>
      {!checkingSession && (!developerName || !token) ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={saveName}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-[#1E3A8A]">
              {isRegister ? "Регистрация застройщика" : "Вход в кабинет застройщика"}
            </h2>
            <p className="text-sm text-slate-600">
              {isRegister
                ? "Создайте аккаунт, чтобы получить 1 месяц бесплатного доступа."
                : "Войдите в аккаунт для доступа к проектному dashboard."}
            </p>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {isRegister && (
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Название компании"
                className="h-11 w-full rounded-xl text-black border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
                required
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="email@example.com"
              className="h-11 w-full rounded-xl text-black border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Пароль"
              className="h-11 w-full rounded-xl text-black border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              required
            />
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#F97316] text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              {isRegister ? "Создать аккаунт" : "Войти"}
            </button>
            <button
              type="button"
              onClick={() => setIsRegister((current) => !current)}
              className="text-sm font-semibold text-[#1E3A8A]"
            >
              {isRegister ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
