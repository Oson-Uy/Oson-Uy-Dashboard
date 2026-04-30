"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, ApiAuthError, apiFetch, clearSession, getToken } from "@/lib/api";

type LeadStatus = "NEW" | "CONTACTED";

type Lead = {
  id: number;
  name: string;
  phone: string;
  project: string;
  createdAt: string;
  status: LeadStatus;
  feedbackUrl?: string;
};

type ApiLead = {
  id: number;
  name: string;
  phone: string;
  status: LeadStatus;
  createdAt: string;
  project: { id: number; name: string; developerId: number } | null;
};

type FeedbackItem = {
  id: number;
  rating: number;
  comment: string | null;
  submittedAt: string;
  lead: {
    name: string;
    project: {
      name: string;
    };
  };
};

const STORAGE_KEY = "oson_uy_developer_name";
const adminHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackStats, setFeedbackStats] = useState<{
    avgRating: number | null;
    totalFeedbacks: number;
    items: FeedbackItem[];
  } | null>(null);

  const [selectedLink, setSelectedLink] = useState<string | null>(null);

  const loadLeads = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiFetch<ApiLead[]>("/leads");
      const currentDeveloper = await apiFetch<{ id: number; name: string }>("/developers");
      window.localStorage.setItem(STORAGE_KEY, currentDeveloper.name);
      const feedbackData = await apiFetch<{
        avgRating: number | null;
        totalFeedbacks: number;
        items: FeedbackItem[];
      }>("/leads/feedback/summary");
      setFeedbackStats(feedbackData);
      setLeads(
        data
          .filter((lead) => lead.project?.developerId === currentDeveloper.id)
          .map((lead) => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          project: lead.project?.name ?? "—",
          createdAt: new Date(lead.createdAt).toISOString().slice(0, 10),
          status: lead.status,
          feedbackUrl: undefined,
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
    void loadLeads();
  }, []);

  const leadsCount = useMemo(
    () => ({
      total: leads.length,
      new: leads.filter((item) => item.status === "NEW").length,
      contacted: leads.filter((item) => item.status === "CONTACTED").length,
    }),
    [leads],
  );

  const setContacted = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/leads/${id}`, {
        method: "PATCH",
        headers: adminHeaders(),
        body: JSON.stringify({ status: "CONTACTED" }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update lead (${response.status})`);
      }

      setLeads((current) =>
        current.map((lead) =>
          lead.id === id ? { ...lead, status: "CONTACTED" } : lead,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const createFeedbackLink = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/leads/${id}/feedback-request`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to create feedback link (${response.status})`);
      }
      const data = (await response.json()) as { feedbackUrl: string };
      // Replace localhost:3000 with vercel app link if it's there
      const finalUrl = data.feedbackUrl.replace("http://localhost:3000", "https://oson-uy-website.vercel.app");
      setLeads((current) =>
        current.map((lead) =>
          lead.id === id ? { ...lead, feedbackUrl: finalUrl } : lead,
        ),
      );
      setSelectedLink(finalUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#1E3A8A]">Leads</h2>
        <p className="mt-1 text-slate-600">
          Список заявок и быстрый перевод в статус CONTACTED.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-blue-100 bg-white p-6 text-slate-500">
          Загрузка заявок...
        </div>
      ) : (
        <>

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
        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Оценка разговоров</p>
          <p className="text-2xl font-bold text-[#1E3A8A]">
            {feedbackStats?.avgRating ?? "—"}
          </p>
          <p className="text-xs text-slate-500">
            Отзывов: {feedbackStats?.totalFeedbacks ?? 0}
          </p>
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
              <th className="px-4 py-3 font-semibold">feedback</th>
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
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => createFeedbackLink(lead.id)}
                    disabled={lead.status !== "CONTACTED"}
                    className="h-11 rounded-xl bg-[#1E3A8A] px-4 text-xs font-semibold text-white transition hover:bg-[#3C55BE] disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    Feedback link
                  </button>
                  {lead.feedbackUrl && (
                    <button
                      onClick={() => setSelectedLink(lead.feedbackUrl!)}
                      className="mt-1 max-w-[180px] truncate text-xs text-blue-600 underline hover:text-blue-800"
                    >
                      Показать ссылку
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Feedbacks Section */}
      {feedbackStats && feedbackStats.items && feedbackStats.items.length > 0 && (
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-[#1E3A8A]">Отзывы клиентов</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {feedbackStats.items.map((feedback) => (
              <div key={feedback.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex text-orange-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg key={star} className={`h-5 w-5 ${star <= feedback.rating ? "fill-orange-400" : "fill-slate-200"}`} viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(feedback.submittedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <div className="mb-2 text-sm text-slate-800 italic">
                  &quot;{feedback.comment || "Без комментария"}&quot;
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{feedback.lead?.name}</span>
                  <span className="text-xs font-medium text-slate-500">{feedback.lead?.project?.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal for Link */}
      {selectedLink && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-xl font-bold text-slate-900">Ссылка для клиента</h3>
            <p className="mt-2 text-sm text-slate-500">
              Скопируйте эту ссылку и отправьте её клиенту (например, в Telegram), чтобы он мог оценить работу менеджера.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <input 
                type="text"
                readOnly
                value={selectedLink}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedLink);
                  alert("Ссылка скопирована в буфер обмена!");
                  setSelectedLink(null);
                }}
                className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white hover:bg-blue-700 transition"
              >
                Копировать ссылку
              </button>
            </div>
            <button
              onClick={() => setSelectedLink(null)}
              className="mt-4 w-full text-sm font-medium text-slate-500 hover:text-slate-700"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
      </>
      )}
    </section>
  );
}
