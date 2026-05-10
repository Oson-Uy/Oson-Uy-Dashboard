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
  LayoutGrid,
  Plus,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { API_URL, apiFetch, getToken } from "@/lib/api";
import { formatUzs } from "@/lib/currency";

type AptStatus = "AVAILABLE" | "RESERVED" | "SOLD";

type Apartment = {
  id: number;
  sectionKey?: string;
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

type BulkSectionForm = {
  sectionKey: string;
  sectionLabel: string;
  floorFrom: number;
  floorTo: number;
  unitsPerFloor: number;
  rooms: number;
  areaSqm: number;
  priceUzs: string;
  layoutVariantId: string;
};

function defaultBulkSection(): BulkSectionForm {
  return {
    sectionKey: "",
    sectionLabel: "",
    floorFrom: 1,
    floorTo: 9,
    unitsPerFloor: 4,
    rooms: 2,
    areaSqm: 55,
    priceUzs: "",
    layoutVariantId: "",
  };
}

function countBulkUnits(sections: BulkSectionForm[]): number {
  let n = 0;
  for (const sec of sections) {
    const lo = Math.min(sec.floorFrom, sec.floorTo);
    const hi = Math.max(sec.floorFrom, sec.floorTo);
    if (Number.isFinite(lo) && Number.isFinite(hi) && hi >= lo) {
      n += (hi - lo + 1) * Math.max(1, sec.unitsPerFloor);
    }
  }
  return n;
}

function previewNumbers(sections: BulkSectionForm[], max = 8): string[] {
  const out: string[] = [];
  for (const sec of sections) {
    const sk = sec.sectionKey.trim();
    const lo = Math.min(sec.floorFrom, sec.floorTo);
    const hi = Math.max(sec.floorFrom, sec.floorTo);
    for (let f = lo; f <= hi && out.length < max; f++) {
      for (let u = 1; u <= sec.unitsPerFloor && out.length < max; u++) {
        const num = sk
          ? `${sk}-${f}-${String(u).padStart(2, "0")}`
          : `${f}-${String(u).padStart(2, "0")}`;
        out.push(num);
      }
    }
  }
  return out;
}

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

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSections, setBulkSections] = useState<BulkSectionForm[]>([
    defaultBulkSection(),
  ]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

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

  const hasSections = useMemo(
    () => list.some((a) => (a.sectionKey ?? "").length > 0),
    [list],
  );

  const grouped = useMemo(() => {
    const sectionMap = new Map<string, Apartment[]>();
    for (const a of list) {
      const sk = a.sectionKey ?? "";
      if (!sectionMap.has(sk)) sectionMap.set(sk, []);
      sectionMap.get(sk)!.push(a);
    }
    const entries = [...sectionMap.entries()].sort((a, b) =>
      a[0].localeCompare(b[0], undefined, { numeric: true }),
    );
    return entries.map(([sectionKey, units]) => {
      const floorMap = new Map<number, Apartment[]>();
      for (const u of units) {
        if (!floorMap.has(u.floor)) floorMap.set(u.floor, []);
        floorMap.get(u.floor)!.push(u);
      }
      const floors = [...floorMap.entries()].sort((x, y) => y[0] - x[0]);
      return { sectionKey, floors };
    });
  }, [list]);

  const bulkPreviewCount = useMemo(
    () => countBulkUnits(bulkSections),
    [bulkSections],
  );

  const bulkPreviewNums = useMemo(
    () => previewNumbers(bulkSections),
    [bulkSections],
  );

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

  const updateBulkRow = (
    index: number,
    patch: Partial<BulkSectionForm>,
  ) => {
    setBulkSections((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  };

  const submitBulk = async () => {
    setBulkError(null);
    const trimmed = bulkSections.map((s) => ({
      ...s,
      sectionKey: s.sectionKey.trim(),
    }));

    if (trimmed.length > 1) {
      for (const s of trimmed) {
        if (!s.sectionKey) {
          setBulkError(t("bulk.warnMultiKeys"));
          return;
        }
      }
    }

    if (bulkPreviewCount <= 0 || bulkPreviewCount > 2500) {
      setBulkError(t("bulk.badCount"));
      return;
    }

    setBulkSubmitting(true);
    try {
      const body = {
        sections: trimmed.map((s) => ({
          sectionKey: s.sectionKey,
          sectionLabel: s.sectionLabel.trim() || undefined,
          floorFrom: Number(s.floorFrom),
          floorTo: Number(s.floorTo),
          unitsPerFloor: Number(s.unitsPerFloor),
          rooms: Number(s.rooms),
          areaSqm: Number(s.areaSqm),
          ...(s.priceUzs.trim()
            ? { priceUzs: Number(s.priceUzs.replace(/\s/g, "")) }
            : {}),
          ...(s.layoutVariantId.trim()
            ? { layoutVariantId: Number(s.layoutVariantId) }
            : {}),
        })),
      };

      const res = await fetch(
        `${API_URL}/projects/${projectId}/apartments/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        let msg = t("bulk.error");
        try {
          const j = (await res.json()) as {
            message?: string | string[];
          };
          if (typeof j.message === "string") msg = j.message;
          else if (Array.isArray(j.message)) msg = j.message.join(", ");
        } catch {
          /* ignore */
        }
        throw new Error(msg);
      }

      setBulkOpen(false);
      setBulkSections([defaultBulkSection()]);
      await load();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : t("bulk.error"));
    } finally {
      setBulkSubmitting(false);
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              setBulkError(null);
              setBulkOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E3A8A] px-5 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-blue-900/15 transition hover:bg-[#172554]"
          >
            <LayoutGrid className="h-4 w-4" />
            {t("bulk.open")}
          </button>
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
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 font-bold">
          {error}
        </div>
      )}

      <div className="space-y-8">
        {grouped.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500 font-medium">
            <p className="mb-4">{t("empty")}</p>
            <button
              type="button"
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F97316] px-5 py-2.5 text-sm font-black uppercase tracking-widest text-white"
            >
              <LayoutGrid className="h-4 w-4" />
              {t("bulk.open")}
            </button>
          </div>
        ) : (
          grouped.map(({ sectionKey, floors }) => (
            <div key={sectionKey || "__single__"} className="space-y-4">
              {hasSections ? (
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                  <Layers className="h-5 w-5 text-[#1E3A8A]" />
                  <h2 className="text-lg font-black uppercase tracking-tight text-[#1E3A8A]">
                    {sectionKey
                      ? t("blockTitle", { code: sectionKey })
                      : t("blockDefault")}
                  </h2>
                </div>
              ) : null}
              <div className="space-y-6">
                {floors.map(([floor, units]) => (
                  <div
                    key={`${sectionKey}-${floor}`}
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
                          <div className="text-sm font-black">
                            {a.rooms} {t("rooms")}
                          </div>
                          <div className="text-[10px] font-bold opacity-90">
                            {a.areaSqm} м²
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-black text-[#1E3A8A]">
                  {t("bulk.title")}
                </h2>
                <p className="mt-1 text-xs font-medium text-slate-500">
                  {t("bulk.hint")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !bulkSubmitting && setBulkOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-6">
              {bulkSections.map((row, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-5 space-y-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                      {t("bulk.blockHeading", { n: idx + 1 })}
                    </span>
                    {bulkSections.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setBulkSections((s) =>
                            s.filter((_, i) => i !== idx),
                          )
                        }
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        aria-label={t("bulk.removeBlock")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.sectionKey")}
                      </span>
                      <input
                        value={row.sectionKey}
                        onChange={(e) =>
                          updateBulkRow(idx, { sectionKey: e.target.value })
                        }
                        placeholder="A"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.sectionLabel")}
                      </span>
                      <input
                        value={row.sectionLabel}
                        onChange={(e) =>
                          updateBulkRow(idx, { sectionLabel: e.target.value })
                        }
                        placeholder={t("bulk.sectionLabelPh")}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-900"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.floorFrom")}
                      </span>
                      <input
                        type="number"
                        value={row.floorFrom}
                        onChange={(e) =>
                          updateBulkRow(idx, {
                            floorFrom: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.floorTo")}
                      </span>
                      <input
                        type="number"
                        value={row.floorTo}
                        onChange={(e) =>
                          updateBulkRow(idx, {
                            floorTo: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.unitsPerFloor")}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={row.unitsPerFloor}
                        onChange={(e) =>
                          updateBulkRow(idx, {
                            unitsPerFloor: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.rooms")}
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={row.rooms}
                        onChange={(e) =>
                          updateBulkRow(idx, { rooms: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.areaSqm")}
                      </span>
                      <input
                        type="number"
                        min={1}
                        step={0.1}
                        value={row.areaSqm}
                        onChange={(e) =>
                          updateBulkRow(idx, {
                            areaSqm: Number(e.target.value),
                          })
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.priceUzs")}
                      </span>
                      <input
                        value={row.priceUzs}
                        onChange={(e) =>
                          updateBulkRow(idx, { priceUzs: e.target.value })
                        }
                        placeholder="—"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-slate-400">
                        {t("bulk.layoutVariantId")}
                      </span>
                      <input
                        value={row.layoutVariantId}
                        onChange={(e) =>
                          updateBulkRow(idx, {
                            layoutVariantId: e.target.value,
                          })
                        }
                        placeholder="—"
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
                      />
                    </label>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setBulkSections((s) => [...s, defaultBulkSection()])
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 py-4 text-sm font-black uppercase tracking-widest text-slate-500 hover:border-[#1E3A8A] hover:text-[#1E3A8A]"
              >
                <Plus className="h-4 w-4" />
                {t("bulk.addBlock")}
              </button>

              <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
                <p className="text-sm font-black text-[#1E3A8A]">
                  {t("bulk.previewCount", { count: bulkPreviewCount })}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">
                  {t("bulk.previewSample")}: {bulkPreviewNums.join(", ")}
                  {bulkPreviewCount > bulkPreviewNums.length ? "…" : ""}
                </p>
              </div>

              {bulkError && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-bold text-red-700">
                  {bulkError}
                </div>
              )}
            </div>

            <div className="flex shrink-0 gap-3 border-t border-slate-100 p-6">
              <button
                type="button"
                onClick={() => !bulkSubmitting && setBulkOpen(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black uppercase tracking-widest text-slate-600"
              >
                {t("bulk.cancel")}
              </button>
              <button
                type="button"
                disabled={bulkSubmitting || bulkPreviewCount <= 0}
                onClick={() => void submitBulk()}
                className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#F97316] py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
              >
                {bulkSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                {t("bulk.submit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-[100] flex justify-end bg-slate-950/40 backdrop-blur-sm">
          <div className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {t("drawerTitle", { n: selected.number })}
                </h2>
                <p className="text-xs font-bold text-slate-400">
                  {(selected.sectionKey ?? "").length > 0
                    ? `${t("blockShort", { code: selected.sectionKey ?? "" })} · `
                    : ""}
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
