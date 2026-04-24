import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <main className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">Oson Uy Dashboard</h1>
        <p className="mt-2 text-slate-600">
          Простой кабинет застройщика для работы с заявками и проектами.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/dashboard/leads"
            className="flex h-14 items-center justify-center rounded-xl bg-[#F97316] text-base font-semibold text-white transition hover:bg-slate-700"
          >
            Leads
          </Link>
          <Link
            href="/dashboard/projects"
            className="flex h-14 items-center justify-center rounded-xl bg-blue-600 text-base font-semibold text-white transition hover:bg-blue-500"
          >
            Projects
          </Link>
        </div>
      </main>
    </div>
  );
}
