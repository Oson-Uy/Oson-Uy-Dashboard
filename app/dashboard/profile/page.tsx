"use client";

import { useEffect, useState } from "react";
import { apiFetch, API_URL, getToken } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Building2, Copy, ExternalLink, Loader2, MessageCircle } from "lucide-react";

type Project = {
  id: number;
  name: string;
  subscription?: {
    plan?: "START" | "PRO" | "PREMIUM" | "ULTIMATE";
    status?: "TRIAL" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED";
  } | null;
};

type TelegramLinkResponse = {
  deepLink: string;
  expiresAt: string;
};

export default function ProfilePage() {
  const t = useTranslations("Dashboard.profile");
  const [name, setName] = useState("");
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [telegramLink, setTelegramLink] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramErrorMsg, setTelegramErrorMsg] = useState<string | null>(null);
  const [copyDone, setCopyDone] = useState(false);
  const [developerId, setDeveloperId] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [legalAddress, setLegalAddress] = useState("");
  const [officeAddress, setOfficeAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [companySaving, setCompanySaving] = useState(false);
  const [companySaved, setCompanySaved] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const loadProfile = async () => {
    const [developer, projectsData] = await Promise.all([
      apiFetch<{
        id: number;
        name: string;
        telegramLinked?: boolean;
        phone?: string | null;
        legalAddress?: string | null;
        officeAddress?: string | null;
        website?: string | null;
        description?: string | null;
        logoUrl?: string | null;
      }>("/developers"),
      apiFetch<Project[]>("/projects"),
    ]);
    setDeveloperId(developer.id);
    setName(developer.name);
    setTelegramLinked(Boolean(developer.telegramLinked));
    setPhone(developer.phone ?? "");
    setLegalAddress(developer.legalAddress ?? "");
    setOfficeAddress(developer.officeAddress ?? "");
    setWebsite(developer.website ?? "");
    setCompanyDescription(developer.description ?? "");
    setLogoUrl(developer.logoUrl ?? "");
    setProjects(projectsData.filter((item) => item.subscription));
  };

  useEffect(() => {
    void (async () => {
      try {
        await loadProfile();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void (async () => {
        try {
          await loadProfile();
        } catch {
          /* ignore */
        }
      })();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  const requestTelegramLink = async () => {
    setTelegramLoading(true);
    setTelegramErrorMsg(null);
    setError(null);
    try {
      const data = await apiFetch<TelegramLinkResponse>(
        "/developers/me/telegram-link",
      );
      setTelegramLink(data.deepLink);
    } catch {
      setTelegramErrorMsg(t("telegramError"));
    } finally {
      setTelegramLoading(false);
    }
  };

  const copyLink = async () => {
    if (!telegramLink) return;
    await navigator.clipboard.writeText(telegramLink);
    setCopyDone(true);
    window.setTimeout(() => setCopyDone(false), 2500);
  };

  const saveCompany = async () => {
    if (developerId == null) return;
    setCompanySaving(true);
    setCompanyError(null);
    setCompanySaved(false);
    try {
      await apiFetch(`/developers/${developerId}`, {
        method: "PATCH",
        body: JSON.stringify({
          phone: phone.trim() || undefined,
          legalAddress: legalAddress.trim() || undefined,
          officeAddress: officeAddress.trim() || undefined,
          website: website.trim() || undefined,
          description: companyDescription.trim() || undefined,
          logoUrl: logoUrl.trim() || undefined,
        }),
      });
      setCompanySaved(true);
      window.setTimeout(() => setCompanySaved(false), 2500);
    } catch (e) {
      setCompanyError(
        e instanceof Error ? e.message : t("companySaveError"),
      );
    } finally {
      setCompanySaving(false);
    }
  };

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_URL}/upload/image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: formData,
      });
      const data = (await res.json()) as { url?: string };
      if (data.url) setLogoUrl(data.url);
    } catch {
      setCompanyError(t("companyLogoError"));
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[#1E3A8A]">{t("title")}</h2>
        <p className="mt-1 text-slate-600">{t("subtitle")}</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
      {loading ? (
        <div className="rounded-2xl border border-blue-100 bg-white p-5 text-slate-500">
          {t("loading")}
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t("developer")}
            </p>
            <p className="mt-1 text-xl font-bold text-[#1E3A8A]">
              {name || "—"}
            </p>
            <p className="mt-2 text-sm text-slate-600">{t("billingInfo")}</p>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm space-y-5">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-indigo-50 p-3 text-indigo-600">
                <Building2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-lg font-bold text-[#1E3A8A]">
                  {t("companyTitle")}
                </h3>
                <p className="text-sm text-slate-600">{t("companySubtitle")}</p>
              </div>
            </div>
            {companyError && (
              <p className="text-sm text-red-600">{companyError}</p>
            )}
            {companySaved && (
              <p className="text-sm text-emerald-700">{t("companySaved")}</p>
            )}
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t("companyLogo")}
                </span>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="flex h-full items-center justify-center text-xs text-slate-400">
                        —
                      </span>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(e) =>
                        void uploadLogo(e.target.files?.[0])
                      }
                    />
                  </div>
                  <input
                    type="url"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://…"
                    className="min-w-[200px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1E3A8A]"
                  />
                </div>
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">
                  {t("companyPhone")}
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1E3A8A]"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-xs font-semibold text-slate-500">
                  {t("companyWebsite")}
                </span>
                <input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1E3A8A]"
                />
              </label>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t("companyLegalAddress")}
                </span>
                <input
                  value={legalAddress}
                  onChange={(e) => setLegalAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1E3A8A]"
                />
              </label>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t("companyOfficeAddress")}
                </span>
                <input
                  value={officeAddress}
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1E3A8A]"
                />
              </label>
              <label className="block space-y-1.5 md:col-span-2">
                <span className="text-xs font-semibold text-slate-500">
                  {t("companyDescription")}
                </span>
                <textarea
                  value={companyDescription}
                  onChange={(e) => setCompanyDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#1E3A8A]"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={() => void saveCompany()}
              disabled={companySaving}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1E3A8A] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
            >
              {companySaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t("companySave")}
            </button>
          </div>

          <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-600">
                <MessageCircle className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <h3 className="text-lg font-bold text-[#1E3A8A]">
                  {t("telegramTitle")}
                </h3>
                <p className="text-sm text-slate-600">{t("telegramDesc")}</p>
                {telegramLinked ? (
                  <p className="text-sm font-medium text-emerald-700">
                    {t("telegramLinked")}
                  </p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void requestTelegramLink()}
                      disabled={telegramLoading}
                      className="rounded-xl bg-[#1E3A8A] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-900 disabled:opacity-60"
                    >
                      {telegramLoading ? "…" : t("telegramGetLink")}
                    </button>
                    {telegramErrorMsg && (
                      <p className="text-sm text-red-600">{telegramErrorMsg}</p>
                    )}
                    {copyDone && (
                      <p className="text-sm text-emerald-700">{t("telegramCopied")}</p>
                    )}
                    {telegramLink && (
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">
                          {t("telegramExpires")}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t("telegramRefreshHint")}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={telegramLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-slate-800"
                          >
                            {t("telegramOpen")}{" "}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => void copyLink()}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                          >
                            <Copy className="h-4 w-4" />
                            {t("telegramCopy")}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-[#1E3A8A]">
                  {project.name}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {t("projectPlan")}:{" "}
                  <span className="font-semibold">
                    {t(`plans.${project.subscription?.plan ?? "START"}`)}
                  </span>
                </p>
                <p className="text-sm text-slate-600">
                  {t("projectStatus")}:{" "}
                  <span className="font-semibold">
                    {t(`statuses.${project.subscription?.status ?? "TRIAL"}`)}
                  </span>
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {t("activationInfo")}
                </p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
