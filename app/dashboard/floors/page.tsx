"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, ApiAuthError, apiFetch, clearSession, getToken } from "@/lib/api";
import { formatMoneyInput, formatUzs, parseMoneyInput } from "@/lib/currency";
import {
  Plus,
  Layers,
  Maximize2,
  DollarSign,
  Image as ImageIcon,
  Loader2,
  Edit2,
  Trash2,
  Building2,
} from "lucide-react";
import { useTranslations } from "next-intl";

type ProjectOption = { id: number; name: string; developerId: number };
type ProjectFloor = {
  id: number;
  projectId: number;
  floor: number;
  pricePerM2: number;
  areaSqm: number;
  sampleImageUrl?: string | null;
  title?: string | null;
  project?: { id: number; name: string };
};

type FloorForm = {
  projectId: number;
  floor: string;
  pricePerM2: string;
  areaSqm: string;
  title: string;
  sampleImageUrl: string;
};

const adminHeaders = (contentType = true) => ({
  ...(contentType ? { "Content-Type": "application/json" } : {}),
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const defaultForm: FloorForm = {
  projectId: 0,
  floor: "1",
  pricePerM2: "",
  areaSqm: "",
  title: "",
  sampleImageUrl: "",
};

export default function FloorsPage() {
  const t = useTranslations("Dashboard.floors");
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [floors, setFloors] = useState<ProjectFloor[]>([]);
  const [form, setForm] = useState<FloorForm>(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const indicativeTotal =
    form.pricePerM2 && form.areaSqm && Number(form.areaSqm) > 0
      ? Math.round(
          parseMoneyInput(form.pricePerM2) * Number(form.areaSqm),
        )
      : null;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [currentDeveloper, allProjects, allFloors] = await Promise.all([
        apiFetch<{ id: number; name: string }>("/developers"),
        apiFetch<ProjectOption[]>("/projects"),
        apiFetch<ProjectFloor[]>("/floors"),
      ]);

      const ownProjects = allProjects.filter(
        (project) => project.developerId === currentDeveloper.id,
      );
      const ownProjectIds = new Set(ownProjects.map((item) => item.id));
      const ownFloors = allFloors.filter((item) =>
        ownProjectIds.has(item.projectId),
      );

      setProjects(ownProjects);
      setFloors(ownFloors);
      setForm((current) => ({
        ...current,
        projectId: current.projectId || ownProjects[0]?.id || 0,
      }));
    } catch (err) {
      if (err instanceof ApiAuthError) {
        clearSession();
      }
      setError(err instanceof Error ? err.message : "Error loading data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const onImagePick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: adminHeaders(false),
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Error uploading image (${response.status})`);
      }
      const data = (await response.json()) as { url: string };
      setForm((current) => ({ ...current, sampleImageUrl: data.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setSaving(true);
      setError(null);
      const response = await fetch(
        editingId ? `${API_URL}/floors/${editingId}` : `${API_URL}/floors`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: adminHeaders(),
          body: JSON.stringify({
            projectId: form.projectId,
            floor: Number(form.floor),
            pricePerM2: parseMoneyInput(form.pricePerM2),
            areaSqm: Number(form.areaSqm),
            title: form.title.trim() || undefined,
            sampleImageUrl: form.sampleImageUrl || undefined,
          }),
        },
      );
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(
          errText || `Failed to save floor (${response.status})`,
        );
      }

      await loadData();
      setForm((current) => ({
        ...defaultForm,
        projectId: current.projectId || projects[0]?.id || 0,
      }));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm(t("confirmDelete"))) return;
    try {
      setError(null);
      const response = await fetch(`${API_URL}/floors/${id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      if (!response.ok) {
        throw new Error(`Failed to delete (${response.status})`);
      }
      await loadData();
      if (editingId === id) {
        setEditingId(null);
        setForm((c) => ({ ...defaultForm, projectId: c.projectId }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1E3A8A] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black tracking-tight text-[#1E3A8A]">
          {t("title")}
        </h1>
        <p className="font-medium text-slate-500">{t("subtitle")}</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <form
            onSubmit={onSubmit}
            className="sticky top-8 space-y-6 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm"
          >
            <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-slate-900">
              {editingId ? (
                <Edit2 className="h-5 w-5 text-orange-500" />
              ) : (
                <Plus className="h-5 w-5 text-blue-600" />
              )}
              {editingId ? t("edit") : t("add")}
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t("form.selectProject")}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    value={form.projectId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        projectId: Number(e.target.value),
                      }))
                    }
                    className="h-14 w-full appearance-none rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-sm font-bold text-black outline-none transition-all ring-blue-600/10 focus:border-blue-600 focus:bg-white focus:ring-4"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t("form.floor")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={form.floor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, floor: e.target.value }))
                    }
                    className="h-14 w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 text-sm font-bold text-black outline-none transition-all focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {t("form.area")}
                  </label>
                  <div className="relative">
                    <Maximize2 className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      value={form.areaSqm}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, areaSqm: e.target.value }))
                      }
                      placeholder="72"
                      className="h-14 w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-sm font-bold text-black outline-none transition-all focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t("form.pricePerM2")}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={form.pricePerM2}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pricePerM2: formatMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="15 000 000"
                    className="h-14 w-full rounded-2xl border border-slate-100 bg-slate-50 pl-11 pr-4 text-sm font-bold text-black outline-none transition-all focus:border-blue-600 focus:bg-white"
                  />
                </div>
                {indicativeTotal != null && (
                  <p className="ml-4 mt-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                    ≈ {formatUzs(indicativeTotal)} {t("form.indicativeTotal")}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t("form.titleOptional")}
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  className="h-14 w-full rounded-2xl border border-slate-100 bg-slate-50 px-6 text-sm font-bold text-black outline-none transition-all focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="ml-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  {t("form.samplePhoto")}
                </label>
                <div className="group relative cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onImagePick}
                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                  />
                  <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50 transition-all group-hover:bg-slate-100">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    ) : form.sampleImageUrl ? (
                      <img
                        src={form.sampleImageUrl}
                        className="h-full w-full rounded-2xl object-contain p-2"
                        alt=""
                      />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-slate-300" />
                        <span className="text-xs font-bold text-slate-400">
                          {t("form.uploadClick")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={saving || uploading}
                className="h-16 flex-1 rounded-2xl bg-[#F97316] font-black uppercase tracking-widest text-white shadow-xl shadow-orange-900/10 transition-all hover:bg-orange-600 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {saving ? t("form.saving") : editingId ? t("form.save") : t("form.addNew")}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm((c) => ({
                      ...defaultForm,
                      projectId: c.projectId || projects[0]?.id || 0,
                    }));
                  }}
                  className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 transition-all hover:bg-slate-200"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-6 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">{t("list")}</h2>
            <span className="rounded-full bg-slate-50 px-3 py-1 text-[10px] font-black uppercase text-slate-400">
              {t("total")}: {floors.length}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {floors.map((fl) => (
              <div
                key={fl.id}
                className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="absolute right-4 top-4 rounded-lg bg-slate-900/5 px-2 py-1 backdrop-blur">
                  <span className="text-[10px] font-bold text-slate-600">
                    {t("floorBadge", { n: fl.floor })}
                  </span>
                </div>
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-slate-50">
                    {fl.sampleImageUrl ? (
                      <img
                        src={fl.sampleImageUrl}
                        className="h-full w-full rounded-2xl object-cover p-1"
                        alt=""
                      />
                    ) : (
                      <Layers className="h-8 w-8 text-slate-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-slate-900">
                      {fl.project?.name}
                    </h3>
                    <p className="mt-1 text-xs font-black uppercase tracking-tight text-blue-600">
                      {formatUzs(Math.round(fl.pricePerM2))} / м² · {fl.areaSqm}{" "}
                      м²
                    </p>
                    {fl.title && (
                      <p className="mt-1 text-xs text-slate-500">{fl.title}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {t("table.indicative")}
                    </p>
                    <p className="mt-1 text-lg font-black leading-none text-[#F97316]">
                      {formatUzs(Math.round(fl.pricePerM2 * fl.areaSqm))}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onDelete(fl.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-500 transition-all hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(fl.id);
                        setForm({
                          projectId: fl.projectId,
                          floor: String(fl.floor),
                          pricePerM2: formatMoneyInput(
                            String(Math.round(fl.pricePerM2)),
                          ),
                          areaSqm: String(fl.areaSqm),
                          title: fl.title ?? "",
                          sampleImageUrl: fl.sampleImageUrl ?? "",
                        });
                      }}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 shadow-sm transition-all hover:bg-[#1E3A8A] hover:text-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {floors.length === 0 && (
              <div className="col-span-full space-y-4 rounded-[3rem] border-2 border-dashed border-slate-100 py-20 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
                  <Building2 className="h-8 w-8 text-slate-200" />
                </div>
                <p className="font-medium text-slate-400">{t("empty")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
