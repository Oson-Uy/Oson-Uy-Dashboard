"use client";

import { FormEvent, useEffect, useState } from "react";
import { API_URL, ApiAuthError, apiFetch, clearSession, getToken } from "@/lib/api";
import { formatMoneyInput, formatUzs, parseMoneyInput } from "@/lib/currency";
import { 
  Plus, 
  Home, 
  Layers, 
  Maximize2, 
  DollarSign, 
  Image as ImageIcon,
  Loader2,
  Edit2,
  Trash2,
  Building2,
  ArrowRight
} from "lucide-react";

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
      setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
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
        throw new Error(`Не удалось сохранить квартиру (${response.status})`);
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
        <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight">Квартиры</h1>
        <p className="text-slate-500 font-medium">Управление номерным фондом ваших жилых комплексов.</p>
      </div>

      <div className="grid gap-10 lg:grid-cols-5">
        {/* Form Container */}
        <div className="lg:col-span-2">
          <form
            onSubmit={onSubmit}
            className="sticky top-8 space-y-6 rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm"
          >
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-4">
              {editingId ? <Edit2 className="h-5 w-5 text-orange-500" /> : <Plus className="h-5 w-5 text-blue-600" />}
              {editingId ? "Редактировать" : "Добавить новую"}
            </h2>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Выберите проект</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <select
                    value={form.projectId}
                    onChange={(e) => setForm(f => ({ ...f, projectId: Number(e.target.value) }))}
                    className="h-14 w-full rounded-2xl bg-slate-50 border border-slate-100 pl-11 pr-4 text-sm font-bold outline-none ring-blue-600/10 focus:ring-4 focus:bg-white focus:border-blue-600 transition-all text-black appearance-none"
                  >
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Комнаты</label>
                  <input
                    type="number"
                    value={form.rooms}
                    onChange={(e) => setForm(f => ({ ...f, rooms: e.target.value }))}
                    className="h-14 w-full rounded-2xl bg-slate-50 border border-slate-100 px-6 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 transition-all text-black"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Этаж</label>
                  <input
                    type="number"
                    value={form.floor}
                    onChange={(e) => setForm(f => ({ ...f, floor: e.target.value }))}
                    className="h-14 w-full rounded-2xl bg-slate-50 border border-slate-100 px-6 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 transition-all text-black"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Площадь (м²)</label>
                <div className="relative">
                  <Maximize2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    value={form.area}
                    onChange={(e) => setForm(f => ({ ...f, area: e.target.value }))}
                    placeholder="45"
                    className="h-14 w-full rounded-2xl bg-slate-50 border border-slate-100 pl-11 pr-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 transition-all text-black"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Цена (сум)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={form.price}
                    onChange={(e) => setForm(f => ({ ...f, price: formatMoneyInput(e.target.value) }))}
                    placeholder="500 000 000"
                    className="h-14 w-full rounded-2xl bg-slate-50 border border-slate-100 pl-11 pr-4 text-sm font-bold outline-none focus:bg-white focus:border-blue-600 transition-all text-black"
                  />
                </div>
                {pricePerM2 && (
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-4 mt-1">
                    ≈ {formatUzs(pricePerM2)} / м²
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Планировка (фото)</label>
                <div className="relative group cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onImagePick}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="h-32 w-full rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50 flex flex-col items-center justify-center gap-2 group-hover:bg-slate-100 transition-all">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                    ) : form.imageUrl ? (
                      <img src={form.imageUrl} className="h-full w-full object-contain rounded-2xl p-2" alt="Preview" />
                    ) : (
                      <>
                        <ImageIcon className="h-6 w-6 text-slate-300" />
                        <span className="text-xs font-bold text-slate-400">Нажмите для загрузки</span>
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
                className="flex-1 h-16 rounded-2xl bg-[#F97316] text-white font-black uppercase tracking-widest shadow-xl shadow-orange-900/10 hover:bg-orange-600 transition-all disabled:bg-slate-100 disabled:text-slate-400"
              >
                {saving ? "Сохранение..." : editingId ? "Сохранить" : "Добавить"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setEditingId(null); setForm(defaultForm); }}
                  className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-all"
                >
                  <Trash2 className="h-6 w-6" />
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List Container */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Список апартаментов</h2>
            <span className="text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-3 py-1 rounded-full">
              Всего: {apartments.length}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {apartments.map((apt) => (
              <div key={apt.id} className="group relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 overflow-hidden">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="h-20 w-20 rounded-2xl bg-slate-50 flex-shrink-0 flex items-center justify-center border border-slate-100">
                    {apt.imageUrl ? (
                      <img src={apt.imageUrl} className="h-full w-full object-contain p-2" alt="Plan" />
                    ) : (
                      <Home className="h-8 w-8 text-slate-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{apt.project?.name}</h3>
                    <p className="text-xs font-black text-blue-600 uppercase mt-1 tracking-tight flex items-center gap-1">
                      {apt.rooms} комн. <ArrowRight className="h-3 w-3" /> {apt.area} м²
                    </p>
                  </div>
                </div>

                <div className="flex items-end justify-between border-t border-slate-50 pt-4">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Стоимость</p>
                    <p className="text-lg font-black text-[#F97316] leading-none mt-1">{formatUzs(apt.price)}</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(apt.id);
                      setForm({
                        projectId: apt.projectId,
                        price: formatMoneyInput(String(Math.round(apt.price))),
                        rooms: String(apt.rooms),
                        area: String(apt.area),
                        floor: String(apt.floor),
                        imageUrl: apt.imageUrl ?? "",
                      });
                    }}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-[#1E3A8A] hover:text-white transition-all shadow-sm"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
                
                <div className="absolute top-4 right-4 bg-slate-900/5 backdrop-blur px-2 py-1 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-600">{apt.floor} этаж</span>
                </div>
              </div>
            ))}

            {apartments.length === 0 && (
              <div className="col-span-full py-20 text-center space-y-4 rounded-[3rem] border-2 border-dashed border-slate-100">
                <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                  <Building2 className="h-8 w-8 text-slate-200" />
                </div>
                <p className="text-slate-400 font-medium">Пока нет добавленных квартир</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
