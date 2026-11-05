'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, TrendingUp, Clock, CheckCircle, Euro, LogOut } from 'lucide-react';
import { getProvvigioni } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

interface Provvigione {
  id: string;
  mese: string;
  azienda_id: string;
  importo_abbonamento: number;
  percentuale: number;
  importo_provvigione: number;
  stato: 'in_attesa' | 'pagata' | 'annullata';
}

interface ProvvigioniData {
  totale_in_attesa: number;
  totale_pagato: number;
  provvigioni: Provvigione[];
}

const STATO_LABEL: Record<string, { label: string; cls: string }> = {
  in_attesa: { label: 'In attesa', cls: 'text-yellow-400 bg-yellow-900/30 border-yellow-700' },
  pagata:    { label: 'Pagata',    cls: 'text-green-400 bg-green-900/30 border-green-700' },
  annullata: { label: 'Annullata', cls: 'text-slate-400 bg-slate-800 border-slate-600' },
};

export default function ProvvigioniPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [data, setData] = useState<ProvvigioniData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (user) {
      getProvvigioni(user.user_id)
        .then(d => setData(d as ProvvigioniData))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  // Raggruppa per mese
  const perMese: Record<string, Provvigione[]> = {};
  data?.provvigioni.forEach(p => {
    if (!perMese[p.mese]) perMese[p.mese] = [];
    perMese[p.mese].push(p);
  });
  const mesi = Object.keys(perMese).sort().reverse();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-blue-400">
            <Shield size={22} />
            <span className="font-bold">Safety SaaS</span>
          </div>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-white">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp size={24} className="text-blue-400" />
            Le mie provvigioni
          </h1>
          <p className="text-slate-400 text-sm mt-1">30% su ogni abbonamento PMI gestita</p>
        </div>

        {/* Riepilogo */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-yellow-900/30 border border-yellow-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-yellow-400 text-sm mb-2">
              <Clock size={16} />
              In attesa di pagamento
            </div>
            <div className="text-3xl font-bold text-white">
              €{(data?.totale_in_attesa ?? 0).toFixed(2)}
            </div>
          </div>
          <div className="bg-green-900/30 border border-green-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 text-green-400 text-sm mb-2">
              <CheckCircle size={16} />
              Totale incassato
            </div>
            <div className="text-3xl font-bold text-white">
              €{(data?.totale_pagato ?? 0).toFixed(2)}
            </div>
          </div>
        </div>

        {/* Lista per mese */}
        {mesi.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Euro size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nessuna provvigione registrata ancora</p>
            <p className="text-sm mt-1">Le provvigioni vengono generate mensilmente per ogni PMI gestita</p>
          </div>
        ) : (
          <div className="space-y-6">
            {mesi.map(mese => {
              const voci = perMese[mese];
              const totMese = voci.reduce((s, v) => s + v.importo_provvigione, 0);
              return (
                <div key={mese}>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-semibold text-slate-300">{mese}</h2>
                    <span className="text-sm text-slate-400">Totale: <span className="text-white font-medium">€{totMese.toFixed(2)}</span></span>
                  </div>
                  <div className="space-y-2">
                    {voci.map(p => {
                      const cfg = STATO_LABEL[p.stato] || STATO_LABEL.in_attesa;
                      return (
                        <div
                          key={p.id}
                          className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-300">
                              Azienda <span className="font-mono text-xs text-slate-500">{p.azienda_id.slice(0, 8)}…</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              Abbonamento €{p.importo_abbonamento.toFixed(2)} × {p.percentuale}%
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-white">€{p.importo_provvigione.toFixed(2)}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full border ${cfg.cls}`}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
