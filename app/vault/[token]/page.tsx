'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Shield, FileText, CheckCircle, Clock, AlertTriangle, QrCode } from 'lucide-react';
import { getVault } from '@/lib/api';

interface VaultDoc {
  id: string;
  titolo: string;
  tipo: string;
  data_documento: string | null;
  data_scadenza: string | null;
}

interface VaultVerbale {
  id: string;
  titolo: string;
  tipo: string;
  data_verbale: string;
  firmato: boolean;
}

interface VaultData {
  azienda: { ragione_sociale: string; piva: string | null; settore: string | null };
  documenti: VaultDoc[];
  verbali: VaultVerbale[];
  generato_il: string;
}

export default function VaultPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<VaultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    getVault(token)
      .then(setData)
      .catch(() => setError('Vault non trovato o non valido'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="text-center">
          <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
          <h1 className="text-white text-xl font-semibold">Vault non trovato</h1>
          <p className="text-slate-400 mt-2 text-sm">Il QR code potrebbe essere scaduto o non valido.</p>
        </div>
      </div>
    );
  }

  const az = data!.azienda;
  const generato = new Date(data!.generato_il).toLocaleString('it-IT');

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header istituzionale */}
      <header className="bg-blue-900/40 border-b border-blue-800 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Shield size={24} className="text-blue-400" />
          <div>
            <div className="font-bold text-white">Safety SaaS — Vault Documenti</div>
            <div className="text-blue-300 text-xs">Accesso pubblico per ispezioni — D.Lgs. 81/2008</div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Intestazione azienda */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="bg-blue-900/50 p-3 rounded-xl">
              <QrCode size={28} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{az.ragione_sociale}</h1>
              <div className="text-slate-400 text-sm mt-1 space-x-3">
                {az.piva && <span>P.IVA {az.piva}</span>}
                {az.settore && <span>· {az.settore}</span>}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700 text-xs text-slate-500">
            Vault aggiornato il {generato}
          </div>
        </div>

        {/* Documenti */}
        {data!.documenti.length > 0 && (
          <section className="mb-6">
            <h2 className="font-semibold mb-3 text-slate-300">Documenti</h2>
            <div className="space-y-2">
              {data!.documenti.map(doc => (
                <div
                  key={doc.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3"
                >
                  <FileText size={18} className="text-blue-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{doc.titolo}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {doc.tipo}
                      {doc.data_documento && ` · ${new Date(doc.data_documento).toLocaleDateString('it-IT')}`}
                      {doc.data_scadenza && (
                        <span className="ml-2 text-orange-400">
                          Scade: {new Date(doc.data_scadenza).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Verbali */}
        {data!.verbali.length > 0 && (
          <section className="mb-6">
            <h2 className="font-semibold mb-3 text-slate-300">Verbali</h2>
            <div className="space-y-2">
              {data!.verbali.map(v => (
                <div
                  key={v.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-4 flex items-center gap-3"
                >
                  <FileText size={18} className="text-slate-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{v.titolo}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {v.tipo} · {new Date(v.data_verbale).toLocaleDateString('it-IT')}
                    </div>
                  </div>
                  {v.firmato
                    ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                    : <Clock size={16} className="text-orange-400 shrink-0" />
                  }
                </div>
              ))}
            </div>
          </section>
        )}

        {data!.documenti.length === 0 && data!.verbali.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <FileText size={40} className="mx-auto mb-3 opacity-30" />
            <p>Nessun documento disponibile in questo vault</p>
          </div>
        )}

        {/* Footer legale */}
        <div className="mt-8 bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-xs text-slate-500">
          <p className="font-medium text-slate-400 mb-1">⚠ Nota per gli ispettori</p>
          <p>Questo vault è generato automaticamente dalla piattaforma Safety SaaS. I documenti mostrati sono quelli che l&apos;azienda ha reso pubblicamente accessibili. Per l&apos;accesso alla documentazione completa, contattare direttamente l&apos;azienda o il responsabile RSPP.</p>
        </div>
      </main>

      <footer className="text-center text-slate-600 text-xs py-4">
        Safety SaaS — Antonio Iovane, Agenzia Digitale
      </footer>
    </div>
  );
}
