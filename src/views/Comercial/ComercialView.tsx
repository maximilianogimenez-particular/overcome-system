// COMERCIALVIEW.TSX
// Gestión Comercial de Overcome Consulting:
// Sub-módulos: 1. Alta Cliente, 2. Cotizaciones, 3. Satisfacción (NPS)

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { SearchFilter } from '../../components/SearchFilter';

export const ComercialView: React.FC = () => {
  const {
    companies,
    agreements,
    surveys,
    activeRole,
    currentUser,
    createRecord,
    updateRecord,
    deleteRecord,
  } = useApp();

  const isClient = activeRole === 'cliente';
  const clientCompanyId = currentUser?.company_id;

  // Estados de la UI
  const [activeSubTab, setActiveSubTab] = useState<'alta_cliente' | 'acuerdos' | 'satisfaccion'>('acuerdos');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState(isClient ? clientCompanyId || 'ALL' : 'ALL');
  const [companySearch, setCompanySearch] = useState('');

  // Ajustar pestaña si es cliente (no tiene acceso a Alta Cliente)
  useEffect(() => {
    if (isClient && activeSubTab === 'alta_cliente') {
      setActiveSubTab('acuerdos');
    }
  }, [isClient, activeSubTab]);

  // --- ESTADOS ALTA CLIENTE (COMPANIES) ---
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any | null>(null);
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

  // --- ESTADOS COTIZACIONES (AGREEMENTS) ---
  const [showAgreementModal, setShowAgreementModal] = useState(false);
  const [newAgreement, setNewAgreement] = useState({
    company_id: null as string | null,
    prospect_company_name: '',
    title: '',
    description: '',
    amount: '',
    months: '1',
    currency: 'ARS',
    status: 'Negociacion' as const,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });
  const [isProspect, setIsProspect] = useState(false);
  const [isEditingProspect, setIsEditingProspect] = useState(false);
  const [editingAgreement, setEditingAgreement] = useState<any | null>(null);
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [newCommentData, setNewCommentData] = useState<{ [agreementId: string]: { date: string; comment: string } }>({});
  const [editingCommentRef, setEditingCommentRef] = useState<{ agreementId: string; index: number } | null>(null);
  const [editingCommentText, setEditingCommentText] = useState({ date: '', comment: '' });

  // --- ESTADOS ENCUESTAS (NPS) ---
  const [showSurveyModal, setShowSurveyModal] = useState(false);
  const [newSurvey, setNewSurvey] = useState({
    company_id: isClient ? clientCompanyId || '' : '',
    score: 10,
    comments: '',
    survey_date: new Date().toISOString().split('T')[0],
  });

  // --- ACCIONES ALTA CLIENTE ---

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyForm.name || !companyForm.tax_id) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
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

  const handleSaveEditCompany = async (e: React.FormEvent) => {
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
    const hasAgreements = agreements.some((a) => a.company_id === id);
    if (hasAgreements) {
      alert('No se puede eliminar este cliente porque tiene cotizaciones asociadas.');
      return;
    }
    if (window.confirm('¿Está seguro de eliminar esta empresa cliente? (Baja)')) {
      await deleteRecord('companies', id);
    }
  };

  // --- ACCIONES COTIZACIONES ---

  const handleCreateAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProspect && !newAgreement.prospect_company_name) {
      alert('Por favor ingrese el nombre del prospecto');
      return;
    }
    if (!isProspect && !newAgreement.company_id) {
      alert('Por favor seleccione un cliente');
      return;
    }
    if (!newAgreement.title || !newAgreement.amount || !newAgreement.start_date) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
    await createRecord('agreements', {
      ...newAgreement,
      company_id: isProspect ? null : newAgreement.company_id,
      prospect_company_name: isProspect ? newAgreement.prospect_company_name : null,
      amount: Math.round(parseFloat(newAgreement.amount)),
      months: parseInt(newAgreement.months) || 1,
      end_date: newAgreement.end_date || null,
    });
    setShowAgreementModal(false);
    setNewAgreement({
      company_id: null,
      prospect_company_name: '',
      title: '',
      description: '',
      amount: '',
      months: '1',
      currency: 'ARS',
      status: 'Negociacion',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    });
    setIsProspect(false);
  };

  const handleSaveEditAgreement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgreement) return;
    if (isEditingProspect && !editingAgreement.prospect_company_name) {
      alert('Por favor ingrese el nombre del prospecto');
      return;
    }
    if (!isEditingProspect && !editingAgreement.company_id) {
      alert('Por favor seleccione un cliente');
      return;
    }
    await updateRecord('agreements', editingAgreement.id, {
      company_id: isEditingProspect ? null : editingAgreement.company_id,
      prospect_company_name: isEditingProspect ? editingAgreement.prospect_company_name : null,
      title: editingAgreement.title,
      description: editingAgreement.description,
      amount: Math.round(parseFloat(editingAgreement.amount.toString())),
      months: parseInt(editingAgreement.months.toString()) || 1,
      currency: editingAgreement.currency,
      status: editingAgreement.status,
      start_date: editingAgreement.start_date,
      end_date: editingAgreement.end_date || null,
    });
    setEditingAgreement(null);
  };

  const handleChangeAgreementStatus = async (id: string, status: 'Negociacion' | 'Aprobada' | 'Perdida' | 'Suspendida') => {
    await updateRecord('agreements', id, { status });
  };

  const handleDeleteAgreement = async (id: string) => {
    if (window.confirm('¿Está seguro de eliminar esta cotización? (Baja)')) {
      await deleteRecord('agreements', id);
    }
  };

  const toggleComments = (agreementId: string) => {
    setExpandedComments(prev => ({
      ...prev,
      [agreementId]: !prev[agreementId],
    }));
  };

  const handleCommentDataChange = (agreementId: string, field: 'date' | 'comment', value: string) => {
    setNewCommentData(prev => ({
      ...prev,
      [agreementId]: {
        date: prev[agreementId]?.date || new Date().toISOString().split('T')[0],
        comment: prev[agreementId]?.comment || '',
        [field]: value,
      }
    }));
  };

  const handleAddComment = async (e: React.FormEvent, agreementId: string) => {
    e.preventDefault();
    const data = newCommentData[agreementId];
    if (!data || !data.comment.trim()) {
      alert('Por favor ingrese un comentario');
      return;
    }
    const date = data.date || new Date().toISOString().split('T')[0];

    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const comments = agreement.follow_up_comments || [];
    const updatedComments = [...comments, { date, comment: data.comment }];

    await updateRecord('agreements', agreementId, {
      follow_up_comments: updatedComments
    });

    // Reset input
    setNewCommentData(prev => ({
      ...prev,
      [agreementId]: {
        date: new Date().toISOString().split('T')[0],
        comment: '',
      }
    }));
  };

  const handleDeleteComment = async (agreementId: string, indexToDelete: number) => {
    if (!window.confirm('¿Está seguro de eliminar este comentario de seguimiento?')) return;
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const comments = agreement.follow_up_comments || [];
    const updatedComments = comments.filter((_, idx) => idx !== indexToDelete);

    await updateRecord('agreements', agreementId, {
      follow_up_comments: updatedComments
    });
  };

  const handleStartEditComment = (agreementId: string, index: number, currentData: { date: string; comment: string }) => {
    setEditingCommentRef({ agreementId, index });
    setEditingCommentText({ date: currentData.date, comment: currentData.comment });
  };

  const handleSaveEditComment = async (agreementId: string, indexToUpdate: number) => {
    if (!editingCommentText.comment.trim()) {
      alert('Por favor ingrese un comentario');
      return;
    }
    const agreement = agreements.find(a => a.id === agreementId);
    if (!agreement) return;

    const comments = [...(agreement.follow_up_comments || [])];
    comments[indexToUpdate] = {
      date: editingCommentText.date || new Date().toISOString().split('T')[0],
      comment: editingCommentText.comment.trim()
    };

    await updateRecord('agreements', agreementId, {
      follow_up_comments: comments
    });

    setEditingCommentRef(null);
  };

  // --- ACCIONES ENCUESTAS ---

  const handleCreateSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurvey.company_id || !newSurvey.score) {
      alert('Por favor complete los campos obligatorios');
      return;
    }
    await createRecord('satisfaction_surveys', {
      ...newSurvey,
      user_id: currentUser?.id || null,
      score: parseInt(newSurvey.score.toString()),
      comments: newSurvey.comments || null,
    });
    setShowSurveyModal(false);
    setNewSurvey({
      company_id: isClient ? clientCompanyId || '' : '',
      score: 10,
      comments: '',
      survey_date: new Date().toISOString().split('T')[0],
    });
  };

  // --- FORMATEADORES ---
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatCurrencyARS = (amount: number) => {
    const rounded = Math.round(amount);
    return `$ ${rounded.toLocaleString('es-AR')}`;
  };

  // --- FILTRADOS ---

  // 1. Filtrar Clientes (Alta Cliente Tab)
  const filteredCompanies = companies.filter((c) => {
    const searchString = `${c.name} ${c.tax_id} ${c.contact_name || ''} ${c.contact_position || ''} ${c.email || ''} ${c.phone || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // 2. Filtrar Cotizaciones
  const filteredAgreements = agreements
    .filter((a) => {
      if (isClient && a.company_id !== clientCompanyId) return false;
      if (!isClient && companyFilter !== 'ALL' && a.company_id !== companyFilter) return false;
      if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

      const company = companies.find((c) => c.id === a.company_id);
      const clientName = company ? company.name : (a.prospect_company_name || '');
      const searchString = `${a.title} ${a.description || ''} ${clientName}`.toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''));

  // 3. Filtrar Encuestas
  const filteredSurveys = surveys.filter((s) => {
    if (isClient && s.company_id !== clientCompanyId) return false;
    if (!isClient && companyFilter !== 'ALL' && s.company_id !== companyFilter) return false;

    const company = companies.find((c) => c.id === s.company_id);
    const searchString = `${s.comments || ''} ${company?.name || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // Opciones de búsqueda
  const companyOptions = [...companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name }));
  const agreementStatusOptions = [
    { value: 'Negociacion', label: 'Negociacion' },
    { value: 'Aprobada', label: 'Aprobada' },
    { value: 'Perdida', label: 'Perdida' },
    { value: 'Suspendida', label: 'Suspendida' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Gestión Comercial</h2>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>
            Control de cotizaciones de servicios, propuestas comerciales y encuestas de satisfacción.
          </p>
        </div>

        {/* Botones de sub-módulos */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card-dark)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
          <button
            onClick={() => { setActiveSubTab('acuerdos'); setSearchTerm(''); }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSubTab === 'acuerdos' ? 'var(--primary-orange)' : 'transparent',
              color: activeSubTab === 'acuerdos' ? 'white' : 'var(--text-light-secondary)',
            }}
          >
            Cotizaciones
          </button>
          {!isClient && (
            <button
              onClick={() => { setActiveSubTab('alta_cliente'); setSearchTerm(''); }}
              className="btn-secondary"
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeSubTab === 'alta_cliente' ? 'var(--primary-orange)' : 'transparent',
                color: activeSubTab === 'alta_cliente' ? 'white' : 'var(--text-light-secondary)',
              }}
            >
              Alta Cliente
            </button>
          )}
          <button
            onClick={() => { setActiveSubTab('satisfaccion'); setSearchTerm(''); }}
            className="btn-secondary"
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSubTab === 'satisfaccion' ? 'var(--primary-orange)' : 'transparent',
              color: activeSubTab === 'satisfaccion' ? 'white' : 'var(--text-light-secondary)',
            }}
          >
            Satisfacción
          </button>
        </div>
      </div>

      {/* --- SUBTAB 1: ALTA CLIENTE --- */}
      {activeSubTab === 'alta_cliente' && !isClient && (
        <div>
          {/* Filtros */}
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por cliente, contacto, cargo, email o teléfono..."
              onClearFilters={() => setSearchTerm('')}
            />

            {(activeRole === 'superadmin' || activeRole === 'comercial') && (
              <button className="btn-primary" onClick={() => setShowCompanyModal(true)}>
                + Alta Cliente
              </button>
            )}
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
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                      No se encontraron clientes registrados.
                    </td>
                  </tr>
                ) : (
                  filteredCompanies.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.contact_name || 'Sin asignar'}</td>
                      <td>{c.contact_position || 'Sin asignar'}</td>
                      <td>{c.email || 'Sin asignar'}</td>
                      <td>{c.phone || 'Sin asignar'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => setEditingCompany(c)}
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUBTAB 2: COTIZACIONES --- */}
      {activeSubTab === 'acuerdos' && (
        <div>
          {/* Filtros */}
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar cotizaciones, alcance o clientes..."
              filters={[
                ...(!isClient ? [{ key: 'company', label: 'Clientes', options: companyOptions }] : []),
                { key: 'status', label: 'Estados', options: agreementStatusOptions },
              ]}
              activeFilters={{
                company: companyFilter,
                status: statusFilter,
              }}
              onFilterChange={(key, val) => {
                if (key === 'company') setCompanyFilter(val);
                if (key === 'status') setStatusFilter(val);
              }}
              onClearFilters={() => {
                setSearchTerm('');
                setCompanyFilter(isClient ? clientCompanyId || 'ALL' : 'ALL');
                setStatusFilter('ALL');
              }}
            />

            {!isClient && (activeRole === 'superadmin' || activeRole === 'comercial') && (
              <button className="btn-primary" onClick={() => { setShowAgreementModal(true); setCompanySearch(''); }}>
                + Nueva Cotización
              </button>
            )}
          </div>

          {/* Tabla de cotizaciones */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Servicio / Proyecto</th>
                  <th>Meses</th>
                  <th>Monto</th>
                  <th>Estado</th>
                  {!isClient && <th>Acciones con ABM</th>}
                </tr>
              </thead>
              <tbody>
                {filteredAgreements.length === 0 ? (
                  <tr>
                    <td colSpan={isClient ? 6 : 7} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                      No se encontraron cotizaciones registradas.
                    </td>
                  </tr>
                ) : (
                  filteredAgreements.map((a) => {
                    const company = companies.find((c) => c.id === a.company_id);
                    return (
                      <React.Fragment key={a.id}>
                        <tr>
                          {/* 1. Fecha */}
                          <td>{formatDate(a.start_date)}</td>
                          
                          {/* 2. Cliente */}
                          <td>
                            {company ? (
                              company.name
                            ) : a.prospect_company_name ? (
                              <span>
                                {a.prospect_company_name}{' '}
                                <span style={{ fontSize: '0.7rem', color: 'var(--accent-yellow)', opacity: 0.85, background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>
                                  Prospecto
                                </span>
                              </span>
                            ) : (
                              'S/N'
                            )}
                          </td>
                          
                          {/* 3. Servicio / Proyecto */}
                          <td>
                            <div style={{ fontWeight: 400 }}>{a.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', marginBottom: '4px' }}>{a.description}</div>
                            <button
                              type="button"
                              onClick={() => toggleComments(a.id)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--primary-orange)',
                                cursor: 'pointer',
                                fontSize: '0.75rem',
                                padding: 0,
                                textDecoration: 'underline',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              💬 Seguimiento ({(a.follow_up_comments || []).length})
                            </button>
                          </td>
                          
                          {/* 4. Meses */}
                          <td>{a.months || 1}</td>
                          
                          {/* 5. Monto (Sin Negrita, redondeado) */}
                          <td style={{ fontWeight: 400 }}>{formatCurrencyARS(a.amount)}</td>
                          
                          {/* 6. Estado */}
                          <td>
                            {!isClient && (activeRole === 'superadmin' || activeRole === 'comercial') ? (
                              <select
                                value={a.status}
                                onChange={(e) => handleChangeAgreementStatus(a.id, e.target.value as any)}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.85rem',
                                  color: a.status === 'Aprobada' ? 'var(--accent-green)' : a.status === 'Negociacion' ? 'var(--accent-yellow)' : a.status === 'Suspendida' ? '#ADB5BD' : 'var(--accent-red)',
                                  backgroundColor: 'var(--bg-panel-dark)',
                                  borderColor: a.status === 'Aprobada' ? 'rgba(16, 185, 129, 0.4)' : a.status === 'Negociacion' ? 'rgba(245, 158, 11, 0.4)' : a.status === 'Suspendida' ? '#555' : 'rgba(239, 68, 68, 0.4)',
                                  borderWidth: '1.5px',
                                  borderRadius: '6px',
                                  fontWeight: 600,
                                }}
                              >
                                <option value="Negociacion" style={{ color: 'var(--accent-yellow)', backgroundColor: 'var(--bg-card-dark)' }}>Negociacion</option>
                                <option value="Aprobada" style={{ color: 'var(--accent-green)', backgroundColor: 'var(--bg-card-dark)' }}>Aprobada</option>
                                <option value="Perdida" style={{ color: 'var(--accent-red)', backgroundColor: 'var(--bg-card-dark)' }}>Perdida</option>
                                <option value="Suspendida" style={{ color: '#ADB5BD', backgroundColor: 'var(--bg-card-dark)' }}>Suspendida</option>
                              </select>
                            ) : (
                              <span 
                                className="badge" 
                                style={{ 
                                  backgroundColor: a.status === 'Aprobada' ? 'var(--accent-green-alpha)' : a.status === 'Negociacion' ? 'var(--accent-yellow-alpha)' : a.status === 'Suspendida' ? 'rgba(108, 117, 125, 0.1)' : 'var(--accent-red-alpha)', 
                                  color: a.status === 'Aprobada' ? 'var(--accent-green)' : a.status === 'Negociacion' ? 'var(--accent-yellow)' : a.status === 'Suspendida' ? '#ADB5BD' : 'var(--accent-red)',
                                  border: `1px solid ${a.status === 'Aprobada' ? 'rgba(16, 185, 129, 0.2)' : a.status === 'Negociacion' ? 'rgba(245, 158, 11, 0.2)' : a.status === 'Suspendida' ? 'rgba(108, 117, 125, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                }}
                              >
                                {a.status}
                              </span>
                            )}
                          </td>
                          
                          {/* 7. Acciones ABM */}
                          {!isClient && (
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setEditingAgreement({
                                      ...a,
                                      amount: a.amount.toString(),
                                      months: a.months.toString(),
                                    });
                                    setIsEditingProspect(!a.company_id);
                                    setCompanySearch('');
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                  onClick={() => handleDeleteAgreement(a.id)}
                                >
                                  Eliminar
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                        {expandedComments[a.id] && (
                          <tr>
                            <td colSpan={isClient ? 6 : 7} style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '16px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <h6 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-orange)' }}>
                                  Seguimiento de la Propuesta / Historial de Comentarios
                                </h6>
                                
                                {/* List of comments */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                                  {(a.follow_up_comments || []).length === 0 ? (
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-light-muted)', fontStyle: 'italic' }}>
                                      No hay comentarios de seguimiento registrados para esta propuesta.
                                    </div>
                                  ) : (
                                    [...(a.follow_up_comments || [])]
                                      .map((c, originalIndex) => ({ ...c, originalIndex }))
                                      .sort((c1, c2) => c1.date.localeCompare(c2.date))
                                      .map((c) => (
                                        <div key={c.originalIndex} style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', background: 'var(--bg-black)', border: '1px solid var(--border-dark)', borderRadius: '6px', fontSize: '0.8rem' }}>
                                          {editingCommentRef?.agreementId === a.id && editingCommentRef?.index === c.originalIndex ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                              <div style={{ display: 'flex', gap: '8px' }}>
                                                <input
                                                  type="date"
                                                  value={editingCommentText.date}
                                                  onChange={(e) => setEditingCommentText({ ...editingCommentText, date: e.target.value })}
                                                  style={{ padding: '4px', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--bg-panel-dark)', border: '1px solid var(--border-dark)', color: 'white', width: '130px' }}
                                                />
                                                <input
                                                  type="text"
                                                  value={editingCommentText.comment}
                                                  onChange={(e) => setEditingCommentText({ ...editingCommentText, comment: e.target.value })}
                                                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--bg-panel-dark)', border: '1px solid var(--border-dark)', color: 'white', flex: 1 }}
                                                />
                                              </div>
                                              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                                <button
                                                  type="button"
                                                  className="btn-secondary"
                                                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                                  onClick={() => setEditingCommentRef(null)}
                                                >
                                                  Cancelar
                                                </button>
                                                <button
                                                  type="button"
                                                  className="btn-primary"
                                                  style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                                  onClick={() => handleSaveEditComment(a.id, c.originalIndex)}
                                                >
                                                  Guardar
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>
                                                <span>📅 {formatDate(c.date)}</span>
                                                {!isClient && (
                                                  <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button 
                                                      type="button" 
                                                      style={{ background: 'none', border: 'none', color: 'var(--primary-orange)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                                                      onClick={() => handleStartEditComment(a.id, c.originalIndex, c)}
                                                    >
                                                      Editar
                                                    </button>
                                                    <button 
                                                      type="button" 
                                                      style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
                                                      onClick={() => handleDeleteComment(a.id, c.originalIndex)}
                                                    >
                                                      Eliminar
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                              <div style={{ color: 'var(--text-light-primary)', whiteSpace: 'pre-wrap' }}>{c.comment}</div>
                                            </>
                                          )}
                                        </div>
                                      ))
                                  )}
                                </div>

                                {/* Form to add new comment (Staff only) */}
                                {!isClient && (
                                  <form onSubmit={(e) => handleAddComment(e, a.id)} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '130px' }}>
                                      <label style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>Fecha *</label>
                                      <input
                                        type="date"
                                        required
                                        value={newCommentData[a.id]?.date || new Date().toISOString().split('T')[0]}
                                        onChange={(e) => handleCommentDataChange(a.id, 'date', e.target.value)}
                                        style={{ padding: '6px', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--bg-panel-dark)', border: '1px solid var(--border-dark)', color: 'white' }}
                                      />
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                                      <label style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>Nuevo Comentario de Seguimiento *</label>
                                      <input
                                        type="text"
                                        required
                                        placeholder="Ej: Se envió propuesta corregida..."
                                        value={newCommentData[a.id]?.comment || ''}
                                        onChange={(e) => handleCommentDataChange(a.id, 'comment', e.target.value)}
                                        style={{ padding: '6px', fontSize: '0.75rem', borderRadius: '4px', background: 'var(--bg-panel-dark)', border: '1px solid var(--border-dark)', color: 'white' }}
                                      />
                                    </div>
                                    <button type="submit" className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.75rem', height: 'fit-content' }}>
                                      Agregar
                                    </button>
                                  </form>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUBTAB 3: SATISFACCIÓN --- */}
      {activeSubTab === 'satisfaccion' && (
        <div>
          {/* Filtros */}
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar en comentarios o clientes..."
              filters={!isClient ? [{ key: 'company', label: 'Clientes', options: companyOptions }] : []}
              activeFilters={{ company: companyFilter }}
              onFilterChange={(_, val) => setCompanyFilter(val)}
              onClearFilters={() => {
                setSearchTerm('');
                setCompanyFilter(isClient ? clientCompanyId || 'ALL' : 'ALL');
              }}
            />

            {(isClient || activeRole === 'superadmin' || activeRole === 'comercial') && (
              <button className="btn-primary" onClick={() => { setShowSurveyModal(true); setCompanySearch(''); }}>
                + Registrar NPS / Encuesta
              </button>
            )}
          </div>

          {/* NPS General Widget */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: '20px', marginBottom: '24px' }}>
            <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <h4 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--text-light-muted)', marginBottom: '8px' }}>
                NPS Promedio
              </h4>
              <div style={{ fontSize: '3rem', fontWeight: 700, color: 'var(--primary-orange)' }}>
                {filteredSurveys.length > 0
                  ? (filteredSurveys.reduce((sum, s) => sum + s.score, 0) / filteredSurveys.length).toFixed(1)
                  : 'N/A'}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                En base a {filteredSurveys.length} encuestas registradas
              </span>
            </div>

            {/* Listado de encuestas */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', overflow: 'hidden' }}>
              <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-light-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Feedback y Comentarios Recientes
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '350px', overflowY: 'auto' }}>
                {filteredSurveys.length === 0 ? (
                  <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '20px' }}>
                    No hay encuestas ni feedbacks registrados para este cliente.
                  </p>
                ) : (
                  filteredSurveys.map((s) => {
                    const company = companies.find((c) => c.id === s.company_id);
                    return (
                      <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid var(--border-dark)', paddingBottom: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{company?.name}</span>
                          <span
                            className={`badge ${s.score >= 9 ? 'badge-success' : s.score >= 7 ? 'badge-warning' : 'badge-danger'}`}
                            style={{ padding: '2px 8px', borderRadius: '4px' }}
                          >
                            Puntaje: {s.score}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-light-secondary)', fontStyle: 'italic' }}>
                          "{s.comments || 'Sin comentarios adicionales.'}"
                        </p>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)' }}>Fecha: {formatDate(s.survey_date)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALES --- */}

      {/* 1. Alta Cliente (Empresas) */}
      {showCompanyModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Dar de Alta Cliente</h3>
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
                      placeholder="ejemplo@globex.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="text"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
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
                <button type="submit" className="btn-primary">Registrar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modificación Cliente */}
      {editingCompany && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Editar Cliente</h3>
              <button className="modal-close" onClick={() => setEditingCompany(null)}>×</button>
            </div>
            <form onSubmit={handleSaveEditCompany}>
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

      {/* 3. Registrar Nueva Cotización */}
      {showAgreementModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registrar Nueva Cotización</h3>
              <button className="modal-close" onClick={() => setShowAgreementModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateAgreement}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tipo de Cliente</label>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-light-secondary)' }}>
                      <input
                        type="radio"
                        name="clientType"
                        checked={!isProspect}
                        onChange={() => {
                          setIsProspect(false);
                          setNewAgreement({ ...newAgreement, company_id: '', prospect_company_name: '' });
                        }}
                      />
                      <span>Cliente Registrado</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-light-secondary)' }}>
                      <input
                        type="radio"
                        name="clientType"
                        checked={isProspect}
                        onChange={() => {
                          setIsProspect(true);
                          setNewAgreement({ ...newAgreement, company_id: null, prospect_company_name: '' });
                        }}
                      />
                      <span>Nuevo Prospecto (No registrado)</span>
                    </label>
                  </div>
                </div>

                {isProspect ? (
                  <div className="form-group">
                    <label>Nombre de la Empresa (Prospecto) *</label>
                    <input
                      type="text"
                      placeholder="Ej. Acme Corp S.A."
                      value={newAgreement.prospect_company_name}
                      onChange={(e) => setNewAgreement({ ...newAgreement, prospect_company_name: e.target.value })}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Empresa Cliente Registrada *</label>
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
                      value={newAgreement.company_id || ''}
                      onChange={(e) => setNewAgreement({ ...newAgreement, company_id: e.target.value })}
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
                )}
                <div className="form-group">
                  <label>Servicio / Proyecto *</label>
                  <input
                    type="text"
                    value={newAgreement.title}
                    onChange={(e) => setNewAgreement({ ...newAgreement, title: e.target.value })}
                    placeholder="Ej. Consultoría de Procesos Organizacionales"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción del alcance</label>
                  <textarea
                    rows={3}
                    value={newAgreement.description}
                    onChange={(e) => setNewAgreement({ ...newAgreement, description: e.target.value })}
                    placeholder="Alcance del servicio, entregables principales..."
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duración (Meses) *</label>
                    <input
                      type="number"
                      min="1"
                      value={newAgreement.months}
                      onChange={(e) => setNewAgreement({ ...newAgreement, months: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Monto Económico ($ ARG) *</label>
                    <input
                      type="number"
                      step="1"
                      value={newAgreement.amount}
                      onChange={(e) => setNewAgreement({ ...newAgreement, amount: e.target.value })}
                      placeholder="Ej. 150000"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Inicio *</label>
                    <input
                      type="date"
                      value={newAgreement.start_date}
                      onChange={(e) => setNewAgreement({ ...newAgreement, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha Fin (Estimada)</label>
                    <input
                      type="date"
                      value={newAgreement.end_date}
                      onChange={(e) => setNewAgreement({ ...newAgreement, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Estado Inicial</label>
                  <select
                    value={newAgreement.status}
                    onChange={(e) => setNewAgreement({ ...newAgreement, status: e.target.value as any })}
                  >
                    <option value="Negociacion">Negociacion</option>
                    <option value="Aprobada">Aprobada</option>
                    <option value="Perdida">Perdida</option>
                    <option value="Suspendida">Suspendida</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAgreementModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cotización</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Editar Cotización */}
      {editingAgreement && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Editar Cotización</h3>
              <button className="modal-close" onClick={() => setEditingAgreement(null)}>×</button>
            </div>
            <form onSubmit={handleSaveEditAgreement}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Tipo de Cliente</label>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-light-secondary)' }}>
                      <input
                        type="radio"
                        name="editClientType"
                        checked={!isEditingProspect}
                        onChange={() => {
                          setIsEditingProspect(false);
                          setEditingAgreement({ ...editingAgreement, company_id: '', prospect_company_name: '' });
                        }}
                      />
                      <span>Cliente Registrado</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-light-secondary)' }}>
                      <input
                        type="radio"
                        name="editClientType"
                        checked={isEditingProspect}
                        onChange={() => {
                          setIsEditingProspect(true);
                          setEditingAgreement({ ...editingAgreement, company_id: null, prospect_company_name: editingAgreement.prospect_company_name || '' });
                        }}
                      />
                      <span>Nuevo Prospecto (No registrado)</span>
                    </label>
                  </div>
                </div>

                {isEditingProspect ? (
                  <div className="form-group">
                    <label>Nombre de la Empresa (Prospecto) *</label>
                    <input
                      type="text"
                      placeholder="Ej. Acme Corp S.A."
                      value={editingAgreement.prospect_company_name || ''}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, prospect_company_name: e.target.value })}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Empresa Cliente Registrada *</label>
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
                      value={editingAgreement.company_id || ''}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, company_id: e.target.value })}
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
                )}
                <div className="form-group">
                  <label>Servicio / Proyecto *</label>
                  <input
                    type="text"
                    value={editingAgreement.title}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, title: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción del alcance</label>
                  <textarea
                    rows={3}
                    value={editingAgreement.description || ''}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, description: e.target.value })}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Duración (Meses) *</label>
                    <input
                      type="number"
                      min="1"
                      value={editingAgreement.months}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, months: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Monto Económico ($ ARG) *</label>
                    <input
                      type="number"
                      step="1"
                      value={editingAgreement.amount}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, amount: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Inicio *</label>
                    <input
                      type="date"
                      value={editingAgreement.start_date}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha Fin (Estimada)</label>
                    <input
                      type="date"
                      value={editingAgreement.end_date || ''}
                      onChange={(e) => setEditingAgreement({ ...editingAgreement, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Estado</label>
                  <select
                    value={editingAgreement.status}
                    onChange={(e) => setEditingAgreement({ ...editingAgreement, status: e.target.value as any })}
                  >
                    <option value="Negociacion">Negociacion</option>
                    <option value="Aprobada">Aprobada</option>
                    <option value="Perdida">Perdida</option>
                    <option value="Suspendida">Suspendida</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingAgreement(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Registrar Nueva Encuesta */}
      {showSurveyModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registrar Calificación NPS</h3>
              <button className="modal-close" onClick={() => setShowSurveyModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateSurvey}>
              <div className="modal-body">
                {!isClient ? (
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
                      value={newSurvey.company_id}
                      onChange={(e) => setNewSurvey({ ...newSurvey, company_id: e.target.value })}
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
                ) : (
                  <div className="form-group">
                    <label>Empresa Cliente</label>
                    <input
                      type="text"
                      value={companies.find((c) => c.id === clientCompanyId)?.name || ''}
                      disabled
                    />
                  </div>
                )}
                <div className="form-group">
                  <label>Puntuación NPS (1 al 10) *</label>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={newSurvey.score}
                      onChange={(e) => setNewSurvey({ ...newSurvey, score: parseInt(e.target.value) })}
                      style={{ flex: 1, accentColor: 'var(--primary-orange)' }}
                      required
                    />
                    <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--primary-orange)', minWidth: '35px', textAlign: 'right' }}>
                      {newSurvey.score}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                    <span>1 (Muy disconforme)</span>
                    <span>10 (Excelente recomendado)</span>
                  </div>
                </div>
                <div className="form-group">
                  <label>Comentarios / Sugerencias de mejora</label>
                  <textarea
                    rows={4}
                    value={newSurvey.comments}
                    onChange={(e) => setNewSurvey({ ...newSurvey, comments: e.target.value })}
                    placeholder="Contanos tu experiencia trabajando con Overcome Consulting..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Encuesta</label>
                  <input
                    type="date"
                    value={newSurvey.survey_date}
                    onChange={(e) => setNewSurvey({ ...newSurvey, survey_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowSurveyModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Enviar Encuesta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
