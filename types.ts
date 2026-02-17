
export enum MaterialStatus {
  ATTIVO = 'ATTIVO',
  RITIRATO = 'RITIRATO'
}

export interface Material {
  id?: number;
  nome: string;
  lotto: string;
  dataApertura: string; // ISO format YYYY-MM-DD
  dataScadenza: string; // ISO format YYYY-MM-DD
  ubicazione: string;
  stato: MaterialStatus;
  quantitaStock: number; // Confezioni integre in magazzino
  sogliaMinima: number;  // Livello per allerta
  note?: string;
  pdfUrl?: string;
}

export interface DashboardStats {
  totale: number;
  attivi: number;
  ritirati: number;
  scaduti: number;
  scadenza30: number;
  scadenza90: number;
  sottoSoglia: number;
}

export type ViewMode = 'DASHBOARD' | 'LIST' | 'FORM' | 'EXPIRATIONS';
