// DASHBOARDVIEW.TSX
// Panel principal interactivo con indicadores clave y gráficos de Overcome Consulting.
// Adapta dinámicamente la información según el Rol activo.

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { BarChart, DonutChart } from '../../components/SVGCharts';

export const DashboardView: React.FC = () => {
  const {
    companies,
    agreements,
    surveys,
    projects,
    invoices,
    collections,
    activeRole,
    currentUser,
  } = useApp();

  // Filtrar datos si el rol actual es Cliente (Multi-tenant isolation)
  const isClient = activeRole === 'cliente';
  const clientCompanyId = currentUser?.company_id;

  const filteredCompanies = isClient
    ? companies.filter((c) => c.id === clientCompanyId)
    : companies;

  const filteredAgreements = isClient
    ? agreements.filter((a) => a.company_id === clientCompanyId)
    : agreements;

  const filteredInvoices = isClient
    ? invoices.filter((i) => i.company_id === clientCompanyId)
    : invoices;

  const filteredProjects = isClient
    ? projects.filter((p) => p.company_id === clientCompanyId)
    : projects;

  const filteredSurveys = isClient
    ? surveys.filter((s) => s.company_id === clientCompanyId)
    : surveys;

  // --- FILTROS DE TIEMPO INTERACTIVOS ---
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL'); // 'ALL' o '01'...'12'
  const [activeSection, setActiveSection] = useState<'all' | 'comercial' | 'operaciones' | 'administracion'>('all');

  const monthLabels: { [key: string]: string } = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
    '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
    '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  };

  // Extraer años disponibles en las colecciones
  const availableYears = Array.from(new Set([
    '2026',
    ...agreements.map(a => (a.start_date || '').split('-')[0]),
    ...invoices.map(i => (i.issue_date || '').split('-')[0]),
    ...collections.map(c => (c.collection_date || '').split('-')[0]),
  ].filter(y => y && y.length === 4))).sort().reverse();

  // Filtros de fecha activos
  const currentYear = selectedYear;
  const currentMonth = selectedMonth === 'ALL' ? '07' : selectedMonth; // Por defecto usa Julio (07) para comparación mensual si está en ALL
  const currentMonthLabel = monthLabels[currentMonth];
  const monthFilterStr = `${currentYear}-${currentMonth}`;

  // --- CÁLCULO DE INDICADORES ---

  // A. INDICADORES COMERCIALES

  // 1. Cantidad de cotizaciones emitidas (Anual y Mensual)
  const agreementsAnnual = filteredAgreements.filter(a => (a.start_date || '').startsWith(currentYear));
  const agreementsMonthly = filteredAgreements.filter(a => (a.start_date || '').startsWith(monthFilterStr));

  // 2. Aprobadas vs emitidas (Anual y Mensual)
  const approvedAnnual = agreementsAnnual.filter(a => a.status === 'Aprobada').length;
  const emittedAnnual = agreementsAnnual.length;
  const approvalRateAnnual = emittedAnnual > 0 ? Math.round((approvedAnnual / emittedAnnual) * 100) : 0;

  const approvedMonthly = agreementsMonthly.filter(a => a.status === 'Aprobada').length;
  const emittedMonthly = agreementsMonthly.length;
  const approvalRateMonthly = emittedMonthly > 0 ? Math.round((approvedMonthly / emittedMonthly) * 100) : 0;

  // 3. Satisfacción - NPS
  const totalSurveys = filteredSurveys.length;
  const promoters = filteredSurveys.filter(s => s.score >= 9).length;
  const passives = filteredSurveys.filter(s => s.score >= 7 && s.score <= 8).length;
  const detractors = filteredSurveys.filter(s => s.score <= 6).length;
  const npsScore = totalSurveys > 0 ? Math.round(((promoters - detractors) / totalSurveys) * 100) : 0;

  const avgNPS = totalSurveys > 0
    ? (filteredSurveys.reduce((sum, s) => sum + s.score, 0) / totalSurveys).toFixed(1)
    : 'N/A';

  // A.5 INDICADORES DE OPERACIÓN
  // 1. Total Proyectos en curso
  const projectsInProgress = filteredProjects.filter((p) => p.status === 'in_progress').length;

  // 2. Proyectos Promedio Mensual (para el año seleccionado)
  const projectsInYear = filteredProjects.filter((p) => (p.start_date || '').startsWith(currentYear));
  const projectsByMonthMap: { [key: string]: number } = {};
  projectsInYear.forEach((p) => {
    const month = (p.start_date || '').split('-')[1];
    if (month) {
      projectsByMonthMap[month] = (projectsByMonthMap[month] || 0) + 1;
    }
  });
  const uniqueMonthsWithProjects = Object.keys(projectsByMonthMap).length;
  const avgProjectsPerMonth = uniqueMonthsWithProjects > 0 ? (projectsInYear.length / uniqueMonthsWithProjects).toFixed(1) : '0';

  // B. INDICADORES DE ADMINISTRACIÓN

  // 1. Facturación (Anual y Mensual)
  const billingAnnual = filteredInvoices
    .filter(i => (i.issue_date || '').startsWith(currentYear))
    .reduce((sum, i) => sum + i.amount, 0);

  const billingMonthly = filteredInvoices
    .filter(i => (i.issue_date || '').startsWith(monthFilterStr))
    .reduce((sum, i) => sum + i.amount, 0);

  // 2. Cobranza (Anual y Mensual)
  const invoiceIds = filteredInvoices.map((i) => i.id);
  const filteredCollections = isClient
    ? collections.filter((col) => invoiceIds.includes(col.invoice_id))
    : collections;

  const collectionsAnnual = filteredCollections
    .filter(c => (c.collection_date || '').startsWith(currentYear))
    .reduce((sum, c) => sum + c.amount_collected, 0);

  const collectionsMonthly = filteredCollections
    .filter(c => (c.collection_date || '').startsWith(monthFilterStr))
    .reduce((sum, c) => sum + c.amount_collected, 0);

  // 2.5 Facturación por cobrar (Anual y Mensual)
  const pendingBillingAnnual = filteredInvoices
    .filter(i => (i.issue_date || '').startsWith(currentYear) && (i.status === 'sent' || i.status === 'overdue'))
    .reduce((sum, i) => sum + i.amount, 0);

  const pendingBillingMonthly = filteredInvoices
    .filter(i => (i.issue_date || '').startsWith(monthFilterStr) && (i.status === 'sent' || i.status === 'overdue'))
    .reduce((sum, i) => sum + i.amount, 0);

  // 3. Top 5 de clientes con mayor facturación anual
  const clientBillingMap: { [key: string]: number } = {};
  filteredInvoices
    .filter(i => (i.issue_date || '').startsWith(currentYear))
    .forEach(i => {
      clientBillingMap[i.company_id] = (clientBillingMap[i.company_id] || 0) + i.amount;
    });

  const topClients = Object.entries(clientBillingMap)
    .map(([compId, amt]) => {
      const company = companies.find(c => c.id === compId);
      return {
        name: company ? company.name : 'Desconocido',
        amount: amt
      };
    })
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const maxClientAmount = topClients[0]?.amount || 1;

  // 4. Top 5 de servicios con mayor facturación anual
  const serviceBillingMap: { [key: string]: number } = {};
  filteredInvoices
    .filter(i => (i.issue_date || '').startsWith(currentYear))
    .forEach(i => {
      const serviceName = i.description || 'Servicios Profesionales';
      serviceBillingMap[serviceName] = (serviceBillingMap[serviceName] || 0) + i.amount;
    });

  const topServices = Object.entries(serviceBillingMap)
    .map(([name, amt]) => ({ name, amount: amt }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const maxServiceAmount = topServices[0]?.amount || 1;

  // C. GRÁFICOS DE COMPATIBILIDAD
  const agreementStatusData = [
    { label: 'Aprobadas', value: filteredAgreements.filter((a) => a.status === 'Aprobada').length, color: 'var(--accent-green)' },
    { label: 'Negociacion', value: filteredAgreements.filter((a) => a.status === 'Negociacion').length, color: 'var(--accent-yellow)' },
    { label: 'Perdidas', value: filteredAgreements.filter((a) => a.status === 'Perdida').length, color: 'var(--accent-red)' },
    { label: 'Suspendidas', value: filteredAgreements.filter((a) => a.status === 'Suspendida').length, color: 'var(--text-light-muted)' },
  ];

  const financialSummaryData = [
    { label: 'Facturac. Anual', value: billingAnnual },
    { label: 'Cobranza Anual', value: collectionsAnnual },
    { label: 'Facturac. Mensual', value: billingMonthly },
    { label: 'Cobranza Mensual', value: collectionsMonthly },
  ];

  // --- FORMATEADORES ---
  const formatCurrencyARS = (val: number) => {
    return `$ ${Math.round(val).toLocaleString('es-AR')}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="animate-fade-in">
      {/* Encabezado e Interfaz de Filtros */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            {isClient ? `Tablero de ${filteredCompanies[0]?.name || 'Cliente'}` : 'Tablero de Control Operativo'}
          </h2>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>
            Indicadores y métricas de desempeño organizacionales consolidados.
          </p>
        </div>

        {/* selectores de Año y Mes del Reporte */}
        {!isClient && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', fontWeight: 600 }}>AÑO</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-panel-dark)',
                  border: '1px solid var(--border-dark)',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  outline: 'none',
                }}
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-light-muted)', fontWeight: 600 }}>COMP. MENSUAL</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-panel-dark)',
                  border: '1px solid var(--border-dark)',
                  color: 'white',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  outline: 'none',
                }}
              >
                <option value="ALL">Todo el Año (Ver Julio)</option>
                {Object.entries(monthLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Navegación por áreas de Indicadores (Tabs) */}
      {!isClient && (
        <div style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-dark)',
          paddingBottom: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          {[
            { id: 'all', label: '📊 Vista Consolidada' },
            { id: 'comercial', label: '📈 Área Comercial' },
            { id: 'operaciones', label: '⚙️ Área de Operaciones' },
            { id: 'administracion', label: '💼 Área de Administración' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id as any)}
              className="btn-secondary"
              style={{
                padding: '8px 16px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activeSection === tab.id ? 'var(--primary-orange)' : 'transparent',
                color: activeSection === tab.id ? 'white' : 'var(--text-light-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* RENDERIZADO DE SECCIONES DE INDICADORES */}

      {/* ==================================================== */}
      {/* 1. SECCIÓN COMERCIAL */}
      {/* ==================================================== */}
      {(activeSection === 'all' || activeSection === 'comercial') && (
        <div style={{ marginBottom: '36px' }}>
          {!isClient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.2rem' }}>📈</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Indicadores Comerciales</h3>
              <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-dark)', marginLeft: '12px' }}></span>
            </div>
          )}

          <div className="stats-grid" style={{ marginBottom: '20px' }}>
            {/* Cotizaciones Emitidas */}
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-header">
                <span>Cotizaciones Emitidas</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--primary-orange-alpha)', color: 'var(--primary-orange)' }}>Volumen</span>
              </div>
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'white' }}>
                  {agreementsAnnual.length} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-light-muted)' }}>en {currentYear}</span>
                </div>
                <div style={{ fontSize: '0.95rem', marginTop: '6px', color: 'var(--text-light-secondary)' }}>
                  <strong>{agreementsMonthly.length}</strong> emitidas en {selectedMonth === 'ALL' ? 'Julio' : currentMonthLabel}
                </div>
              </div>
              <div className="stat-footer">
                Total histórico de cotizaciones registradas
              </div>
            </div>

            {/* Aprobación (Aprobadas vs Emitidas) */}
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-header">
                <span>Tasa de Aprobación</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-green-alpha)', color: 'var(--accent-green)' }}>Efectividad</span>
              </div>
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                  {approvalRateAnnual}% <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-light-muted)' }}>Anual</span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', margin: '4px 0' }}>
                  ({approvedAnnual} aprobadas de {emittedAnnual} emitidas)
                </div>
                <div style={{ fontSize: '0.95rem', marginTop: '6px', color: 'white' }}>
                  <strong>{approvalRateMonthly}%</strong> en {selectedMonth === 'ALL' ? 'Julio' : currentMonthLabel} ({approvedMonthly} de {emittedMonthly})
                </div>
              </div>
              <div className="stat-footer">
                Cotizaciones cerradas en estado "Aprobada"
              </div>
            </div>

            {/* NPS & Satisfacción */}
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-header">
                <span>Satisfacción Net Promoter Score (NPS)</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-yellow-alpha)', color: 'var(--accent-yellow)' }}>Calidad</span>
              </div>
              <div style={{ margin: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 700, color: npsScore >= 50 ? 'var(--accent-green)' : npsScore >= 0 ? 'var(--accent-yellow)' : 'var(--accent-red)' }}>
                    {npsScore >= 0 ? `+${npsScore}` : npsScore}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-light-muted)' }}>NPS Index</div>
                </div>

                {/* Barra NPS */}
                <div style={{ display: 'flex', height: '6px', borderRadius: '3px', overflow: 'hidden', margin: '8px 0', background: 'rgba(255,255,255,0.05)' }}>
                  <div style={{ width: `${totalSurveys > 0 ? (promoters/totalSurveys)*100 : 0}%`, background: 'var(--accent-green)' }}></div>
                  <div style={{ width: `${totalSurveys > 0 ? (passives/totalSurveys)*100 : 0}%`, background: 'var(--accent-yellow)' }}></div>
                  <div style={{ width: `${totalSurveys > 0 ? (detractors/totalSurveys)*100 : 0}%`, background: 'var(--accent-red)' }}></div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                  <span>Promotores: {promoters}</span>
                  <span>Detractores: {detractors}</span>
                </div>
              </div>
              <div className="stat-footer">
                Promedio general de satisfacción: <strong style={{ color: 'white' }}>{avgNPS} / 10</strong>
              </div>
            </div>
          </div>

          {activeSection === 'comercial' && (
            <div className="panel-row" style={{ gridTemplateColumns: '1.5fr 1fr' }}>
              <div className="glass-card" style={{ padding: '24px', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
                  Estado de Acuerdos del Período
                </h4>
                <DonutChart data={agreementStatusData} title="Estado General de Propuestas" />
              </div>
              <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <h4 style={{ marginBottom: '8px', fontSize: '0.95rem', fontWeight: 600 }}>Acerca del NPS (Net Promoter Score)</h4>
                <p style={{ color: 'var(--text-light-muted)', fontSize: '0.8rem', lineHeight: '1.4' }}>
                  Se calcula restando el porcentaje de clientes Detractores (calificaciones de 1 a 6) del porcentaje de clientes Promotores (calificaciones de 9 y 10).
                </p>
                <ul style={{ color: 'var(--text-light-secondary)', fontSize: '0.8rem', paddingLeft: '16px', marginTop: '8px', lineHeight: '1.5' }}>
                  <li><strong style={{ color: 'var(--accent-green)' }}>+50 a +100:</strong> Nivel Excelente / World Class.</li>
                  <li><strong style={{ color: 'var(--accent-yellow)' }}>0 a +50:</strong> Nivel Bueno / Aceptable.</li>
                  <li><strong style={{ color: 'var(--accent-red)' }}>Menor a 0:</strong> Requiere atención inmediata.</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. SECCIÓN OPERACIÓN */}
      {/* ==================================================== */}
      {(activeSection === 'all' || activeSection === 'operaciones') && (
        <div style={{ marginBottom: '36px' }}>
          {!isClient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚙️</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Indicadores de Operación</h3>
              <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-dark)', marginLeft: '12px' }}></span>
            </div>
          )}

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {/* Total Proyectos En Curso */}
            <div className="glass-card stat-card">
              <div className="stat-header">
                <span className="stat-label">Total Proyectos en Curso</span>
                <span className="stat-icon" style={{ color: 'var(--primary-orange)' }}>🚀</span>
              </div>
              <div className="stat-value">{projectsInProgress}</div>
              <div className="stat-footer">
                <span className="text-success">Activos actualmente en Kanban</span>
              </div>
            </div>

            {/* Proyectos Promedio Mensual */}
            <div className="glass-card stat-card">
              <div className="stat-header">
                <span className="stat-label">Proyectos Promedio Mensual</span>
                <span className="stat-icon" style={{ color: 'var(--accent-blue)' }}>📊</span>
              </div>
              <div className="stat-value">{avgProjectsPerMonth}</div>
              <div className="stat-footer">
                <span style={{ color: 'var(--text-light-muted)' }}>
                  Basado en {projectsInYear.length} proyectos durante {uniqueMonthsWithProjects} meses ({currentYear})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. SECCIÓN ADMINISTRACIÓN */}
      {/* ==================================================== */}
      {(activeSection === 'all' || activeSection === 'administracion') && (
        <div style={{ marginBottom: '36px' }}>
          {!isClient && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <span style={{ fontSize: '1.2rem' }}>💼</span>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, margin: 0 }}>Indicadores de Administración</h3>
              <span style={{ flex: 1, height: '1px', backgroundColor: 'var(--border-dark)', marginLeft: '12px' }}></span>
            </div>
          )}

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {/* Facturación (Anual y Mensual) */}
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-header">
                <span>Facturación (Emitido C/ IVA)</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--primary-orange-alpha)', color: 'var(--primary-orange)' }}>Ingresos</span>
              </div>
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white' }}>
                  {formatCurrencyARS(billingAnnual)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-light-muted)' }}>en {currentYear}</span>
                </div>
                <div style={{ fontSize: '0.95rem', marginTop: '6px', color: 'var(--text-light-secondary)' }}>
                  <strong>{formatCurrencyARS(billingMonthly)}</strong> en {selectedMonth === 'ALL' ? 'Julio' : currentMonthLabel}
                </div>
              </div>
              <div className="stat-footer">
                Monto consolidado facturado
              </div>
            </div>

            {/* Cobranza (Anual y Mensual) */}
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-header">
                <span>Cobranza (Percibido)</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-green-alpha)', color: 'var(--accent-green)' }}>Caja</span>
              </div>
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-green)' }}>
                  {formatCurrencyARS(collectionsAnnual)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-light-muted)' }}>en {currentYear}</span>
                </div>
                <div style={{ fontSize: '0.95rem', marginTop: '6px', color: 'white' }}>
                  <strong>{formatCurrencyARS(collectionsMonthly)}</strong> en {selectedMonth === 'ALL' ? 'Julio' : currentMonthLabel}
                </div>
              </div>
              <div className="stat-footer">
                Cobros efectivamente ingresados
              </div>
            </div>

            {/* Facturación por Cobrar (Pendiente de Cobro) */}
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-header">
                <span>Dinero por Cobrar (Pendiente)</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'var(--accent-yellow-alpha)', color: 'var(--accent-yellow)' }}>Pendiente</span>
              </div>
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent-yellow)' }}>
                  {formatCurrencyARS(pendingBillingAnnual)} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-light-muted)' }}>en {currentYear}</span>
                </div>
                <div style={{ fontSize: '0.95rem', marginTop: '6px', color: 'white' }}>
                  <strong>{formatCurrencyARS(pendingBillingMonthly)}</strong> en {selectedMonth === 'ALL' ? 'Julio' : currentMonthLabel}
                </div>
              </div>
              <div className="stat-footer">
                Facturas emitidas pendientes de cobro
              </div>
            </div>

            {/* Eficiencia de Cobro */}
            <div className="glass-card stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="stat-header">
                <span>Eficiencia de Cobro</span>
                <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'white' }}>Cierre</span>
              </div>
              <div style={{ margin: '14px 0' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'white' }}>
                  {billingAnnual > 0 ? Math.round((collectionsAnnual / billingAnnual) * 100) : 0}% <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-light-muted)' }}>Anual</span>
                </div>
                <div style={{ fontSize: '0.95rem', marginTop: '6px', color: 'var(--text-light-secondary)' }}>
                  Cobrado vs Facturado en el período
                </div>
              </div>
              <div className="stat-footer">
                Relación ingreso / facturación anual
              </div>
            </div>
          </div>

          {/* Gráfico Financiero de Barras */}
          {activeSection === 'all' && (
            <div style={{ marginBottom: '24px' }}>
              <BarChart data={financialSummaryData} title={`Resumen de Caja Overcome (${currentYear})`} prefix="$" />
            </div>
          )}

          {/* TOP 5 CLIENTES Y SERVICIOS */}
          {!isClient && (
            <div className="panel-row" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Top 5 Clientes */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary-orange)' }}>
                  🏆 Top 5 Clientes con Mayor Facturación Anual
                </h4>
                {topClients.length === 0 ? (
                  <p style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem' }}>No hay registros de facturación en este período.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {topClients.map((client, index) => {
                      const percentage = Math.round((client.amount / maxClientAmount) * 100);
                      return (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span><strong>{index + 1}. {client.name}</strong></span>
                            <span style={{ fontWeight: 600 }}>{formatCurrencyARS(client.amount)}</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-orange), #ffae19)', borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Top 5 Servicios */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: '12px' }}>
                <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary-orange)' }}>
                  💼 Top 5 Servicios con Mayor Facturación Anual
                </h4>
                {topServices.length === 0 ? (
                  <p style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem' }}>No hay registros de facturación en este período.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {topServices.map((service, index) => {
                      const percentage = Math.round((service.amount / maxServiceAmount) * 100);
                      return (
                        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                            <span style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '70%',
                              fontSize: '0.8rem'
                            }}>
                              <strong>{index + 1}. {service.name}</strong>
                            </span>
                            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatCurrencyARS(service.amount)}</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-green), #81e285)', borderRadius: '4px' }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* VISTA COMPATIBLE CLIENTE (SI EL INGRESO ES DE CLIENTE) */}
      {/* ==================================================== */}
      {isClient && (
        <div className="panel-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
          {/* Proyectos activos para Clientes */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <h4 style={{ marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
              Proyectos en Curso
            </h4>
            {filteredProjects.length === 0 ? (
              <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>No hay proyectos activos asignados.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredProjects.map((p) => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-panel-dark)', borderRadius: '6px' }}>
                    <div>
                      <h5 style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Inicio: {formatDate(p.start_date)}</span>
                    </div>
                    <span className={`badge ${p.status === 'completed' ? 'badge-success' : p.status === 'in_progress' ? 'badge-info' : 'badge-warning'}`}>
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Facturas recientes del Cliente */}
          <div className="glass-card" style={{ padding: '24px', borderRadius: '12px' }}>
            <h4 style={{ marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
              Facturas Recientes
            </h4>
            {filteredInvoices.length === 0 ? (
              <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>No hay facturas emitidas.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredInvoices.slice(0, 3).map((inv) => (
                  <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--bg-panel-dark)', borderRadius: '6px' }}>
                    <div>
                      <h5 style={{ fontWeight: 600, fontSize: '0.9rem' }}>{inv.invoice_number}</h5>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>Vence: {formatDate(inv.due_date)}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{formatCurrencyARS(inv.amount)}</div>
                      <span className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'sent' ? 'badge-info' : inv.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                        {inv.status === 'paid' ? 'Pagada' : inv.status === 'sent' ? 'Enviada' : inv.status === 'overdue' ? 'Vencida' : 'Borrador'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lista de últimas Cotizaciones Activas (Solo Staff) */}
      {!isClient && activeSection === 'all' && (
        <div className="glass-card" style={{ padding: '24px', borderRadius: '12px', marginTop: '24px' }}>
          <h4 style={{ marginBottom: '16px', textTransform: 'uppercase', fontSize: '0.85rem', color: 'var(--text-light-muted)' }}>
            Cotizaciones Recientes
          </h4>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Servicio / Proyecto</th>
                  <th>Cliente</th>
                  <th>Monto</th>
                  <th>Fecha Inicio</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {agreements.slice(0, 4).map((a) => {
                  const company = companies.find((c) => c.id === a.company_id);
                  return (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 400 }}>{a.title}</td>
                      <td>{company?.name || 'Cargando...'}</td>
                      <td style={{ fontWeight: 400 }}>{formatCurrencyARS(a.amount)}</td>
                      <td>{formatDate(a.start_date)}</td>
                      <td>
                        <span
                          className="badge"
                          style={{
                            backgroundColor: a.status === 'Aprobada' ? 'var(--accent-green-alpha)' : a.status === 'Negociacion' ? 'var(--accent-yellow-alpha)' : a.status === 'Suspendida' ? 'rgba(108, 117, 125, 0.1)' : 'var(--accent-red-alpha)',
                            color: a.status === 'Aprobada' ? 'var(--accent-green)' : a.status === 'Negociacion' ? 'var(--accent-yellow)' : a.status === 'Suspendida' ? '#ADB5BD' : 'var(--accent-red)',
                            border: `1px solid ${a.status === 'Aprobada' ? 'rgba(10, 185, 129, 0.2)' : a.status === 'Negociacion' ? 'rgba(245, 158, 11, 0.2)' : a.status === 'Suspendida' ? 'rgba(108, 117, 125, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
