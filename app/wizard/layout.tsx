'use client';

import { useParams, useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import clsx from 'clsx';

const TOTAL_STEPS = 13;

export default function WizardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const stepParam = params?.step;
  const currentStep = stepParam ? parseInt(String(stepParam), 10) : 1;
  const progress = (currentStep / TOTAL_STEPS) * 100;

  const [saving, setSaving] = useState(false);
  const [step13Ready, setStep13Ready] = useState(false);
  const [existingDvrId, setExistingDvrId] = useState<string | null>(null);
  const [stepsModificati, setStepsModificati] = useState<string[]>([]);
  const saveRef = useRef<(() => void) | null>(null);

  // Expose a way for step forms to register their save function
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__wizardTriggerSave = () => {
      if (saveRef.current) saveRef.current();
    };
  }, []);

  const goBack = () => {
    if (currentStep > 1) router.push(`/wizard/${currentStep - 1}`);
  };

  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      router.push(`/wizard/${currentStep + 1}`);
    }
  }, [currentStep, router]);

  // Listen for step-level save-and-advance event
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      if (ev.detail?.saving !== undefined) setSaving(ev.detail.saving);
      if (ev.detail?.advance) goNext();
    };
    window.addEventListener('wizard:step', handler);
    return () => window.removeEventListener('wizard:step', handler);
  }, [goNext]);

  // Listen for step 13 completion status
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      setStep13Ready(Boolean(ev.detail?.isComplete));
    };
    window.addEventListener('wizard:step13ready', handler);
    return () => window.removeEventListener('wizard:step13ready', handler);
  }, []);

  // Listen for update state (existing DVR + steps modificati)
  useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      setExistingDvrId(ev.detail?.existingDvrId ?? null);
      setStepsModificati(ev.detail?.stepsModificati ?? []);
    };
    window.addEventListener('wizard:updatestate', handler);
    return () => window.removeEventListener('wizard:updatestate', handler);
  }, []);

  const isWizardStep = /^\/wizard\/\d+$/.test(pathname ?? '');
  if (!isWizardStep) return <>{children}</>;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Fixed header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <span className="font-bold text-blue-600 text-lg mr-2">DVR AI</span>
          <div className="flex-1">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span className="font-medium">Step {currentStep} di {TOTAL_STEPS}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          {saving && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <span className="animate-spin rounded-full h-3 w-3 border border-slate-400 border-t-transparent" />
              Salvataggio…
            </span>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 py-8 px-4">
        <div className="max-w-[720px] mx-auto">
          {children}
        </div>
      </main>

      {/* Footer nav */}
      <footer className="bg-white border-t border-slate-200 px-4 py-4 sticky bottom-0">
        <div className="max-w-[720px] mx-auto flex justify-between items-center">
          <button
            onClick={goBack}
            disabled={currentStep === 1}
            className={clsx(
              'flex items-center gap-2 font-medium py-2 px-5 rounded-lg border transition-colors',
              currentStep === 1
                ? 'text-slate-300 border-slate-200 cursor-not-allowed'
                : 'text-slate-700 border-slate-300 hover:bg-slate-50'
            )}
          >
            <ChevronLeft size={18} /> Indietro
          </button>

          {currentStep < TOTAL_STEPS ? (
            <button
              onClick={() => {
                const fn = (window as unknown as Record<string, unknown>).__wizardSaveAndAdvance;
                if (typeof fn === 'function') (fn as () => void)();
                else goNext();
              }}
              className="flex items-center gap-2 btn-primary"
            >
              Avanti <ChevronRight size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              {/* Pulsante aggiornamento parziale — visibile solo se esiste un DVR e ci sono modifiche */}
              {existingDvrId && stepsModificati.length > 0 && (
                <button
                  onClick={() => {
                    const fn = (window as unknown as Record<string, unknown>).__wizardUpdateDVR;
                    if (typeof fn === 'function') (fn as () => void)();
                  }}
                  disabled={!step13Ready}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title={`Rigenera solo: ${stepsModificati.join(', ')} (10 crediti)`}
                >
                  <RefreshCw size={16} />
                  Aggiorna DVR
                  <span className="text-xs opacity-80 ml-1">(10 cr)</span>
                </button>
              )}
              <button
                onClick={() => {
                  const fn = (window as unknown as Record<string, unknown>).__wizardGenerateDVR;
                  if (typeof fn === 'function') (fn as () => void)();
                }}
                disabled={!step13Ready}
                className="flex items-center gap-2 btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                🤖 {existingDvrId ? 'Rigenera DVR (150 cr)' : 'Genera DVR con AI'}
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
