'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, Loader2, RefreshCw } from 'lucide-react';
import clsx from 'clsx';
import { STEPS } from './stepConfig';
import { aggiornaDVRParziale } from '@/lib/api';

// ── helpers ──────────────────────────────────────────────────────────────────

function getSessionId() {
  try { return sessionStorage.getItem('sessione_id') ?? ''; } catch { return ''; }
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function saveStep(sessionId: string, step: number, data: Record<string, unknown>) {
  if (!sessionId) return;
  await fetch(`/api/proxy/wizard/sessione/${sessionId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ step, data }),
  });
}

// ── sub-components ────────────────────────────────────────────────────────────

function ArrayField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2 mb-2">
        <input
          className="input-base flex-1"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onChange([...value, input.trim()]); setInput(''); e.preventDefault(); } }}
          placeholder="Digita e premi Invio"
        />
        <button type="button" onClick={() => { if (input.trim()) { onChange([...value, input.trim()]); setInput(''); } }}
          className="btn-secondary px-3">
          <Plus size={16} />
        </button>
      </div>
      <ul className="space-y-1">
        {value.map((item, i) => (
          <li key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <span>{item}</span>
            <button type="button" onClick={() => onChange(value.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryCard({ step, label, data }: { step: number; label: string; data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button type="button" className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
        onClick={() => setOpen(o => !o)}>
        <span className="font-medium text-sm">Step {step} — {label}</span>
        <span className="text-slate-400 text-lg">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="px-4 py-3 text-sm text-slate-600 space-y-1 bg-white">
          {Object.entries(data).length === 0
            ? <span className="text-slate-400 italic">Nessun dato</span>
            : Object.entries(data).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-slate-500 min-w-[160px]">{k}:</span>
                <span className="font-medium">{Array.isArray(v) ? v.join(', ') : String(v ?? '—')}</span>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function StepPage() {
  const params = useParams();
  const router = useRouter();
  const stepNum = parseInt(String(params?.step ?? '1'), 10);
  const config = STEPS[stepNum];

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [allData, setAllData] = useState<Record<number, Record<string, unknown>>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<{ titolo: string; n: number; totale: number } | null>(null);
  const [existingDvrId, setExistingDvrId] = useState<string | null>(null);
  const [stepsModificati, setStepsModificati] = useState<string[]>([]);
  const [dichiarazioneAccettata, setDichiarazioneAccettata] = useState(false);
  const [dataRegolarizzazione, setDataRegolarizzazione] = useState('');

  // Calcolo adempimenti aperti (basato su allData, disponibile nelle callback)
  const adempimentiAperti = useMemo<string[]>(() => {
    if (stepNum !== 13) return [];
    const s08 = (allData[8] ?? {}) as Record<string, unknown>;
    const s09 = (allData[9] ?? {}) as Record<string, unknown>;
    const s10 = (allData[10] ?? {}) as Record<string, unknown>;
    const items: string[] = [];
    if (s08.sorveglianza_sanitaria === false) items.push('Sorveglianza sanitaria — visite mediche obbligatorie non ancora effettuate (art. 41 D.Lgs. 81/08)');
    if (s09.formazione_effettuata === false) items.push('Formazione sicurezza lavoratori non ancora completata (art. 36-37 D.Lgs. 81/08)');
    if (s09.piano_emergenza === false) items.push('Piano di emergenza ed evacuazione non ancora adottato (art. 43 D.Lgs. 81/08)');
    if (s09.estintori_certificati === false) items.push('Estintori non ancora verificati/certificati (D.M. 10/03/1998)');
    if (s10.duvri_necessario === true) items.push('DUVRI (Documento Unico Valutazione Rischi Interferenziali) da redigere con appaltatori (art. 26 D.Lgs. 81/08)');
    return items;
  }, [stepNum, allData]);
  const hasDichiarazioneCalc = adempimentiAperti.length > 0;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted data
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('wizard_data');
      if (raw) {
        const parsed = JSON.parse(raw) as Record<number, Record<string, unknown>>;
        setAllData(parsed);
        setFormData(parsed[stepNum] ?? {});
      }
    } catch { /* ignore */ }
  }, [stepNum]);

  // Detecta DVR esistente e step modificati (solo step 13)
  useEffect(() => {
    if (stepNum !== 13) return;
    try {
      const dvrId = sessionStorage.getItem('dvr_id');
      setExistingDvrId(dvrId);
      if (!dvrId) return;
      // Confronta wizard_data corrente con snapshot salvato al momento della generazione
      const rawSnapshot = sessionStorage.getItem('wizard_data_snapshot');
      const rawCurrent = sessionStorage.getItem('wizard_data');
      if (!rawSnapshot || !rawCurrent) return;
      const snapshot = JSON.parse(rawSnapshot) as Record<number, Record<string, unknown>>;
      const current = JSON.parse(rawCurrent) as Record<number, Record<string, unknown>>;
      const modificati: string[] = [];
      for (let s = 1; s <= 12; s++) {
        const snap = JSON.stringify(snapshot[s] ?? {});
        const curr = JSON.stringify(current[s] ?? {});
        if (snap !== curr) modificati.push(`step${String(s).padStart(2, '0')}`);
      }
      setStepsModificati(modificati);
    } catch { /* ignore */ }
  }, [stepNum, allData]);

  const set = useCallback((key: string, val: unknown) => {
    setFormData(prev => {
      const next = { ...prev, [key]: val };
      // debounced autosave
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const sessionId = getSessionId();
        saveStep(sessionId, stepNum, next).catch(() => {});
        // persist in sessionStorage
        try {
          const raw = sessionStorage.getItem('wizard_data');
          const all = raw ? JSON.parse(raw) as Record<number, Record<string, unknown>> : {};
          all[stepNum] = next;
          sessionStorage.setItem('wizard_data', JSON.stringify(all));
        } catch { /* ignore */ }
      }, 800);
      return next;
    });
  }, [stepNum]);

  const validate = useCallback(() => {
    const errs: string[] = [];
    config?.fields.forEach(f => {
      if (f.required) {
        const v = formData[f.key];
        if (!v || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0)) {
          errs.push(`"${f.label}" è obbligatorio`);
        }
      }
    });
    setErrors(errs);
    return errs.length === 0;
  }, [config, formData]);

  const saveAndAdvance = useCallback(async () => {
    if (!validate()) return;
    const sessionId = getSessionId();
    await saveStep(sessionId, stepNum, formData);
    try {
      const raw = sessionStorage.getItem('wizard_data');
      const all = raw ? JSON.parse(raw) as Record<number, Record<string, unknown>> : {};
      all[stepNum] = formData;
      sessionStorage.setItem('wizard_data', JSON.stringify(all));
    } catch { /* ignore */ }
    router.push(`/wizard/${stepNum + 1}`);
  }, [validate, stepNum, formData, router]);

  const generateDVR = useCallback(async () => {
    setGenerating(true);
    setGenError(null);
    setGenProgress(null);
    let sessionId = getSessionId();

    if (!sessionId) {
      try {
        const initRes = await fetch('/api/proxy/wizard/sessione', { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({}) });
        if (initRes.ok) {
          const d = await initRes.json();
          sessionId = d.sessione_id;
          try { sessionStorage.setItem('sessione_id', sessionId); } catch {}
        }
      } catch {}
    }

    try {
      await saveStep(sessionId, stepNum, formData);

      // Avvia generazione in background
      const bodyPayload: Record<string, unknown> = {};
      if (hasDichiarazioneCalc && dichiarazioneAccettata && dataRegolarizzazione) {
        bodyPayload.dichiarazione_responsabilita = {
          adempimenti_aperti: adempimentiAperti,
          data_regolarizzazione: dataRegolarizzazione,
          accettata: true,
        };
      }
      const res = await fetch(`/api/proxy/dvr/genera/${sessionId}`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });
      if (!res.ok) throw new Error(`Errore avvio generazione: ${res.status}`);
      const { dvr_id: dvrId } = await res.json() as { dvr_id: string };
      if (!dvrId) throw new Error('ID DVR non ricevuto');

      sessionStorage.setItem('dvr_id', dvrId);
      setGenProgress({ titolo: 'Generazione in corso...', n: 1, totale: 4 });

      // Polling ogni 8 secondi
      let tentativi = 0;
      const maxTentativi = 45; // ~6 minuti
      await new Promise<void>((resolve, reject) => {
        const intervallo = setInterval(async () => {
          tentativi++;
          try {
            const r = await fetch(`/api/proxy/dvr/${dvrId}/stato`, { headers: getAuthHeaders() });
            if (!r.ok) return;
            const stato = await r.json() as { stato: string; docx_pronto: boolean; errore?: string };

            if (stato.stato === 'in_coda') {
              setGenProgress({ titolo: 'In coda...', n: 0, totale: 4 });
            } else if (stato.stato === 'in_corso') {
              setGenProgress({ titolo: 'Generazione in corso...', n: 2, totale: 4 });
            } else if (stato.stato === 'completato' && stato.docx_pronto) {
              clearInterval(intervallo);
              resolve();
            } else if (stato.stato === 'errore') {
              clearInterval(intervallo);
              reject(new Error(stato.errore ?? 'Errore generazione DVR'));
            } else if (tentativi >= maxTentativi) {
              clearInterval(intervallo);
              reject(new Error('Timeout: generazione troppo lunga'));
            }
          } catch { /* retry al prossimo tick */ }
        }, 8000);
      });

      // Salva snapshot per rilevare future modifiche
      try { sessionStorage.setItem('wizard_data_snapshot', sessionStorage.getItem('wizard_data') ?? '{}'); } catch {}

      router.push(`/dvr/${dvrId}`);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Errore sconosciuto');
      setGenerating(false);
      setGenProgress(null);
    }
  }, [stepNum, formData, router]);

  const updateDVRParziale = useCallback(async () => {
    if (!existingDvrId || stepsModificati.length === 0) return;
    setGenerating(true);
    setGenError(null);
    setGenProgress({ titolo: 'Preparazione aggiornamento...', n: 1, totale: 3 });

    try {
      // Costruisce wizard_data nel formato atteso dal backend
      const rawData = sessionStorage.getItem('wizard_data');
      const allStepData = rawData ? JSON.parse(rawData) as Record<number, Record<string, unknown>> : {};
      const wizardPayload: Record<string, unknown> = {};
      for (let s = 1; s <= 13; s++) {
        wizardPayload[`step${String(s).padStart(2, '0')}`] = allStepData[s] ?? {};
      }

      setGenProgress({ titolo: 'Rigenero sezioni modificate...', n: 2, totale: 3 });

      await aggiornaDVRParziale(existingDvrId, stepsModificati, wizardPayload);

      // Polling stato
      let tentativi = 0;
      const maxTentativi = 30;
      await new Promise<void>((resolve, reject) => {
        const intervallo = setInterval(async () => {
          tentativi++;
          try {
            const r = await fetch(`/api/proxy/dvr/${existingDvrId}/stato`, {
              headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token') ?? ''}` },
            });
            if (!r.ok) return;
            const stato = await r.json() as { stato: string; docx_pronto: boolean; errore?: string };
            if (stato.stato === 'completato' && stato.docx_pronto) {
              clearInterval(intervallo);
              resolve();
            } else if (stato.stato === 'errore') {
              clearInterval(intervallo);
              reject(new Error(stato.errore ?? 'Errore aggiornamento DVR'));
            } else if (tentativi >= maxTentativi) {
              clearInterval(intervallo);
              reject(new Error('Timeout aggiornamento'));
            }
          } catch { /* retry */ }
        }, 6000);
      });

      // Aggiorna snapshot
      try { sessionStorage.setItem('wizard_data_snapshot', sessionStorage.getItem('wizard_data') ?? '{}'); } catch {}
      setStepsModificati([]);

      router.push(`/dvr/${existingDvrId}`);
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : 'Errore sconosciuto');
      setGenerating(false);
      setGenProgress(null);
    }
  }, [existingDvrId, stepsModificati, router]);

  // Register callbacks for layout footer buttons
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__wizardSaveAndAdvance = saveAndAdvance;
    (window as unknown as Record<string, unknown>).__wizardGenerateDVR = generateDVR;
    (window as unknown as Record<string, unknown>).__wizardUpdateDVR = updateDVRParziale;
    // Esponi stato per il layout
    (window as unknown as Record<string, unknown>).__wizardExistingDvrId = existingDvrId;
    (window as unknown as Record<string, unknown>).__wizardStepsModificati = stepsModificati;
    window.dispatchEvent(new CustomEvent('wizard:updatestate', {
      detail: { existingDvrId, stepsModificati }
    }));
    return () => {
      delete (window as unknown as Record<string, unknown>).__wizardSaveAndAdvance;
      delete (window as unknown as Record<string, unknown>).__wizardGenerateDVR;
      delete (window as unknown as Record<string, unknown>).__wizardUpdateDVR;
    };
  }, [saveAndAdvance, generateDVR, updateDVRParziale, existingDvrId, stepsModificati]);

  // Communicate completion status to layout footer (step 13 only)
  useEffect(() => {
    if (stepNum !== 13) return;
    const missing: number[] = [];
    for (let s = 1; s <= 12; s++) {
      const stepCfg = STEPS[s];
      if (!stepCfg) continue;
      const stepData = (allData[s] ?? {}) as Record<string, unknown>;
      const hasMissing = stepCfg.fields.some(f => {
        if (!f.required) return false;
        const v = stepData[f.key];
        return !v || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
      });
      if (hasMissing) missing.push(s);
    }
    window.dispatchEvent(new CustomEvent('wizard:step13ready', { detail: { isComplete: missing.length === 0 } }));
  }, [stepNum, allData]);

  if (!config) return <div className="card text-center text-slate-500">Step non trovato.</div>;

  const renderField = (field: typeof config.fields[0]) => {
    const val = formData[field.key];

    switch (field.type) {
      case 'text':
      case 'number':
      case 'date':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type={field.type}
              className="input-base"
              value={String(val ?? '')}
              maxLength={field.maxLength}
              placeholder={field.placeholder}
              onChange={e => set(field.key, field.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <textarea
              className="input-base min-h-[120px] resize-y"
              value={String(val ?? '')}
              placeholder={field.placeholder}
              onChange={e => set(field.key, e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {field.label} {field.required && <span className="text-red-500">*</span>}
            </label>
            <select className="input-base bg-white" value={String(val ?? '')} onChange={e => set(field.key, e.target.value)}>
              <option value="">— seleziona —</option>
              {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        );

      case 'checkbox':
        return (
          <div key={field.key} className="flex items-center gap-3">
            <input
              id={field.key}
              type="checkbox"
              checked={Boolean(val)}
              onChange={e => set(field.key, e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={field.key} className="text-sm font-medium text-slate-700">{field.label}</label>
          </div>
        );

      case 'radio':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-2">{field.label}</label>
            <div className="flex flex-wrap gap-3">
              {field.options?.map(opt => (
                <label key={opt} className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors text-sm',
                  val === opt ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-slate-200 hover:bg-slate-50'
                )}>
                  <input type="radio" name={field.key} value={opt} checked={val === opt} onChange={() => set(field.key, opt)} className="sr-only" />
                  {opt}
                </label>
              ))}
            </div>
          </div>
        );

      case 'multicheckbox':
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-2">{field.label}</label>
            <div className="space-y-2">
              {field.options?.map(opt => {
                const arr = Array.isArray(val) ? val as string[] : [];
                const checked = arr.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={checked}
                      onChange={() => set(field.key, checked ? arr.filter(x => x !== opt) : [...arr, opt])}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                    <span className="text-sm text-slate-700">{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'array':
        return (
          <ArrayField
            key={field.key}
            label={field.label}
            value={Array.isArray(val) ? val as string[] : []}
            onChange={v => set(field.key, v)}
          />
        );

      case 'logo': {
        const logoVal = typeof val === 'string' ? val : '';
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
            <div className="flex flex-col gap-3">
              {logoVal ? (
                <div className="relative inline-flex items-center gap-3">
                  <img src={logoVal} alt="Logo aziendale" className="h-20 max-w-[200px] object-contain border border-slate-200 rounded-lg p-2 bg-white" />
                  <button type="button" onClick={() => set(field.key, '')}
                    className="text-red-400 hover:text-red-600 flex items-center gap-1 text-sm">
                    <Trash2 size={14} /> Rimuovi
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                  <p className="text-slate-400 text-sm mb-3">Nessun logo caricato — verrà usata una filigrana di default</p>
                  <label className="cursor-pointer btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2">
                    <Plus size={15} /> Carica logo (PNG / JPG, max 2 MB)
                    <input type="file" accept="image/png,image/jpeg" className="sr-only"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 2 * 1024 * 1024) { alert('File troppo grande (max 2 MB)'); return; }
                        const reader = new FileReader();
                        reader.onload = ev => set(field.key, ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'planimetria': {
        const planVal = typeof val === 'string' ? val : '';
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{field.label}</label>
            <div className="flex flex-col gap-3">
              {planVal ? (
                <div className="flex flex-col gap-2">
                  <img src={planVal} alt="Planimetria" className="max-h-64 max-w-full object-contain border border-slate-200 rounded-xl p-2 bg-white" />
                  <button type="button" onClick={() => set(field.key, '')}
                    className="self-start text-red-400 hover:text-red-600 flex items-center gap-1 text-sm">
                    <Trash2 size={14} /> Rimuovi planimetria
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50">
                  <p className="text-slate-500 text-sm mb-1 font-medium">Nessuna planimetria caricata</p>
                  <p className="text-slate-400 text-xs mb-3">Se disponibile, verrà inserita nella sezione "Layout Emergenza" del DVR</p>
                  <label className="cursor-pointer btn-secondary inline-flex items-center gap-2 text-sm px-4 py-2">
                    <Plus size={15} /> Carica planimetria (PNG / JPG / PDF, max 10 MB)
                    <input type="file" accept="image/png,image/jpeg,image/jpg,application/pdf" className="sr-only"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 10 * 1024 * 1024) { alert('File troppo grande (max 10 MB)'); return; }
                        if (file.type === 'application/pdf') {
                          alert('Per i PDF: converti prima in immagine (PNG/JPG) e ricarica.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = ev => set(field.key, ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  // Step 13: summary + generate button
  if (stepNum === 13) {
    // Compute missing required fields across all steps
    const missingByStep: { step: number; title: string; fields: string[] }[] = [];
    for (let s = 1; s <= 12; s++) {
      const stepCfg = STEPS[s];
      if (!stepCfg) continue;
      const stepData = (allData[s] ?? {}) as Record<string, unknown>;
      const missing = stepCfg.fields
        .filter(f => {
          if (!f.required) return false;
          const v = stepData[f.key];
          return !v || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && v.length === 0);
        })
        .map(f => f.label);
      if (missing.length > 0) missingByStep.push({ step: s, title: stepCfg.title, fields: missing });
    }
    const isComplete = missingByStep.length === 0;

    // Usa variabili calcolate con useMemo (disponibili nello scope del componente)
    const hasDichiarazione = hasDichiarazioneCalc;
    // La generazione è abilitata solo se: form completo E (nessun adempimento aperto O dichiarazione accettata con data)
    const canGenerate = isComplete && (!hasDichiarazione || (dichiarazioneAccettata && dataRegolarizzazione.trim() !== ''));

    return (
      <div className="space-y-4">
        <div className="card">
          <h2 className="text-xl font-bold mb-1">{config.title}</h2>
          <p className="text-slate-500 text-sm mb-4">{config.description}</p>
          <div className="space-y-3">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(s => (
              <SummaryCard
                key={s}
                step={s}
                label={STEPS[s]?.title ?? `Step ${s}`}
                data={(allData[s] ?? {}) as Record<string, unknown>}
              />
            ))}
          </div>
        </div>

        {!isComplete && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800">
            <p className="font-semibold mb-2">⚠️ Completa i campi obbligatori prima di generare il DVR:</p>
            <ul className="space-y-1 list-disc list-inside">
              {missingByStep.map(({ step: s, title, fields }) => (
                <li key={s}>
                  <button
                    onClick={() => router.push(`/wizard/${s}`)}
                    className="underline hover:text-amber-900 font-medium"
                  >
                    Step {s} — {title}
                  </button>
                  : {fields.join(', ')}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Dichiarazione responsabilità per adempimenti non ancora attuati */}
        {hasDichiarazione && (
          <div className="bg-red-50 border border-red-300 rounded-xl px-5 py-5 text-sm">
            <div className="flex items-start gap-3 mb-4">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-bold text-red-800 text-base mb-1">Adempimenti obbligatori non ancora attuati</p>
                <p className="text-red-700">
                  Sono stati rilevati obblighi di legge non ancora adempiuti. Prima di procedere con la generazione del DVR,
                  il Datore di Lavoro deve sottoscrivere la dichiarazione di assunzione di responsabilità.
                </p>
              </div>
            </div>

            <ul className="space-y-2 mb-5">
              {adempimentiAperti.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-red-800">
                  <span className="mt-0.5 text-red-500 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="bg-white border border-red-200 rounded-xl p-4 space-y-4">
              <p className="font-semibold text-slate-700 text-sm">
                Dichiarazione del Datore di Lavoro — art. 17 e art. 55 D.Lgs. 81/08
              </p>
              <p className="text-slate-600 text-xs leading-relaxed">
                Il sottoscritto Datore di Lavoro, consapevole delle responsabilità civili (art. 2087 c.c.) e penali
                (art. 55 D.Lgs. 81/08, art. 589-590 c.p.) derivanti dalla mancata attuazione degli adempimenti
                sopra indicati, dichiara di voler procedere alla redazione del DVR pur in presenza di tali
                inadempimenti e si impegna formalmente a regolarizzare la propria posizione entro la data indicata.
              </p>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Data entro cui ci si impegna a regolarizzare <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={dataRegolarizzazione}
                  onChange={e => setDataRegolarizzazione(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input-base w-48 text-sm"
                />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dichiarazioneAccettata}
                  onChange={e => setDichiarazioneAccettata(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 text-red-600 focus:ring-red-500 shrink-0"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  <strong>Dichiaro</strong> di essere consapevole degli obblighi di legge non ancora adempiuti,
                  mi assumo la piena responsabilità civile e penale per il periodo di inadempimento e mi impegno
                  a regolarizzare la mia posizione entro la data indicata. Questa dichiarazione sarà inclusa
                  nel DVR come allegato firmato.
                </span>
              </label>
              {hasDichiarazione && dichiarazioneAccettata && !dataRegolarizzazione && (
                <p className="text-xs text-red-600">Inserisci la data di regolarizzazione per procedere.</p>
              )}
            </div>
          </div>
        )}

        <div className="card text-center">
          <p className="text-slate-600 mb-4">
            {isComplete
              ? 'Tutto pronto? Clicca il bottone per generare il DVR con l\'intelligenza artificiale.'
              : 'Compila tutti i campi obbligatori per abilitare la generazione.'}
          </p>
          <button
            onClick={generateDVR}
            disabled={generating || !canGenerate}
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-lg py-4 px-8 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {generating ? <><Loader2 size={22} className="animate-spin" /> Generazione in corso…</> : '🤖 Genera DVR con AI'}
          </button>

          {generating && genProgress && (
            <div className="mt-6 w-full max-w-md mx-auto">
              <div className="text-sm text-slate-600 mb-2 text-center">
                📝 {genProgress.titolo}
              </div>
              <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{ width: `${(genProgress.n / genProgress.totale) * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 text-center mt-1">
                Sezione {genProgress.n} di {genProgress.totale} — Generazione multi-sezione (~3 min)
              </div>
            </div>
          )}

          {genError && <p className="mt-4 text-red-600 text-sm">{genError}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="card space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">{config.title}</h2>
        <p className="text-slate-500 text-sm">{config.description}</p>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
          <strong>Correggi i seguenti errori:</strong>
          <ul className="mt-1 list-disc list-inside space-y-0.5">
            {errors.map(e => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}

      {config.fields.map(renderField)}
    </div>
  );
}
