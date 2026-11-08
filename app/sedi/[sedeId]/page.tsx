'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Shield, ArrowLeft, Users, UserCheck, LogOut, Plus,
  Trash2, Mail, Phone, Calendar, AlertTriangle, CheckCircle, Clock,
} from 'lucide-react';
import {
  getSede, getDipendenti, getFigureSicurezza,
  creaDipendente, creaFiguraSicurezza,
  Sede, Dipendente, FiguraSicurezza, RuoloFigura, RUOLO_LABEL,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

type Tab = 'dipendenti' | 'figure';

export default function SedeDetailPage() {
  const { sedeId } = useParams<{ sedeId: string }>();
  const router = useRouter();
  const { logout } = useAuth();

  const [sede, setSede] = useState<Sede | null>(null);
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [figure, setFigure] = useState<FiguraSicurezza[]>([]);
  const [tab, setTab] = useState<Tab>('dipendenti');
  const [loading, setLoading] = useState(true);

  // Modali
  const [showDipForm, setShowDipForm] = useState(false);
  const [showFigForm, setShowFigForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form dipendente
  const [dipForm, setDipForm] = useState({
    nome: '', cognome: '', codice_fiscale: '',
    data_nascita: '', luogo_nascita: '', mansione: '',
    data_assunzione: '', contratto: '',
  });

  // Form figura
  const [figForm, setFigForm] = useState({
    ruolo: 'rspp' as RuoloFigura,
    nome: '', email: '', telefono: '',
    data_nomina: '', data_scadenza_formazione: '',
  });

  useEffect(() => {
    if (!sedeId) return;
    Promise.all([getSede(sedeId), getDipendenti(sedeId), getFigureSicurezza(sedeId)])
      .then(([s, d, f]) => { setSede(s); setDipendenti(d); setFigure(f); })
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [sedeId, router]);

  async function salvaDipendente() {
    if (!dipForm.nome || !dipForm.cognome) return;
    setSaving(true);
    try {
      const nd = await creaDipendente(sedeId, dipForm);
      setDipendenti(prev => [...prev, nd]);
      setShowDipForm(false);
      setDipForm({ nome: '', cognome: '', codice_fiscale: '', data_nascita: '', luogo_nascita: '', mansione: '', data_assunzione: '', contratto: '' });
    } finally { setSaving(false); }
  }

  async function salvaFigura() {
    if (!figForm.nome) return;
    setSaving(true);
    try {
      const nf = await creaFiguraSicurezza(sedeId, figForm);
      setFigure(prev => [...prev, nf]);
      setShowFigForm(false);
      setFigForm({ ruolo: 'rspp', nome: '', email: '', telefono: '', data_nomina: '', data_scadenza_formazione: '' });
    } finally { setSaving(false); }
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

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{sede?.nome}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {[sede?.indirizzo, sede?.citta, sede?.provincia].filter(Boolean).join(', ')}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-800 rounded-xl p-1 mb-6 max-w-xs">
          <button
            onClick={() => setTab('dipendenti')}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${tab === 'dipendenti' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Users size={15} />
            Dipendenti
          </button>
          <button
            onClick={() => setTab('figure')}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-medium py-2 px-3 rounded-lg transition-colors ${tab === 'figure' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <UserCheck size={15} />
            Figure
          </button>
        </div>

        {/* ── DIPENDENTI ── */}
        {tab === 'dipendenti' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{dipendenti.filter(d => d.attivo).length} dipendenti attivi</h2>
              <button
                onClick={() => setShowDipForm(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} />
                Aggiungi
              </button>
            </div>

            {showDipForm && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-4">Nuovo dipendente</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'nome', label: 'Nome *', placeholder: 'Mario' },
                    { key: 'cognome', label: 'Cognome *', placeholder: 'Rossi' },
                    { key: 'codice_fiscale', label: 'Codice Fiscale', placeholder: 'RSSMRA80A01H501W' },
                    { key: 'mansione', label: 'Mansione', placeholder: 'Operaio generico' },
                    { key: 'data_nascita', label: 'Data nascita', placeholder: '', type: 'date' },
                    { key: 'luogo_nascita', label: 'Luogo nascita', placeholder: 'Napoli' },
                    { key: 'data_assunzione', label: 'Data assunzione', placeholder: '', type: 'date' },
                    { key: 'contratto', label: 'Contratto', placeholder: 'Tempo indeterminato' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-400 mb-1">{label}</label>
                      <input
                        type={type || 'text'}
                        value={(dipForm as Record<string, string>)[key]}
                        onChange={e => setDipForm(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={salvaDipendente}
                    disabled={saving || !dipForm.nome || !dipForm.cognome}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {saving ? 'Salvataggio…' : 'Salva'}
                  </button>
                  <button
                    onClick={() => setShowDipForm(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {dipendenti.length === 0 && !showDipForm && (
              <div className="text-center py-16">
                <Users size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nessun dipendente registrato</p>
              </div>
            )}

            <div className="space-y-2">
              {dipendenti.map(dip => (
                <div
                  key={dip.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-sm text-white">{dip.cognome} {dip.nome}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {dip.mansione || 'Mansione non specificata'}
                      {dip.codice_fiscale && <span className="ml-2 font-mono">{dip.codice_fiscale}</span>}
                    </div>
                    {dip.data_assunzione && (
                      <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <Calendar size={10} />
                        Assunto il {new Date(dip.data_assunzione).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    dip.attivo
                      ? 'bg-green-900/40 text-green-300 border-green-700'
                      : 'bg-slate-700 text-slate-400 border-slate-600'
                  }`}>
                    {dip.attivo ? 'Attivo' : 'Inattivo'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FIGURE SICUREZZA ── */}
        {tab === 'figure' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Figure di sicurezza</h2>
              <button
                onClick={() => setShowFigForm(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus size={14} />
                Aggiungi
              </button>
            </div>

            {showFigForm && (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-4">
                <h3 className="font-semibold text-sm mb-4">Nuova figura di sicurezza</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Ruolo *</label>
                    <select
                      value={figForm.ruolo}
                      onChange={e => setFigForm(prev => ({ ...prev, ruolo: e.target.value as RuoloFigura }))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                    >
                      {(Object.entries(RUOLO_LABEL) as [RuoloFigura, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  {[
                    { key: 'nome', label: 'Nome completo *', placeholder: 'Dott. Antonio Rossi' },
                    { key: 'email', label: 'Email', placeholder: 'rspp@example.it' },
                    { key: 'telefono', label: 'Telefono', placeholder: '+39 081 …' },
                    { key: 'data_nomina', label: 'Data nomina', placeholder: '', type: 'date' },
                    { key: 'data_scadenza_formazione', label: 'Scadenza formazione', placeholder: '', type: 'date' },
                  ].map(({ key, label, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-xs text-slate-400 mb-1">{label}</label>
                      <input
                        type={type || 'text'}
                        value={(figForm as Record<string, string>)[key]}
                        onChange={e => setFigForm(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={salvaFigura}
                    disabled={saving || !figForm.nome}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    {saving ? 'Salvataggio…' : 'Salva'}
                  </button>
                  <button
                    onClick={() => setShowFigForm(false)}
                    className="bg-slate-700 hover:bg-slate-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            {figure.length === 0 && !showFigForm && (
              <div className="text-center py-16">
                <UserCheck size={40} className="text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nessuna figura registrata</p>
                <p className="text-slate-600 text-xs mt-1">Aggiungi RSPP, RLS, Medico Competente, ecc.</p>
              </div>
            )}

            <div className="space-y-2">
              {figure.map(fig => {
                const scadenzaFormazione = fig.data_scadenza_formazione
                  ? new Date(fig.data_scadenza_formazione)
                  : null;
                const oggi = new Date();
                const giorniScadenza = scadenzaFormazione
                  ? Math.ceil((scadenzaFormazione.getTime() - oggi.getTime()) / 86400000)
                  : null;
                const statoScadenza = giorniScadenza == null ? null
                  : giorniScadenza < 0 ? 'scaduta'
                  : giorniScadenza < 30 ? 'urgente'
                  : 'ok';

                return (
                  <div key={fig.id} className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-blue-900/50 text-blue-300 border border-blue-700 px-2 py-0.5 rounded-full">
                            {RUOLO_LABEL[fig.ruolo]}
                          </span>
                        </div>
                        <div className="font-medium text-sm text-white mt-1.5">{fig.nome}</div>
                        <div className="flex gap-3 mt-1">
                          {fig.email && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Mail size={11} /> {fig.email}
                            </div>
                          )}
                          {fig.telefono && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Phone size={11} /> {fig.telefono}
                            </div>
                          )}
                        </div>
                      </div>
                      {statoScadenza && (
                        <div className={`flex items-center gap-1 text-xs ${
                          statoScadenza === 'scaduta' ? 'text-red-400'
                          : statoScadenza === 'urgente' ? 'text-orange-400'
                          : 'text-green-400'
                        }`}>
                          {statoScadenza === 'scaduta' ? <AlertTriangle size={13} />
                            : statoScadenza === 'urgente' ? <Clock size={13} />
                            : <CheckCircle size={13} />}
                          {statoScadenza === 'scaduta'
                            ? `Formazione scaduta`
                            : `Form. scade tra ${giorniScadenza}gg`}
                        </div>
                      )}
                    </div>
                    {fig.data_nomina && (
                      <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                        <Calendar size={10} />
                        Nominato il {new Date(fig.data_nomina).toLocaleDateString('it-IT')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
