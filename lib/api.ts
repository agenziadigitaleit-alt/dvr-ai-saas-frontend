/**
 * api.ts — client HTTP centralizzato con auth JWT
 */

const BASE = '/api/proxy';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

export function clearToken() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Non autenticato');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Errore ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  access_token: string;
  token_type: string;
  ruolo: string;
  nome: string;
  user_id: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const form = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Credenziali non valide' }));
    throw new Error(err.detail);
  }
  return res.json();
}

export async function register(data: {
  email: string;
  password: string;
  nome?: string;
  cognome?: string;
  ruolo?: string;
}): Promise<AuthUser> {
  return request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
}

export async function getMe() {
  return request<{ id: string; email: string; nome: string; ruolo: string; rspp_id: string | null }>('/auth/me');
}

// ── Aziende ───────────────────────────────────────────────────────────────────

export interface Azienda {
  id: string;
  ragione_sociale: string;
  piva?: string;
  settore?: string;
  n_dipendenti?: number;
  qr_token?: string;
}

export async function getAziende(): Promise<Azienda[]> {
  return request('/aziende');
}

export async function getAzienda(id: string): Promise<Azienda> {
  return request(`/aziende/${id}`);
}

export async function creaAzienda(data: Partial<Azienda> & { ragione_sociale: string }) {
  return request('/aziende', { method: 'POST', body: JSON.stringify(data) });
}

// ── Scadenze ──────────────────────────────────────────────────────────────────

export interface Scadenza {
  id: string;
  tipo: string;
  titolo: string;
  data_scadenza: string;
  completata: boolean;
  stato: 'completata' | 'scaduta' | 'urgente' | 'in_scadenza' | 'ok';
  colore: string;
  giorni_rimasti: number;
}

export async function getScadenze(aziendaId: string): Promise<Scadenza[]> {
  return request(`/aziende/${aziendaId}/scadenze`);
}

export async function completaScadenza(scadenzaId: string) {
  return request(`/scadenze/${scadenzaId}/completa`, { method: 'PUT' });
}

// ── Verbali ───────────────────────────────────────────────────────────────────

export interface Verbale {
  id: string;
  tipo: string;
  titolo: string;
  data_verbale: string;
  firmato: boolean;
  nel_vault: boolean;
  firmatari: string[];
}

export async function getVerbali(aziendaId: string): Promise<Verbale[]> {
  return request(`/aziende/${aziendaId}/verbali`);
}

export async function firmaVerbale(verbaleId: string) {
  return request(`/verbali/${verbaleId}/firma`, { method: 'PUT' });
}

// ── Compliance ────────────────────────────────────────────────────────────────

export interface Adempimento {
  id: string;
  codice: string;
  titolo: string;
  riferimento: string;
  descrizione: string;
  sanzione_datore: string;
  rischio_penale: boolean;
  note_penale?: string;
  priorita: 'alta' | 'media';
  universale: boolean;
  stato?: string;
}

export interface ComplianceReport {
  adempimenti: Adempimento[];
  totale: number;
  alto_rischio_count: number;
  rischio_penale_count: number;
  settore: string;
  n_dipendenti: number;
}

export async function getCompliance(aziendaId: string): Promise<ComplianceReport> {
  return request(`/aziende/${aziendaId}/compliance`);
}

// ── Vault pubblico (no auth) ──────────────────────────────────────────────────

export async function getVault(qrToken: string) {
  const res = await fetch(`${BASE}/vault/${qrToken}`);
  if (!res.ok) throw new Error('Vault non trovato');
  return res.json();
}

// ── Provvigioni ───────────────────────────────────────────────────────────────

export async function getProvvigioni(rsppId: string) {
  return request(`/rspp/${rsppId}/provvigioni`);
}

// ── Fase 2: Sedi ──────────────────────────────────────────────────────────────

