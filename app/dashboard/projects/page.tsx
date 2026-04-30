"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  API_URL,
  ApiAuthError,
  apiFetch,
  clearSession,
  getToken,
} from "@/lib/api";
import { formatMoneyInput, formatUzs, parseMoneyInput } from "@/lib/currency";
import { 
  Plus, 
  Building2, 
  MapPin, 
  Layers, 
  Home, 
  Calendar, 
  Video, 
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  QrCode,
  CreditCard,
  ChevronRight,
  Edit2,
  Trash2,
  ExternalLink,
  Loader2,
  Star,
  Info,
  DollarSign,
  X
} from "lucide-react";

type Project = {
  id: number;
  name: string;
  location: string;
  district: string;
  description: string;
  advantages: string;
  mapEmbedUrl: string;
  qrCodeUrl: string;
  totalFloors: string;
  totalUnits: string;
  priceFrom: string;
  pricePerM2From: string;
  imageUrl: string;
  videoUrl?: string;
  deliveryDate: string;
  developerId: number;
  plan?: "START" | "PRO" | "PREMIUM" | "ULTIMATE";
  subscriptionStatus?: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  media?: Array<{ imageUrl: string }>;
};

type ProjectForm = Omit<Project, "id">;
type Developer = { id: number; name: string; qrCodeUrl?: string };
const STORAGE_KEY = "oson_uy_developer_name";
const PLAN_PRICES: Record<"START" | "PRO" | "PREMIUM" | "ULTIMATE", number> = {
  START: 1900000,
  PRO: 3200000,
  PREMIUM: 5100000,
  ULTIMATE: 6400000,
};

const defaultForm: ProjectForm = {
  name: "",
  location: "",
  district: "",
  description: "",
  advantages: "",
  mapEmbedUrl: "",
  qrCodeUrl: "",
  totalFloors: "",
  totalUnits: "",
  priceFrom: "",
  pricePerM2From: "",
  imageUrl: "",
  videoUrl: "",
  deliveryDate: "",
  developerId: 0,
};

