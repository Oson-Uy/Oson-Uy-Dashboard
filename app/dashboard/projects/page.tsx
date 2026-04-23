"use client";

import { FormEvent, useMemo, useState } from "react";

type Project = {
  id: number;
  name: string;
  location: string;
  priceFrom: number;
  imageUrl: string;
  videoUrl?: string;
};

type ProjectForm = Omit<Project, "id">;

const defaultForm: ProjectForm = {
  name: "",
  location: "",
  priceFrom: 0,
  imageUrl: "",
  videoUrl: "",
};

const initialProjects: Project[] = [
  {
    id: 1,
    name: "Modern Tashkent",
    location: "Tashkent",
    priceFrom: 78000,
    imageUrl: "https://images.unsplash.com/photo-1460317442991-0ec209397118",
    videoUrl: "",
  },
  {
    id: 2,
    name: "Samarkand Heights",
    location: "Samarkand",
    priceFrom: 62000,
    imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab",
    videoUrl: "",
  },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [form, setForm] = useState<ProjectForm>(defaultForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const submitLabel = useMemo(
    () => (editingId ? "Сохранить изменения" : "Создать проект"),
    [editingId],
  );

  const resetForm = () => {
    setForm(defaultForm);
    setEditingId(null);
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (editingId) {
      setProjects((current) =>
        current.map((project) =>
          project.id === editingId ? { ...project, ...form } : project,
        ),
      );
      resetForm();
      return;
    }

    const nextId = projects.length ? Math.max(...projects.map((p) => p.id)) + 1 : 1;
    setProjects((current) => [...current, { id: nextId, ...form }]);
    resetForm();
  };

  const onEdit = (project: Project) => {
    setEditingId(project.id);
    setForm({
      name: project.name,
      location: project.location,
      priceFrom: project.priceFrom,
      imageUrl: project.imageUrl,
      videoUrl: project.videoUrl ?? "",
    });
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#1E3A8A]">Projects</h2>
        <p className="mt-1 text-slate-600">
          Управляйте проектами: создавайте новые и редактируйте существующие.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="grid gap-4 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:grid-cols-2"
      >
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">name</span>
          <input
            value={form.name}
            onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
            required
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">location</span>
          <input
            value={form.location}
            onChange={(event) =>
              setForm((p) => ({ ...p, location: event.target.value }))
            }
            required
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">priceFrom</span>
          <input
            type="number"
            min={0}
            value={form.priceFrom}
            onChange={(event) =>
              setForm((p) => ({ ...p, priceFrom: Number(event.target.value) }))
            }
            required
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-semibold text-slate-700">imageUrl</span>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(event) =>
              setForm((p) => ({ ...p, imageUrl: event.target.value }))
            }
            required
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
          />
        </label>
        <label className="space-y-1 sm:col-span-2">
          <span className="text-sm font-semibold text-slate-700">videoUrl (optional)</span>
          <input
            type="url"
            value={form.videoUrl}
            onChange={(event) =>
              setForm((p) => ({ ...p, videoUrl: event.target.value }))
            }
            className="h-12 w-full rounded-xl border border-slate-300 px-3 text-slate-900 outline-none ring-[#1E3A8A]/30 focus:ring"
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
            <p className="mt-2 text-base font-semibold text-[#F97316]">
              from ${project.priceFrom.toLocaleString()}
            </p>
            <p className="mt-2 truncate text-sm text-slate-500">
              image: {project.imageUrl}
            </p>
            <p className="truncate text-sm text-slate-500">
              video: {project.videoUrl || "-"}
            </p>
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
    </section>
  );
}
