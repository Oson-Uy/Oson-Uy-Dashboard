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
import { useTranslations } from "next-intl";

interface OnboardingProps {
  onClose: () => void;
}

export function Onboarding({ onClose }: OnboardingProps) {
  const t = useTranslations("Dashboard.onboarding");
  const [currentStep, setCurrentStep] = useState(0);

  const stepsData = [
    {
      icon: <Sparkles className="h-12 w-12 text-orange-500" />,
      color: "bg-orange-50",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <Building2 className="h-12 w-12 text-blue-500" />,
      color: "bg-blue-50",
      image: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <Users className="h-12 w-12 text-emerald-500" />,
      color: "bg-emerald-50",
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <Zap className="h-12 w-12 text-purple-500" />,
      color: "bg-purple-50",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1000&auto=format&fit=crop"
    },
    {
      icon: <ShieldCheck className="h-12 w-12 text-blue-600" />,
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

  const currentTitle = t(`steps.${currentStep}.title`);
  const currentDescription = t(`steps.${currentStep}.description`);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px]"
      >
        {/* Left Side - Image */}
        <div className="relative w-full md:w-1/2 overflow-hidden bg-slate-900">
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
          
          <div className="absolute bottom-12 left-12 right-12 z-10">
            <div className="flex gap-2 mb-6">
              {stepsData.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? "w-8 bg-white" : "w-2 bg-white/30"
                  }`}
                />
              ))}
            </div>
            <p className="text-white/60 text-xs font-black uppercase tracking-widest mb-2">{t('step')} {currentStep + 1} {t('of')} {stepsData.length}</p>
            <h3 className="text-white text-3xl font-black italic uppercase leading-none">
              {currentTitle.split(' ')[0]} <span className="text-orange-500">{currentTitle.split(' ').slice(1).join(' ')}</span>
            </h3>
          </div>
        </div>

        {/* Right Side - Content */}
        <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center bg-white relative">
          <button 
            onClick={onClose}
            className="absolute top-8 right-8 p-2 rounded-full hover:bg-slate-50 text-slate-400 hover:text-slate-900 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              <div className={`w-20 h-20 rounded-3xl ${stepsData[currentStep].color} flex items-center justify-center shadow-lg`}>
                {stepsData[currentStep].icon}
              </div>
              
              <div className="space-y-4">
                <h2 className="text-3xl font-black text-[#1E3A8A] leading-tight tracking-tight">
                  {currentTitle}
                </h2>
                <p className="text-lg text-slate-500 font-medium leading-relaxed">
                  {currentDescription}
                </p>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button
                  onClick={nextStep}
                  className="flex-1 h-16 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-900/20 flex items-center justify-center gap-3 transition-all active:scale-[0.98] uppercase tracking-wider"
                >
                  {currentStep === stepsData.length - 1 ? t('finish') : t('next')}
                  <ChevronRight className="h-5 w-5" />
                </button>
                {currentStep < stepsData.length - 1 && (
                  <button 
                    onClick={onClose}
                    className="px-6 h-16 text-slate-400 hover:text-slate-900 font-bold text-sm uppercase tracking-widest"
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
