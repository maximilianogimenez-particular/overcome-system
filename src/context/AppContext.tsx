// APPCONTEXT.TSX
// Contexto global para la gestión del estado de la plataforma de Overcome Consulting
// Proporciona el estado de la BD local y simula el usuario/rol actualmente autenticado.

import React, { createContext, useContext, useState, useEffect } from 'react';
import * as db from '../database/db';

interface AppContextType {
  // Datos del negocio
  companies: db.Company[];
  users: db.User[];
  agreements: db.Agreement[];
  surveys: db.SatisfactionSurvey[];
  projects: db.Project[];
  invoices: db.Invoice[];
  collections: db.Collection[];
  purchases: db.Purchase[];
  payments: db.ProviderPayment[];
  vendors: db.Vendor[];
  loading: boolean;

  // Simulación de sesión de usuario
  currentUser: db.User | null;
  setCurrentUser: (user: db.User) => void;
  activeRole: db.User['role'];
  setActiveRole: (role: db.User['role']) => void;
  selectedClientFilter: string; // Para superadmin filtrar todo por cliente
  setSelectedClientFilter: (companyId: string) => void;

  // Operaciones globales (CRUD)
  refreshData: () => Promise<void>;
  createRecord: <K extends keyof db.DatabaseState>(
    table: K,
    record: Omit<db.DatabaseState[K][number], 'id' | 'created_at'> & { id?: string; created_at?: string }
  ) => Promise<db.DatabaseState[K][number]>;
  updateRecord: <K extends keyof db.DatabaseState>(
    table: K,
    id: string,
    updates: Partial<db.DatabaseState[K][number]>
  ) => Promise<db.DatabaseState[K][number] | null>;
  deleteRecord: <K extends keyof db.DatabaseState>(table: K, id: string) => Promise<boolean>;
  restoreDatabase: (newState: db.DatabaseState) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [companies, setCompanies] = useState<db.Company[]>([]);
  const [users, setUsers] = useState<db.User[]>([]);
  const [agreements, setAgreements] = useState<db.Agreement[]>([]);
  const [surveys, setSurveys] = useState<db.SatisfactionSurvey[]>([]);
  const [projects, setProjects] = useState<db.Project[]>([]);
  const [invoices, setInvoices] = useState<db.Invoice[]>([]);
  const [collections, setCollections] = useState<db.Collection[]>([]);
  const [purchases, setPurchases] = useState<db.Purchase[]>([]);
  const [payments, setPayments] = useState<db.ProviderPayment[]>([]);
  const [vendors, setVendors] = useState<db.Vendor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUserInner] = useState<db.User | null>(null);
  const [activeRole, setActiveRoleState] = useState<db.User['role']>('superadmin');
  const [selectedClientFilter, setSelectedClientFilter] = useState<string>('ALL');

  // Carga inicial
  const refreshData = async () => {
    setLoading(true);
    try {
      const state = await db.getDB();
      setCompanies(state.companies);
      setUsers(state.users);
      setAgreements(state.agreements);
      setSurveys(state.satisfaction_surveys);
      setProjects(state.projects);
      setInvoices(state.invoices);
      setCollections(state.collections);
      setPurchases(state.purchases);
      setPayments(state.provider_payments);
      setVendors(state.vendors || []);

      // Si no hay un usuario simulado activo, asignar al Super Admin por defecto
      if (!currentUser && state.users.length > 0) {
        const adminUser = state.users.find(u => u.role === 'superadmin') || state.users[0];
        setCurrentUserInner(adminUser);
        setActiveRoleState(adminUser.role);
      }
    } catch (error) {
      console.error('Error cargando los datos del negocio:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  // Cambiar de usuario/rol simulado
  const setCurrentUser = (user: db.User) => {
    setCurrentUserInner(user);
    setActiveRoleState(user.role);
  };

  const setActiveRole = (role: db.User['role']) => {
    setActiveRoleState(role);
    // Cambiar también al usuario simulado de ese rol en el estado
    if (users.length > 0) {
      const foundUser = users.find(u => u.role === role);
      if (foundUser) {
        setCurrentUserInner(foundUser);
      } else {
        // Generar un usuario temporal si no existe en la BD
        setCurrentUserInner({
          id: db.generateUUID(),
          name: `Simulado ${role.toUpperCase()}`,
          email: `${role}@overcome-test.com`,
          role: role,
          company_id: role === 'cliente' && companies.length > 0 ? companies[0].id : null,
          status: 'active',
          created_at: new Date().toISOString()
        });
      }
    }
  };

  // CRUD wrappers
  const createRecord = async <K extends keyof db.DatabaseState>(
    table: K,
    record: Omit<db.DatabaseState[K][number], 'id' | 'created_at'> & { id?: string; created_at?: string }
  ) => {
    const newRecord = await db.createItem(table, record);
    await refreshData();
    return newRecord;
  };

  const updateRecord = async <K extends keyof db.DatabaseState>(
    table: K,
    id: string,
    updates: Partial<db.DatabaseState[K][number]>
  ) => {
    const updated = await db.updateItem(table, id, updates);
    await refreshData();
    return updated;
  };

  const deleteRecord = async <K extends keyof db.DatabaseState>(table: K, id: string) => {
    const success = await db.deleteItem(table, id);
    if (success) {
      await refreshData();
    }
    return success;
  };

  const restoreDatabase = async (newState: db.DatabaseState) => {
    const success = await db.restoreDB(newState);
    if (success) {
      await refreshData();
    }
    return success;
  };

  return (
    <AppContext.Provider
      value={{
        companies,
        users,
        agreements,
        surveys,
        projects,
        invoices,
        collections,
        purchases,
        payments,
        vendors,
        loading,
        currentUser,
        setCurrentUser,
        activeRole,
        setActiveRole,
        selectedClientFilter,
        setSelectedClientFilter,
        refreshData,
        createRecord,
        updateRecord,
        deleteRecord,
        restoreDatabase,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe ser usado dentro de un AppProvider');
  }
  return context;
};
