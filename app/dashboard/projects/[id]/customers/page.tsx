"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Loader2,
  RefreshCw,
  Users,
  Pencil,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { apiFetch } from "@/lib/api";
import { formatUzs } from "@/lib/currency";
import { formatPhoneNumber } from "@/lib/format";

type ApartmentOpt = {
  id: number;
  number: string;
  floor: number;
  sectionKey?: string | null;
};

type CustomerRow = {
  id: number;
  name: string;
  phone: string;
  accessCode: string;
  apartmentId: number | null;
  totalPriceUzs: number | null;
  monthlyDueUzs: number | null;
  notes: string | null;
  apartment: {
    id: number;
    number: string;
    floor: number;
    sectionKey?: string | null;
  } | null;
};

type ListResponse = {
  items: CustomerRow[];
  total: number;
};

function aptLabel(a: ApartmentOpt) {
  const sk = (a.sectionKey ?? "").trim();
  return sk ? `${sk} · №${a.number} (${a.floor} эт.)` : `№${a.number} (${a.floor} эт.)`;
}

export default function ProjectCustomersPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const t = useTranslations("Dashboard.customers");

  const [projectName, setProjectName] = useState("");
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [apartments, setApartments] = useState<ApartmentOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createAptId, setCreateAptId] = useState<string>("");
  const [createTotal, setCreateTotal] = useState("");
  const [createMonthly, setCreateMonthly] = useState("");
  const [createNotes, setCreateNotes] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const editRow = useMemo(
    () => rows.find((r) => r.id === editId) ?? null,
    [rows, editId],
  );
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAptId, setEditAptId] = useState<string>("");
  const [editTotal, setEditTotal] = useState("");
  const [editMonthly, setEditMonthly] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    if (!editRow) return;
    setEditName(editRow.name);
    setEditPhone(editRow.phone);
    setEditAptId(editRow.apartmentId != null ? String(editRow.apartmentId) : "");
    setEditTotal(
      editRow.totalPriceUzs != null ? String(editRow.totalPriceUzs) : "",
    );
    setEditMonthly(
      editRow.monthlyDueUzs != null ? String(editRow.monthlyDueUzs) : "",
    );
    setEditNotes(editRow.notes ?? "");
  }, [editRow]);

  const load = useCallback(async () => {
    if (!projectId || Number.isNaN(projectId)) return;
    setLoading(true);
    setError(null);
    try {
      const [proj, listRes, aptRes] = await Promise.all([
        apiFetch<{ name: string }>(`/projects/${projectId}`),
        apiFetch<ListResponse>(`/projects/${projectId}/customers?limit=200`),
        apiFetch<{ items: ApartmentOpt[] }>(
          `/projects/${projectId}/apartments?limit=500`,
        ),
      ]);
      setProjectName(proj.name);
      setRows(listRes.items ?? []);
      setApartments(aptRes.items ?? []);
    } catch {
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  }, [projectId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setNotice(t("copied"));
      setTimeout(() => setNotice(null), 2500);
    } catch {
      setNotice(t("copyFail"));
      setTimeout(() => setNotice(null), 2500);
    }
  };

  const regenerate = async (customerId: number) => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<{ accessCode: string }>(
        `/projects/${projectId}/customers/${customerId}/access-code`,
        { method: "POST", body: "{}" },
      );
      setRows((prev) =>
        prev.map((r) =>
          r.id === customerId ? { ...r, accessCode: res.accessCode } : r,
        ),
      );
      setNotice(t("regenerated"));
      setTimeout(() => setNotice(null), 2500);
    } catch {
      setError(t("regenerateError"));
    } finally {
      setSaving(false);
    }
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: createName.trim(),
        phone: createPhone.trim(),
        ...(createAptId ? { apartmentId: Number(createAptId) } : {}),
        ...(createTotal.trim()
          ? { totalPriceUzs: Number(createTotal.replace(/\s/g, "")) }
          : {}),
        ...(createMonthly.trim()
          ? { monthlyDueUzs: Number(createMonthly.replace(/\s/g, "")) }
          : {}),
        ...(createNotes.trim() ? { notes: createNotes.trim() } : {}),
      };
      await apiFetch(`/projects/${projectId}/customers`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setCreateName("");
      setCreatePhone("");
      setCreateAptId("");
      setCreateTotal("");
      setCreateMonthly("");
      setCreateNotes("");
      await load();
      setNotice(t("created"));
      setTimeout(() => setNotice(null), 2500);
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: editName.trim(),
        phone: editPhone.trim(),
        apartmentId: editAptId ? Number(editAptId) : null,
        totalPriceUzs: editTotal.trim()
          ? Number(editTotal.replace(/\s/g, ""))
          : null,
        monthlyDueUzs: editMonthly.trim()
          ? Number(editMonthly.replace(/\s/g, ""))
          : null,
        notes: editNotes.trim() || null,
      };
      await apiFetch(`/projects/${projectId}/customers/${editId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setEditId(null);
      await load();
      setNotice(t("saved"));
      setTimeout(() => setNotice(null), 2500);
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15";

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
    <div className="mx-auto max-w-6xl space-y-10 pb-24 animate-in fade-in duration-500">
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
        <Link
          href={`/dashboard/projects/${projectId}/chessboard`}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
        >
          {t("openChessboard")}
        </Link>
      </div>

      {notice && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-2">
          <Users className="h-6 w-6 text-[#1E3A8A]" />
          <h2 className="text-lg font-black text-slate-900">{t("createTitle")}</h2>
        </div>
        <form onSubmit={submitCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 sm:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("name")}
            </span>
            <input
              className={inputClass}
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              required
              minLength={2}
            />
          </label>
          <label className="space-y-1 sm:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("phone")}
            </span>
            <input
              className={inputClass}
              value={createPhone}
              onChange={(e) => setCreatePhone(e.target.value)}
              required
              placeholder="+998…"
            />
          </label>
          <label className="space-y-1 sm:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("apartment")}
            </span>
            <select
              className={inputClass}
              value={createAptId}
              onChange={(e) => setCreateAptId(e.target.value)}
            >
              <option value="">{t("apartmentOptional")}</option>
              {apartments.map((a) => (
                <option key={a.id} value={a.id}>
                  {aptLabel(a)}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("totalPrice")}
            </span>
            <input
              className={inputClass}
              inputMode="numeric"
              value={createTotal}
              onChange={(e) => setCreateTotal(e.target.value)}
              placeholder="—"
            />
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("monthlyDue")}
            </span>
            <input
              className={inputClass}
              inputMode="numeric"
              value={createMonthly}
              onChange={(e) => setCreateMonthly(e.target.value)}
              placeholder="—"
            />
          </label>
          <label className="space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {t("notes")}
            </span>
            <input
              className={inputClass}
              value={createNotes}
              onChange={(e) => setCreateNotes(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1E3A8A] px-8 py-3 text-sm font-black uppercase tracking-widest text-white shadow-lg disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("createBtn")}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-black text-slate-900">{t("listTitle")}</h2>
          <p className="text-xs font-medium text-slate-500">{t("listHint")}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-4">{t("name")}</th>
                <th className="px-4 py-4">{t("phone")}</th>
                <th className="px-4 py-4">{t("apartmentShort")}</th>
                <th className="px-4 py-4">{t("accessCode")}</th>
                <th className="px-4 py-4">{t("monthlyDueShort")}</th>
                <th className="px-4 py-4 text-right">{t("actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-bold text-slate-900">{r.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatPhoneNumber(r.phone)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.apartment
                      ? `${(r.apartment.sectionKey ?? "").trim() ? `${r.apartment.sectionKey} · ` : ""}№${r.apartment.number}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black tracking-wider">
                        {r.accessCode}
                      </code>
                      <button
                        type="button"
                        onClick={() => void copyCode(r.accessCode)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                        title={t("copy")}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {r.monthlyDueUzs != null ? formatUzs(r.monthlyDueUzs) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditId(r.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3 w-3" /> {t("edit")}
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void regenerate(r.id)}
                        className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                      >
                        <RefreshCw className="h-3 w-3" /> {t("regenerate")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center text-slate-400 font-medium"
                  >
                    {t("empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editId != null && editRow && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="text-xl font-black text-[#1E3A8A]">{t("editTitle")}</h3>
              <button
                type="button"
                onClick={() => setEditId(null)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"
                aria-label={t("close")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={submitEdit} className="space-y-4">
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t("name")}
                </span>
                <input
                  className={inputClass}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t("phone")}
                </span>
                <input
                  className={inputClass}
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t("apartment")}
                </span>
                <select
                  className={inputClass}
                  value={editAptId}
                  onChange={(e) => setEditAptId(e.target.value)}
                >
                  <option value="">{t("apartmentClear")}</option>
                  {apartments.map((a) => (
                    <option key={a.id} value={a.id}>
                      {aptLabel(a)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t("totalPrice")}
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={editTotal}
                  onChange={(e) => setEditTotal(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t("monthlyDue")}
                </span>
                <input
                  className={inputClass}
                  inputMode="numeric"
                  value={editMonthly}
                  onChange={(e) => setEditMonthly(e.target.value)}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {t("notes")}
                </span>
                <input
                  className={inputClass}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </label>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditId(null)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-sm font-black uppercase tracking-widest text-slate-600"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[#1E3A8A] py-3 text-sm font-black uppercase tracking-widest text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
