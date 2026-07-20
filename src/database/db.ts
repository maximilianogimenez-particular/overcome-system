// DB.TS
// Adaptador de Base de Datos local persistido en localStorage para Overcome Consulting
// Diseñado con promesas asíncronas para facilitar el cambio futuro a Supabase.

import initialSeedData from '../../db_backups/initial_seed.json';
import { supabase, isSupabaseConfigured } from './supabase';

// Interfaces de Datos
export interface Company {
  id: string;
  name: string;
  tax_id: string;
  contact_name: string | null;
  contact_position: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'comercial' | 'operaciones' | 'administracion' | 'cliente';
  company_id: string | null; // null para staff de Overcome
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Agreement {
  id: string;
  company_id: string | null;
  prospect_company_name?: string | null;
  title: string;
  description: string | null;
  amount: number;
  months: number;
  currency: string;
  status: 'Negociacion' | 'Aprobada' | 'Perdida' | 'Suspendida';
  start_date: string;
  end_date: string | null;
  follow_up_comments?: { date: string; comment: string }[];
  created_at: string;
}

export interface SatisfactionSurvey {
  id: string;
  company_id: string;
  user_id: string | null;
  score: number;
  comments: string | null;
  survey_date: string;
  created_at: string;
}

export interface Project {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'review' | 'completed' | 'paused';
  start_date: string;
  end_date: string | null;
  assigned_user_id: string | null;
  assigned_user_ids?: string[];
  created_at: string;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  amount: number;
  currency: string;
  description: string | null;
  issue_date: string;
  due_date: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  file_url: string | null;
  created_at: string;
}

export interface Collection {
  id: string;
  invoice_id: string;
  amount_collected: number;
  collection_date: string;
  payment_method: 'transfer' | 'cash' | 'check' | 'credit_card' | 'e_cheq' | 'other';
  bank: 'Galicia' | 'Comafi' | 'Santander' | 'Uala' | null;
  reference_number: string | null;
  status: 'pending' | 'completed';
  created_at: string;
}

export interface Vendor {
  id: string;
  name: string;
  cuit: string;
  category: string;
  evalQuality: number;
  evalDelivery: number;
  evalPrice: number;
  evalService: number;
  evalAdmin: number;
  status: 'Aprobado' | 'Rechazado';
  lastEvaluation: string;
  responsible: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Purchase {
  id: string;
  provider_name: string;
  vendor_id?: string | null;
  projectName?: string | null;
  items_json?: string | null;
  description: string | null;
  amount: number;
  currency: string;
  purchase_date: string;
  category: 'software_licenses' | 'external_consulting' | 'hardware' | 'office_supplies' | 'services' | 'other';
  status: 'pending' | 'approved' | 'rejected' | 'delivered' | 'paid';
  invoiceNumber?: string | null;
  responsible?: string | null;
  created_at: string;
}

export interface ProviderPayment {
  id: string;
  purchase_id: string | null;
  provider_name: string;
  amount: number;
  currency: string;
  payment_date: string;
  payment_method: 'transfer' | 'cash' | 'check' | 'other';
  bank: 'Galicia' | 'Comafi' | 'Santander' | 'Uala' | null;
  status: 'pending' | 'paid';
  created_at: string;
}

// Estructura de la Base de Datos completa
export interface DatabaseState {
  companies: Company[];
  users: User[];
  agreements: Agreement[];
  satisfaction_surveys: SatisfactionSurvey[];
  projects: Project[];
  invoices: Invoice[];
  collections: Collection[];
  purchases: Purchase[];
  provider_payments: ProviderPayment[];
  vendors: Vendor[];
}

const STORAGE_KEY = 'overcome_consulting_db';

// Generador de UUIDs simple para el frontend
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Inicializar la base de datos
export const initializeDB = (): DatabaseState => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error al parsear base de datos local, restableciendo con semilla inicial', e);
    }
  }

  // Si no hay datos, cargar la semilla
  const seedState: DatabaseState = {
    companies: initialSeedData.companies as Company[],
    users: initialSeedData.users as User[],
    agreements: initialSeedData.agreements as Agreement[],
    satisfaction_surveys: initialSeedData.satisfaction_surveys as SatisfactionSurvey[],
    projects: initialSeedData.projects as Project[],
    invoices: initialSeedData.invoices as Invoice[],
    collections: initialSeedData.collections as Collection[],
    purchases: initialSeedData.purchases as Purchase[],
    provider_payments: initialSeedData.provider_payments as ProviderPayment[],
    vendors: (initialSeedData as any).vendors || [],
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seedState));
  return seedState;
};

let cachedState: DatabaseState | null = null;

// Guardar estado en localStorage y local API server
const saveDBState = (state: DatabaseState) => {
  cachedState = state;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  
  // Post state updates to local API server file
  fetch('/api/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(state),
  }).catch((err) => {
    console.warn('Vite dev server db API unavailable:', err);
  });
};

