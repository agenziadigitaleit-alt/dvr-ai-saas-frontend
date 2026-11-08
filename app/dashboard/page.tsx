'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Plus, Building2, Users, LogOut, ChevronRight, TrendingUp, Calendar, Wallet, Bell } from 'lucide-react';
import { getAziende, creaAzienda, getWallet, getNotifiche, Azienda } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, logout, loading: authLoading } = useAuth();
  const [aziende, setAziende] = useState<Azienda[]>([]);
  const [saldoWallet, setSaldoWallet] = useState<number | null>(null);
  const [nNotifiche, setNNotifiche] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nuovaRagioneSociale, setNuovaRagioneSociale] = useState('');
  const [nuovaPiva, setNuovaPiva] = useState('');
  const [nuovoSettore, setNuovoSettore] = useState('Uffici');
  const [nuoviDipendenti, setNuoviDipendenti] = useState('1');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      getAziende()
        .then(list => {
          setAziende(list);
          if (list.length > 0) {
            getWallet(list[0].id).then(w => setSaldoWallet(w.saldo)).catch(() => {});
          }
          getNotifiche(5).then(nn => setNNotifiche(nn.filter((n: {stato: string}) => n.stato !== 'saltata').length)).catch(() => {});
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [user]);

  async function handleCreaAzienda(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await creaAzienda({
        ragione_sociale: nuovaRagioneSociale,
        piva: nuovaPiva,
        settore: nuovoSettore,
        n_dipendenti: parseInt(nuoviDipendenti),
      });
      const updated = await getAziende();
      setAziende(updated);
      setShowForm(false);
      setNuovaRagioneSociale('');
      setNuovaPiva('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Errore creazione azienda');
    } finally {
      setCreating(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-blue-400">
          <Shield size={24} />
          <span className="font-bold text-lg">Safety SaaS</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-slate-400 text-sm">{user?.nome}</span>
          <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-full border border-blue-800">
            {user?.ruolo}
          </span>
          <button
            onClick={() => router.push('/wallet')}
            className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-colors ${
              saldoWallet === 0
                ? 'border-red-700 bg-red-900/30 text-red-300 hover:bg-red-900/50'
                : saldoWallet !== null && saldoWallet < 50
                ? 'border-orange-700 bg-orange-900/30 text-orange-300 hover:bg-orange-900/50'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:border-blue-600 hover:text-white'
            }`}
          >
            <Wallet size={14} />
            {saldoWallet !== null ? `${saldoWallet} cr` : 'Wallet'}
          </button>
          <button
            onClick={() => router.push('/scadenzario')}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <Calendar size={16} />
            Scadenzario
          </button>
          {(aziende.length > 1 || user?.ruolo === 'rspp') && (
            <button
              onClick={() => router.push('/admin')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <Building2 size={16} />
              Studio
            </button>
          )}
          {user?.ruolo === 'platform_admin' && (
            <button
              onClick={() => router.push('/superadmin')}
              className="flex items-center gap-1.5 text-sm bg-violet-900/40 text-violet-300 border border-violet-800 hover:bg-violet-800/50 px-2.5 py-1 rounded-lg transition-colors"
            >
              <Shield size={14} />
              Superadmin
            </button>
          )}
          {user?.ruolo === 'rspp' && (
            <button
              onClick={() => router.push('/rspp/provvigioni')}
              className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <TrendingUp size={16} />
              Provvigioni
            </button>
          )}
          <button
            onClick={() => router.push('/notifiche')}
            className="relative text-slate-400 hover:text-white transition-colors"
          >
            <Bell size={18} />
            {nNotifiche > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {nNotifiche > 9 ? '9+' : nNotifiche}
              </span>
            )}
          </button>
          <button onClick={logout} className="text-slate-400 hover:text-white transition-colors">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Titolo + pulsante */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Le tue aziende</h1>
            <p className="text-slate-400 text-sm mt-1">{aziende.length} aziende gestite</p>
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={18} />
            Nuova azienda
          </button>
        </div>

        {/* Form nuova azienda */}
        {showForm && (
          <form
            onSubmit={handleCreaAzienda}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6"
          >
            <h2 className="font-semibold mb-4">Aggiungi azienda</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Ragione sociale *</label>
                <input
                  value={nuovaRagioneSociale}
                  onChange={e => setNuovaRagioneSociale(e.target.value)}
                  required
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">P.IVA</label>
                <input
                  value={nuovaPiva}
                  onChange={e => setNuovaPiva(e.target.value)}
                  placeholder="IT..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Settore</label>
                <select
                  value={nuovoSettore}
                  onChange={e => setNuovoSettore(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {['Uffici', 'Ristorazione', 'Edilizia', 'Artigianato', 'Commercio'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">N. dipendenti</label>
                <input
                  type="number"
                  min="1"
                  value={nuoviDipendenti}
                  onChange={e => setNuoviDipendenti(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={creating}
                className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2 rounded-xl transition-colors disabled:opacity-60"
              >
                {creating ? 'Creazione...' : 'Crea azienda'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-white px-4 py-2 transition-colors"
              >
                Annulla
              </button>
            </div>
          </form>
        )}

        {/* Lista aziende */}
        {aziende.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            <Building2 size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">Nessuna azienda ancora</p>
            <p className="text-sm mt-1">Clicca "Nuova azienda" per iniziare</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aziende.map(az => (
              <button
                key={az.id}
                onClick={() => router.push(`/aziende/${az.id}`)}
                className="bg-slate-800 border border-slate-700 hover:border-blue-600 rounded-2xl p-5 text-left transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">
                      {az.ragione_sociale}
                    </div>
                    <div className="text-slate-400 text-sm mt-0.5">{az.piva || 'P.IVA non inserita'}</div>
                  </div>
                  <ChevronRight size={18} className="text-slate-600 group-hover:text-blue-400 mt-0.5 transition-colors" />
                </div>
                <div className="flex gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Building2 size={12} />
                    {az.settore || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {az.n_dipendenti ?? '—'} dip.
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
