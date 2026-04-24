"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const STORAGE_KEY = "oson_uy_developer_name";
const getInitialName = () =>
  typeof window === "undefined" ? "" : (window.localStorage.getItem(STORAGE_KEY) ?? "");

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [developerName, setDeveloperName] = useState(getInitialName);
  const [draftName, setDraftName] = useState(getInitialName);

  const saveName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = draftName.trim();
    if (!nextName) return;
    window.localStorage.setItem(STORAGE_KEY, nextName);
    setDeveloperName(nextName);
  };

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
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
      {!developerName && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            onSubmit={saveName}
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5 shadow-xl"
          >
            <h2 className="text-lg font-bold text-[#1E3A8A]">Имя застройщика</h2>
            <p className="text-sm text-slate-600">
              Укажите имя один раз, и проекты будут создаваться от этого застройщика.
            </p>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Например: Samarkand Build Group"
              className="h-11 w-full rounded-xl text-black border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              required
            />
            <button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#F97316] text-sm font-semibold text-white transition hover:bg-orange-600"
            >
              Сохранить и продолжить
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
