"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  ChevronRight,
  CreditCard,
  ListChecks,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useMessages, useTranslations } from "next-intl";

interface OnboardingProps {
  onClose: () => void;
}

type OnboardingStepCopy = {
  title: string;
  description: string;
  bullets?: string[];
};

const STEP_VISUAL: {
  Icon: LucideIcon;
  color: string;
  gradient: string;
}[] = [
  {
    Icon: Sparkles,
    color: "bg-orange-50",
    gradient: "from-[#1E3A8A] via-[#2563eb] to-slate-950",
  },
  {
    Icon: Building2,
    color: "bg-blue-50",
    gradient: "from-[#0f172a] via-[#1e3a8a] to-slate-900",
  },
  {
    Icon: PhoneCall,
    color: "bg-emerald-50",
    gradient: "from-emerald-800 via-[#14532d] to-slate-950",
  },
  {
    Icon: ListChecks,
    color: "bg-violet-50",
    gradient: "from-violet-800 via-[#4c1d95] to-slate-950",
  },
  {
    Icon: CreditCard,
    color: "bg-amber-50",
    gradient: "from-amber-700 via-[#9a3412] to-slate-950",
  },
  {
    Icon: ShieldCheck,
    color: "bg-slate-100",
    gradient: "from-slate-700 via-slate-900 to-black",
  },
];

export function Onboarding({ onClose }: OnboardingProps) {
  const t = useTranslations("Dashboard.onboarding");
  const messages = useMessages() as {
    Dashboard?: { onboarding?: { steps?: OnboardingStepCopy[] } };
  };
  const stepsCopy =
    messages.Dashboard?.onboarding?.steps ?? ([] as OnboardingStepCopy[]);
  const [currentStep, setCurrentStep] = useState(0);

  const stepCount = Math.max(stepsCopy.length, STEP_VISUAL.length);
  const visual = STEP_VISUAL[Math.min(currentStep, STEP_VISUAL.length - 1)]!;
  const StepIcon = visual.Icon;

  const nextStep = () => {
    if (currentStep < stepCount - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const stepMessage = stepsCopy[currentStep];
  const currentTitle =
    stepMessage?.title ?? t(`steps.${currentStep}.title`);
  const currentDescription =
    stepMessage?.description ?? t(`steps.${currentStep}.description`);
  const currentBullets = stepMessage?.bullets;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-3 backdrop-blur-md sm:p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative flex max-h-[min(92vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:max-h-[88vh] md:flex-row"
      >
        <div
          className={`relative h-32 shrink-0 overflow-hidden bg-gradient-to-br sm:h-36 md:h-auto md:w-2/5 md:min-h-[200px] ${visual.gradient}`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.15),transparent_55%)]"
            />
          </AnimatePresence>

          <div className="absolute inset-0 flex items-center justify-center opacity-90 md:opacity-100">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <StepIcon className="h-8 w-8 text-white" aria-hidden />
            </div>
          </div>

          <div className="absolute bottom-4 left-4 right-4 z-10 md:bottom-6 md:left-6 md:right-6">
            <div className="mb-3 flex gap-1.5 md:mb-4">
              {Array.from({ length: stepCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/70">
              {t("step")} {currentStep + 1} {t("of")} {stepCount}
            </p>
            <h3 className="line-clamp-2 text-base font-black uppercase italic leading-tight text-white sm:text-lg md:text-xl">
              {currentTitle.split(" ")[0]}{" "}
              <span className="text-orange-300">
                {currentTitle.split(" ").slice(1).join(" ")}
              </span>
            </h3>
          </div>
        </div>

        <div className="relative flex min-h-0 w-full flex-col justify-center overflow-y-auto bg-white p-5 md:w-3/5 md:p-7">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-900 md:right-4 md:top-4"
          >
            <X className="h-5 w-5" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pt-2 md:space-y-5"
            >
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-md ${visual.color}`}
              >
                <StepIcon className="h-7 w-7 text-[#1E3A8A]" aria-hidden />
              </div>

              <div className="space-y-2.5">
                <h2 className="text-xl font-black leading-snug tracking-tight text-[#1E3A8A] md:text-2xl">
                  {currentTitle}
                </h2>
                <p className="whitespace-pre-line text-sm font-medium leading-relaxed text-slate-500 md:text-[15px]">
                  {currentDescription}
                </p>
                {currentBullets && currentBullets.length > 0 && (
                  <ul className="list-disc space-y-1.5 pl-4 text-sm font-medium leading-relaxed text-slate-600 marker:text-[#1E3A8A] md:space-y-2">
                    {currentBullets.map((line, idx) => (
                      <li key={idx}>{line}</li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-blue-900/15 transition-all hover:bg-blue-900 active:scale-[0.98] md:h-12 md:text-base"
                >
                  {currentStep === stepCount - 1 ? t("finish") : t("next")}
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                {currentStep < stepCount - 1 && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900"
                  >
                    {t("skip")}
                  </button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
