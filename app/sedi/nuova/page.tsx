'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, ArrowLeft, LogOut } from 'lucide-react';
import { creaSede } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

function NuovaSedeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const aziendaId = searchParams.get('azienda_id') || '';
  const { logout } = useAuth();

  const [form, setForm] = useState({
    nome: '', indirizzo: '', citta: '', cap: '', provincia: '',
    superficie_mq: '', n_dipendenti: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nome || !aziendaId) return;
    setSaving(true);
    setError('');
    try {
      await creaSede(aziendaId, {
        nome: form.nome,
        indirizzo: form.indirizzo || undefined,
        citta: form.citta || undefined,
        cap: form.cap || undefined,
        provincia: form.provincia || undefined,
        superficie_mq: form.superficie_mq ? Number(form.superficie_mq) : undefined,
        n_dipendenti: form.n_dipendenti ? Number(form.n_dipendenti) : undefined,
      });
      router.push(`/aziende/${aziendaId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Errore durante il salvataggio');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <header className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
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

      <main className="max-w-lg mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold mb-6">Nuova sede operativa</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { key: 'nome', label: 'Nome sede *', placeholder: 'Es. Sede principale, Magazzino Nord…' },
            { key: 'indirizzo', label: 'Indirizzo', placeholder: 'Via Roma 1' },
            { key: 'citta', label: 'Città', placeholder: 'Napoli' },
            { key: 'cap', label: 'CAP', placeholder: '80100' },
            { key: 'provincia', label: 'Provincia', placeholder: 'NA' },
            { key: 'superficie_mq', label: 'Superficie (m²)', placeholder: '500', type: 'number' },
            { key: 'n_dipendenti', label: 'N° dipendenti stimati', placeholder: '10', type: 'number' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={(form as Record<string, string>)[key]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          ))}

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving || !form.nome}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              {saving ? 'Salvataggio…' : 'Crea sede'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-xl transition-colors"
            >
              Annulla
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function NuovaSedePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>}>
      <NuovaSedeForm />
    </Suspense>
  );
}
