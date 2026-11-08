'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Shield, CheckCircle, Loader2 } from 'lucide-react';
import { verificaCheckout } from '@/lib/api';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';
  const aziendaId = searchParams.get('azienda_id') || '';

  const [stato, setStato] = useState<'verifica' | 'ok' | 'errore'>('verifica');
  const [crediti, setCrediti] = useState(0);
  const [nuovoSaldo, setNuovoSaldo] = useState(0);

  useEffect(() => {
    if (!sessionId) { setStato('errore'); return; }
    verificaCheckout(sessionId)
      .then(data => {
        if (data.stato === 'completato') {
          setCrediti(data.crediti || 0);
          setNuovoSaldo(data.nuovo_saldo || 0);
          setStato('ok');
        } else {
          setTimeout(() => verificaCheckout(sessionId).then(d => {
            if (d.stato === 'completato') {
              setCrediti(d.crediti || 0);
              setNuovoSaldo(d.nuovo_saldo || 0);
              setStato('ok');
            } else {
              setStato('errore');
            }
          }), 3000);
        }
      })
      .catch(() => setStato('errore'));
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center">
        <div className="flex items-center gap-2 justify-center text-blue-400 mb-8">
          <Shield size={22} />
          <span className="font-bold">Safety SaaS</span>
        </div>

        {stato === 'verifica' && (
          <>
            <Loader2 size={48} className="text-blue-400 mx-auto animate-spin mb-4" />
            <h1 className="text-xl font-bold mb-2">Verifica pagamento…</h1>
            <p className="text-slate-400 text-sm">Stiamo confermando il tuo acquisto con Stripe.</p>
          </>
        )}

        {stato === 'ok' && (
          <>
            <CheckCircle size={56} className="text-green-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pagamento riuscito!</h1>
            <p className="text-slate-400 text-sm mb-6">
              Hai acquistato <span className="text-white font-semibold">{crediti} crediti</span>.
              {nuovoSaldo > 0 && (
                <> Il tuo nuovo saldo è <span className="text-blue-300 font-semibold">{nuovoSaldo} crediti</span>.</>
              )}
            </p>
            <button
              onClick={() => router.push(aziendaId ? `/aziende/${aziendaId}` : '/dashboard')}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Vai alla dashboard
            </button>
          </>
        )}

        {stato === 'errore' && (
          <>
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-xl font-bold mb-2">Verifica non riuscita</h1>
            <p className="text-slate-400 text-sm mb-6">
              Il pagamento potrebbe comunque essere andato a buon fine. Controlla il wallet tra qualche minuto.
            </p>
            <button
              onClick={() => router.push('/wallet')}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              Vai al wallet
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function WalletSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
