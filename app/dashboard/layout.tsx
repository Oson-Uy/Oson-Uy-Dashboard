import Link from "next/link";

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50">
      <header className="border-b border-blue-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-[#1E3A8A]">Oson Uy Dashboard</h1>
          <nav className="flex gap-2">
            <Link
              href="/dashboard/leads"
              className="rounded-xl bg-[#1E3A8A] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3C55BE]"
            >
              Leads
            </Link>
            <Link
              href="/dashboard/projects"
              className="rounded-xl bg-[#F97316] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-600"
            >
              Projects
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
