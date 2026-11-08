'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield, ArrowLeft, LogOut, Wallet, CreditCard, Zap, TrendingDown,
  TrendingUp, RefreshCw, CheckCircle, AlertTriangle, Star,
} from 'lucide-react';
import {
  getAziende, getWallet, getPacchettiCrediti, getPrezziServizi, creaCheckout,
  Azienda, WalletInfo, PacchettoCrediti,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const TX_TIPO_CONFIG = {
  acquisto_online:  { label: 'Acquisto online', color: 'text-green-400', icon: TrendingUp },
  ricarica_admin:   { label: 'Ricarica admin',  color: 'text-blue-400',  icon: TrendingUp },
  consumo_servizio: { label: 'Servizio',         color: 'text-red-400',   icon: TrendingDown },
  rimborso:         { label: 'Rimborso',         color: 'text-green-400', icon: TrendingUp },
} as const;

const SERVIZIO_LABEL: Record<string, string> = {
  dvr_bozza: 'Bozza DVR',
  dvr_rettifica: 'Rettifica DVR',
  piano_emergenza: 'Piano di emergenza',
  verbale_formazione: 'Verbale formazione',
  verbale_informazione: 'Verbale informazione',
  opuscolo_lavoratrici_madri: 'Opuscolo lavoratrici madri',
  traduzione_dvr: 'Traduzione DVR',
  verbale_consegna_dpi: 'Verbale consegna DPI',
  nomina_rspp: 'Nomina RSPP',
  nomina_rls: 'Nomina RLS',
};

function WalletContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, logout } = useAuth();

  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [aziendaId, setAziendaId] = useState('');
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [pacchetti, setPacchetti] = useState<PacchettoCrediti[]>([]);
  const [prezzi, setPrezzi] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [tab, setTab] = useState<'ricarica' | 'storico' | 'listino'>('ricarica');
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (searchParams.get('cancelled')) setCancelled(true);
  }, [searchParams]);

  useEffect(() => {
    Promise.all([getAziende(), getPacchettiCrediti(), getPrezziServizi()])
      .then(([az, pk, pr]) => {
        setAziende(az);
        setPacchetti(pk);
        setPrezzi(pr);
        if (az.length > 0) setAziendaId(az[0].id);
      })
      .catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!aziendaId) return;
    getWallet(aziendaId).then(setWallet).catch(() => setWallet(null));
  }, [aziendaId]);

  async function handleAcquisto(pacchettoId: string) {
    if (!aziendaId) return;
    setPurchasing(pacchettoId);
    try {
      const { checkout_url } = await creaCheckout(aziendaId, pacchettoId);
      window.location.href = checkout_url;
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Errore pagamento');
      setPurchasing(null);
    }
  }

  async function refreshWallet() {
    if (!aziendaId) return;
    const w = await getWallet(aziendaId);
    setWallet(w);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const saldo = wallet?.saldo ?? 0;
  const saldoClass = saldo === 0 ? 'text-red-400' : saldo < 50 ? 'text-orange-400' : 'text-white';

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
          <span className="text-slate-600">·</span>
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Wallet size={16} /> Wallet
          </span>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-white transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Selector azienda */}
        {aziende.length > 1 && (
          <div className="mb-6">
            <select
              value={aziendaId}
              onChange={e => setAziendaId(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {aziende.map(az => <option key={az.id} value={az.id}>{az.ragione_sociale}</option>)}
            </select>
          </div>
        )}

        {/* Avviso annullamento */}
        {cancelled && (
          <div className="bg-orange-900/30 border border-orange-700 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 text-orange-300 text-sm">
            <AlertTriangle size={16} />
            Pagamento annullato. I tuoi crediti non sono stati addebitati.
          </div>
        )}

        {/* Hero saldo */}
        <div className="bg-gradient-to-br from-blue-900/60 to-slate-800 border border-blue-700/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm mb-1">Saldo crediti</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${saldoClass}`}>{saldo}</span>
                <span className="text-slate-400 text-lg">crediti</span>
              </div>
              <p className="text-slate-500 text-xs mt-1">1 credito = 1 €</p>
            </div>
            <div className="text-right">
              <button onClick={refreshWallet} className="text-slate-400 hover:text-white mb-3 block ml-auto">
                <RefreshCw size={16} />
              </button>
              {saldo === 0 && (
                <div className="flex items-center gap-1.5 text-red-400 text-xs">
                  <AlertTriangle size={12} />
                  Saldo esaurito
                </div>
              )}
              {saldo > 0 && saldo < 50 && (
                <div className="flex items-center gap-1.5 text-orange-400 text-xs">
                  <AlertTriangle size={12} />
                  Saldo basso
                </div>
              )}
              {saldo >= 50 && (
                <div className="flex items-center gap-1.5 text-green-400 text-xs">
                  <CheckCircle size={12} />
                  Saldo ok
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6">
          {[
            { key: 'ricarica', label: 'Ricarica' },
            { key: 'storico', label: 'Storico' },
            { key: 'listino', label: 'Prezzi servizi' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`flex-1 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                tab === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── RICARICA ── */}
        {tab === 'ricarica' && (
          <div>
            {/* Piani standard */}
            <p className="text-slate-400 text-sm mb-3">
              Scegli un pacchetto. Il pagamento avviene su Stripe — carta di credito e PayPal.
            </p>
            <div className="space-y-3 mb-8">
              {pacchetti.filter(p => p.tipo === 'standard').map(p => (
                <div
                  key={p.id}
                  className={`relative bg-slate-800 border rounded-2xl p-5 flex items-center justify-between ${
                    p.popolare ? 'border-blue-500' : 'border-slate-700'
                  }`}
                >
                  {p.popolare && (
                    <div className="absolute -top-3 left-4 flex items-center gap-1 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      <Star size={10} />
                      Più scelto
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-white">{p.nome}</div>
                    <div className="text-2xl font-bold text-blue-300 mt-1">
                      {p.crediti}
                      <span className="text-sm font-normal text-slate-400 ml-1">crediti</span>
                    </div>
                    {p.sconto_pct > 0 && (
                      <div className="text-xs text-green-400 mt-0.5">Risparmi il {p.sconto_pct}% rispetto al prezzo base</div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-white mb-2">€{p.prezzo_eur.toFixed(2)}</div>
                    <button
                      onClick={() => handleAcquisto(p.id)}
                      disabled={!!purchasing}
                      className={`flex items-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm transition-colors ${
                        p.popolare ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-white'
                      } disabled:opacity-50`}
                    >
                      <CreditCard size={14} />
                      {purchasing === p.id ? 'Reindirizzamento…' : 'Acquista'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Piani Studio */}
            <div className="border-t border-slate-700 pt-6 mb-6">
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-gradient-to-r from-violet-600 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  PIANO STUDIO
                </div>
                <span className="text-slate-400 text-xs">Per professionisti e studi che gestiscono più aziende clienti</span>
              </div>
              <p className="text-slate-500 text-xs mb-4">
                Consulenti del lavoro, commercialisti, RSPP esterni, studi di consulenza.
                Gestisci ogni cliente con un account dedicato e risparmia fino al 30%.
              </p>
              <div className="space-y-3">
                {pacchetti.filter(p => p.tipo === 'studio').map(p => (
                  <div
                    key={p.id}
                    className={`relative bg-gradient-to-br from-violet-900/40 to-slate-800 border rounded-2xl p-5 flex items-center justify-between ${
                      p.popolare ? 'border-violet-500' : 'border-violet-800/50'
                    }`}
                  >
                    {p.popolare && (
                      <div className="absolute -top-3 left-4 flex items-center gap-1 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                        <Star size={10} />
                        Più scelto dai professionisti
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-white">{p.nome}</div>
                        <div className="bg-green-900/60 text-green-300 text-xs font-bold px-2 py-0.5 rounded-full">
                          -{p.sconto_pct}%
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-violet-300 mt-1">
                        {p.crediti.toLocaleString('it-IT')}
                        <span className="text-sm font-normal text-slate-400 ml-1">crediti</span>
                      </div>
                      {p.note && (
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{p.note}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-slate-500 line-through mb-0.5">
                        €{p.crediti.toLocaleString('it-IT')}
                      </div>
                      <div className="text-xl font-bold text-white mb-2">€{p.prezzo_eur.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</div>
                      <button
                        onClick={() => handleAcquisto(p.id)}
                        disabled={!!purchasing}
                        className="flex items-center gap-2 font-semibold px-4 py-2 rounded-xl text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50"
                      >
                        <CreditCard size={14} />
                        {purchasing === p.id ? 'Reindirizzamento…' : 'Acquista'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-xs text-slate-500">
              <p className="font-medium text-slate-400 mb-1">ℹ️ Come funziona</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>I crediti vengono scalati automaticamente quando usi un servizio AI (DVR, verbali, ecc.)</li>
                <li>Ogni credito vale 1 € — nessun abbonamento, paghi solo quello che usi</li>
                <li>Il pagamento è sicuro via Stripe (PCI-DSS Level 1)</li>
                <li>I crediti non scadono mai</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── STORICO ── */}
        {tab === 'storico' && (
          <div>
            {!wallet?.transazioni?.length ? (
              <div className="text-center py-16">
                <Wallet size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nessuna transazione ancora</p>
              </div>
            ) : (
              <div className="space-y-2">
                {wallet.transazioni.map(tx => {
                  const cfg = TX_TIPO_CONFIG[tx.tipo] || TX_TIPO_CONFIG.consumo_servizio;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={tx.id}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <Icon size={18} className={cfg.color} />
                        <div>
                          <div className="text-sm text-white font-medium">
                            {tx.descrizione || (tx.servizio ? SERVIZIO_LABEL[tx.servizio] || tx.servizio : cfg.label)}
                          </div>
                          <div className="text-xs text-slate-500">
                            {new Date(tx.created_at).toLocaleString('it-IT')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold text-sm ${tx.crediti > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.crediti > 0 ? '+' : ''}{tx.crediti} cr
                        </div>
                        <div className="text-xs text-slate-500">saldo: {tx.saldo_dopo}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── LISTINO PREZZI ── */}
        {tab === 'listino' && (
          <div>
            <p className="text-slate-400 text-sm mb-4">
              Costo in crediti di ogni servizio AI generato dalla piattaforma.
            </p>
            <div className="space-y-2">
              {Object.entries(prezzi).map(([servizio, costo]) => (
                <div
                  key={servizio}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Zap size={16} className="text-blue-400 shrink-0" />
                    <div>
                      <div className="text-sm text-white font-medium">
                        {SERVIZIO_LABEL[servizio] || servizio.replace(/_/g, ' ')}
                      </div>
                      <div className="text-xs text-slate-500">€{costo.toFixed(2)} equivalenti</div>
                    </div>
                  </div>
                  <div className="font-bold text-blue-300 text-sm">{costo} cr</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import { Suspense } from 'react';

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>}>
      <WalletContent />
    </Suspense>
  );
}
