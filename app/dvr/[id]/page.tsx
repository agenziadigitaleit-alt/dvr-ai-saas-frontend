'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Download, ArrowLeft, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface DvrSection {
  titolo: string;
  contenuto: string;
}

interface BackendDvrResponse {
  dvr_id: string;
  sessione_id: string;
  sezioni: Record<string, unknown>;
  pdf_path?: string;
  created_at: string;
}

interface DvrData {
  id: string;
  ragione_sociale?: string;
  data_generazione?: string;
  sezioni: DvrSection[];
}

const SEZIONE_LABELS: Record<string, string> = {
  introduzione: '1. Introduzione e Quadro Normativo',
  metodologia_valutazione: '2. Metodologia di Valutazione dei Rischi',
  profilo_aziendale: '3. Profilo Aziendale e Organizzazione del Lavoro',
  ambienti_lavoro: '4. Descrizione degli Ambienti di Lavoro',
  attrezzature_impianti: '5. Attrezzature, Impianti e Sostanze',
  identificazione_rischi: '6. Identificazione dei Pericoli e dei Rischi',
  valutazione_rischi: '7. Valutazione dei Rischi — Tabella P×D',
  misure_prevenzione_tecniche: '8. Misure di Prevenzione Tecniche',
  misure_prevenzione_dpi: '9. Dispositivi di Protezione Individuale',
  informazione_formazione: '10. Informazione, Formazione e Addestramento',
  gestione_emergenze: '11. Gestione delle Emergenze',
  sorveglianza_sanitaria: '12. Sorveglianza Sanitaria',
  piano_miglioramento: '13. Piano di Miglioramento',
  conclusioni: '14. Conclusioni e Dichiarazioni',
  allegato_normativa: 'Allegato A — Normativa di Riferimento',
  allegato_schede_dpi: 'Allegato B — Schede Tecniche DPI',
};

interface RiskRow {
  rischio: string; fonte: string; mansioni: string;
  P: number; D: number; R: number; livello: string;
  misure_adottate: string; misure_da_adottare: string;
}

