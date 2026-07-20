// OPERACIONESVIEW.TSX
// Módulo de Operaciones de Overcome Consulting:
// Tablero Kanban interactivo para el seguimiento de Proyectos y Servicios.

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SearchFilter } from '../../components/SearchFilter';

type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'completed' | 'paused';

interface KanbanColumn {
  id: ProjectStatus;
  title: string;
  color: string;
}

export const OperacionesView: React.FC = () => {
  const {
    companies,
    projects,
    users,
    activeRole,
    currentUser,
    createRecord,
    updateRecord,
    deleteRecord,
  } = useApp();

  const isClient = activeRole === 'cliente';
  const clientCompanyId = currentUser?.company_id;

  // Estados de búsqueda y filtrado
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState(isClient ? clientCompanyId || 'ALL' : 'ALL');
  const [userFilter, setUserFilter] = useState('ALL');
  const [companySearch, setCompanySearch] = useState('');

  // Modales
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'proyectos' | 'consultores'>('proyectos');
  const [collapsedColumns, setCollapsedColumns] = useState<{ [key in ProjectStatus]?: boolean }>({
    planning: true,
    completed: true,
    paused: true,
  });
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'operaciones' as 'superadmin' | 'comercial' | 'operaciones' | 'administracion' | 'cliente',
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };
  const [newProject, setNewProject] = useState({
    company_id: '',
    name: '',
    description: '',
    status: 'planning' as ProjectStatus,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    assigned_user_ids: [] as string[],
  });

  // Columnas de nuestro tablero Kanban
  const columns: KanbanColumn[] = [
    { id: 'planning', title: 'Planificación', color: 'var(--text-light-muted)' },
    { id: 'in_progress', title: 'En Curso', color: 'var(--primary-orange)' },
    { id: 'completed', title: 'Completado', color: 'var(--accent-green)' },
    { id: 'paused', title: 'Pausado', color: 'var(--accent-red)' },
  ];

  // --- ACCIONES ---

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.company_id || !newProject.name || !newProject.start_date) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    await createRecord('projects', {
      ...newProject,
      assigned_user_id: newProject.assigned_user_ids[0] || null,
      assigned_user_ids: newProject.assigned_user_ids,
      end_date: newProject.end_date || null,
    });

    setShowProjectModal(false);
    setNewProject({
      company_id: '',
      name: '',
      description: '',
      status: 'planning',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      assigned_user_ids: [],
    });
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    await createRecord('users', {
      ...newUser,
      company_id: null,
      status: 'active',
    });

    setShowUserModal(false);
    setNewUser({
      name: '',
      email: '',
      role: 'operaciones',
    });
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editingUser.name || !editingUser.email) {
      alert('Por favor complete los campos obligatorios');
      return;
    }

    await updateRecord('users', editingUser.id, {
      name: editingUser.name,
      email: editingUser.email,
      role: editingUser.role,
      status: editingUser.status,
    });

    setEditingUser(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este consultor?')) {
      await deleteRecord('users', id);
      setEditingUser(null);
    }
  };

  const toggleColumn = (colId: ProjectStatus) => {
    setCollapsedColumns(prev => ({
      ...prev,
      [colId]: !prev[colId],
    }));
  };

  const handleUpdateStatus = async (projectId: string, newStatus: ProjectStatus) => {
    if (isClient) return; // Clientes no editan flujos
    await updateRecord('projects', projectId, { status: newStatus });
  };

  const handleEditProjectClick = (proj: any) => {
    if (isClient) return;
    const assignedIds = proj.assigned_user_ids || (proj.assigned_user_id ? [proj.assigned_user_id] : []);
    setEditingProject({
      ...proj,
      assigned_user_ids: assignedIds,
    });
    setCompanySearch('');
  };

  const handleSaveEditProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;

    await updateRecord('projects', editingProject.id, {
      name: editingProject.name,
      description: editingProject.description,
      status: editingProject.status,
      start_date: editingProject.start_date,
      end_date: editingProject.end_date || null,
      company_id: editingProject.company_id,
      assigned_user_id: editingProject.assigned_user_ids[0] || null,
      assigned_user_ids: editingProject.assigned_user_ids || [],
    });

    setEditingProject(null);
  };

  const handleDeleteProject = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este proyecto?')) {
      await deleteRecord('projects', id);
      setEditingProject(null);
    }
  };

  // --- FILTRADO DE PROYECTOS ---
  const filteredProjects = projects.filter((p) => {
    // Multi-tenant: Si es cliente, solo sus proyectos
    if (isClient && p.company_id !== clientCompanyId) return false;

    // Filtro por Cliente
    if (!isClient && companyFilter !== 'ALL' && p.company_id !== companyFilter) return false;

    // Filtro por Consultor asignado
    const assignedIds = p.assigned_user_ids || (p.assigned_user_id ? [p.assigned_user_id] : []);
    if (userFilter !== 'ALL' && !assignedIds.includes(userFilter)) return false;

    // Buscador texto
    const company = companies.find((c) => c.id === p.company_id);
    const assignedConsultants = users.filter((u) => assignedIds.includes(u.id));
    const consultantsNameString = assignedConsultants.map((u) => u.name).join(' ');
    const searchString = `${p.name} ${p.description || ''} ${company?.name || ''} ${consultantsNameString}`.toLowerCase();
    
    return searchString.includes(searchTerm.toLowerCase());
  });

  const companyOptions = [...companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name }));
  const internalUsersOptions = users
    .filter((u) => u.role !== 'cliente')
    .map((u) => ({ value: u.id, label: u.name }));

  // --- FILTRADO DE CONSULTORES ---
  const filteredConsultants = users.filter((u) => {
    if (u.role === 'cliente') return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Operaciones (Proyectos y Servicios)</h2>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>
            Gestión del avance de los servicios contratados por clientes de Overcome Consulting.
          </p>
        </div>

        {/* Sub-menú de Tabs */}
        {!isClient && (
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card-dark)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
            <button
              onClick={() => { setActiveTab('proyectos'); setSearchTerm(''); }}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'proyectos' ? 'var(--primary-orange)' : 'transparent',
                color: activeTab === 'proyectos' ? 'white' : 'var(--text-light-secondary)',
                fontSize: '0.85rem',
              }}
            >
              Tablero de Proyectos
            </button>
            <button
              onClick={() => { setActiveTab('consultores'); setSearchTerm(''); }}
              className="btn-secondary"
              style={{
                padding: '8px 14px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeTab === 'consultores' ? 'var(--primary-orange)' : 'transparent',
                color: activeTab === 'consultores' ? 'white' : 'var(--text-light-secondary)',
                fontSize: '0.85rem',
              }}
            >
              Maestro de Consultores
            </button>
          </div>
        )}
      </div>

      {activeTab === 'proyectos' ? (
        <>
          {/* Buscadores y Filtros */}
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar proyectos, consultores o descripción..."
              filters={[
                ...(!isClient ? [{ key: 'company', label: 'Clientes', options: companyOptions }] : []),
                { key: 'user', label: 'Consultor Asignado', options: internalUsersOptions },
              ]}
              activeFilters={{
                company: companyFilter,
                user: userFilter,
              }}
              onFilterChange={(key, val) => {
                if (key === 'company') setCompanyFilter(val);
                if (key === 'user') setUserFilter(val);
              }}
              onClearFilters={() => {
                setSearchTerm('');
                setCompanyFilter(isClient ? clientCompanyId || 'ALL' : 'ALL');
                setUserFilter('ALL');
              }}
            />

            {!isClient && (activeRole === 'superadmin' || activeRole === 'operaciones') && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" onClick={() => setShowUserModal(true)}>
                  + Alta Consultor
                </button>
                <button className="btn-primary" onClick={() => { setShowProjectModal(true); setCompanySearch(''); }}>
                  + Nuevo Proyecto
                </button>
              </div>
            )}
          </div>

          {/* Kanban Board Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: columns.map(col => collapsedColumns[col.id] ? '60px' : '1fr').join(' '),
            gap: '16px',
            overflowX: 'auto',
            paddingBottom: '16px',
            minWidth: '900px',
            transition: 'grid-template-columns 0.3s ease'
          }}>
            {columns.map((col) => {
              const colProjects = filteredProjects.filter((p) => p.status === col.id);
              const isCollapsed = !!collapsedColumns[col.id];

              return (
                <div
                  key={col.id}
                  className="glass-panel"
                  style={{
                    borderRadius: '12px',
                    padding: isCollapsed ? '16px 4px' : '16px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minHeight: '500px',
                    background: 'rgba(20, 20, 22, 0.6)',
                    width: '100%',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {isCollapsed ? (
                    /* COLUMNA COLAPSADA / MINIMIZADA */
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', height: '100%' }}>
                      <button
                        type="button"
                        onClick={() => toggleColumn(col.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-light-muted)',
                          cursor: 'pointer',
                          fontSize: '1rem',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'transform 0.2s'
                        }}
                        title="Expandir columna"
                      >
                        ➡️
                      </button>
                      <span style={{
                        writingMode: 'vertical-rl',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        color: col.color,
                        letterSpacing: '0.05em',
                        whiteSpace: 'nowrap',
                        transform: 'rotate(180deg)',
                        margin: '10px 0',
                        cursor: 'pointer'
                      }}
                        onClick={() => toggleColumn(col.id)}
                      >
                        {col.title}
                      </span>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: 'var(--bg-panel-dark)',
                          padding: '2px 8px',
                          borderRadius: '20px',
                          color: 'var(--text-light-muted)',
                        }}
                      >
                        {colProjects.length}
                      </span>
                    </div>
                  ) : (
                    /* COLUMNA ABIERTA / EXPANDIDA */
                    <>
                      {/* Encabezado Columna */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-dark)', paddingBottom: '10px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: col.color, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          {col.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: 'var(--bg-panel-dark)',
                              padding: '2px 8px',
                              borderRadius: '20px',
                              color: 'var(--text-light-muted)',
                            }}
                          >
                            {colProjects.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleColumn(col.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-light-muted)',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Minimizar columna"
                          >
                            ⬅️
                          </button>
                        </div>
                      </div>

                      {/* Contenedor de Tarjetas */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                    {colProjects.map((p) => {
                      const company = companies.find((c) => c.id === p.company_id);
                      const assignedIds = p.assigned_user_ids || (p.assigned_user_id ? [p.assigned_user_id] : []);
                      const assignedConsultants = users.filter((u) => assignedIds.includes(u.id));
                      const displayNames = assignedConsultants.map(u => u.name.split(' ')[0]).join(', ');

                      return (
                        <div
                          key={p.id}
                          className="glass-card"
                          style={{
                            padding: '14px',
                            borderRadius: '8px',
                            borderLeft: `3px solid ${col.color}`,
                            cursor: isClient ? 'default' : 'pointer',
                          }}
                          onClick={() => handleEditProjectClick(p)}
                        >
                          <div style={{ fontSize: '0.75rem', color: 'var(--primary-orange)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
                            {company?.name}
                          </div>
                          <h5 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px', color: 'white' }}>{p.name}</h5>
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)', lineClamp: 2, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: '10px' }}>
                            {p.description || 'Sin descripción.'}
                          </p>

                          {/* Footer Card */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: 'var(--text-light-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span>Inicio: {formatDate(p.start_date)}</span>
                              {p.end_date ? (
                                <span>Fin: {formatDate(p.end_date)}</span>
                              ) : (
                                <span style={{ opacity: 0.6 }}>Fin: S/N</span>
                              )}
                            </div>
                            <span style={{ fontWeight: 600, color: 'var(--text-light-secondary)', textAlign: 'right', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={displayNames || 'Sin asignar'}>
                              👤 {displayNames || 'Sin asignar'}
                            </span>
                          </div>

                          {/* Selector de Cambiar de Columna Rápido para Staff */}
                          {!isClient && (
                            <div
                              style={{ marginTop: '10px', display: 'flex', gap: '4px', justifyContent: 'flex-end' }}
                              onClick={(e) => e.stopPropagation()} // Prevenir abrir el modal completo
                            >
                              <select
                                value={p.status}
                                onChange={(e) => handleUpdateStatus(p.id, e.target.value as ProjectStatus)}
                                style={{ padding: '2px 4px', fontSize: '0.7rem', background: 'var(--bg-black)', border: '1px solid var(--border-dark)', borderRadius: '4px' }}
                              >
                                {columns.map((colOpt) => (
                                  <option key={colOpt.id} value={colOpt.id}>{colOpt.title}</option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Buscadores y Filtros Consultores */}
          <div className="view-header-actions">
            <div className="search-filters-bar" style={{ flex: 1 }}>
              <div className="search-input-wrapper" style={{ width: '100%' }}>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Buscar consultor por nombre, email o rol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg className="search-icon-svg" viewBox="0 0 24 24">
                  <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </div>
            </div>

            {!isClient && (activeRole === 'superadmin' || activeRole === 'operaciones') && (
              <button className="btn-primary" onClick={() => setShowUserModal(true)}>
                + Alta Consultor
              </button>
            )}
          </div>

          {/* Tabla de Consultores */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre Completo</th>
                  <th>Correo Electrónico</th>
                  <th>Rol en la Organización</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredConsultants.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                      No se encontraron consultores.
                    </td>
                  </tr>
                ) : (
                  filteredConsultants.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 600 }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: user.role === 'superadmin' ? 'var(--accent-red-alpha)' : user.role === 'operaciones' ? 'var(--primary-orange-alpha)' : 'rgba(255, 255, 255, 0.05)',
                            color: user.role === 'superadmin' ? 'var(--accent-red)' : user.role === 'operaciones' ? 'var(--primary-orange)' : 'var(--text-light-secondary)',
                            border: '1px solid rgba(255, 255, 255, 0.05)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {user.role === 'operaciones' ? 'Operaciones / Consultor' : user.role}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${user.status === 'active' ? 'badge-success' : 'badge-danger'}`}>
                          {user.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => setEditingUser(user)}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-danger"
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODALES */}

      {/* 1. Modal de Creación */}
      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registrar Nuevo Proyecto</h3>
              <button className="modal-close" onClick={() => setShowProjectModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Empresa Cliente *</label>
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
                    value={newProject.company_id}
                    onChange={(e) => setNewProject({ ...newProject, company_id: e.target.value })}
                    required
                  >
                    <option value="">Seleccione una empresa</option>
                    {[...companies]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre del Proyecto / Servicio *</label>
                  <input
                    type="text"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                    placeholder="Ej. Rediseño Organizacional 2026"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción y Alcance</label>
                  <textarea
                    rows={3}
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                    placeholder="Detallar entregables, metodologías..."
                  />
                </div>
                <div className="form-group">
                  <label>Consultores Responsables (Seleccionar varios)</label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-dark)',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--bg-black)'
                  }}>
                    {users
                      .filter((u) => u.role !== 'cliente' && u.status === 'active')
                      .map((u) => {
                        const isChecked = newProject.assigned_user_ids.includes(u.id);
                        return (
                          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-light-secondary)' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewProject({ ...newProject, assigned_user_ids: [...newProject.assigned_user_ids, u.id] });
                                } else {
                                  setNewProject({ ...newProject, assigned_user_ids: newProject.assigned_user_ids.filter(id => id !== u.id) });
                                }
                              }}
                            />
                            <span>{u.name} ({u.role === 'operaciones' ? 'Operaciones / Consultor' : u.role})</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Inicio *</label>
                    <input
                      type="date"
                      value={newProject.start_date}
                      onChange={(e) => setNewProject({ ...newProject, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Finalización (Prevista)</label>
                    <input
                      type="date"
                      value={newProject.end_date}
                      onChange={(e) => setNewProject({ ...newProject, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Estado Inicial</label>
                  <select
                    value={newProject.status}
                    onChange={(e) => setNewProject({ ...newProject, status: e.target.value as ProjectStatus })}
                  >
                    <option value="planning">Planificación</option>
                    <option value="in_progress">En Curso</option>
                    <option value="completed">Completado</option>
                    <option value="paused">Pausado</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowProjectModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Crear Proyecto</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal de Edición de Proyecto (Staff only) */}
      {editingProject && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Editar Proyecto</h3>
              <button className="modal-close" onClick={() => setEditingProject(null)}>×</button>
            </div>
            <form onSubmit={handleSaveEditProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Empresa Cliente</label>
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
                    value={editingProject.company_id}
                    onChange={(e) => setEditingProject({ ...editingProject, company_id: e.target.value })}
                    required
                  >
                    {[...companies]
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()))
                      .map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre del Proyecto *</label>
                  <input
                    type="text"
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción y Alcance</label>
                  <textarea
                    rows={3}
                    value={editingProject.description || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Consultores Responsables (Seleccionar varios)</label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    maxHeight: '150px',
                    overflowY: 'auto',
                    border: '1px solid var(--border-dark)',
                    padding: '10px',
                    borderRadius: '6px',
                    background: 'var(--bg-black)'
                  }}>
                    {users
                      .filter((u) => u.role !== 'cliente' && u.status === 'active')
                      .map((u) => {
                        const assignedIds = editingProject.assigned_user_ids || [];
                        const isChecked = assignedIds.includes(u.id);
                        return (
                          <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-light-secondary)' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setEditingProject({ ...editingProject, assigned_user_ids: [...assignedIds, u.id] });
                                } else {
                                  setEditingProject({ ...editingProject, assigned_user_ids: assignedIds.filter((id: string) => id !== u.id) });
                                }
                              }}
                            />
                            <span>{u.name} ({u.role === 'operaciones' ? 'Operaciones / Consultor' : u.role})</span>
                          </label>
                        );
                      })}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Inicio *</label>
                    <input
                      type="date"
                      value={editingProject.start_date}
                      onChange={(e) => setEditingProject({ ...editingProject, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Finalización</label>
                    <input
                      type="date"
                      value={editingProject.end_date || ''}
                      onChange={(e) => setEditingProject({ ...editingProject, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={editingProject.status}
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as ProjectStatus })}
                  >
                    <option value="planning">Planificación</option>
                    <option value="in_progress">En Curso</option>
                    <option value="completed">Completado</option>
                    <option value="paused">Pausado</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => handleDeleteProject(editingProject.id)}
                >
                  Eliminar Proyecto
                </button>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setEditingProject(null)}>Cancelar</button>
                  <button type="submit" className="btn-primary">Guardar Cambios</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Registro de Consultor */}
      {showUserModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registrar Consultor Responsable</h3>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre Completo *</label>
                  <input
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    placeholder="Ej. Ing. Martin Gómez"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico *</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="ejemplo@overcome.com"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Rol en la Organización</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                  >
                    <option value="operaciones">Operaciones / Consultoría</option>
                    <option value="comercial">Comercial</option>
                    <option value="administracion">Administración</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowUserModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Consultor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal de Edición de Consultor */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Modificar Consultor</h3>
              <button className="modal-close" onClick={() => setEditingUser(null)}>×</button>
            </div>
            <form onSubmit={handleSaveEditUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre Completo *</label>
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
                  <label>Rol en la Organización</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                  >
                    <option value="operaciones">Operaciones / Consultoría</option>
                    <option value="comercial">Comercial</option>
                    <option value="administracion">Administración</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
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
