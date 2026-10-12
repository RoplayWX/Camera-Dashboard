import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Crosshair, CheckCircle2, Shield, Activity, Camera } from 'lucide-react';

interface SystemLoadingScreenProps {
  loadedCount: number;
  isReady: boolean;
  onComplete: () => void;
}

export const SystemLoadingScreen: React.FC<SystemLoadingScreenProps> = ({
  loadedCount,
  isReady,
  onComplete,
}) => {
  const [progress, setProgress] = useState<number>(10);
  const [statusText, setStatusText] = useState<string>('Initializing command core...');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);

  // Progressive loading sequence
  useEffect(() => {
    const minTimer = setTimeout(() => {
      setProgress((p) => Math.max(p, 30));
      setStatusText('Mounting video telemetry decoders & HLS pipeline...');
      setCurrentStep(2);
    }, 350);

    const step2Timer = setTimeout(() => {
      setProgress((p) => Math.max(p, 55));
      setStatusText('Connecting 212 HazCams severe weather tower feeds...');
      setCurrentStep(3);
    }, 750);

    const step3Timer = setTimeout(() => {
      setProgress((p) => Math.max(p, 75));
      setStatusText('Cataloging nationwide camera registry & chaser network...');
      setCurrentStep(4);
    }, 1150);

    return () => {
      clearTimeout(minTimer);
      clearTimeout(step2Timer);
      clearTimeout(step3Timer);
    };
  }, []);

  // Sync progress with loadedCount when available
  useEffect(() => {
    if (loadedCount > 1000) {
      const calculated = Math.min(90, Math.max(40, Math.round((loadedCount / 42000) * 85)));
      setProgress((p) => Math.max(p, calculated));
    }
  }, [loadedCount]);

  // Handle completion when everything is ready
  useEffect(() => {
    if (isReady && !isDismissing) {
      setProgress(100);
      setStatusText('All surveillance feeds synchronized • System ready');
      setCurrentStep(5);

      const dismissTimer = setTimeout(() => {
        setIsDismissing(true);
        const completeTimer = setTimeout(() => {
          onComplete();
        }, 500);
        return () => clearTimeout(completeTimer);
      }, 650);

      return () => clearTimeout(dismissTimer);
    }
  }, [isReady, isDismissing, onComplete]);

  return (
    <AnimatePresence>
      {!isDismissing && (
        <motion.div
          key="system-loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#000000] text-white select-none overflow-hidden"
        >
          {/* Subtle Ambient Radar Glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-emerald-500/10 rounded-full blur-2xl" />
          </div>

          {/* Grid pattern overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
            }}
          />

          {/* Center Card */}
          <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center text-center">
            {/* Radar / Crosshair Emblem */}
            <div className="relative w-24 h-24 mb-7 flex items-center justify-center">
              {/* Spinning outer scanner ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 rounded-full border border-dashed border-blue-500/40"
              />
              {/* Secondary pulse ring */}
              <motion.div
                animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.7, 0.3] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-2 rounded-full border border-emerald-500/30"
              />
              {/* Core Icon Badge */}
              <div className="relative w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-700/80 shadow-2xl flex items-center justify-center">
                <Camera className="w-7 h-7 text-blue-400" />
                <motion.span
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black"
                />
              </div>
            </div>

            {/* Title & Tagline */}
            <div className="space-y-1.5 mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[10px] uppercase font-bold tracking-widest text-neutral-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping inline-block" />
                <span>COMMAND MONITORING DASHBOARD</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white uppercase font-sans">
                INITIALIZING ASSETS...
              </h1>
              <p className="text-xs text-neutral-400 font-mono">
                {statusText}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-neutral-900 rounded-full h-2.5 p-0.5 border border-neutral-800 mb-3 shadow-inner overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 shadow-[0_0_12px_rgba(59,130,246,0.6)]"
                initial={{ width: '10%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              />
            </div>

            {/* Sub-status & Counter */}
            <div className="w-full flex items-center justify-between text-[11px] text-neutral-400 font-mono mb-7">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-blue-400 animate-pulse" />
                <span>INDEXING NODES</span>
              </span>
              <span className="font-bold text-neutral-200">
                {loadedCount > 0 ? `${loadedCount.toLocaleString()}+ CAMS` : 'CONNECTING...'}
              </span>
              <span className="font-bold text-blue-400">{progress}%</span>
            </div>

            {/* Checklist items */}
            <div className="w-full grid grid-cols-2 gap-2 text-left">
              <div
                className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 transition-all ${
                  currentStep >= 1
                    ? 'bg-neutral-900/70 border-neutral-800 text-neutral-300'
                    : 'bg-neutral-950/40 border-neutral-900 text-neutral-600'
                }`}
              >
                {currentStep >= 2 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Activity className="w-3.5 h-3.5 text-blue-400 animate-spin shrink-0" />
                )}
                <span className="truncate">Core Telemetry</span>
              </div>

              <div
                className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 transition-all ${
                  currentStep >= 3
                    ? 'bg-neutral-900/70 border-neutral-800 text-neutral-300'
                    : 'bg-neutral-950/40 border-neutral-900 text-neutral-600'
                }`}
              >
                {currentStep >= 3 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Crosshair className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                )}
                <span className="truncate">HazCams Towers</span>
              </div>

              <div
                className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 transition-all ${
                  currentStep >= 4
                    ? 'bg-neutral-900/70 border-neutral-800 text-neutral-300'
                    : 'bg-neutral-950/40 border-neutral-900 text-neutral-600'
                }`}
              >
                {currentStep >= 4 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Radio className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                )}
                <span className="truncate">Weather Feeds</span>
              </div>

              <div
                className={`p-2 rounded-lg border text-[11px] flex items-center gap-2 transition-all ${
                  currentStep >= 5
                    ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                    : 'bg-neutral-950/40 border-neutral-900 text-neutral-600'
                }`}
              >
                {currentStep >= 5 ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Shield className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                )}
                <span className="truncate">HLS Matrix Ready</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