function RiskTable({ rows }: { rows: RiskRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-slate-700 text-white">
            {['Rischio','Fonte','Mansioni','P','D','R','Livello','Misure adottate','Da adottare'].map(h => (
              <th key={h} className="px-2 py-2 text-left border border-slate-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const rv = Number(r.R);
            const cls = rv <= 4 ? 'bg-green-50 text-green-800' : rv <= 9 ? 'bg-amber-50 text-amber-800' : 'bg-red-50 text-red-800';
            return (
              <tr key={i} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                <td className="px-2 py-1.5 border border-slate-200">{r.rischio}</td>
                <td className="px-2 py-1.5 border border-slate-200">{r.fonte}</td>
                <td className="px-2 py-1.5 border border-slate-200">{r.mansioni}</td>
                <td className="px-2 py-1.5 border border-slate-200 text-center font-bold">{r.P}</td>
                <td className="px-2 py-1.5 border border-slate-200 text-center font-bold">{r.D}</td>
                <td className={`px-2 py-1.5 border border-slate-200 text-center font-bold ${cls}`}>{r.R}</td>
                <td className={`px-2 py-1.5 border border-slate-200 font-semibold ${cls}`}>{r.livello}</td>
                <td className="px-2 py-1.5 border border-slate-200">{r.misure_adottate}</td>
                <td className="px-2 py-1.5 border border-slate-200">{r.misure_da_adottare}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function parseSections(raw: Record<string, unknown>): DvrSection[] {
  const ORDER = [
    'introduzione','metodologia_valutazione','profilo_aziendale','ambienti_lavoro',
    'attrezzature_impianti','identificazione_rischi','valutazione_rischi',
    'misure_prevenzione_tecniche','misure_prevenzione_dpi','informazione_formazione',
    'gestione_emergenze','sorveglianza_sanitaria','piano_miglioramento','conclusioni',
    'allegato_normativa','allegato_schede_dpi',
  ];
  const ordered = ORDER.filter(k => raw[k] !== undefined)
    .concat(Object.keys(raw).filter(k => !ORDER.includes(k)));

  return ordered.map(key => {
    const value = raw[key];
    let contenuto: string;
    if (typeof value === 'string') {
      contenuto = value;
    } else if (Array.isArray(value)) {
      contenuto = '__RISK_TABLE__' + JSON.stringify(value);
    } else if (value && typeof value === 'object' && 'contenuto' in value) {
      contenuto = (value as {contenuto: string}).contenuto;
    } else {
      contenuto = JSON.stringify(value, null, 2);
    }
    return { titolo: SEZIONE_LABELS[key] ?? key, contenuto };
  });
}

function AccordionSection({ section, index }: { section: DvrSection; index: number }) {
  const [open, setOpen] = useState(index === 0);
  const isRiskTable = section.contenuto.startsWith('__RISK_TABLE__');
  const riskRows: RiskRow[] = isRiskTable
    ? (() => { try { return JSON.parse(section.contenuto.slice(14)) as RiskRow[]; } catch { return []; } })()
    : [];

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors text-left gap-3"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-semibold text-slate-800">{section.titolo}</span>
        {open ? <ChevronDown size={18} className="text-slate-400 shrink-0" /> : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
      </button>
      {open && (
        <div className="px-5 py-4 bg-white text-slate-700 text-sm leading-relaxed">
          {isRiskTable
            ? <RiskTable rows={riskRows} />
            : <div className="whitespace-pre-wrap">{section.contenuto}</div>}
        </div>
      )}
    </div>
  );
}

export default function DvrPage() {
  const params = useParams();
  const router = useRouter();
  const dvrId = params?.id as string;

  const [dvr, setDvr] = useState<DvrData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    if (!dvrId) return;
    fetch(`/api/proxy/dvr/${dvrId}`)
      .then(r => { if (!r.ok) throw new Error(`Errore ${r.status}`); return r.json(); })
      .then((data: BackendDvrResponse) => {
        setDvr({
          id: data.dvr_id,
          data_generazione: data.created_at?.split('T')[0],
          sezioni: parseSections(data.sezioni ?? {}),
        });
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [dvrId]);

  async function handleDownloadPdf() {
    setPdfLoading(true);
    setPdfError(null);
    try {
      // Generate PDF
      const genRes = await fetch(`/api/proxy/dvr/${dvrId}/pdf`, { method: 'POST' });
      if (!genRes.ok) throw new Error(`Errore generazione PDF: ${genRes.status}`);

      // Download PDF
      const dlRes = await fetch(`/api/proxy/dvr/${dvrId}/pdf`);
      if (!dlRes.ok) throw new Error(`Errore download PDF: ${dlRes.status}`);

      const blob = await dlRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DVR_${dvr?.ragione_sociale ?? dvrId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setPdfError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Caricamento DVR…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="card max-w-md w-full text-center">
          <p className="text-red-600 font-medium mb-4">Errore: {error}</p>
          <button onClick={() => router.push('/')} className="btn-secondary">← Torna alla home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-600 text-lg">DVR AI</span>
            <span className="text-slate-300">|</span>
            <span className="font-semibold text-slate-800 truncate max-w-[200px] md:max-w-none">
              ✅ DVR — {dvr?.ragione_sociale ?? 'Documento generato'}
            </span>
          </div>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 btn-primary text-sm"
          >
            {pdfLoading
              ? <><Loader2 size={16} className="animate-spin" /> Generazione PDF…</>
              : <><Download size={16} /> Scarica PDF</>}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Meta */}
        <div className="card flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs text-slate-500 mb-1">Azienda</div>
            <div className="font-bold text-lg">{dvr?.ragione_sociale ?? '—'}</div>
          </div>
          {dvr?.data_generazione && (
            <div className="text-right">
              <div className="text-xs text-slate-500 mb-1">Data generazione</div>
              <div className="font-medium">{dvr.data_generazione}</div>
            </div>
          )}
        </div>

        {/* PDF error */}
        {pdfError && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {pdfError}
          </div>
        )}

        {/* Sections accordion */}
        <div className="space-y-3">
          {dvr?.sezioni?.length
            ? dvr.sezioni.map((s, i) => <AccordionSection key={i} section={s} index={i} />)
            : <div className="card text-center text-slate-400">Nessuna sezione disponibile.</div>}
        </div>

        {/* Bottom actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex items-center justify-center gap-2 btn-primary text-base py-3 px-6"
          >
            {pdfLoading ? <><Loader2 size={18} className="animate-spin" /> Generazione PDF…</> : <><Download size={18} /> ⬇ Scarica PDF</>}
          </button>
          <button
            onClick={() => router.push('/')}
            className="flex items-center justify-center gap-2 btn-secondary text-base py-3 px-6"
          >
            <ArrowLeft size={18} /> Nuovo DVR
          </button>
        </div>
      </main>
    </div>
  );
}