// Obtener base de datos actual (priorizando el archivo local mediante la API)
export const getDB = async (): Promise<DatabaseState> => {
  if (isSupabaseConfigured) {
    try {
      const tables: Array<keyof DatabaseState> = [
        'companies',
        'users',
        'agreements',
        'satisfaction_surveys',
        'projects',
        'invoices',
        'collections',
        'purchases',
        'provider_payments',
        'vendors'
      ];
      
      const promises = tables.map(table => supabase.from(table).select('*'));
      const results = await Promise.all(promises);
      
      const dbState: any = {};
      tables.forEach((table, index) => {
        const { data, error } = results[index];
        if (error) throw error;
        dbState[table] = data || [];
      });
      
      return dbState as DatabaseState;
    } catch (error) {
      console.error('Supabase getDB error, falling back to cached local state:', error);
    }
  }

  if (cachedState) {
    return cachedState;
  }
  
  const localState = initializeDB();
  cachedState = localState;
  
  try {
    const res = await fetch('/api/data');
    if (res.ok) {
      const serverState = await res.json();
      if (serverState && Object.keys(serverState).length > 0) {
        cachedState = { ...localState, ...serverState };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
      } else {
        saveDBState(localState);
      }
    }
  } catch (err) {
    console.log('Servidor local de base de datos no disponible, utilizando almacenamiento del navegador.');
  }
  
  return (cachedState || localState);
};

// Guardar base de datos completa (Importación)
export const restoreDB = async (newState: DatabaseState): Promise<boolean> => {
  if (isSupabaseConfigured) {
    try {
      const tables: Array<keyof DatabaseState> = [
        'companies',
        'users',
        'agreements',
        'satisfaction_surveys',
        'projects',
        'invoices',
        'collections',
        'purchases',
        'provider_payments',
        'vendors'
      ];
      
      for (const table of tables) {
        // Delete existing data (exclude safe dummy uuid if any)
        await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        const records = newState[table] as any[];
        if (records && records.length > 0) {
          const { error } = await supabase.from(table).insert(records);
          if (error) throw error;
        }
      }
      return true;
    } catch (error) {
      console.error('Supabase restore DB error:', error);
      return false;
    }
  }

  return new Promise((resolve) => {
    setTimeout(() => {
      saveDBState(newState);
      resolve(true);
    }, 200);
  });
};

export const getItems = async <K extends keyof DatabaseState>(
  table: K
): Promise<DatabaseState[K]> => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error(`Supabase error reading table ${table}:`, error);
      throw error;
    }
    return (data || []) as any;
  }

  const db = await getDB();
  if (!db[table]) {
    (db[table] as any) = [];
  }
  return db[table];
};

export const getItemById = async <K extends keyof DatabaseState>(
  table: K,
  id: string
): Promise<any | null> => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error(`Supabase error reading row from ${table}:`, error);
      throw error;
    }
    return data;
  }

  const db = await getDB();
  if (!db[table]) {
    (db[table] as any) = [];
  }
  const list = db[table] as any[];
  return list.find((item) => item.id === id) || null;
};

export const createItem = async <K extends keyof DatabaseState>(
  table: K,
  item: Omit<DatabaseState[K][number], 'id' | 'created_at'> & { id?: string; created_at?: string }
): Promise<DatabaseState[K][number]> => {
  if (isSupabaseConfigured) {
    const payload = { ...item };
    const { data, error } = await supabase
      .from(table)
      .insert([payload])
      .select()
      .single();
    if (error) {
      console.error(`Supabase error inserting into ${table}:`, error);
      throw error;
    }
    return data as any;
  }

  const db = await getDB();
  const newItem = {
    ...item,
    id: item.id || generateUUID(),
    created_at: item.created_at || new Date().toISOString(),
  } as any;

  if (!db[table]) {
    (db[table] as any) = [];
  }
  (db[table] as any[]).push(newItem);
  saveDBState(db);

  return newItem;
};

export const updateItem = async <K extends keyof DatabaseState>(
  table: K,
  id: string,
  updates: Partial<DatabaseState[K][number]>
): Promise<DatabaseState[K][number] | null> => {
  if (isSupabaseConfigured) {
    const { data, error } = await supabase
      .from(table)
      .update(updates as any)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error(`Supabase error updating ${table} row ${id}:`, error);
      throw error;
    }
    return data as any;
  }

  const db = await getDB();
  if (!db[table]) {
    (db[table] as any) = [];
  }
  const list = db[table] as any[];
  const index = list.findIndex((item) => item.id === id);

  if (index === -1) return null;

  const updatedItem = {
    ...list[index],
    ...updates,
  };

  list[index] = updatedItem;
  saveDBState(db);

  return updatedItem;
};

export const deleteItem = async <K extends keyof DatabaseState>(
  table: K,
  id: string
): Promise<boolean> => {
  if (isSupabaseConfigured) {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    if (error) {
      console.error(`Supabase error deleting from ${table} row ${id}:`, error);
      throw error;
    }
    return true;
  }

  const db = await getDB();
  if (!db[table]) {
    (db[table] as any) = [];
  }
  const list = db[table] as any[];
  const initialLength = list.length;
  db[table] = list.filter((item) => item.id !== id) as any;

  if (db[table].length === initialLength) return false;

  saveDBState(db);
  return true;
};
