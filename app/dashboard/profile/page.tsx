"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { useTranslations } from "next-intl";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";

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

  const loadProfile = async () => {
    const [developer, projectsData] = await Promise.all([
      apiFetch<{
        id: number;
        name: string;
        telegramLinked?: boolean;
      }>("/developers"),
      apiFetch<Project[]>("/projects"),
    ]);
    setName(developer.name);
    setTelegramLinked(Boolean(developer.telegramLinked));
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