export interface Sede {
  id: string;
  azienda_id: string;
  nome: string;
  indirizzo?: string;
  citta?: string;
  cap?: string;
  provincia?: string;
  superficie_mq?: number;
  n_dipendenti?: number;
  attiva: boolean;
}

export async function getSedi(aziendaId: string): Promise<Sede[]> {
  return request(`/aziende/${aziendaId}/sedi`);
}

export async function creaSede(aziendaId: string, data: Partial<Sede> & { nome: string }): Promise<Sede> {
  return request(`/aziende/${aziendaId}/sedi`, { method: 'POST', body: JSON.stringify(data) });
}

export async function getSede(sedeId: string): Promise<Sede> {
  return request(`/sedi/${sedeId}`);
}

export async function aggiornaSede(sedeId: string, data: Partial<Sede>): Promise<Sede> {
  return request(`/sedi/${sedeId}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function eliminaSede(sedeId: string): Promise<void> {
  return request(`/sedi/${sedeId}`, { method: 'DELETE' });
}

// ── Fase 2: Dipendenti ────────────────────────────────────────────────────────

export interface Dipendente {
  id: string;
  sede_id: string;
  azienda_id: string;
  nome: string;
  cognome: string;
  codice_fiscale?: string;
  data_nascita?: string;
  luogo_nascita?: string;
  mansione?: string;
  data_assunzione?: string;
  contratto?: string;
  attivo: boolean;
}

export async function getDipendenti(sedeId: string): Promise<Dipendente[]> {
  return request(`/sedi/${sedeId}/dipendenti`);
}

export async function creaDipendente(sedeId: string, data: Partial<Dipendente> & { nome: string; cognome: string }): Promise<Dipendente> {
  return request(`/sedi/${sedeId}/dipendenti`, { method: 'POST', body: JSON.stringify(data) });
}

export async function aggiornaDipendente(dipId: string, data: Partial<Dipendente>): Promise<Dipendente> {
  return request(`/dipendenti/${dipId}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ── Fase 2: Figure sicurezza ──────────────────────────────────────────────────

export type RuoloFigura = 'rspp' | 'rls' | 'mc' | 'antincendio' | 'primo_soccorso';

export interface FiguraSicurezza {
  id: string;
  sede_id: string;
  azienda_id: string;
  ruolo: RuoloFigura;
  nome: string;
  email?: string;
  telefono?: string;
  data_nomina?: string;
  data_scadenza_formazione?: string;
}

export const RUOLO_LABEL: Record<RuoloFigura, string> = {
  rspp: 'RSPP',
  rls: 'RLS',
  mc: 'Medico Competente',
  antincendio: 'Addetto Antincendio',
  primo_soccorso: 'Addetto Primo Soccorso',
};

export async function getFigureSicurezza(sedeId: string): Promise<FiguraSicurezza[]> {
  return request(`/sedi/${sedeId}/figure`);
}

export async function creaFiguraSicurezza(sedeId: string, data: Partial<FiguraSicurezza> & { ruolo: RuoloFigura; nome: string }): Promise<FiguraSicurezza> {
  return request(`/sedi/${sedeId}/figure`, { method: 'POST', body: JSON.stringify(data) });
}

// ── Fase 2: Visite mediche ────────────────────────────────────────────────────

export type StatoVisita = 'effettuata' | 'programmata' | 'scaduta';

export interface VisitaMedica {
  id: string;
  dipendente_id: string;
  azienda_id: string;
  tipo_visita: string;
  data_visita?: string;
  data_prossima?: string;
  stato: StatoVisita;
  esito?: string;
  medico?: string;
}

export async function getVisiteMediche(dipId: string): Promise<VisitaMedica[]> {
  return request(`/dipendenti/${dipId}/visite`);
}

export async function creaVisitaMedica(dipId: string, data: Partial<VisitaMedica> & { tipo_visita: string }): Promise<VisitaMedica> {
  return request(`/dipendenti/${dipId}/visite`, { method: 'POST', body: JSON.stringify(data) });
}

// ── Fase 2: Adempimenti compliance ────────────────────────────────────────────

export type StatoAdempimento = 'conforme' | 'non_conforme' | 'in_scadenza' | 'non_applicabile';

export interface AdempimentoCompliance {
  id: string;
  azienda_id: string;
  sede_id?: string;
  categoria: string;
  titolo: string;
  descrizione?: string;
  normativa?: string;
  stato: StatoAdempimento;
  data_scadenza?: string;
  data_completamento?: string;
}

export async function getAdempimenti(aziendaId: string): Promise<AdempimentoCompliance[]> {
  return request(`/aziende/${aziendaId}/adempimenti`);
}

export async function aggiornaAdempimento(adId: string, data: Partial<AdempimentoCompliance>): Promise<AdempimentoCompliance> {
  return request(`/adempimenti/${adId}`, { method: 'PUT', body: JSON.stringify(data) });
}

// ── Fase 2: Scadenzario centralizzato ────────────────────────────────────────

export type UrgenzaScadenza = 'scaduto' | 'critico' | 'urgente' | 'normale';

export interface VoceScadenzario {
  id: string;
  tipo: 'adempimento' | 'visita_medica' | 'scadenza_legacy';
  titolo: string;
  descrizione?: string;
  data_scadenza?: string;
  giorni_rimasti?: number;
  urgenza: UrgenzaScadenza;
  stato: string;
  riferimento?: string;
}

export async function getScadenzarioCompleto(aziendaId: string): Promise<VoceScadenzario[]> {
  return request(`/aziende/${aziendaId}/scadenzario-completo`);
}

// ── Wallet ────────────────────────────────────────────────────────────────────

export interface WalletInfo {
  azienda_id: string;
  saldo: number;
  transazioni: WalletTx[];
}

export interface WalletTx {
  id: string;
  tipo: 'acquisto_online' | 'ricarica_admin' | 'consumo_servizio' | 'rimborso';
  crediti: number;
  saldo_dopo: number;
  descrizione?: string;
  servizio?: string;
  created_at: string;
}

export interface PacchettoCrediti {
  id: string;
  nome: string;
  crediti: number;
  prezzo_eur: number;
  sconto_pct: number;
  popolare: boolean;
  tipo: 'standard' | 'studio';
  note?: string | null;
}

export async function getWallet(aziendaId: string): Promise<WalletInfo> {
  return request(`/wallet/${aziendaId}`);
}

export async function getTransazioni(aziendaId: string, limit = 50): Promise<WalletTx[]> {
  return request(`/wallet/${aziendaId}/transazioni?limit=${limit}`);
}

export async function getPacchettiCrediti(): Promise<PacchettoCrediti[]> {
  return request('/wallet/pacchetti/lista');
}

export async function getPrezziServizi(): Promise<Record<string, number>> {
  return request('/wallet/servizi/prezzi');
}

export async function creaCheckout(aziendaId: string, pacchettoId: string): Promise<{ checkout_url: string; session_id: string }> {
  return request('/wallet/checkout', {
    method: 'POST',
    body: JSON.stringify({ azienda_id: aziendaId, pacchetto_id: pacchettoId }),
  });
}

export async function verificaCheckout(sessionId: string): Promise<{ stato: string; crediti?: number; nuovo_saldo?: number }> {
  return request(`/wallet/checkout/verifica/${sessionId}`);
}

export async function ricaricaManuale(aziendaId: string, crediti: number, nota?: string) {
  return request('/wallet/admin/ricarica', {
    method: 'POST',
    body: JSON.stringify({ azienda_id: aziendaId, crediti, nota }),
  });
}

// ── Admin / Partner panel ─────────────────────────────────────────────────────

export type UrgenzaAzienda = 'critica' | 'alta' | 'media' | 'ok';

export interface AziendaRiepilogo {
  id: string;
  ragione_sociale: string;
  piva?: string;
  settore?: string;
  n_dipendenti?: number;
  saldo_wallet: number;
  adempimenti_non_conformi: number;
  adempimenti_scaduti: number;
  adempimenti_urgenti: number;
  urgenza: UrgenzaAzienda;
}

export interface AdminRiepilogo {
  totale_aziende: number;
  saldo_wallet_totale: number;
  adempimenti_non_conformi: number;
  adempimenti_scaduti: number;
  adempimenti_urgenti: number;
  aziende: AziendaRiepilogo[];
}

export async function getAdminRiepilogo(): Promise<AdminRiepilogo> {
  return request('/admin/riepilogo');
}

// ── Superadmin ────────────────────────────────────────────────────────────────

export interface SuperadminUtente {
  id: string;
  nome: string;
  email: string;
  ruolo: string;
  n_aziende: number;
  saldo_wallet_totale: number;
  created_at?: string;
}

export interface SuperadminPanoramica {
  utenti_totali: number;
  utenti_per_ruolo: Record<string, number>;
  aziende_totali: number;
  crediti_totali_piattaforma: number;
  revenue_totale_eur: number;
  adempimenti_non_conformi: number;
  adempimenti_conformi: number;
  utenti: SuperadminUtente[];
}

export async function getSuperadminPanoramica(): Promise<SuperadminPanoramica> {
  return request('/superadmin/panoramica');
}

// ── Notifiche ─────────────────────────────────────────────────────────────────

export interface Notifica {
  id: string;
  tipo: 'scadenza_immediata' | 'reminder_7gg' | 'reminder_30gg' | 'digest_settimanale';
  stato: 'inviata' | 'fallita' | 'saltata';
  destinatario_email?: string;
  oggetto?: string;
  n_scadenze: number;
  errore?: string;
  created_at?: string;
}

export async function getNotifiche(limit = 50): Promise<Notifica[]> {
  return request(`/notifiche?limit=${limit}`);
}

export async function getConfigNotifiche(): Promise<{ smtp_configurato: boolean; smtp_host?: string; smtp_user?: string; scheduler_attivo: boolean }> {
  return request('/notifiche/config');
}

export async function testNotifiche(): Promise<{ ok: boolean; messaggio: string }> {
  return request('/notifiche/test', { method: 'POST' });
}

// ── PEC Generator ─────────────────────────────────────────────────────────────

export interface PecOutput {
  oggetto: string;
  corpo: string;
  crediti_scalati: number;
}

export async function generaPec(aziendaId: string, adempimentoId: string): Promise<PecOutput> {
  return request(`/aziende/${aziendaId}/adempimenti/${adempimentoId}/genera-pec`, { method: 'POST' });
}

export interface PecByCodiceInput {
  codice: string;
  titolo: string;
  riferimento: string;
  descrizione: string;
  sanzione_datore: string;
  rischio_penale: boolean;
}

export async function generaPecByCodice(aziendaId: string, payload: PecByCodiceInput): Promise<PecOutput> {
  return request(`/aziende/${aziendaId}/compliance/genera-pec`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function superadminRicaricaWallet(aziendaId: string, crediti: number, nota?: string) {
  return request('/wallet/admin/ricarica', {
    method: 'POST',
    body: JSON.stringify({ azienda_id: aziendaId, crediti, nota }),
  });
}

// ── Aggiornamento parziale DVR ─────────────────────────────────────────────

export interface AggiornaParzialeDVRResult {
  dvr_id: string;
  stato: string;
  sezioni_da_rigenerare: string[];
  messaggio: string;
}

export async function aggiornaDVRParziale(
  dvrId: string,
  stepsModificati: string[],
  wizardData: Record<string, unknown>,
): Promise<AggiornaParzialeDVRResult> {
  return request(`/dvr/${dvrId}/sezioni`, {
    method: 'PATCH',
    body: JSON.stringify({ steps_modificati: stepsModificati, wizard_data: wizardData }),
  });
}
