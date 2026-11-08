'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ArrowLeft, LogOut, Building2, Users, Wallet, AlertTriangle,
  CheckCircle, ChevronRight, RefreshCw, TrendingUp, FileText, Clock,
} from 'lucide-react';
import { getAdminRiepilogo, AdminRiepilogo, AziendaRiepilogo, UrgenzaAzienda } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const URGENZA_CFG: Record<UrgenzaAzienda, { label: string; color: string; bg: string; border: string; dot: string }> = {
  critica: { label: 'Critica',  color: 'text-red-300',    bg: 'bg-red-900/30',    border: 'border-red-700',    dot: 'bg-red-500' },
  alta:    { label: 'Alta',     color: 'text-orange-300', bg: 'bg-orange-900/30', border: 'border-orange-700', dot: 'bg-orange-500' },
  media:   { label: 'Media',    color: 'text-yellow-300', bg: 'bg-yellow-900/20', border: 'border-yellow-700', dot: 'bg-yellow-500' },
  ok:      { label: 'OK',       color: 'text-green-300',  bg: 'bg-green-900/20',  border: 'border-green-700',  dot: 'bg-green-500' },
};

function StatTile({ icon: Icon, label, value, sub, colorClass }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; colorClass: string;
}) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className={`${colorClass} mb-3`}><Icon size={22} /></div>
      <div className={`text-3xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-slate-400 text-sm mt-0.5">{label}</div>
      {sub && <div className="text-slate-600 text-xs mt-1">{sub}</div>}
    </div>
  );
}

function UrgenzaBadge({ urgenza }: { urgenza: UrgenzaAzienda }) {
  const cfg = URGENZA_CFG[urgenza];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AziendaRow({ az, onClick }: { az: AziendaRiepilogo; onClick: () => void }) {
  const cfg = URGENZA_CFG[az.urgenza];
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-slate-800 border rounded-2xl p-4 hover:border-blue-600 transition-colors group ${
        az.urgenza === 'critica' ? 'border-red-800' : az.urgenza === 'alta' ? 'border-orange-800' : 'border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Info azienda */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white group-hover:text-blue-300 transition-colors truncate">
              {az.ragione_sociale}
            </span>
            <UrgenzaBadge urgenza={az.urgenza} />
          </div>
          <div className="flex gap-3 mt-1 text-xs text-slate-500 flex-wrap">
            {az.settore && <span className="flex items-center gap-1"><Building2 size={11} />{az.settore}</span>}
            {az.n_dipendenti != null && <span className="flex items-center gap-1"><Users size={11} />{az.n_dipendenti} dip.</span>}
            {az.piva && <span>{az.piva}</span>}
          </div>
        </div>

        {/* KPI inline */}
        <div className="flex items-center gap-4 shrink-0">
          {/* Adempimenti */}
          <div className="text-center hidden sm:block">
            <div className={`text-lg font-bold ${az.adempimenti_scaduti > 0 ? 'text-red-400' : az.adempimenti_non_conformi > 0 ? 'text-orange-400' : 'text-green-400'}`}>
              {az.adempimenti_non_conformi}
            </div>
            <div className="text-xs text-slate-600">da sanare</div>
          </div>

          {/* Wallet */}
          <div className="text-center hidden sm:block">
            <div className={`text-lg font-bold ${az.saldo_wallet === 0 ? 'text-red-400' : az.saldo_wallet < 50 ? 'text-orange-400' : 'text-slate-300'}`}>
              {az.saldo_wallet}
            </div>
            <div className="text-xs text-slate-600">crediti</div>
          </div>

          <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
        </div>
      </div>

      {/* Avvisi urgenti visibili */}
      {(az.adempimenti_scaduti > 0 || az.adempimenti_urgenti > 0 || az.saldo_wallet === 0) && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {az.adempimenti_scaduti > 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-900/40 text-red-300 border border-red-800 px-2 py-0.5 rounded-full">
              <AlertTriangle size={10} />
              {az.adempimenti_scaduti} adempiment{az.adempimenti_scaduti === 1 ? 'o' : 'i'} scadut{az.adempimenti_scaduti === 1 ? 'o' : 'i'}
            </span>
          )}
          {az.adempimenti_urgenti > 0 && (
            <span className="flex items-center gap-1 text-xs bg-orange-900/40 text-orange-300 border border-orange-800 px-2 py-0.5 rounded-full">
              <Clock size={10} />
              {az.adempimenti_urgenti} in scadenza entro 30gg
            </span>
          )}
          {az.saldo_wallet === 0 && (
            <span className="flex items-center gap-1 text-xs bg-red-900/40 text-red-300 border border-red-800 px-2 py-0.5 rounded-full">
              <Wallet size={10} />
              Wallet esaurito
            </span>
          )}
        </div>
      )}
    </button>
  );
}

type Filtro = 'tutti' | 'critica' | 'alta' | 'media' | 'ok';

export default function AdminPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [data, setData] = useState<AdminRiepilogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('tutti');
  const [cerca, setCerca] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const r = await getAdminRiepilogo();
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
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!data) return null;

  const aziendeVisibili = data.aziende.filter(az => {
    const matchFiltro = filtro === 'tutti' || az.urgenza === filtro;
    const matchCerca = !cerca || az.ragione_sociale.toLowerCase().includes(cerca.toLowerCase())
      || (az.piva || '').includes(cerca);
    return matchFiltro && matchCerca;
  });

  const countPerFiltro: Record<Filtro, number> = {
    tutti: data.aziende.length,
    critica: data.aziende.filter(a => a.urgenza === 'critica').length,
    alta: data.aziende.filter(a => a.urgenza === 'alta').length,
    media: data.aziende.filter(a => a.urgenza === 'media').length,
    ok: data.aziende.filter(a => a.urgenza === 'ok').length,
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
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
          <span className="text-slate-300 font-semibold">Pannello Studio</span>
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
        {/* Titolo */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Vista aggregata aziende</h1>
          <p className="text-slate-400 text-sm mt-1">
            Riepilogo di tutte le aziende gestite — ordinate per urgenza compliance.
          </p>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatTile
            icon={Building2}
            label="Aziende gestite"
            value={data.totale_aziende}
            colorClass="text-blue-400"
          />
          <StatTile
            icon={Wallet}
            label="Crediti totali"
            value={data.saldo_wallet_totale}
            sub={`€${data.saldo_wallet_totale} equivalenti`}
            colorClass={data.saldo_wallet_totale < 100 ? 'text-orange-400' : 'text-slate-300'}
          />
          <StatTile
            icon={AlertTriangle}
            label="Adempimenti scaduti"
            value={data.adempimenti_scaduti}
            sub="Richiedono azione immediata"
            colorClass={data.adempimenti_scaduti > 0 ? 'text-red-400' : 'text-green-400'}
          />
          <StatTile
            icon={Clock}
            label="In scadenza 30gg"
            value={data.adempimenti_urgenti}
            sub="Da pianificare"
            colorClass={data.adempimenti_urgenti > 0 ? 'text-orange-400' : 'text-green-400'}
          />
        </div>

        {/* Barra filtri + cerca */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {/* Filtri urgenza */}
          <div className="flex gap-1 bg-slate-800 rounded-xl p-1 overflow-x-auto">
            {([
              { key: 'tutti',   label: 'Tutte' },
              { key: 'critica', label: '🔴 Critica' },
              { key: 'alta',    label: '🟠 Alta' },
              { key: 'media',   label: '🟡 Media' },
              { key: 'ok',      label: '🟢 OK' },
            ] as { key: Filtro; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFiltro(key)}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  filtro === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
                {countPerFiltro[key] > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 ${filtro === key ? 'bg-blue-500' : 'bg-slate-700 text-slate-400'}`}>
                    {countPerFiltro[key]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Ricerca */}
          <input
            type="text"
            placeholder="Cerca azienda o P.IVA…"
            value={cerca}
            onChange={e => setCerca(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Lista aziende */}
        {aziendeVisibili.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Building2 size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nessuna azienda corrisponde ai filtri selezionati.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {aziendeVisibili.map(az => (
              <AziendaRow
                key={az.id}
                az={az}
                onClick={() => router.push(`/aziende/${az.id}`)}
              />
            ))}
          </div>
        )}

        {/* Footer azioni rapide */}
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/wallet')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-600 text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors"
          >
            <Wallet size={16} />
            Ricarica wallet
          </button>
          <button
            onClick={() => router.push('/scadenzario')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-blue-600 text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors"
          >
            <FileText size={16} />
            Scadenzario globale
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm text-slate-300 hover:text-white px-4 py-2 rounded-xl transition-colors"
          >
            <TrendingUp size={16} />
            Nuova azienda
          </button>
        </div>
      </main>
    </div>
  );
}
