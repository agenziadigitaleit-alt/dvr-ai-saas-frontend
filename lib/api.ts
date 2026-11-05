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
  codice: string;
  titolo: string;
  riferimento: string;
  descrizione: string;
  sanzione_datore: string;
  rischio_penale: boolean;
  note_penale?: string;
  priorita: 'alta' | 'media';
  universale: boolean;
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
