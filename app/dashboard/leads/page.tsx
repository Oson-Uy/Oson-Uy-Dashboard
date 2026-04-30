"use client";

import { useEffect, useMemo, useState } from "react";
import { API_URL, ApiAuthError, apiFetch, clearSession, getToken } from "@/lib/api";
import { 
  Users, 
  PhoneCall, 
  CheckCircle2, 
  Star, 
  ExternalLink, 
  Copy, 
  Search,
  Filter,
  MoreHorizontal,
  Mail
} from "lucide-react";

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
  const [searchQuery, setSearchQuery] = useState("");

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

  const filteredLeads = useMemo(() => {
    return leads.filter(l => 
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      l.phone.includes(searchQuery) ||
      l.project.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, searchQuery]);

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

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1E3A8A] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-[#1E3A8A] tracking-tight">Лиды</h1>
          <p className="text-slate-500 font-medium text-sm">Управляйте входящими заявками и отзывами клиентов.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 pl-11 pr-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-600/5 focus:border-blue-600 outline-none transition-all w-64"
            />
          </div>
          <button className="h-12 w-12 flex items-center justify-center bg-white border border-slate-200 rounded-2xl text-slate-500 hover:bg-slate-50 transition-all">
            <Filter className="h-5 w-5" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-2 italic">
          <X className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Stats Mini Grid */}
      <div className="grid gap-4 sm:grid-cols-4">
        <LeadStatCard label="Всего" value={leadsCount.total} color="text-blue-600" />
        <LeadStatCard label="Новые" value={leadsCount.new} color="text-orange-600" />
        <LeadStatCard label="Связались" value={leadsCount.contacted} color="text-emerald-600" />
        <LeadStatCard label="Рейтинг" value={feedbackStats?.avgRating ? feedbackStats.avgRating.toFixed(1) : "—"} color="text-yellow-500" sub={`Из ${feedbackStats?.totalFeedbacks ?? 0}`} />
      </div>

      {/* Table Container */}
      <div className="rounded-[2rem] border border-slate-100 bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-black tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-5">Клиент</th>
                <th className="px-6 py-5">Проект</th>
                <th className="px-6 py-5">Статус</th>
                <th className="px-6 py-5">Действие</th>
                <th className="px-6 py-5 text-right">Фидбек</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{lead.name}</div>
                    <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                      <PhoneCall className="h-3 w-3" /> {lead.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">{lead.project}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tight">{lead.createdAt}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase ${
                      lead.status === "NEW" 
                        ? "bg-orange-100 text-orange-700" 
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {lead.status === "NEW" ? <Mail className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => setContacted(lead.id)}
                      disabled={lead.status === "CONTACTED"}
                      className="h-10 rounded-xl bg-slate-900 px-4 text-xs font-black text-white transition-all hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 uppercase tracking-widest"
                    >
                      Связаться
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => createFeedbackLink(lead.id)}
                        disabled={lead.status !== "CONTACTED"}
                        className="flex items-center gap-2 h-10 rounded-xl bg-blue-50 px-4 text-xs font-black text-blue-700 transition-all hover:bg-blue-100 disabled:opacity-0"
                      >
                        <Star className="h-3 w-3" /> Отзыв
                      </button>
                      {lead.feedbackUrl && (
                        <button
                          onClick={() => setSelectedLink(lead.feedbackUrl!)}
                          className="text-[10px] font-black text-blue-600 underline uppercase tracking-tighter"
                        >
                          Показать ссылку
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center text-slate-400 font-medium italic">
                    Заявок не найдено
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feedbacks Section */}
      {feedbackStats && feedbackStats.items && feedbackStats.items.length > 0 && (
        <div className="mt-16 space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-[#1E3A8A] tracking-tight">Последние отзывы</h2>
            <div className="flex items-center gap-2 bg-yellow-50 px-4 py-2 rounded-2xl border border-yellow-100">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              <span className="font-black text-yellow-700">{feedbackStats.avgRating?.toFixed(1)}</span>
            </div>
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {feedbackStats.items.map((feedback) => (
              <div key={feedback.id} className="group relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-xl transition-all hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex text-yellow-500">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className={`h-4 w-4 ${star <= feedback.rating ? "fill-yellow-500" : "fill-slate-100 text-slate-100"}`} />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
                    {new Date(feedback.submittedAt).toLocaleDateString('ru-RU')}
                  </span>
                </div>
                <p className="text-sm text-slate-700 font-medium leading-relaxed italic">
                  &quot;{feedback.comment || "Без комментария"}&quot;
                </p>
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-slate-900">{feedback.lead?.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase">{feedback.lead?.project?.name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Link Modal */}
      {selectedLink && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-blue-50 p-3 rounded-2xl text-blue-600">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900 uppercase">Ссылка для клиента</h3>
            </div>
            
            <p className="text-sm text-slate-500 font-medium leading-relaxed mb-6">
              Отправьте эту ссылку клиенту, чтобы он мог оценить работу вашего менеджера.
            </p>
            
            <div className="space-y-3">
              <div className="relative group">
                <input 
                  type="text"
                  readOnly
                  value={selectedLink}
                  className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 pr-12 text-xs font-bold text-slate-600 outline-none"
                />
                <Copy className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
              </div>
              
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedLink);
                  // Using a more modern alert placeholder logic
                  setSelectedLink(null);
                }}
                className="w-full h-14 rounded-2xl bg-[#1E3A8A] text-sm font-black text-white hover:bg-blue-800 transition-all shadow-xl shadow-blue-900/10 uppercase tracking-widest"
              >
                Копировать ссылку
              </button>
            </div>
            
            <button
              onClick={() => setSelectedLink(null)}
              className="mt-6 w-full text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function LeadStatCard({ label, value, color, sub }: any) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        {sub && <span className="text-[10px] font-bold text-slate-400">{sub}</span>}
      </div>
    </div>
  );
}
