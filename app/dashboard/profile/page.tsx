"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

type Project = {
  id: number;
  name: string;
  subscription?: {
    plan?: "START" | "PRO" | "PREMIUM" | "ULTIMATE";
    status?: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  } | null;
};

export default function ProfilePage() {
  const [name, setName] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [developer, projectsData] = await Promise.all([
          apiFetch<{ id: number; name: string }>("/developers"),
          apiFetch<Project[]>("/projects"),
        ]);
        setName(developer.name);
        setProjects(projectsData.filter((item) => item.subscription));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#1E3A8A]">Profile</h2>
        <p className="mt-1 text-slate-600">Профиль застройщика, тарифы и статус ручной оплаты.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      {loading ? (
        <div className="rounded-2xl border border-blue-100 bg-white p-5 text-slate-500">
          Загрузка профиля...
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">Developer</p>
            <p className="mt-1 text-xl font-bold text-[#1E3A8A]">{name || "—"}</p>
            <p className="mt-2 text-sm text-slate-600">
              Оплата подписок: вручную (наличные или перевод на карту).
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-[#1E3A8A]">{project.name}</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Plan: <span className="font-semibold">{project.subscription?.plan ?? "START"}</span>
                </p>
                <p className="text-sm text-slate-600">
                  Status: <span className="font-semibold">{project.subscription?.status ?? "TRIAL"}</span>
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Для активации/продления: создайте заявку в разделе Projects.
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
