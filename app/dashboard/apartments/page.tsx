"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, ApiAuthError, apiFetch, clearSession, getToken } from "@/lib/api";
import { formatMoneyInput, formatUzs, parseMoneyInput } from "@/lib/currency";

type ProjectOption = { id: number; name: string; developerId: number };
type Apartment = {
  id: number;
  projectId: number;
  rooms: number;
  area: number;
  floor: number;
  price: number;
  imageUrl?: string;
  project?: { id: number; name: string };
};

type ApartmentForm = {
  projectId: number;
  price: string;
  rooms: string;
  area: string;
  floor: string;
  imageUrl: string;
};

const STORAGE_KEY = "oson_uy_developer_name";
const adminHeaders = (contentType = true) => ({
  ...(contentType ? { "Content-Type": "application/json" } : {}),
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
});

const defaultForm: ApartmentForm = {
  projectId: 0,
  price: "",
  rooms: "1",
  area: "",
  floor: "1",
  imageUrl: "",
};

export default function ApartmentsPage() {
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [apartments, setApartments] = useState<Apartment[]>([]);
  const [form, setForm] = useState<ApartmentForm>(defaultForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const pricePerM2 =
    form.price && form.area && Number(form.area) > 0
      ? Math.round(parseMoneyInput(form.price) / Number(form.area))
      : null;

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [currentDeveloper, allProjects, allApartments] = await Promise.all([
        apiFetch<{ id: number; name: string }>("/developers"),
        apiFetch<ProjectOption[]>("/projects"),
        apiFetch<Apartment[]>("/apartments"),
      ]);
      window.localStorage.setItem(STORAGE_KEY, currentDeveloper.name);
      const ownProjects = allProjects.filter(
        (project) => project.developerId === currentDeveloper.id,
      );
      const ownProjectIds = new Set(ownProjects.map((item) => item.id));
      const ownApartments = allApartments.filter((item) =>
        ownProjectIds.has(item.projectId),
      );

      setProjects(ownProjects);
      setApartments(ownApartments);
      setForm((current) => ({
        ...current,
        projectId: current.projectId || ownProjects[0]?.id || 0,
      }));
    } catch (err) {
      if (err instanceof ApiAuthError) {
        clearSession();
      }
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        throw new Error(`Ошибка загрузки фото (${response.status})`);
      }
      const data = (await response.json()) as { url: string };
      setForm((current) => ({ ...current, imageUrl: data.url }));
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
        editingId ? `${API_URL}/apartments/${editingId}` : `${API_URL}/apartments`,
        {
          method: editingId ? "PATCH" : "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          projectId: form.projectId,
          price: parseMoneyInput(form.price),
          rooms: Number(form.rooms),
          area: Number(form.area),
          floor: Number(form.floor),
          imageUrl: form.imageUrl || undefined,
        }),
        },
      );
      if (!response.ok) {
        throw new Error(`Не удалось создать апартамент (${response.status})`);
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

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[#1E3A8A]">Apartments</h2>
        <p className="text-sm text-slate-600">Добавляйте апартаменты к своим проектам.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-blue-100 bg-white p-5 text-slate-500">
          Загрузка апартаментов...
        </div>
      ) : (
        <>
          <form
            onSubmit={onSubmit}
            className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:grid-cols-2"
          >
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Проект
              </span>
              <select
                value={form.projectId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    projectId: Number(event.target.value),
                  }))
                }
                required
                className="h-10 w-full rounded-xl text-black border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Цена (сум)
              </span>
              <input
                type="text"
                min={0}
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({ ...current, price: formatMoneyInput(event.target.value) }))
                }
                placeholder="например 850 000 000"
                required
                className="h-10 w-full text-black rounded-xl border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              />
            </label>
            <div className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Цена за м2 (расчет)
              </span>
              <div className="flex h-10 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-[#1E3A8A]">
                {pricePerM2 ? `${formatUzs(pricePerM2)} / м²` : "—"}
              </div>
            </div>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Комнат
              </span>
              <input
                type="number"
                min={1}
                value={form.rooms}
                onChange={(event) =>
                  setForm((current) => ({ ...current, rooms: event.target.value.replace(/\D/g, "") }))
                }
                required
                className="h-10 w-full text-black rounded-xl border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Площадь (м2)
              </span>
              <input
                type="number"
                min={1}
                value={form.area}
                onChange={(event) =>
                  setForm((current) => ({ ...current, area: event.target.value.replace(/\D/g, "") }))
                }
                required
                className="h-10 w-full text-black rounded-xl border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Этаж
              </span>
              <input
                type="number"
                min={1}
                value={form.floor}
                onChange={(event) =>
                  setForm((current) => ({ ...current, floor: event.target.value.replace(/\D/g, "") }))
                }
                required
                className="h-10 w-full text-black rounded-xl border border-slate-300 px-3 text-sm outline-none ring-[#1E3A8A]/30 focus:ring"
              />
            </label>
            <label className="space-y-1 sm:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                Фото апартамента
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={(event) => void onImagePick(event)}
                className="block w-full text-sm text-black file:mr-3 file:rounded-lg file:border-0 file:bg-[#1E3A8A] file:px-3 file:py-2 file:font-semibold file:text-white"
              />
              {form.imageUrl && (
                <img
                  src={form.imageUrl}
                  alt="Apartment preview"
                  className="mt-2 h-32 w-full rounded-xl border border-slate-200 object-cover sm:w-48"
                />
              )}
            </label>
            <button
              type="submit"
              disabled={saving || uploading || !projects.length}
              className="h-11 rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 sm:col-span-2"
            >
              {saving
                ? "Сохранение..."
                : uploading
                  ? "Загрузка фото..."
                  : editingId
                    ? "Сохранить изменения"
                    : "Добавить апартамент"}
            </button>
          </form>

          <div className="grid gap-3 sm:grid-cols-2">
            {apartments.map((apartment) => (
              <article
                key={apartment.id}
                className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-[#1E3A8A]">
                  {apartment.project?.name ?? `Project #${apartment.projectId}`}
                </p>
                <p className="text-sm text-slate-600">
                  {apartment.rooms} комн. | {apartment.area} м2 | этаж {apartment.floor}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#F97316]">
                  {formatUzs(apartment.price)}
                </p>
                <p className="text-xs text-slate-500">
                  {formatUzs(apartment.price / apartment.area)} / м²
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(apartment.id);
                    setForm({
                      projectId: apartment.projectId,
                      price: formatMoneyInput(String(Math.round(apartment.price))),
                      rooms: String(apartment.rooms),
                      area: String(apartment.area),
                      floor: String(apartment.floor),
                      imageUrl: apartment.imageUrl ?? "",
                    });
                  }}
                  className="mt-3 h-10 rounded-xl bg-[#1E3A8A] px-4 text-xs font-semibold text-white transition hover:bg-[#3C55BE]"
                >
                  Редактировать
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
