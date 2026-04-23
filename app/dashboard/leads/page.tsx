"use client";

import { useMemo, useState } from "react";

type LeadStatus = "NEW" | "CONTACTED";

type Lead = {
  id: number;
  name: string;
  phone: string;
  project: string;
  createdAt: string;
  status: LeadStatus;
};

const initialLeads: Lead[] = [
  {
    id: 1,
    name: "Ali Valiyev",
    phone: "+998 90 123 45 67",
    project: "Modern Tashkent",
    createdAt: "2026-04-22",
    status: "NEW",
  },
  {
    id: 2,
    name: "Dildora Karimova",
    phone: "+998 93 222 11 00",
    project: "Samarkand Heights",
    createdAt: "2026-04-21",
    status: "CONTACTED",
  },
  {
    id: 3,
    name: "Jasur Nurmatov",
    phone: "+998 91 700 00 10",
    project: "City Garden",
    createdAt: "2026-04-20",
    status: "NEW",
  },
];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>(initialLeads);

  const leadsCount = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((item) => item.status === "NEW").length,
      contacted: leads.filter((item) => item.status === "CONTACTED").length,
    }),
    [leads],
  );

  const setContacted = (id: number) => {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === id ? { ...lead, status: "CONTACTED" } : lead,
      ),
    );
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#1E3A8A]">Leads</h2>
        <p className="mt-1 text-slate-600">
          Список заявок и быстрый перевод в статус CONTACTED.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Всего заявок</p>
          <p className="text-2xl font-bold text-[#1E3A8A]">{leadsCount.total}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Новые</p>
          <p className="text-2xl font-bold text-[#1E3A8A]">{leadsCount.new}</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Связались</p>
          <p className="text-2xl font-bold text-[#1E3A8A]">{leadsCount.contacted}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-blue-100 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#1E3A8A]/5 text-[#1E3A8A]">
            <tr>
              <th className="px-4 py-3 font-semibold">name</th>
              <th className="px-4 py-3 font-semibold">phone</th>
              <th className="px-4 py-3 font-semibold">project</th>
              <th className="px-4 py-3 font-semibold">createdAt</th>
              <th className="px-4 py-3 font-semibold">status</th>
              <th className="px-4 py-3 font-semibold">action</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3 font-medium text-slate-900">{lead.name}</td>
                <td className="px-4 py-3 text-slate-700">{lead.phone}</td>
                <td className="px-4 py-3 text-slate-700">{lead.project}</td>
                <td className="px-4 py-3 text-slate-700">{lead.createdAt}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-3 py-1 text-xs font-semibold ${
                      lead.status === "NEW"
                        ? "bg-orange-100 text-orange-700"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {lead.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setContacted(lead.id)}
                    disabled={lead.status === "CONTACTED"}
                    className="h-11 rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Set CONTACTED
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
