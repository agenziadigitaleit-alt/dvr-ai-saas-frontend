'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ArrowLeft, LogOut, Users, Building2, Wallet, TrendingUp,
  RefreshCw, AlertTriangle, CheckCircle, ChevronRight, Euro,
} from 'lucide-react';
import { getSuperadminPanoramica, SuperadminPanoramica, SuperadminUtente } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const RUOLO_LABEL: Record<string, string> = {
  platform_admin: 'Superadmin',
  rspp: 'Consulente / RSPP',
  pmi_admin: 'Titolare PMI',
};

function StatTile({ icon: Icon, label, value, sub, colorClass, onClick }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; colorClass: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-slate-800 border border-slate-700 rounded-2xl p-5 ${onClick ? 'cursor-pointer hover:border-violet-600 transition-colors' : ''}`}
    >
      <div className={`${colorClass} mb-3`}><Icon size={20} /></div>
      <div className={`text-3xl font-bold ${colorClass}`}>{typeof value === 'number' ? value.toLocaleString('it-IT') : value}</div>
      <div className="text-slate-400 text-sm mt-0.5">{label}</div>
      {sub && <div className="text-slate-600 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function UtenteRow({ u, onClick }: { u: SuperadminUtente; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800 border border-slate-700 hover:border-violet-600 rounded-2xl p-4 transition-colors group"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white group-hover:text-violet-300 transition-colors">{u.nome}</span>
            <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">
              {RUOLO_LABEL[u.ruolo] || u.ruolo}
            </span>
          </div>
          <div className="text-slate-500 text-xs mt-0.5">{u.email}</div>
          {u.created_at && (
            <div className="text-slate-600 text-xs mt-0.5">
              Registrato: {new Date(u.created_at).toLocaleDateString('it-IT')}
            </div>
          )}
        </div>
        <div className="flex items-center gap-5 shrink-0">
          <div className="text-center hidden sm:block">
            <div className="text-lg font-bold text-blue-300">{u.n_aziende}</div>
            <div className="text-xs text-slate-600">aziende</div>
          </div>
          <div className="text-center hidden sm:block">
            <div className={`text-lg font-bold ${u.saldo_wallet_totale === 0 ? 'text-red-400' : u.saldo_wallet_totale < 100 ? 'text-orange-400' : 'text-slate-300'}`}>
              {u.saldo_wallet_totale}
            </div>
            <div className="text-xs text-slate-600">crediti</div>
          </div>
          <ChevronRight size={18} className="text-slate-600 group-hover:text-violet-400 transition-colors" />
        </div>
      </div>
      {u.saldo_wallet_totale === 0 && u.n_aziende > 0 && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-300">
          <AlertTriangle size={11} />
          Wallet esaurito — potrebbe non riuscire a generare documenti
        </div>
      )}
    </button>
  );
}

export default function SuperadminPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [data, setData] = useState<SuperadminPanoramica | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cerca, setCerca] = useState('');
  const [filtroRuolo, setFiltroRuolo] = useState<string>('tutti');

  async function load() {
    try {
      const r = await getSuperadminPanoramica();
      setData(r);
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-violet-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const utentiVisibili = data.utenti.filter(u => {
    const matchRuolo = filtroRuolo === 'tutti' || u.ruolo === filtroRuolo;
    const matchCerca = !cerca || u.nome.toLowerCase().includes(cerca.toLowerCase()) || u.email.toLowerCase().includes(cerca.toLowerCase());
    return matchRuolo && matchCerca;
  });

  const utentiConAziende = data.utenti.filter(u => u.n_aziende > 0).length;
  const tasso_compliance = data.adempimenti_conformi + data.adempimenti_non_conformi > 0
    ? Math.round(data.adempimenti_conformi / (data.adempimenti_conformi + data.adempimenti_non_conformi) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 text-violet-400">
            <Shield size={22} />
            <span className="font-bold">Safety SaaS</span>
          </div>
          <span className="text-slate-600">·</span>
          <span className="bg-violet-900/60 text-violet-300 border border-violet-700 text-xs font-bold px-2.5 py-1 rounded-full">
            SUPERADMIN
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-sm hidden sm:block">{user?.nome}</span>
          <button
            onClick={handleRefresh}
            className={`text-slate-400 hover:text-white transition-colors ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={16} />
          </button>
          <button onClick={logout} className="text-slate-400 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Panoramica piattaforma</h1>
          <p className="text-slate-400 text-sm mt-1">Tutti gli utenti, le aziende e i KPI della piattaforma Safety SaaS.</p>
        </div>

        {/* KPI tiles — riga 1: struttura */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <StatTile icon={Users}     label="Utenti registrati"   value={data.utenti_totali}        sub={`${utentiConAziende} con aziende attive`} colorClass="text-violet-400" />
          <StatTile icon={Building2} label="Aziende gestite"     value={data.aziende_totali}       colorClass="text-blue-400" />
          <StatTile icon={Wallet}    label="Crediti in circolo"  value={data.crediti_totali_piattaforma} sub="Saldo aggregato su tutti i wallet" colorClass="text-slate-300" />
          <StatTile icon={Euro}      label="Revenue totale (€)"  value={`€${data.revenue_totale_eur.toLocaleString('it-IT')}`} sub="Da acquisti Stripe" colorClass="text-green-400" />
        </div>

        {/* KPI tiles — riga 2: compliance */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <StatTile icon={AlertTriangle} label="Adempimenti non conformi" value={data.adempimenti_non_conformi} colorClass={data.adempimenti_non_conformi > 0 ? 'text-red-400' : 'text-green-400'} />
          <StatTile icon={CheckCircle}   label="Adempimenti conformi"     value={data.adempimenti_conformi}     colorClass="text-green-400" />
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
            <div className="text-slate-400 text-sm mb-2">Tasso compliance</div>
            <div className={`text-3xl font-bold ${tasso_compliance >= 70 ? 'text-green-400' : tasso_compliance >= 40 ? 'text-orange-400' : 'text-red-400'}`}>
              {tasso_compliance}%
            </div>
            <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${tasso_compliance >= 70 ? 'bg-green-500' : tasso_compliance >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${tasso_compliance}%` }}
              />
            </div>
          </div>
        </div>

        {/* Distribuzione ruoli */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">Distribuzione utenti per ruolo</h2>
          <div className="flex flex-wrap gap-4">
            {Object.entries(data.utenti_per_ruolo).map(([ruolo, count]) => (
              <div key={ruolo} className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{count}</span>
                <span className="text-sm text-slate-400">{RUOLO_LABEL[ruolo] || ruolo}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabella utenti */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-3">Utenti con aziende</h2>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex gap-1 bg-slate-800 rounded-xl p-1">
              {[
                { key: 'tutti', label: 'Tutti' },
                { key: 'rspp', label: 'Consulenti' },
                { key: 'pmi_admin', label: 'Titolari PMI' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFiltroRuolo(key)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                    filtroRuolo === key ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder="Cerca per nome o email…"
              value={cerca}
              onChange={e => setCerca(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          {utentiVisibili.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Users size={36} className="mx-auto mb-2 opacity-30" />
              <p>Nessun utente trovato.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {utentiVisibili.map(u => (
                <UtenteRow
                  key={u.id}
                  u={u}
                  onClick={() => router.push('/admin')}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
