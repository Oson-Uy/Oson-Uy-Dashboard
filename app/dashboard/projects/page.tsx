"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_URL, ApiAuthError, apiFetch, clearSession, getToken } from "@/lib/api";

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
};

type ProjectForm = Omit<Project, "id">;
type Developer = { id: number; name: string; qrCodeUrl?: string };
const STORAGE_KEY = "oson_uy_developer_name";

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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDeveloperId, setActiveDeveloperId] = useState<number | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [qrUploading, setQrUploading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);

  const submitLabel = useMemo(
    () => (editingId ? "Сохранить изменения" : "Создать проект"),
    [editingId],
  );

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
      const [projectsData] = await Promise.all([
        apiFetch<Array<{
        id: number;
        name: string;
        location: string;
        district?: string | null;
        description?: string | null;
        advantages?: string[];
        mapEmbedUrl?: string | null;
        qrCodeUrl?: string | null;
        totalFloors?: number | null;
        totalUnits?: number | null;
        imageUrl: string;
        videoUrl?: string | null;
        deliveryDate: string;
        media?: Array<{ imageUrl: string }>;
        apartments: Array<{ price: number; area: number }>;
        developerId: number;
        subscription?: { plan: Project["plan"]; status: Project["subscriptionStatus"] } | null;
      }>>("/projects"),
      ]);
      const currentDeveloper = await apiFetch<Developer>("/developers");
      const devs = [currentDeveloper];
      window.localStorage.setItem(STORAGE_KEY, currentDeveloper.name);

      setDevelopers(devs);
      setActiveDeveloperId(currentDeveloper.id);
      setQrCodeUrl(currentDeveloper.qrCodeUrl ?? "");
      setForm((current) => ({ ...current, developerId: currentDeveloper.id }));
      const ownProjects = projectsData.filter(
        (project) => project.developerId === currentDeveloper.id,
      );
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
          priceFrom: project.apartments.length
            ? String(Math.min(...project.apartments.map((apt) => apt.price)))
            : "",
          pricePerM2From: project.apartments.length
            ? String(
                Math.min(
                  ...project.apartments
                    .filter((apt) => apt.area > 0)
                    .map((apt) => apt.price / apt.area),
                ).toFixed(0),
              )
            : "",
          plan: project.subscription?.plan,
          subscriptionStatus: project.subscription?.status,
        })),
      );
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

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void (async () => {
      try {
        setError(null);
        const payload = {
          name: form.name,
          location: form.location,
          district: form.district || undefined,
          description: form.description || undefined,
          advantages: form.advantages
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          mapEmbedUrl: toEmbedMapUrl(form.mapEmbedUrl) || undefined,
          qrCodeUrl: form.qrCodeUrl || undefined,
          totalFloors: form.totalFloors ? Number(form.totalFloors) : undefined,
          totalUnits: form.totalUnits ? Number(form.totalUnits) : undefined,
          deliveryDate: form.deliveryDate,
          imageUrl: form.imageUrl,
          videoUrl: form.videoUrl || undefined,
          imageUrls: uploadedImageUrls.length ? uploadedImageUrls : undefined,
          developerId: activeDeveloperId ?? form.developerId,
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
          },
        );

        if (!response.ok) {
          throw new Error(
            `${editingId ? "Failed to update" : "Failed to create"} project`,
          );
        }

        await loadData();
        resetForm();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    })();
  };

  const onEdit = (project: Project) => {
    setEditingId(project.id);
    setSelectedFiles([]);
    setUploadedImageUrls(project.imageUrl ? [project.imageUrl] : []);
    setForm({
      name: project.name,
      location: project.location,
      district: project.district,
      description: project.description,
      advantages: project.advantages,
      mapEmbedUrl: project.mapEmbedUrl,
      qrCodeUrl: project.qrCodeUrl,
      totalFloors: project.totalFloors,
      totalUnits: project.totalUnits,
      priceFrom: project.priceFrom,
      pricePerM2From: project.pricePerM2From,
      imageUrl: project.imageUrl,
      videoUrl: project.videoUrl ?? "",
      deliveryDate: project.deliveryDate,
      developerId: project.developerId,
    });
  };

  const uploadSelectedImages = async () => {
    if (!selectedFiles.length) return;

    try {
      setIsUploading(true);
      setError(null);

      const uploaded = await Promise.all(
        selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(`${API_URL}/upload/image`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
            body: formData,
          });

          if (!response.ok) {
            throw new Error(`Failed to upload image (${response.status})`);
          }

          const data = (await response.json()) as { url: string };
          return data.url;
        }),
      );

      setUploadedImageUrls((current) => [...current, ...uploaded]);
      setForm((current) => ({
        ...current,
        imageUrl: current.imageUrl || uploaded[0] || "",
      }));
      setSelectedFiles([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsUploading(false);
    }
  };

  const uploadDeveloperQr = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeDeveloperId) return;

    try {
      setQrUploading(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", file);
      const uploadRes = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });
      if (!uploadRes.ok) {
        throw new Error("Не удалось загрузить QR");
      }
      const uploaded = (await uploadRes.json()) as { url: string };
      const response = await fetch(`${API_URL}/developers/${activeDeveloperId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ qrCodeUrl: uploaded.url }),
      });
      if (!response.ok) {
        throw new Error("Не удалось сохранить QR");
      }
      setQrCodeUrl(uploaded.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setQrUploading(false);
    }
  };

  const upgradePlan = async (
    projectId: number,
    plan: "START" | "PRO" | "PREMIUM" | "ULTIMATE",
  ) => {
    try {
      setError(null);
      setPaymentStatus("Создаем платеж...");
      const response = await fetch(`${API_URL}/billing/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          projectId,
          plan,
          provider: "PAYME",
        }),
      });
      if (!response.ok) {
        throw new Error("Не удалось создать оплату");
      }
      const data = (await response.json()) as { checkoutUrl?: string };
      if (data.checkoutUrl) {
        setPaymentStatus("Откройте вкладку оплаты и завершите платеж");
        window.open(data.checkoutUrl, "_blank");
      }
      await loadData();
    } catch (err) {
      setPaymentStatus("Ошибка оплаты");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#1E3A8A]">Projects</h2>
        <p className="mt-1 text-slate-600">
          Управляйте проектами: создавайте новые и редактируйте существующие.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {paymentStatus && <p className="mt-2 text-sm text-emerald-700">{paymentStatus}</p>}
      </div>

      <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
        <p className="text-sm font-semibold text-[#1E3A8A]">
          QR-код застройщика (для верифицированного профиля)
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => void uploadDeveloperQr(event)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1E3A8A] file:px-3 file:py-2 file:font-semibold file:text-white"
          />
          {qrUploading && <span className="text-sm text-slate-500">Загрузка...</span>}
        </div>
        {qrCodeUrl && (
          <img src={qrCodeUrl} alt="Developer QR" className="mt-3 h-28 w-28 rounded-xl border border-slate-200 object-cover" />
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-blue-100 bg-white p-6 text-slate-500">
          Загрузка проектов...
        </div>
      ) : (
        <>
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-2xl border border-blue-100 bg-white p-4 shadow-sm sm:grid-cols-2"
      >
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">name</span>
          <input
            value={form.name}
            onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
            required
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">location</span>
          <input
            value={form.location}
            onChange={(event) =>
              setForm((p) => ({ ...p, location: event.target.value }))
            }
            required
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">district</span>
          <input
            value={form.district}
            onChange={(event) => setForm((p) => ({ ...p, district: event.target.value }))}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">totalFloors</span>
          <input
            type="number"
            min={1}
            value={form.totalFloors}
            onChange={(event) =>
              setForm((p) => ({ ...p, totalFloors: event.target.value.replace(/\D/g, "") }))
            }
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">totalUnits</span>
          <input
            type="number"
            min={1}
            value={form.totalUnits}
            onChange={(event) =>
              setForm((p) => ({ ...p, totalUnits: event.target.value.replace(/\D/g, "") }))
            }
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">priceFrom</span>
          <input
            type="number"
            min={0}
            value={form.priceFrom}
            onChange={(event) =>
              setForm((p) => ({ ...p, priceFrom: event.target.value.replace(/\D/g, "") }))
            }
            required
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">deliveryDate</span>
          <input
            type="text"
            value={form.deliveryDate}
            onChange={(event) =>
              setForm((p) => ({ ...p, deliveryDate: event.target.value }))
            }
            required
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <div className="space-y-2 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">Фотографии проекта</span>
          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) =>
                setSelectedFiles(Array.from(event.target.files ?? []))
              }
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1E3A8A] file:px-3 file:py-2 file:font-semibold file:text-white"
            />
            <button
              type="button"
              onClick={() => void uploadSelectedImages()}
              disabled={!selectedFiles.length || isUploading}
              className="h-11 rounded-xl bg-[#1E3A8A] px-4 text-sm font-semibold text-white transition hover:bg-[#3C55BE] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isUploading ? "Загрузка..." : "Загрузить фото"}
            </button>
          </div>

          {!!uploadedImageUrls.length && (
            <div className="grid gap-3 sm:grid-cols-3">
              {uploadedImageUrls.map((url) => {
                const isMain = form.imageUrl === url;
                return (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, imageUrl: url }))}
                    className={`overflow-hidden rounded-xl border text-left transition ${
                      isMain
                        ? "border-[#F97316] ring-2 ring-orange-200"
                        : "border-slate-200 hover:border-[#1E3A8A]/50"
                    }`}
                  >
                    <img src={url} alt="Project" className="h-28 w-full object-cover" />
                    <div className="px-2 py-1 text-xs text-slate-600">
                      {isMain ? "Главное фото" : "Сделать главным"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">developer</span>
          <div className="flex h-10 items-center rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-700">
            {developers.find((item) => item.id === activeDeveloperId)?.name ?? "—"}
          </div>
        </div>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">videoUrl (optional)</span>
          <input
            type="url"
            value={form.videoUrl}
            onChange={(event) =>
              setForm((p) => ({ ...p, videoUrl: event.target.value }))
            }
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">advantages (comma separated)</span>
          <input
            value={form.advantages}
            onChange={(event) =>
              setForm((p) => ({ ...p, advantages: event.target.value }))
            }
            placeholder="Школа рядом, Паркинг, Закрытый двор"
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">description</span>
          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((p) => ({ ...p, description: event.target.value }))
            }
            className="min-h-24 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">mapEmbedUrl</span>
          <input
            type="url"
            value={form.mapEmbedUrl}
            onChange={(event) =>
              setForm((p) => ({ ...p, mapEmbedUrl: event.target.value }))
            }
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">projectQrCodeUrl</span>
          <input
            type="url"
            value={form.qrCodeUrl}
            onChange={(event) =>
              setForm((p) => ({ ...p, qrCodeUrl: event.target.value }))
            }
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <div className="flex gap-3 sm:col-span-2">
          <button
            type="submit"
            className="h-12 rounded-xl bg-[#F97316] px-6 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            {submitLabel}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="h-12 rounded-xl bg-slate-200 px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
            >
              Отмена
            </button>
          )}
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((project) => (
          <article
            key={project.id}
            className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <h3 className="text-lg font-bold text-[#1E3A8A]">{project.name}</h3>
            <p className="mt-1 text-slate-600">{project.location}</p>
            {project.district && <p className="text-sm text-slate-500">district: {project.district}</p>}
            <p className="mt-2 text-base font-semibold text-[#F97316]">
              from $
              {(project.priceFrom ? Number(project.priceFrom) : 0).toLocaleString()}
            </p>
            <p className="mt-2 truncate text-sm text-slate-500">
              image: {project.imageUrl}
            </p>
            <p className="truncate text-sm text-slate-500">
              video: {project.videoUrl || "-"}
            </p>
            <p className="truncate text-sm text-slate-500">
              delivery: {project.deliveryDate}
            </p>
            {!!project.totalFloors && (
              <p className="truncate text-sm text-slate-500">floors: {project.totalFloors}</p>
            )}
            {!!project.totalUnits && (
              <p className="truncate text-sm text-slate-500">units: {project.totalUnits}</p>
            )}
            {!!project.pricePerM2From && (
              <p className="truncate text-sm text-slate-500">
                from ${Number(project.pricePerM2From).toLocaleString()} / m2
              </p>
            )}
            <p className="truncate text-xs text-slate-500">
              Plan: {project.plan ?? "START"} ({project.subscriptionStatus ?? "TRIAL"})
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(["START", "PRO", "PREMIUM", "ULTIMATE"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => void upgradePlan(project.id, tier)}
                  className="h-8 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 transition hover:border-[#1E3A8A] hover:text-[#1E3A8A]"
                >
                  {tier}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onEdit(project)}
              className="mt-4 h-11 rounded-xl bg-[#1E3A8A] px-5 text-sm font-semibold text-white transition hover:bg-[#3C55BE]"
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
