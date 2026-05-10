"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  X,
  Home,
  User,
  CreditCard,
  Layers,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { API_URL, apiFetch, getToken } from "@/lib/api";
import { formatUzs } from "@/lib/currency";

type AptStatus = "AVAILABLE" | "RESERVED" | "SOLD";

type Apartment = {
  id: number;
  number: string;
  floor: number;
  rooms: number;
  areaSqm: number;
  priceUzs: number | null;
  status: AptStatus;
  layoutImageUrl?: string | null;
  model3dUrl?: string | null;
};

type ApartmentDetail = Apartment & {
  customers: Array<{
    id: number;
    name: string;
    phone: string;
    accessCode: string;
    payments: Array<{
      id: number;
      amountUzs: number;
      paidAt: string;
      comment: string | null;
      type: string;
    }>;
  }>;
  leads: Array<{
    id: number;
    name: string;
    phone: string;
    status: string;
    createdAt: string;
  }>;
};

const statusStyle: Record<AptStatus, string> = {
  AVAILABLE: "bg-emerald-500/90 text-white border-emerald-600",
  RESERVED: "bg-amber-400/95 text-slate-900 border-amber-500",
  SOLD: "bg-red-500/90 text-white border-red-600",
};

export default function ChessboardPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const t = useTranslations("Dashboard.chessboard");

  const [projectName, setProjectName] = useState<string>("");
  const [list, setList] = useState<Apartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ApartmentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!projectId || Number.isNaN(projectId)) return;
    setLoading(true);
    setError(null);
    try {
      const proj = await apiFetch<{ name: string }>(`/projects/${projectId}`);
      setProjectName(proj.name);
      const res = await apiFetch<{ items: Apartment[] }>(
        `/projects/${projectId}/apartments?limit=500`,
      );
      setList(res.items ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const byFloor = useMemo(() => {
    const m = new Map<number, Apartment[]>();
    for (const a of list) {
      const f = a.floor;
      if (!m.has(f)) m.set(f, []);
      m.get(f)!.push(a);
    }
    return [...m.entries()].sort((a, b) => b[0] - a[0]);
  }, [list]);

  const openDetail = async (apt: Apartment) => {
    setDetailLoading(true);
    setSelected({ ...apt, customers: [], leads: [] });
    try {
      const d = await apiFetch<ApartmentDetail>(
        `/projects/${projectId}/apartments/${apt.id}`,
      );
      setSelected(d);
    } catch {
      setSelected(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const patchStatus = async (aptId: number, status: AptStatus) => {
    await fetch(`${API_URL}/projects/${projectId}/apartments/${aptId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ status }),
    });
    await load();
    if (selected?.id === aptId) {
      const d = await apiFetch<ApartmentDetail>(
        `/projects/${projectId}/apartments/${aptId}`,
      );
      setSelected(d);
    }
  };

  if (!projectId || Number.isNaN(projectId)) {
    return (
      <div className="p-10 text-slate-500 font-medium">{t("badProject")}</div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#1E3A8A]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-24 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/projects"
            className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-[#1E3A8A]">
              {t("title")}
            </h1>
            <p className="text-slate-500 font-medium">
              {projectName} · {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs font-bold uppercase tracking-widest">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-emerald-800">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {t("legend.free")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-amber-900">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            {t("legend.reserved")}
          </span>
          <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1.5 text-red-800">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {t("legend.sold")}
          </span>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 font-bold">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {byFloor.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 font-medium">
            {t("empty")}
          </div>
        ) : (
          byFloor.map(([floor, units]) => (
            <div
              key={floor}
              className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-400">
                <Layers className="h-4 w-4" />
                {t("floor", { n: floor })}
              </div>
              <div className="flex flex-wrap gap-2">
                {units.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => void openDetail(a)}
                    className={`min-w-[5.5rem] rounded-2xl border px-3 py-3 text-left shadow-sm transition hover:scale-[1.02] active:scale-[0.98] ${statusStyle[a.status]}`}
                  >
                    <div className="text-[10px] font-black uppercase opacity-80">
                      №{a.number}
                    </div>
                    <div className="text-sm font-black">{a.rooms} {t("rooms")}</div>
                    <div className="text-[10px] font-bold opacity-90">
                      {a.areaSqm} м²
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {t("drawerTitle", { n: selected.number })}
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  {t("floor", { n: selected.floor })} · {selected.rooms}{" "}
                  {t("rooms")} · {selected.areaSqm} м²
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" />
                </div>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      {t("status")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        ["AVAILABLE", "RESERVED", "SOLD"] as AptStatus[]
                      ).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void patchStatus(selected.id, s)}
                          className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider border-2 ${
                            selected.status === s
                              ? statusStyle[s]
                              : "border-slate-200 text-slate-500 bg-white"
                          }`}
                        >
                          {t(`statuses.${s}`)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 flex items-center gap-1">
                      <Home className="h-3 w-3" /> {t("price")}
                    </p>
                    <p className="text-lg font-black text-slate-900">
                      {selected.priceUzs != null
                        ? formatUzs(selected.priceUzs)
                        : "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1">
                      <User className="h-3 w-3" /> {t("clients")}
                    </p>
                    {selected.customers?.length ? (
                      <ul className="space-y-3">
                        {selected.customers.map((c) => (
                          <li
                            key={c.id}
                            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4"
                          >
                            <div className="font-bold text-slate-900">
                              {c.name}
                            </div>
                            <div className="text-xs text-slate-500">{c.phone}</div>
                            <div className="mt-2 space-y-1">
                              <p className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                                <CreditCard className="h-3 w-3" />{" "}
                                {t("payments")}
                              </p>
                              {c.payments?.length ? (
                                c.payments.map((p) => (
                                  <div
                                    key={p.id}
                                    className="text-xs font-medium text-slate-600"
                                  >
                                    {formatUzs(p.amountUzs)} ·{" "}
                                    {new Date(p.paidAt).toLocaleDateString()} ·{" "}
                                    {p.type}
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-slate-400">
                                  —
                                </span>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400">{t("noClients")}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                      {t("recentLeads")}
                    </p>
                    {selected.leads?.length ? (
                      <ul className="space-y-2 text-xs">
                        {selected.leads.map((l) => (
                          <li
                            key={l.id}
                            className="flex justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                          >
                            <span className="font-bold text-slate-800 truncate">
                              {l.name}
                            </span>
                            <span className="shrink-0 text-slate-500">
                              {l.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-400">{t("noLeads")}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
