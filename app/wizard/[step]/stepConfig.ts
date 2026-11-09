export interface Field {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'checkbox' | 'radio' | 'textarea' | 'date' | 'array' | 'multicheckbox' | 'logo' | 'planimetria';
  required?: boolean;
  options?: string[];
  placeholder?: string;
  maxLength?: number;
}

export interface StepConfig {
  title: string;
  description: string;
  fields: Field[];
}

export const STEPS: Record<number, StepConfig> = {
  1: {
    title: 'Anagrafica azienda',
    description: 'Inserisci i dati identificativi dell\'azienda cliente.',
    fields: [
      { key: 'ragione_sociale', label: 'Ragione sociale', type: 'text', required: true },
      { key: 'piva', label: 'Partita IVA', type: 'text', required: true, maxLength: 11, placeholder: '12345678901' },
      { key: 'codice_ateco', label: 'Codice ATECO', type: 'text', required: true, placeholder: 'es. 47.11' },
      { key: 'settore', label: 'Settore', type: 'select', required: true, options: ['Uffici', 'Ristorazione', 'Artigianato', 'Commercio', 'Edilizia', 'Altro'] },
      { key: 'indirizzo_sede', label: 'Indirizzo sede', type: 'text', required: true },
      { key: 'n_dipendenti', label: 'Numero dipendenti', type: 'number', required: true },
      { key: 'datore_lavoro', label: 'Datore di lavoro', type: 'text', required: true },
      { key: 'mc_medico_competente', label: 'Medico competente (opzionale)', type: 'text' },
      { key: 'videosorveglianza', label: 'Impianto di videosorveglianza presente in azienda (art. 4 L. 300/1970)', type: 'checkbox' },
      { key: 'videosorveglianza_denunciata', label: 'Se sì: l\'impianto è stato regolarmente autorizzato dall\'Ispettorato Nazionale del Lavoro (INL)', type: 'checkbox' },
      { key: 'logo', label: 'Logo aziendale (opzionale)', type: 'logo', placeholder: 'Carica il logo in formato PNG o JPG (max 2 MB)' },
    ],
  },
  2: {
    title: 'Organizzazione del lavoro',
    description: 'Descrive come è organizzato il lavoro in azienda.',
    fields: [
      { key: 'mansioni', label: 'Mansioni presenti (aggiungi una alla volta)', type: 'array', required: true },
      { key: 'turni', label: 'Lavoro su turni', type: 'checkbox' },
      { key: 'orario_lavoro', label: 'Orario di lavoro', type: 'text', placeholder: 'es. 8:00-17:00' },
      { key: 'lavoratori_speciali', label: 'Lavoratori in condizioni speciali', type: 'multicheckbox', options: ['Donne in gravidanza', 'Minori', 'Disabili'] },
    ],
  },
  3: {
    title: 'Luoghi di lavoro',
    description: 'Caratteristiche fisiche degli ambienti di lavoro.',
    fields: [
      { key: 'superfici_mq', label: 'Superficie totale (m²)', type: 'number' },
      { key: 'altezza_m', label: 'Altezza locali (m)', type: 'number' },
      { key: 'illuminazione', label: 'Tipo illuminazione', type: 'radio', options: ['Naturale', 'Artificiale', 'Mista'] },
      { key: 'aerazione', label: 'Tipo aerazione', type: 'radio', options: ['Naturale', 'Meccanica', 'Mista'] },
      { key: 'vie_esodo_adeguate', label: 'Vie di esodo adeguate', type: 'checkbox' },
      { key: 'uscite_emergenza', label: 'Numero uscite di emergenza', type: 'number' },
    ],
  },
  4: {
    title: 'Attrezzature',
    description: 'Macchinari e impianti presenti in azienda.',
    fields: [
      { key: 'macchinari', label: 'Lista macchinari (nome, marcatura CE, anno)', type: 'array' },
      { key: 'impianto_elettrico_certificato', label: 'Impianto elettrico certificato (CEI 64-8)', type: 'checkbox' },
      { key: 'tipo_impianto_messa_a_terra', label: 'Classificazione impianto ai fini DPR 462/2001 (periodicità verifica messa a terra)', type: 'radio', options: ['Ordinario (verifica ogni 2 anni)', 'Maggior rischio / rischio esplosione (verifica ogni anno)'] },
      { key: 'data_ultima_verifica_messa_a_terra', label: 'Data ultima verifica messa a terra (DPR 462/2001)', type: 'date' },
      { key: 'ricevuta_messa_a_terra', label: 'Ricevuta verifica messa a terra — ingegnere/organismo certificatore (opzionale)', type: 'planimetria' },
      { key: 'impianto_gas', label: 'Impianto gas presente', type: 'checkbox' },
      { key: 'ascensori', label: 'Ascensori/montacarichi presenti', type: 'checkbox' },
    ],
  },
  5: {
    title: 'Agenti chimici',
    description: 'Sostanze chimiche e prodotti utilizzati in azienda.',
    fields: [
      { key: 'sostanze', label: 'Sostanze chimiche (nome, SDS disponibile)', type: 'array' },
      { key: 'prodotti_pulizia', label: 'Prodotti per le pulizie', type: 'checkbox' },
      { key: 'solventi', label: 'Solventi o vernici', type: 'checkbox' },
    ],
  },
  6: {
    title: 'Condizioni di lavoro',
    description: 'Informazioni sulle condizioni operative — i rischi saranno valutati automaticamente dall\'AI.',
    fields: [
      { key: 'lavoro_notturno', label: 'Lavoro notturno o su turni', type: 'checkbox' },
      { key: 'lavoro_esterno', label: 'Attività svolta anche all\'aperto', type: 'checkbox' },
      { key: 'movimentazione_carichi', label: 'Movimentazione manuale di carichi (>3 kg)', type: 'checkbox' },
      { key: 'videoterminali', label: 'Utilizzo PC/videoterminali per più di 4h/die', type: 'checkbox' },
      { key: 'contatto_pubblico', label: 'Contatto diretto con il pubblico/clienti', type: 'checkbox' },
      { key: 'lavoro_solitario', label: 'Lavoratori che operano in isolamento', type: 'checkbox' },
      { key: 'note_condizioni', label: 'Altre condizioni rilevanti (opzionale)', type: 'textarea', placeholder: 'Es. ambienti con temperature estreme, lavoro in quota, ecc.' },
    ],
  },
  7: {
    title: 'Rischi specifici settore',
    description: 'Rischi peculiari del settore di attività.',
    fields: [
      { key: 'rischi_specifici', label: 'Descrivi i rischi specifici del settore', type: 'textarea', required: true, placeholder: 'Descrivi le attività ad alto rischio, materiali pericolosi, ecc.' },
      { key: 'note_rischi', label: 'Note aggiuntive', type: 'textarea', placeholder: 'Ulteriori osservazioni sui rischi...' },
    ],
  },
  8: {
    title: 'Storico sicurezza',
    description: 'Informazioni storiche sulla sicurezza in azienda.',
    fields: [
      { key: 'anno_dvr_precedente', label: 'Anno DVR precedente (opzionale)', type: 'number', placeholder: 'es. 2022' },
      { key: 'infortuni_3anni', label: 'Infortuni negli ultimi 3 anni', type: 'number', placeholder: '0' },
      { key: 'sorveglianza_sanitaria', label: 'Sorveglianza sanitaria attiva', type: 'checkbox' },
      { key: 'data_ultima_visita', label: 'Data ultima visita medica (opzionale)', type: 'date' },
    ],
  },
  9: {
    title: 'Misure adottate',
    description: 'Misure di prevenzione e protezione già in atto.',
    fields: [
      { key: 'dpi', label: 'DPI forniti ai lavoratori (uno per riga)', type: 'array' },
      { key: 'formazione_effettuata', label: 'Formazione sicurezza effettuata', type: 'checkbox' },
      { key: 'piano_emergenza', label: 'Piano di emergenza adottato', type: 'checkbox' },
      { key: 'estintori_certificati', label: 'Estintori certificati presenti', type: 'checkbox' },
    ],
  },
  10: {
    title: 'Subappalto',
    description: 'Presenza di lavoratori in subappalto.',
    fields: [
      { key: 'subappaltatori_presenti', label: 'Subappaltatori presenti', type: 'checkbox' },
      { key: 'duvri_necessario', label: 'DUVRI necessario', type: 'checkbox' },
    ],
  },
  11: {
    title: 'Documenti',
    description: 'Documentazione disponibile.',
    fields: [
      { key: 'planimetria_file', label: 'Planimetria dei locali (opzionale — verrà inserita nel DVR)', type: 'planimetria' },
      { key: 'ha_foto', label: 'Foto dei luoghi di lavoro disponibili', type: 'checkbox' },
      { key: 'note_aggiuntive', label: 'Note aggiuntive', type: 'textarea', placeholder: 'Ulteriori informazioni rilevanti...' },
    ],
  },
  12: {
    title: 'Figure della sicurezza',
    description: 'Nominativi delle figure obbligatorie per legge (D.Lgs. 81/08).',
    fields: [
      { key: 'rspp_nome', label: 'RSPP — nome e cognome', type: 'text', required: true, placeholder: 'es. Dott. Mario Rossi' },
      { key: 'rspp_tipo', label: 'RSPP — chi ricopre il ruolo (art. 17 D.Lgs. 81/08)', type: 'radio', required: true, options: ['Datore di lavoro (DL-RSPP)', 'Dipendente interno designato', 'Consulente esterno'] },
      { key: 'rls_nome', label: 'RLS — nome e cognome', type: 'text', required: true, placeholder: 'es. Anna Bianchi' },
      { key: 'addetti_antincendio', label: 'Addetti antincendio (aggiungi un nominativo alla volta)', type: 'array', required: true },
      { key: 'addetti_primo_soccorso', label: 'Addetti primo soccorso (aggiungi un nominativo alla volta)', type: 'array', required: true },
      { key: 'mc_nome', label: 'Medico competente — nome e cognome (se presente)', type: 'text', placeholder: 'es. Dott.ssa Carla Marino' },
      { key: 'ha_preposti', label: 'Sono presenti preposti (capi-reparto, capi-turno)', type: 'checkbox' },
      { key: 'ha_dirigenti', label: 'Sono presenti dirigenti con delega sicurezza', type: 'checkbox' },
    ],
  },
  13: {
    title: 'Riepilogo finale',
    description: 'Verifica tutti i dati prima di generare il DVR con l\'AI.',
    fields: [],
  },
};