const toEmbedMapUrl = (value: string) => {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.includes("/maps/embed") || raw.includes("output=embed")) return raw;
  return `https://www.google.com/maps?q=${encodeURIComponent(raw)}&output=embed`;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [form, setForm] = useState<ProjectForm>(defaultForm);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingProjectQr, setIsUploadingProjectQr] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeveloperId, setActiveDeveloperId] = useState<number | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"CARD_TRANSFER" | "CASH">("CARD_TRANSFER");
  const [paymentNote, setPaymentNote] = useState("");
  const [activePayment, setActivePayment] = useState<{
    plan: "START" | "PRO" | "PREMIUM" | "ULTIMATE";
    externalRef: string;
    amountUzs: number;
    method: "CARD_TRANSFER" | "CASH";
    details: string[];
  } | null>(null);

  const resetForm = () => {
    setForm(defaultForm);
    setSelectedFiles([]);
    setUploadedImageUrls([]);
    setEditingId(null);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const projectsData = await apiFetch<any[]>("/projects");
      const currentDeveloper = await apiFetch<Developer>("/developers");
      
      setDevelopers([currentDeveloper]);
      setActiveDeveloperId(currentDeveloper.id);
      setForm((current) => ({ ...current, developerId: currentDeveloper.id }));
      
      const ownProjects = projectsData.filter(p => p.developerId === currentDeveloper.id);
      setProjects(
        ownProjects.map((project) => ({
          id: project.id,
          name: project.name,
          location: project.location,
          district: project.district ?? "",
          description: project.description ?? "",
          advantages: (project.advantages ?? []).join(", "),
          mapEmbedUrl: project.mapEmbedUrl ?? "",
          qrCodeUrl: project.qrCodeUrl ?? "",
          totalFloors: project.totalFloors ? String(project.totalFloors) : "",
          totalUnits: project.totalUnits ? String(project.totalUnits) : "",
          imageUrl: project.imageUrl,
          videoUrl: project.videoUrl ?? "",
          deliveryDate: project.deliveryDate,
          developerId: project.developerId,
          media: project.media,
          priceFrom: project.apartments?.length
            ? String(Math.min(...project.apartments.map((apt: any) => apt.price)))
            : "",
          pricePerM2From: project.apartments?.length
            ? String(
                Math.min(
                  ...project.apartments
                    .filter((apt: any) => apt.area > 0)
                    .map((apt: any) => apt.price / apt.area),
                ).toFixed(0),
              )
            : "",
          plan: project.subscription?.plan,
          subscriptionStatus: project.subscription?.status,
        })),
      );
    } catch (err) {
      if (err instanceof ApiAuthError) clearSession();
      setError(err instanceof Error ? err.message : "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError(null);
      const payload = {
        ...form,
        advantages: form.advantages.split(",").map(i => i.trim()).filter(Boolean),
        totalFloors: Number(form.totalFloors) || 0,
        totalUnits: Number(form.totalUnits) || 0,
        mapEmbedUrl: toEmbedMapUrl(form.mapEmbedUrl),
        imageUrls: uploadedImageUrls.length ? uploadedImageUrls : undefined,
        developerId: activeDeveloperId,
      };

      const response = await fetch(
        editingId ? `${API_URL}/projects/${editingId}` : `${API_URL}/projects`,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) throw new Error("Ошибка сохранения проекта");
      await loadData();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const onEdit = (project: Project) => {
    setEditingId(project.id);
    const mediaUrls = project.media?.map((m) => m.imageUrl) ?? [];
    setUploadedImageUrls([...new Set([project.imageUrl, ...mediaUrls])].filter(Boolean));
    setForm({ ...project });
    document.getElementById("project-form")?.scrollIntoView({ behavior: "smooth" });
  };

  const uploadSelectedImages = async () => {
    if (!selectedFiles.length) return;
    try {
      setIsUploading(true);
      const uploaded = await Promise.all(
        selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch(`${API_URL}/upload/image`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
          });
          return (await res.json()).url;
        })
      );
      setUploadedImageUrls(prev => [...prev, ...uploaded]);
      if (!form.imageUrl) setForm(f => ({ ...f, imageUrl: uploaded[0] }));
      setSelectedFiles([]);
    } catch (err) {
      setError("Ошибка загрузки фото");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadProjectQr = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingProjectQr(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = await res.json();
      setForm(f => ({ ...f, qrCodeUrl: data.url }));
    } catch (err) {
      setError("Ошибка загрузки QR");
    } finally {
      setIsUploadingProjectQr(false);
    }
  };

  const upgradePlan = async (projectId: number, plan: "START" | "PRO" | "PREMIUM" | "ULTIMATE") => {
    try {
      setPaymentStatus("Создаем заявку...");
      const response = await fetch(`${API_URL}/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ projectId, plan, paymentMethod, note: paymentNote }),
      });
      const data = await response.json();
      setActivePayment({
        plan,
        externalRef: data.externalRef,
        amountUzs: data.amountUzs || 0,
        method: data.paymentMethod,
        details: [data.instructions?.comment || "Оплатите по реквизитам"],
      });
      setPaymentStatus("Заявка создана!");
      await loadData();
    } catch (err) {
      setError("Ошибка создания платежа");
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
    <div className="space-y-10 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight">Проекты</h1>
          <p className="text-slate-500 font-medium">Создание и управление вашими жилыми комплексами.</p>
        </div>
        <button 
          onClick={() => {
            document.getElementById("project-form")?.scrollIntoView({ behavior: "smooth" });
            resetForm();
          }}
          className="h-14 px-8 rounded-2xl bg-[#1E3A8A] text-white font-black uppercase tracking-widest shadow-xl shadow-blue-900/10 hover:bg-blue-800 transition-all flex items-center gap-2"
        >
          <Plus className="h-5 w-5" /> Новый проект
        </button>
      </div>

      {error && (
        <div className="p-6 bg-red-50 border border-red-100 rounded-3xl text-red-600 font-bold flex items-center gap-3">
          <AlertCircle className="h-6 w-6" /> {error}
        </div>
      )}

      {/* Projects List Grid */}
      <div className="grid gap-8 sm:grid-cols-2">
        {projects.map((project) => (
          <div key={project.id} className="group rounded-[2.5rem] border border-slate-100 bg-white overflow-hidden shadow-sm hover:shadow-2xl transition-all hover:-translate-y-1">
            <div className="relative h-64">
              <img src={project.imageUrl} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" alt={project.name} />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1 block">{project.location}</span>
                  <h3 className="text-2xl font-black text-white tracking-tight">{project.name}</h3>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onEdit(project)}
                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/20 backdrop-blur-md text-white hover:bg-white hover:text-slate-900 transition-all"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {project.subscriptionStatus === "ACTIVE" && (
                <div className="absolute top-6 right-6 bg-emerald-500 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg">
                  Active {project.plan}
                </div>
              )}
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <ProjectInfoItem icon={<Layers className="h-4 w-4" />} label="Этажность" value={`${project.totalFloors} эт.`} />
                <ProjectInfoItem icon={<Home className="h-4 w-4" />} label="Квартир" value={`${project.totalUnits} шт.`} />
                <ProjectInfoItem icon={<Calendar className="h-4 w-4" />} label="Сдача" value={project.deliveryDate} />
                <ProjectInfoItem icon={<DollarSign className="h-4 w-4" />} label="От" value={formatUzs(Number(project.priceFrom))} />
              </div>

              <div className="pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex -space-x-2">
                  {project.media?.slice(0, 3).map((m, i) => (
                    <img key={i} src={m.imageUrl} className="h-8 w-8 rounded-full border-2 border-white object-cover" />
                  ))}
                  {project.media && project.media.length > 3 && (
                    <div className="h-8 w-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                      +{project.media.length - 3}
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => onEdit(project)}
                  className="text-sm font-black text-[#1E3A8A] uppercase tracking-widest flex items-center gap-1 group-hover:gap-2 transition-all"
                >
                  Детали <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Form Section */}
      <div id="project-form" className="scroll-mt-10">
        <form onSubmit={onSubmit} className="rounded-[3rem] border border-slate-100 bg-white p-10 shadow-sm space-y-12">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">{editingId ? "Редактировать проект" : "Добавить новый проект"}</h2>
              <p className="text-sm text-slate-500 font-medium">Заполните данные о вашем жилом комплексе.</p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-6">
              <FormInput label="Название ЖК" value={form.name} onChange={(v: string) => setForm(f => ({ ...f, name: v }))} placeholder="ЖК 'Oson Uy'" required />
              <FormInput label="Локация" value={form.location} onChange={(v: string) => setForm(f => ({ ...f, location: v }))} placeholder="Ташкент, ул. Навои" required />
              <div className="grid grid-cols-2 gap-4">
                <FormInput label="Этажность" value={form.totalFloors} onChange={(v: string) => setForm(f => ({ ...f, totalFloors: v }))} type="number" />
                <FormInput label="Кол-во юнитов" value={form.totalUnits} onChange={(v: string) => setForm(f => ({ ...f, totalUnits: v }))} type="number" />
              </div>
              <FormInput label="Дата сдачи" value={form.deliveryDate} onChange={(v: string) => setForm(f => ({ ...f, deliveryDate: v }))} placeholder="2026 IV-кв" required />
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Описание</label>
                <textarea 
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full min-h-[120px] rounded-2xl bg-slate-50 border border-slate-100 p-6 text-sm font-medium outline-none focus:bg-white focus:border-blue-600 transition-all text-black"
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Медиа (фото)</label>
                <div className="flex gap-4">
                  <div className="relative flex-1">
                    <input type="file" multiple accept="image/*" onChange={e => setSelectedFiles(Array.from(e.target.files || []))} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <div className="h-14 w-full rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-sm font-bold bg-slate-50 hover:bg-slate-100 transition-all">
                      <ImageIcon className="h-4 w-4" /> Выбрать файлы
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={uploadSelectedImages} 
                    disabled={!selectedFiles.length || isUploading}
                    className="h-14 px-6 rounded-2xl bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Загрузить"}
                  </button>
                </div>
                {uploadedImageUrls.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-4">
                    {uploadedImageUrls.map((url, i) => (
                      <div key={i} className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${form.imageUrl === url ? "border-orange-500 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"}`} onClick={() => setForm(f => ({ ...f, imageUrl: url }))}>
                        <img src={url} className="h-full w-full object-cover" />
                        {form.imageUrl === url && <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center"><CheckCircle2 className="text-white h-6 w-6" /></div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <FormInput label="Ссылка на видео (YouTube)" value={form.videoUrl || ""} onChange={(v: string) => setForm(f => ({ ...f, videoUrl: v }))} placeholder="https://..." />
              <FormInput label="Google Maps (Embed/Query)" value={form.mapEmbedUrl} onChange={(v: string) => setForm(f => ({ ...f, mapEmbedUrl: v }))} placeholder="Адрес или ссылка" />
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">QR-код проекта</label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 rounded-2xl border-2 border-dashed border-slate-100 flex items-center justify-center bg-slate-50 overflow-hidden">
                    {form.qrCodeUrl ? <img src={form.qrCodeUrl} className="h-full w-full object-cover" /> : <QrCode className="h-8 w-8 text-slate-200" />}
                    <input type="file" onChange={uploadProjectQr} className="absolute inset-0 opacity-0 cursor-pointer" />
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">Загрузите QR-код для быстрого доступа <br/>клиентов к PDF или сайту проекта.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-6">
            <button type="submit" className="flex-1 h-20 rounded-[2rem] bg-[#F97316] text-white text-xl font-black uppercase tracking-[0.2em] shadow-2xl shadow-orange-900/20 hover:bg-orange-600 transition-all active:scale-[0.98]">
              {editingId ? "Сохранить изменения" : "Создать проект"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="h-20 px-10 rounded-[2rem] bg-slate-100 text-slate-400 font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Subscription Billing Section */}
      <div className="rounded-[3rem] bg-slate-900 p-10 text-white space-y-10">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 border border-blue-500/30">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Подписка и Тарифы</h2>
            <p className="text-sm text-slate-400 font-medium">Выберите тарифный план для ваших проектов.</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          {Object.entries(PLAN_PRICES).map(([name, price]) => (
            <div key={name} className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-4 hover:bg-white/10 transition-all group">
              <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">{name}</h4>
              <p className="text-3xl font-black">{formatUzs(price)}<span className="text-sm text-slate-500 font-medium">/мес</span></p>
              <ul className="space-y-2 pt-4">
                <li className="text-[10px] font-bold text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Приоритет в поиске</li>
                <li className="text-[10px] font-bold text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Аналитика лидов</li>
                <li className="text-[10px] font-bold text-slate-400 flex items-center gap-2"><CheckCircle2 className="h-3 w-3 text-emerald-500" /> Поддержка 24/7</li>
              </ul>
              <div className="pt-4 space-y-3">
                <select 
                  className="w-full bg-transparent border border-white/10 rounded-xl px-4 py-2 text-xs font-bold outline-none focus:border-blue-500"
                  onChange={(e) => upgradePlan(Number(e.target.value), name as any)}
                  defaultValue=""
                >
                  <option value="" disabled className="text-black">Выберите проект</option>
                  {projects.map(p => <option key={p.id} value={p.id} className="text-black">{p.name}</option>)}
                </select>
                <button className="w-full py-3 rounded-xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-widest hover:bg-blue-400 hover:text-white transition-all">Подключить</button>
              </div>
            </div>
          ))}
        </div>
        
        {activePayment && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="h-16 w-16 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 animate-pulse">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-1">
              <h4 className="text-lg font-black text-emerald-400 italic">Счёт успешно сформирован!</h4>
              <p className="text-sm font-medium text-slate-300">Инструкция: {activePayment.details[0]}</p>
              <p className="text-xs font-bold text-slate-500 mt-2 uppercase tracking-widest">Код заявки: #{activePayment.externalRef}</p>
            </div>
            <button className="px-8 py-4 rounded-2xl bg-white text-slate-900 font-black uppercase tracking-widest text-xs">Я оплатил</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectInfoItem({ icon, label, value }: any) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 h-8 w-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
        {icon}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-tight">{label}</p>
        <p className="text-sm font-black text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

function FormInput({ label, value, onChange, placeholder, type = "text", required = false }: any) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-14 w-full rounded-2xl bg-slate-50 border border-slate-100 px-6 text-sm font-bold outline-none ring-blue-600/10 focus:ring-4 focus:bg-white focus:border-blue-600 transition-all text-black"
      />
    </div>
  );
}
