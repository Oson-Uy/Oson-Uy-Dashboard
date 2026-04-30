"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/api";
import { formatUzs } from "@/lib/currency";

type Invoice = {
  id: number;
  projectId: number;
  plan: string;
  amountUzs: number;
  status: string;
  paymentMethod: string;
  createdAt: string;
  project: {
    name: string;
    developer: {
      name: string;
      email: string;
    };
  };
};

type Subscription = {
  id: number;
  projectId: number;
  plan: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  project: {
    name: string;
    developer: {
      name: string;
    };
  };
};

export default function BillingPage() {
  const [adminKey, setAdminKey] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-login if we have a key in localStorage
  useEffect(() => {
    const savedKey = window.localStorage.getItem("osonuy_admin_key");
    if (savedKey) {
      setAdminKey(savedKey);
      fetchData(savedKey);
    }
  }, []);

  const fetchData = async (key: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const [invRes, subRes] = await Promise.all([
        fetch(`${API_URL}/billing/admin/invoices`, { headers: { "x-admin-key": key } }),
        fetch(`${API_URL}/billing/admin/subscriptions`, { headers: { "x-admin-key": key } })
      ]);

      if (!invRes.ok || !subRes.ok) {
        throw new Error("Неверный Admin Key или ошибка сервера");
      }

      const invData = await invRes.json();
      const subData = await subRes.json();

      setInvoices(invData);
      setSubscriptions(subData);
      setIsAuthenticated(true);
      window.localStorage.setItem("osonuy_admin_key", key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setIsAuthenticated(false);
      window.localStorage.removeItem("osonuy_admin_key");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim()) {
      fetchData(adminKey.trim());
    }
  };

  const handleConfirmPayment = async (invoiceId: number) => {
    if (!confirm(`Подтвердить оплату по инвойсу #${invoiceId}?`)) return;

    try {
      const res = await fetch(`${API_URL}/billing/admin/confirm-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ invoiceId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Ошибка подтверждения");
      }

      alert("Оплата успешно подтверждена!");
      fetchData(adminKey); // Refresh data
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-blue-100">
          <h2 className="mb-4 text-xl font-bold text-slate-800">Admin Billing</h2>
          <p className="mb-6 text-sm text-slate-500">Введите секретный ключ администратора для управления подписками и счетами.</p>
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            placeholder="ADMIN_SECRET key"
            className="mb-4 w-full text-black rounded-xl border border-slate-300 p-3 outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-purple-600 p-3 font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
          >
            {isLoading ? "Проверка..." : "Войти"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Управление Биллингом</h1>
          <p className="text-slate-500 mt-1">Режим администратора</p>
        </div>
        <button
          onClick={() => {
            setIsAuthenticated(false);
            setAdminKey("");
            window.localStorage.removeItem("osonuy_admin_key");
          }}
          className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-300 transition"
        >
          Выйти из Admin
        </button>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-800 border-b pb-2">Счета на оплату (Invoices)</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Застройщик / Проект</th>
                <th className="px-4 py-3">Тариф</th>
                <th className="px-4 py-3">Сумма</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Дата</th>
                <th className="px-4 py-3 text-right">Действие</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="p-4 text-center">Нет счетов</td></tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3 font-medium text-slate-900">#{inv.id}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{inv.project?.developer?.name}</div>
                      <div className="text-xs text-slate-500">{inv.project?.name}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-orange-600">{inv.plan}</td>
                    <td className="px-4 py-3">{formatUzs(inv.amountUzs)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        inv.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                        inv.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{new Date(inv.createdAt).toLocaleString('ru-RU')}</td>
                    <td className="px-4 py-3 text-right">
                      {inv.status === 'PENDING' && (
                        <button
                          onClick={() => handleConfirmPayment(inv.id)}
                          className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-600"
                        >
                          Подтвердить
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-bold text-slate-800 border-b pb-2">Все подписки</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Проект / Застройщик</th>
                <th className="px-4 py-3">Тариф</th>
                <th className="px-4 py-3">Статус</th>
                <th className="px-4 py-3">Начало</th>
                <th className="px-4 py-3">Конец</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {subscriptions.length === 0 ? (
                <tr><td colSpan={5} className="p-4 text-center">Нет подписок</td></tr>
              ) : (
                subscriptions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{sub.project?.name}</div>
                      <div className="text-xs text-slate-500">{sub.project?.developer?.name}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-orange-600">{sub.plan}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                        sub.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 
                        sub.status === 'TRIAL' ? 'bg-blue-100 text-blue-700' : 
                        sub.status === 'PAST_DUE' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">{sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toLocaleDateString('ru-RU') : '-'}</td>
                    <td className="px-4 py-3 text-xs">{sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString('ru-RU') : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
