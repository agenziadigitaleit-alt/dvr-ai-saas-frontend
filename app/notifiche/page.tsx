'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, ArrowLeft, LogOut, Bell, CheckCircle, AlertTriangle,
  XCircle, Mail, RefreshCw, Settings, Play,
} from 'lucide-react';
import { getNotifiche, getConfigNotifiche, testNotifiche, Notifica } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const TIPO_CFG = {
  scadenza_immediata: { label: 'Scadenza immediata', color: 'text-red-400',    icon: AlertTriangle },
  reminder_7gg:       { label: 'Scade entro 7 giorni', color: 'text-orange-400', icon: Bell },
  reminder_30gg:      { label: 'Scade entro 30 giorni', color: 'text-yellow-400', icon: Bell },
  digest_settimanale: { label: 'Digest settimanale', color: 'text-blue-400',    icon: Mail },
} as const;

const STATO_CFG = {
  inviata: { label: 'Inviata',  color: 'text-green-400',  icon: CheckCircle },
  fallita: { label: 'Fallita',  color: 'text-red-400',    icon: XCircle },
  saltata: { label: 'Saltata',  color: 'text-slate-500',  icon: Bell },
} as const;

export default function NotifichePage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [notifiche, setNotifiche] = useState<Notifica[]>([]);
  const [config, setConfig] = useState<{ smtp_configurato: boolean; smtp_host?: string; smtp_user?: string; scheduler_attivo: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [testRunning, setTestRunning] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  async function load() {
    const [nn, cfg] = await Promise.all([
      getNotifiche(100).catch(() => [] as Notifica[]),
      user?.ruolo === 'platform_admin' ? getConfigNotifiche().catch(() => null) : Promise.resolve(null),
    ]);
    setNotifiche(nn);
    setConfig(cfg);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleTest() {
    setTestRunning(true);
    setTestMsg(null);
    try {
      const r = await testNotifiche();
      setTestMsg(r.messaggio);
      await load();
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : 'Errore');
    } finally {
      setTestRunning(false);
    }
  }

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
          <span className="text-slate-300 font-semibold flex items-center gap-1.5">
            <Bell size={16} /> Notifiche
          </span>
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-white transition-colors">
          <LogOut size={18} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Config SMTP — solo superadmin */}
        {user?.ruolo === 'platform_admin' && config && (
          <div className={`border rounded-2xl p-5 mb-6 ${config.smtp_configurato ? 'bg-green-900/20 border-green-700' : 'bg-orange-900/20 border-orange-700'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Settings size={16} className={config.smtp_configurato ? 'text-green-400' : 'text-orange-400'} />
                  <span className="font-semibold text-sm">
                    {config.smtp_configurato ? 'SMTP configurato' : 'SMTP non configurato'}
                  </span>
                </div>
                {config.smtp_configurato ? (
                  <p className="text-xs text-slate-400">
                    {config.smtp_user} via {config.smtp_host} · Scheduler: {config.scheduler_attivo ? 'attivo' : 'inattivo'}
                  </p>
                ) : (
                  <p className="text-xs text-orange-400">
                    Aggiungi SMTP_USER e SMTP_PASSWORD al file .env sul server per abilitare le email.
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTest}
                  disabled={testRunning}
                  className="flex items-center gap-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  {testRunning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                  Testa ora
                </button>
              </div>
            </div>
            {testMsg && (
              <p className="mt-2 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-lg">{testMsg}</p>
            )}
            {!config.smtp_configurato && (
              <div className="mt-3 bg-slate-800/60 rounded-xl p-3 text-xs text-slate-400 font-mono">
                <p className="text-slate-300 font-sans font-medium mb-1">Da aggiungere a /var/www/dvr-saas/backend/.env:</p>
                <p>SMTP_HOST=smtp.gmail.com</p>
                <p>SMTP_PORT=465</p>
                <p>SMTP_USER=tua@email.com</p>
                <p>SMTP_PASSWORD=xxxx-xxxx-xxxx-xxxx  # App Password Gmail</p>
                <p>EMAIL_FROM=Safety SaaS &lt;tua@email.com&gt;</p>
              </div>
            )}
          </div>
        )}

        {/* Log notifiche */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-200">Storico notifiche</h2>
          <button onClick={() => load()} className="text-slate-500 hover:text-white transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {notifiche.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Bell size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nessuna notifica ancora.</p>
            <p className="text-xs mt-1">Le notifiche vengono generate ogni giorno alle 08:00.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifiche.map(n => {
              const tipoCfg = TIPO_CFG[n.tipo] || TIPO_CFG.reminder_30gg;
              const statoCfg = STATO_CFG[n.stato] || STATO_CFG.saltata;
              const TipoIcon = tipoCfg.icon;
              const StatoIcon = statoCfg.icon;
              return (
                <div key={n.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <TipoIcon size={18} className={`${tipoCfg.color} shrink-0 mt-0.5`} />
                      <div className="min-w-0">
                        <div className="text-sm text-white font-medium truncate">{n.oggetto || tipoCfg.label}</div>
                        {n.destinatario_email && (
                          <div className="text-xs text-slate-500 mt-0.5">→ {n.destinatario_email}</div>
                        )}
                        {n.n_scadenze > 0 && (
                          <div className="text-xs text-slate-500">{n.n_scadenze} scadenz{n.n_scadenze === 1 ? 'a' : 'e'}</div>
                        )}
                        {n.errore && (
                          <div className="text-xs text-red-400 mt-0.5 truncate">{n.errore}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`flex items-center gap-1 text-xs ${statoCfg.color}`}>
                        <StatoIcon size={12} />
                        {statoCfg.label}
                      </div>
                      {n.created_at && (
                        <div className="text-xs text-slate-600 mt-0.5">
                          {new Date(n.created_at).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
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
