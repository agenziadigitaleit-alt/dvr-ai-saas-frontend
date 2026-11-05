'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Shield, ArrowLeft, Calendar, FileText, QrCode,
  CheckCircle, AlertTriangle, Clock, Clipboard, LogOut, Plus,
} from 'lucide-react';
import {
  getAzienda, getScadenze, getVerbali, getCompliance,
  completaScadenza, Azienda, Scadenza, Verbale, ComplianceReport,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Tab = 'scadenzario' | 'verbali' | 'compliance' | 'vault';

const STATO_CONFIG = {
  completata: { label: 'Completata', bg: 'bg-green-900/40', border: 'border-green-700', text: 'text-green-300' },
  scaduta:    { label: 'Scaduta',    bg: 'bg-red-900/40',   border: 'border-red-700',   text: 'text-red-300' },
  urgente:    { label: 'Urgente',    bg: 'bg-red-900/40',   border: 'border-red-700',   text: 'text-red-300' },
  in_scadenza:{ label: 'In scadenza',bg: 'bg-orange-900/40',border: 'border-orange-700',text: 'text-orange-300' },
  ok:         { label: 'OK',         bg: 'bg-slate-800',    border: 'border-slate-700', text: 'text-green-400' },
};

export default function AziendaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [azienda, setAzienda] = useState<Azienda | null>(null);
  const [scadenze, setScadenze] = useState<Scadenza[]>([]);
  const [verbali, setVerbali] = useState<Verbale[]>([]);
  const [compliance, setCompliance] = useState<ComplianceReport | null>(null);
  const [tab, setTab] = useState<Tab>('scadenzario');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getAzienda(id),
      getScadenze(id),
      getVerbali(id),
      getCompliance(id),
    ]).then(([az, sc, vb, co]) => {
      setAzienda(az);
      setScadenze(sc);
      setVerbali(vb);
      setCompliance(co);
    }).catch(() => router.push('/dashboard'))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function handleCompleta(scadenzaId: string) {
    await completaScadenza(scadenzaId);
    const updated = await getScadenze(id);
    setScadenze(updated);
  }

  const FRONTEND_URL = typeof window !== 'undefined' ? window.location.origin : '';
  const vaultUrl = azienda?.qr_token ? `${FRONTEND_URL}/vault/${azienda.qr_token}` : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const tabs: { key: Tab; label: string; icon: typeof Calendar }[] = [
    { key: 'scadenzario', label: 'Scadenzario', icon: Calendar },
    { key: 'verbali', label: 'Verbali', icon: FileText },
    { key: 'compliance', label: 'Compliance', icon: Clipboard },
    { key: 'vault', label: 'QR Vault', icon: QrCode },
  ];

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
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-white transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Intestazione azienda */}
        <div className="flex items-start justify-between mb-6">
          <div>
          <h1 className="text-2xl font-bold">{azienda?.ragione_sociale}</h1>
          <div className="flex gap-4 text-slate-400 text-sm mt-1">
            <span>{azienda?.piva || 'P.IVA non inserita'}</span>
            <span>·</span>
            <span>{azienda?.settore || '—'}</span>
            <span>·</span>
            <span>{azienda?.n_dipendenti ?? '—'} dipendenti</span>
          </div>
          </div>
          <button
            onClick={async () => {
              const token = localStorage.getItem('auth_token');
              const res = await fetch(`/api/proxy/wizard/sessione?azienda_id=${id}`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
              });
              if (res.ok) {
                const d = await res.json();
                sessionStorage.setItem('sessione_id', d.sessione_id);
                sessionStorage.setItem('wizard_azienda_id', id);
                router.push('/wizard/1');
              }
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            <Plus size={16} />
            Nuovo DVR
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${
                tab === key
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Icon size={15} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── SCADENZARIO ── */}
        {tab === 'scadenzario' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold">Scadenze compliance</h2>
              <span className="text-slate-400 text-sm">
                {scadenze.filter(s => s.stato === 'scaduta' || s.stato === 'urgente').length} critiche
              </span>
            </div>
            {scadenze.length === 0 && (
              <p className="text-slate-500 text-center py-12">Nessuna scadenza registrata</p>
            )}
            {scadenze.map(s => {
              const cfg = STATO_CONFIG[s.stato] || STATO_CONFIG.ok;
              return (
                <div
                  key={s.id}
                  className={`${cfg.bg} border ${cfg.border} rounded-xl p-4 flex items-center justify-between gap-4`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-white truncate">{s.titolo}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Scadenza: {s.data_scadenza}
                      {!s.completata && (
                        <span className={`ml-2 ${cfg.text}`}>
                          {s.giorni_rimasti < 0
                            ? `scaduta ${Math.abs(s.giorni_rimasti)} giorni fa`
                            : `${s.giorni_rimasti} giorni rimasti`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text} border ${cfg.border}`}>
                      {cfg.label}
                    </span>
                    {!s.completata && (
                      <button
                        onClick={() => handleCompleta(s.id)}
                        className="text-xs bg-slate-700 hover:bg-green-700 text-white px-3 py-1 rounded-lg transition-colors"
                      >
                        Completata
                      </button>
                    )}
                    {s.completata && <CheckCircle size={18} className="text-green-500" />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── VERBALI ── */}
        {tab === 'verbali' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Verbali e documenti</h2>
            </div>
            {verbali.length === 0 ? (
              <p className="text-slate-500 text-center py-12">Nessun verbale ancora</p>
            ) : (
              <div className="space-y-3">
                {verbali.map(v => (
                  <div
                    key={v.id}
                    className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-sm">{v.titolo}</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        {v.tipo} · {new Date(v.data_verbale).toLocaleDateString('it-IT')}
                        {v.nel_vault && <span className="ml-2 text-blue-400">· nel vault</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {v.firmato
                        ? <span className="text-xs text-green-400 flex items-center gap-1"><CheckCircle size={14} /> Firmato</span>
                        : <span className="text-xs text-orange-400 flex items-center gap-1"><Clock size={14} /> Da firmare</span>
                      }
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── COMPLIANCE ── */}
        {tab === 'compliance' && compliance && (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{compliance.totale}</div>
                <div className="text-xs text-slate-400 mt-1">Adempimenti totali</div>
              </div>
              <div className="bg-red-900/30 border border-red-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-300">{compliance.alto_rischio_count}</div>
                <div className="text-xs text-red-400 mt-1">Alta priorità</div>
              </div>
              <div className="bg-orange-900/30 border border-orange-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-orange-300">{compliance.rischio_penale_count}</div>
                <div className="text-xs text-orange-400 mt-1">Rischio penale</div>
              </div>
            </div>

            <div className="space-y-3">
              {compliance.adempimenti.map(a => (
                <div
                  key={a.codice}
                  className={`rounded-xl p-4 border ${
                    a.priorita === 'alta'
                      ? 'bg-red-900/20 border-red-800/60'
                      : 'bg-slate-800 border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium text-sm flex items-center gap-2">
                        {a.rischio_penale && <AlertTriangle size={14} className="text-orange-400 shrink-0" />}
                        {a.titolo}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{a.riferimento}</div>
                      <div className="text-xs text-slate-300 mt-2">{a.descrizione}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
                      a.priorita === 'alta'
                        ? 'bg-red-900/50 text-red-300 border border-red-700'
                        : 'bg-slate-700 text-slate-300'
                    }`}>
                      {a.priorita}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs text-slate-400">
                    Sanzione: <span className="text-yellow-400">{a.sanzione_datore}</span>
                    {a.rischio_penale && (
                      <span className="ml-3 text-orange-400">⚠ Rischio penale</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── VAULT QR ── */}
        {tab === 'vault' && (
          <div className="text-center">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 max-w-sm mx-auto">
              <QrCode size={48} className="text-blue-400 mx-auto mb-4" />
              <h2 className="font-semibold text-lg mb-2">QR Vault Documenti</h2>
              <p className="text-slate-400 text-sm mb-6">
                Questo QR permette agli ispettori di visualizzare i documenti dell&apos;azienda senza login.
              </p>

              {vaultUrl && (
                <>
                  <a
                    href={`/api/proxy/aziende/${id}/qr.png`}
                    target="_blank"
                    className="block bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors mb-3"
                  >
                    Scarica QR Code PNG
                  </a>
                  <a
                    href={vaultUrl}
                    target="_blank"
                    className="block bg-slate-700 hover:bg-slate-600 text-white py-3 px-6 rounded-xl transition-colors text-sm"
                  >
                    Apri vault pubblico
                  </a>
                  <div className="mt-4 bg-slate-900 rounded-lg p-3 text-xs text-slate-400 break-all font-mono">
                    {vaultUrl}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
