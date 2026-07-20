// CONFIGURACIONVIEW.TSX
// Módulo de Administración de Multi-usuarios, Multi-clientes y Control de Base de Datos de Overcome Consulting.

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SearchFilter } from '../../components/SearchFilter';

export const ConfiguracionView: React.FC = () => {
  const {
    companies,
    users,
    agreements,
    invoices,
    projects,
    collections,
    purchases,
    payments,
    activeRole,
    createRecord,
    updateRecord,
    deleteRecord,
    restoreDatabase,
  } = useApp();

  // Bloqueo de seguridad (Solo Super Admin)
  if (activeRole !== 'superadmin') {
    return (
      <div style={{ textAlign: 'center', padding: '50px 20px' }}>
        <h3 style={{ color: 'var(--accent-red)', marginBottom: '10px' }}>⚠️ Acceso Denegado</h3>
        <p style={{ color: 'var(--text-light-muted)' }}>Solo los usuarios con rol Super Admin pueden acceder a la configuración del sistema.</p>
      </div>
    );
  }

  // Subtabs de configuración
  const [activeSubTab, setActiveSubTab] = useState<'clientes' | 'usuarios' | 'respaldos'>('clientes');
  const [searchTerm, setSearchTerm] = useState('');
  const [companySearch, setCompanySearch] = useState('');

  // Modales
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Estados de Formulario de Empresa
  const [companyForm, setCompanyForm] = useState({
    name: '',
    tax_id: '',
    contact_name: '',
    contact_position: '',
    email: '',
    phone: '',
    address: '',
    status: 'active' as const,
  });

  // Estados de Formulario de Usuario
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    role: 'cliente' as const,
    company_id: '',
    status: 'active' as const,
  });

  // --- ACCIONES CRUD EMPRESAS ---

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name || !companyForm.tax_id) return;
    await createRecord('companies', { ...companyForm });
    setShowCompanyModal(false);
    setCompanyForm({
      name: '',
      tax_id: '',
      contact_name: '',
      contact_position: '',
      email: '',
      phone: '',
      address: '',
      status: 'active',
    });
  };

  const handleEditCompany = (comp: any) => {
    setEditingCompany(comp);
  };

  const handleUpdateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    await updateRecord('companies', editingCompany.id, {
      name: editingCompany.name,
      tax_id: editingCompany.tax_id,
      contact_name: editingCompany.contact_name || null,
      contact_position: editingCompany.contact_position || null,
      email: editingCompany.email || null,
      phone: editingCompany.phone || null,
      address: editingCompany.address || null,
      status: editingCompany.status,
    });
    setEditingCompany(null);
  };

  const handleDeleteCompany = async (id: string) => {
    // Validar si tiene dependencias
    const hasUsers = users.some(u => u.company_id === id);
    const hasAgreements = agreements.some(a => a.company_id === id);
    
    if (hasUsers || hasAgreements) {
      alert('No se puede eliminar esta empresa porque tiene usuarios o acuerdos comerciales vinculados.');
      return;
    }

    if (window.confirm('¿Está seguro de eliminar esta empresa cliente?')) {
      await deleteRecord('companies', id);
    }
  };

  // --- ACCIONES CRUD USUARIOS ---

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.name || !userForm.email || !userForm.role) return;
    
    // Si no es cliente, obligar a company_id null
    const companyId = userForm.role === 'cliente' ? userForm.company_id : null;

    await createRecord('users', {
      name: userForm.name,
      email: userForm.email,
      role: userForm.role,
      company_id: companyId || null,
      status: userForm.status,
    });

    setShowUserModal(false);
    setUserForm({ name: '', email: '', role: 'cliente', company_id: '', status: 'active' });
  };

  const handleEditUser = (usr: any) => {
    setEditingUser(usr);
    setCompanySearch('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const companyId = editingUser.role === 'cliente' ? editingUser.company_id : null;

    await updateRecord('users', editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      company_id: companyId || null,
      status: editingUser.status,
    });

    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este usuario?')) {
      await deleteRecord('users', id);
    }
  };

  // --- EXPORTAR / IMPORTAR / RESTABLECER BASE DE DATOS ---

  const handleExportDB = () => {
    const dataState = {
      companies,
      users,
      agreements,
      satisfaction_surveys: [], // Guardar encuestas
      projects,
      invoices,
      collections,
      purchases,
      provider_payments: payments,
    };
    
    // Obtener encuestas directamente de la BD local por las dudas
    const fullStored = localStorage.getItem('overcome_consulting_db');
    let dataStr = JSON.stringify(dataState, null, 2);
    if (fullStored) {
      dataStr = fullStored;
    }

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `overcome_db_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        
        // Validación básica de claves de la BD
        const requiredKeys = ['companies', 'users', 'invoices'];
        const hasKeys = requiredKeys.every(k => k in parsed);

        if (!hasKeys) {
          alert('Error: El archivo JSON seleccionado no es una copia de seguridad válida del sistema Overcome.');
          return;
        }

        const confirmRestore = window.confirm('¿Está seguro de RESTAURAR la base de datos? Se sobrescribirá el estado actual.');
        if (confirmRestore) {
          await restoreDatabase(parsed);
          alert('Base de datos restaurada correctamente.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON de respaldo. Verifique que no esté dañado.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetToSeed = async () => {
    if (window.confirm('¿Está seguro de limpiar y restablecer toda la base de datos a los valores de prueba iniciales?')) {
      localStorage.removeItem('overcome_consulting_db');
      window.location.reload();
    }
  };

  // --- FILTRADOS ---

  const filteredCompanies = companies.filter((c) => {
    const searchString = `${c.name} ${c.tax_id} ${c.contact_name || ''} ${c.contact_position || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const filteredUsers = users.filter((u) => {
    const company = companies.find((c) => c.id === u.company_id);
    const searchString = `${u.name} ${u.email} ${u.role} ${company?.name || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Panel de Administración de Plataforma</h2>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>
            Alta de clientes, control de accesos de usuarios y resguardo de base de datos.
          </p>
        </div>

        {/* Sub-menú de Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card-dark)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
          <button
            onClick={() => { setActiveSubTab('clientes'); setSearchTerm(''); }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSubTab === 'clientes' ? 'var(--primary-orange)' : 'transparent',
              color: activeSubTab === 'clientes' ? 'white' : 'var(--text-light-secondary)',
              fontSize: '0.85rem',
            }}
          >
            Multi-Clientes
          </button>
          <button
            onClick={() => { setActiveSubTab('usuarios'); setSearchTerm(''); }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSubTab === 'usuarios' ? 'var(--primary-orange)' : 'transparent',
              color: activeSubTab === 'usuarios' ? 'white' : 'var(--text-light-secondary)',
              fontSize: '0.85rem',
            }}
          >
            Multi-Usuarios
          </button>
          <button
            onClick={() => { setActiveSubTab('respaldos'); setSearchTerm(''); }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSubTab === 'respaldos' ? 'var(--primary-orange)' : 'transparent',
              color: activeSubTab === 'respaldos' ? 'white' : 'var(--text-light-secondary)',
              fontSize: '0.85rem',
            }}
          >
            Respaldos BD
          </button>
        </div>
      </div>

      {/* --- TAB: MULTI-CLIENTES --- */}
      {activeSubTab === 'clientes' && (
        <div>
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nombre, tax id o email de la empresa..."
              onClearFilters={() => setSearchTerm('')}
            />

            <button className="btn-primary" onClick={() => setShowCompanyModal(true)}>
              + Crear Cliente
            </button>
          </div>

          {/* Tabla de Clientes */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Contacto Principal</th>
                  <th>Cargo</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.contact_name || 'Sin asignar'}</td>
                    <td>{c.contact_position || 'Sin asignar'}</td>
                    <td>{c.email || 'Sin asignar'}</td>
                    <td>{c.phone || 'Sin asignar'}</td>
                    <td>
                      <span className={`badge ${c.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                        {c.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => handleEditCompany(c)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                          onClick={() => handleDeleteCompany(c.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: MULTI-USUARIOS --- */}
      {activeSubTab === 'usuarios' && (
        <div>
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nombre, email o rol del usuario..."
              onClearFilters={() => setSearchTerm('')}
            />

            <button className="btn-primary" onClick={() => { setShowUserModal(true); setCompanySearch(''); }}>
              + Crear Usuario
            </button>
          </div>

          {/* Tabla de Usuarios */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre y Apellido</th>
                  <th>Correo Electrónico</th>
                  <th>Rol / Acceso</th>
                  <th>Empresa Asignada</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const comp = companies.find((c) => c.id === u.company_id);
                  return (
                    <tr key={u.id}>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td>{u.email}</td>
                      <td style={{ textTransform: 'capitalize' }}>
                        <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>{u.role}</span>
                      </td>
                      <td>{comp?.name || <span style={{ color: 'var(--primary-orange)', fontWeight: 600 }}>Overcome Staff</span>}</td>
                      <td>
                        <span className={`badge ${u.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {u.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => handleEditUser(u)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                            onClick={() => handleDeleteUser(u.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB: RESPALDOS BD --- */}
      {activeSubTab === 'respaldos' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Card Resumen de la BD */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <h4 style={{ marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
              Estadísticas de la Base de Datos Local
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dark)', paddingBottom: '8px' }}>
                <span>Clientes (Empresas)</span>
                <span style={{ fontWeight: 600 }}>{companies.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dark)', paddingBottom: '8px' }}>
                <span>Usuarios Totales</span>
                <span style={{ fontWeight: 600 }}>{users.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dark)', paddingBottom: '8px' }}>
                <span>Acuerdos Comerciales</span>
                <span style={{ fontWeight: 600 }}>{agreements.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dark)', paddingBottom: '8px' }}>
                <span>Proyectos / Servicios</span>
                <span style={{ fontWeight: 600 }}>{projects.length}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-dark)', paddingBottom: '8px' }}>
                <span>Facturas Emitidas</span>
                <span style={{ fontWeight: 600 }}>{invoices.length}</span>
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              <button className="btn-secondary" style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)', flex: 1 }} onClick={handleResetToSeed}>
                Restablecer BD inicial
              </button>
            </div>
          </div>

          {/* Acciones de Resguardo */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h4 style={{ textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
              Acciones de Copia de Seguridad
            </h4>
            
            <div>
              <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>1. Exportar Respaldo</h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '10px' }}>
                Descarga una copia completa en un archivo JSON con todos los datos modificados localmente para guardarlo como backup.
              </p>
              <button className="btn-primary" style={{ width: '100%' }} onClick={handleExportDB}>
                ⬇️ Descargar Copia de Seguridad (.json)
              </button>
            </div>

            <div style={{ borderTop: '1px solid var(--border-dark)', paddingTop: '20px' }}>
              <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>2. Importar Respaldo</h5>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '10px' }}>
                Selecciona un archivo JSON de respaldo descargado previamente para restaurar el estado completo de la base de datos.
              </p>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => document.getElementById('db-import-file')?.click()}>
                📁 Cargar y Restaurar JSON
              </button>
              <input
                type="file"
                id="db-import-file"
                style={{ display: 'none' }}
                accept=".json"
                onChange={handleImportDB}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- MODALES --- */}

      {/* 1. Crear Empresa */}
      {showCompanyModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Dar de Alta Empresa Cliente</h3>
              <button className="modal-close" onClick={() => setShowCompanyModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCompany}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Razón Social / Nombre *</label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    placeholder="Ej. Globex Corporation"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ID Fiscal / Tax ID (RUT/NIT/CUIT) *</label>
                  <input
                    type="text"
                    value={companyForm.tax_id}
                    onChange={(e) => setCompanyForm({ ...companyForm, tax_id: e.target.value })}
                    placeholder="Ej. 30-55555555-9"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contacto Principal</label>
                    <input
                      type="text"
                      value={companyForm.contact_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, contact_name: e.target.value })}
                      placeholder="Ej. John Smith"
                    />
                  </div>
                  <div className="form-group">
                    <label>Cargo del Contacto</label>
                    <input
                      type="text"
                      value={companyForm.contact_position}
                      onChange={(e) => setCompanyForm({ ...companyForm, contact_position: e.target.value })}
                      placeholder="Ej. Gerente de Operaciones"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      placeholder="ejemplo@empresa.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Dirección Física</label>
                  <input
                    type="text"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    placeholder="Calle, Altura, Ciudad..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCompanyModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Empresa</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Editar Empresa */}
      {editingCompany && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Editar Razón Social</h3>
              <button className="modal-close" onClick={() => setEditingCompany(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateCompany}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Razón Social / Nombre *</label>
                  <input
                    type="text"
                    value={editingCompany.name}
                    onChange={(e) => setEditingCompany({ ...editingCompany, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ID Fiscal *</label>
                  <input
                    type="text"
                    value={editingCompany.tax_id}
                    onChange={(e) => setEditingCompany({ ...editingCompany, tax_id: e.target.value })}
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Contacto Principal</label>
                    <input
                      type="text"
                      value={editingCompany.contact_name || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, contact_name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cargo del Contacto</label>
                    <input
                      type="text"
                      value={editingCompany.contact_position || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, contact_position: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input
                      type="email"
                      value={editingCompany.email || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="text"
                      value={editingCompany.phone || ''}
                      onChange={(e) => setEditingCompany({ ...editingCompany, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={editingCompany.address || ''}
                    onChange={(e) => setEditingCompany({ ...editingCompany, address: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={editingCompany.status}
                    onChange={(e) => setEditingCompany({ ...editingCompany, status: e.target.value as any })}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingCompany(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Crear Usuario */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Dar de Alta Usuario</h3>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre y Apellido *</label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    placeholder="Ej. Lucas Martinez"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    placeholder="usuario@overcome.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rol de Usuario *</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm({ ...userForm, role: e.target.value as any })}
                    required
                  >
                    <option value="superadmin">Super Admin (Acceso Total)</option>
                    <option value="comercial">Comercial / Ventas</option>
                    <option value="operaciones">Operaciones / Consultor</option>
                    <option value="administracion">Administración / Contable</option>
                    <option value="cliente">Cliente (Externo)</option>
                  </select>
                </div>
                
                {userForm.role === 'cliente' && (
                  <div className="form-group animate-fade-in">
                    <label>Empresa Cliente Asignada *</label>
                    <input
                      type="text"
                      placeholder="🔍 Buscar empresa..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      style={{
                        marginBottom: '6px',
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        width: '100%',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-panel-dark)',
                        border: '1px solid var(--border-dark)',
                        color: 'var(--text-light-primary)',
                      }}
                    />
                    <select
                      value={userForm.company_id}
                      onChange={(e) => setUserForm({ ...userForm, company_id: e.target.value })}
                      required
                    >
                      <option value="">Seleccione la empresa asociada</option>
                      {[...companies]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)', marginTop: '4px' }}>
                      Este usuario cliente solo podrá ver registros asociados a la empresa seleccionada.
                    </p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowUserModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Editar Usuario */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Editar Datos del Usuario</h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre y Apellido *</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico *</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rol de Usuario *</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    required
                  >
                    <option value="superadmin">Super Admin</option>
                    <option value="comercial">Comercial</option>
                    <option value="operaciones">Operaciones</option>
                    <option value="administracion">Administración</option>
                    <option value="cliente">Cliente</option>
                  </select>
                </div>
                
                {editingUser.role === 'cliente' && (
                  <div className="form-group">
                    <label>Empresa Cliente Asignada *</label>
                    <input
                      type="text"
                      placeholder="🔍 Buscar empresa..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      style={{
                        marginBottom: '6px',
                        padding: '6px 10px',
                        fontSize: '0.85rem',
                        width: '100%',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-panel-dark)',
                        border: '1px solid var(--border-dark)',
                        color: 'var(--text-light-primary)',
                      }}
                    />
                    <select
                      value={editingUser.company_id || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, company_id: e.target.value })}
                      required
                    >
                      <option value="">Seleccione la empresa asociada</option>
                      {[...companies]
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                        .map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
