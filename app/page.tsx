'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, Clock, FileText } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleNuovoDVR() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/proxy/wizard/sessione', { method: 'POST' });
      if (!res.ok) throw new Error(`Errore server: ${res.status}`);
      const data = await res.json();
      const id = data.sessione_id ?? data.id;
      if (!id) throw new Error('ID sessione non ricevuto');
      sessionStorage.setItem('sessione_id', String(id));
      router.push(`/wizard/1`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Errore sconosciuto';
      setError(msg);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800">
        <span className="font-bold text-xl text-blue-400">DVR AI</span>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-blue-900/50 text-blue-300 text-sm font-medium px-4 py-2 rounded-full mb-8 border border-blue-800">
            <Shield size={14} />
            Conforme D.Lgs 81/08
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            Genera il DVR della tua azienda{' '}
            <span className="text-blue-400">in 15 minuti</span>
          </h1>

          <p className="text-xl text-slate-400 mb-10">
            Wizard guidato + intelligenza artificiale — conforme D.Lgs 81/08
          </p>

          <button
            onClick={handleNuovoDVR}
            disabled={loading}
            className="inline-flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-lg py-4 px-8 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-900/40"
          >
            {loading ? (
              <>
                <span className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                Avvio in corso...
              </>
            ) : (
              <>
                Inizia nuovo DVR
                <ArrowRight size={20} />
              </>
            )}
          </button>

          {error && (
            <div className="mt-6 bg-red-900/40 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Feature pills */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            {[
              { icon: Clock, title: '13 step guidati', desc: 'Raccogliamo tutti i dati necessari in modo semplice' },
              { icon: Shield, title: 'AI generativa', desc: 'Il DVR viene redatto automaticamente da Claude AI' },
              { icon: FileText, title: 'PDF pronto', desc: 'Scarica il documento finito, pronto per la firma' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                <Icon size={22} className="text-blue-400 mb-3" />
                <div className="font-semibold mb-1">{title}</div>
                <div className="text-slate-400 text-sm">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-slate-800 text-center text-slate-500 text-sm">
        DVR AI — Antonio Iovane, Agenzia Digitale
      </footer>
    </div>
  );
}
