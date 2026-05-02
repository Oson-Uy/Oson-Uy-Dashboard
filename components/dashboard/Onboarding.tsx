"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  ChevronRight, 
  X,
  Sparkles,
  Zap,
  ShieldCheck
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

export function Onboarding({ onClose }: OnboardingProps) {
  const t = useTranslations("Dashboard.onboarding");
  const messages = useMessages() as {
    Dashboard?: { onboarding?: { steps?: OnboardingStepCopy[] } };
  };
  const stepsCopy =
    messages.Dashboard?.onboarding?.steps ?? ([] as OnboardingStepCopy[]);
  const [currentStep, setCurrentStep] = useState(0);

  const stepsData = [
    {
      icon: <Sparkles className="h-7 w-7 text-orange-500" />,
      color: "bg-orange-50",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <Building2 className="h-7 w-7 text-blue-500" />,
      color: "bg-blue-50",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <Users className="h-7 w-7 text-emerald-500" />,
      color: "bg-emerald-50",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <Zap className="h-7 w-7 text-purple-500" />,
      color: "bg-purple-50",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <ShieldCheck className="h-7 w-7 text-blue-600" />,
      color: "bg-blue-100",
      image: "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=1000&auto=format&fit=crop"
    }
  ];

  const nextStep = () => {
    if (currentStep < stepsData.length - 1) {
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative flex max-h-[min(92vh,680px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl md:max-h-[85vh] md:flex-row"
      >
        {/* Left Side - Image */}
        <div className="relative h-28 shrink-0 overflow-hidden bg-slate-900 sm:h-32 md:h-auto md:w-2/5 md:min-h-[180px]">
          <AnimatePresence mode="wait">
            <motion.img 
              key={currentStep}
              src={stepsData[currentStep].image}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 w-full h-full object-cover opacity-60"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 z-10 md:bottom-6 md:left-6 md:right-6">
            <div className="mb-3 flex gap-1.5 md:mb-4">
              {stepsData.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-6 bg-white" : "w-1.5 bg-white/30"
                  }`}
                />
              ))}
            </div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-white/60">{t('step')} {currentStep + 1} {t('of')} {stepsData.length}</p>
            <h3 className="line-clamp-2 text-base font-black uppercase italic leading-tight text-white sm:text-lg md:text-xl">
              {currentTitle.split(' ')[0]} <span className="text-orange-500">{currentTitle.split(' ').slice(1).join(' ')}</span>
            </h3>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="relative flex min-h-0 w-full flex-col justify-center overflow-y-auto bg-white p-5 md:w-3/5 md:p-7">
          <button 
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
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-md ${stepsData[currentStep].color}`}>
                {stepsData[currentStep].icon}
              </div>
              
              <div className="space-y-2.5">
                <h2 className="text-xl font-black leading-snug tracking-tight text-[#1E3A8A] md:text-2xl">
                  {currentTitle}
                </h2>
                <p className="text-sm font-medium leading-relaxed text-slate-500 whitespace-pre-line md:text-[15px]">
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
                  onClick={nextStep}
                  className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#1E3A8A] text-sm font-black uppercase tracking-wide text-white shadow-lg shadow-blue-900/15 transition-all hover:bg-blue-900 active:scale-[0.98] md:h-12 md:text-base"
                >
                  {currentStep === stepsData.length - 1 ? t('finish') : t('next')}
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </button>
                {currentStep < stepsData.length - 1 && (
                  <button 
                    onClick={onClose}
                    className="shrink-0 px-3 py-2 text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-slate-900"
                  >
                    {t('skip')}
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
