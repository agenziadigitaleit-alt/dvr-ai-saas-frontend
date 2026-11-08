'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ArrowLeft, AlertTriangle, Clock, CheckCircle,
  Calendar, LogOut, RefreshCw,
} from 'lucide-react';
import {
  getAziende, getScadenzarioCompleto,
  Azienda, VoceScadenzario, UrgenzaScadenza,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const URGENZA_CONFIG: Record<UrgenzaScadenza, {
  label: string; bg: string; border: string; text: string; icon: typeof AlertTriangle;
}> = {
  scaduto: { label: 'Scaduto',  bg: 'bg-red-900/40',    border: 'border-red-700',    text: 'text-red-300',    icon: AlertTriangle },
  critico: { label: 'Critico',  bg: 'bg-orange-900/40', border: 'border-orange-700', text: 'text-orange-300', icon: AlertTriangle },
  urgente: { label: 'Urgente',  bg: 'bg-yellow-900/30', border: 'border-yellow-700', text: 'text-yellow-300', icon: Clock },
  normale: { label: 'Normale',  bg: 'bg-slate-800',     border: 'border-slate-700',  text: 'text-slate-400',  icon: CheckCircle },
};

const TIPO_LABEL: Record<VoceScadenzario['tipo'], string> = {
  adempimento: 'Adempimento',
  visita_medica: 'Visita medica',
  scadenza_legacy: 'Compliance',
};

export default function ScadenzarioPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [aziendaId, setAziendaId] = useState<string>('');
  const [voci, setVoci] = useState<VoceScadenzario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroUrgenza, setFiltroUrgenza] = useState<UrgenzaScadenza | 'tutti'>('tutti');

  useEffect(() => {
    getAziende().then(list => {
      setAziende(list);
      if (list.length > 0) setAziendaId(list[0].id);
    }).catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!aziendaId) return;
    setRefreshing(true);
    getScadenzarioCompleto(aziendaId)
      .then(setVoci)
      .catch(() => setVoci([]))
      .finally(() => setRefreshing(false));
  }, [aziendaId]);

  const vociFiltrate = filtroUrgenza === 'tutti'
    ? voci
    : voci.filter(v => v.urgenza === filtroUrgenza);

  const counts = {
    scaduto: voci.filter(v => v.urgenza === 'scaduto').length,
    critico: voci.filter(v => v.urgenza === 'critico').length,
    urgente: voci.filter(v => v.urgenza === 'urgente').length,
    normale: voci.filter(v => v.urgenza === 'normale').length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

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
          <span className="text-slate-300 font-semibold">Scadenzario</span>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-white transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Selector azienda + refresh */}
        <div className="flex items-center gap-3 mb-6">
          {aziende.length > 1 && (
            <select
              value={aziendaId}
              onChange={e => setAziendaId(e.target.value)}
              className="bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500"
            >
              {aziende.map(az => (
                <option key={az.id} value={az.id}>{az.ragione_sociale}</option>
              ))}
            </select>
          )}
          {aziende.length === 1 && (
            <h1 className="text-xl font-bold">{aziende[0].ragione_sociale}</h1>
          )}
          <button
            onClick={() => { setRefreshing(true); getScadenzarioCompleto(aziendaId).then(setVoci).finally(() => setRefreshing(false)); }}
            className="text-slate-400 hover:text-white transition-colors ml-auto"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {(['scaduto', 'critico', 'urgente', 'normale'] as UrgenzaScadenza[]).map(urg => {
            const cfg = URGENZA_CONFIG[urg];
            return (
              <button
                key={urg}
                onClick={() => setFiltroUrgenza(filtroUrgenza === urg ? 'tutti' : urg)}
                className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 text-center transition-all ${filtroUrgenza === urg ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500' : ''}`}
              >
                <div className={`text-2xl font-bold ${cfg.text}`}>{counts[urg]}</div>
                <div className={`text-xs mt-1 ${cfg.text}`}>{cfg.label}</div>
              </button>
            );
          })}
        </div>

        {/* Filtro attivo badge */}
        {filtroUrgenza !== 'tutti' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-slate-400">Filtro:</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${URGENZA_CONFIG[filtroUrgenza].bg} ${URGENZA_CONFIG[filtroUrgenza].text} ${URGENZA_CONFIG[filtroUrgenza].border}`}>
              {URGENZA_CONFIG[filtroUrgenza].label}
            </span>
            <button onClick={() => setFiltroUrgenza('tutti')} className="text-xs text-slate-500 hover:text-white transition-colors">
              Rimuovi filtro ×
            </button>
          </div>
        )}

        {/* Lista voci */}
        {refreshing ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
          </div>
        ) : vociFiltrate.length === 0 ? (
          <div className="text-center py-16">
            <Calendar size={40} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              {filtroUrgenza === 'tutti' ? 'Nessuna scadenza trovata' : `Nessuna voce con urgenza "${URGENZA_CONFIG[filtroUrgenza].label}"`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {vociFiltrate.map(voce => {
              const cfg = URGENZA_CONFIG[voce.urgenza];
              const Icon = cfg.icon;
              return (
                <div
                  key={`${voce.tipo}-${voce.id}`}
                  className={`${cfg.bg} border ${cfg.border} rounded-xl p-4`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs bg-slate-700 text-slate-400 border border-slate-600 px-1.5 py-0.5 rounded">
                          {TIPO_LABEL[voce.tipo]}
                        </span>
                        {voce.riferimento && (
                          <span className="text-xs text-slate-500 truncate">{voce.riferimento}</span>
                        )}
                      </div>
                      <div className="font-medium text-sm text-white truncate">{voce.titolo}</div>
                      {voce.descrizione && (
                        <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{voce.descrizione}</div>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className={`flex items-center gap-1 justify-end ${cfg.text} text-xs font-medium`}>
                        <Icon size={12} />
                        {cfg.label}
                      </div>
                      {voce.data_scadenza && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          {new Date(voce.data_scadenza).toLocaleDateString('it-IT')}
                        </div>
                      )}
                      {voce.giorni_rimasti != null && (
                        <div className={`text-xs mt-0.5 ${cfg.text}`}>
                          {voce.giorni_rimasti < 0
                            ? `${Math.abs(voce.giorni_rimasti)}gg fa`
                            : voce.giorni_rimasti === 0
                            ? 'oggi'
                            : `${voce.giorni_rimasti}gg`}
                        </div>
                      )}
                    </div>
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
