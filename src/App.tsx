// APP.TSX
// Componente raíz de la plataforma de Overcome Consulting.
// Organiza el diseño general (Sidebar + Header + Content) y maneja las rutas de vistas locales.

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { DashboardView } from './views/Dashboard/DashboardView';
import { ComercialView } from './views/Comercial/ComercialView';
import { OperacionesView } from './views/Operaciones/OperacionesView';
import { AdministracionView } from './views/Administracion/AdministracionView';
import { ConfiguracionView } from './views/Configuracion/ConfiguracionView';
import './App.css';

type TabId = 'dashboard' | 'comercial' | 'operaciones' | 'administracion' | 'configuracion';

const PlatformLayout: React.FC = () => {
  const { activeRole, currentUser, setActiveRole } = useApp();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Ajustar la vista si cambiamos a un rol que no tiene acceso a la vista actual
  useEffect(() => {
    if (activeRole === 'comercial' && (activeTab === 'operaciones' || activeTab === 'administracion' || activeTab === 'configuracion')) {
      setActiveTab('dashboard');
    } else if (activeRole === 'operaciones' && (activeTab === 'comercial' || activeTab === 'administracion' || activeTab === 'configuracion')) {
      setActiveTab('dashboard');
    } else if (activeRole === 'administracion' && (activeTab === 'comercial' || activeTab === 'operaciones' || activeTab === 'configuracion')) {
      setActiveTab('dashboard');
    } else if (activeRole === 'cliente' && (activeTab === 'operaciones' || activeTab === 'configuracion')) {
      setActiveTab('dashboard');
    }
  }, [activeRole, activeTab]);

  // Determinar accesos
  const hasComercial = activeRole === 'superadmin' || activeRole === 'comercial' || activeRole === 'cliente';
  const hasOperaciones = activeRole === 'superadmin' || activeRole === 'operaciones';
  const hasAdministracion = activeRole === 'superadmin' || activeRole === 'administracion' || activeRole === 'cliente';
  const hasConfiguracion = activeRole === 'superadmin';

  // Renderizar la vista activa
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'comercial':
        return <ComercialView />;
      case 'operaciones':
        return <OperacionesView />;
      case 'administracion':
        return <AdministracionView />;
      case 'configuracion':
        return <ConfiguracionView />;
      default:
        return <DashboardView />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'comercial': return 'Gestión Comercial';
      case 'operaciones': return 'Operaciones';
      case 'administracion': return 'Administración';
      case 'configuracion': return 'Configuración del Sistema';
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Panel de indicadores y métricas del negocio';
      case 'comercial': return 'Seguimiento de ventas, propuestas y satisfacción';
      case 'operaciones': return 'Gestión y estado de proyectos activos';
      case 'administracion': return 'Cobranza, facturas emitidas, gastos y proveedores';
      case 'configuracion': return 'Gestión multi-inquilino de usuarios y clientes';
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Overlay (Mobile only) */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* 1. SIDEBAR */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <img src="/logo.png" alt="Overcome Logo" className="sidebar-logo" />
          <div className="sidebar-brand">
            <span className="brand-name">Overcome</span>
            <span className="brand-subtitle">Consulting</span>
          </div>
          <button className="sidebar-close-mobile" onClick={() => setIsSidebarOpen(false)}>✕</button>
        </div>

        <nav className="sidebar-menu">
          <span className="menu-section-title">General</span>
          <button
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
            className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            📊 Dashboard
          </button>

          {hasComercial && (
            <button
              onClick={() => { setActiveTab('comercial'); setIsSidebarOpen(false); }}
              className={`menu-item ${activeTab === 'comercial' ? 'active' : ''}`}
            >
              💼 Comercial
            </button>
          )}

          {hasOperaciones && (
            <button
              onClick={() => { setActiveTab('operaciones'); setIsSidebarOpen(false); }}
              className={`menu-item ${activeTab === 'operaciones' ? 'active' : ''}`}
            >
              ⚙️ Operaciones
            </button>
          )}

          {hasAdministracion && (
            <button
              onClick={() => { setActiveTab('administracion'); setIsSidebarOpen(false); }}
              className={`menu-item ${activeTab === 'administracion' ? 'active' : ''}`}
            >
              💵 Administración
            </button>
          )}

          {hasConfiguracion && (
            <>
              <span className="menu-section-title">Administrador</span>
              <button
                onClick={() => { setActiveTab('configuracion'); setIsSidebarOpen(false); }}
                className={`menu-item ${activeTab === 'configuracion' ? 'active' : ''}`}
              >
                ⚙️ Configuración
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">
              {currentUser ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <div className="user-info">
              <span className="user-name">{currentUser ? currentUser.name : 'Cargando...'}</span>
              <span className="user-role">
                {currentUser?.role === 'superadmin' ? 'Super Admin' : currentUser?.role}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="main-area">
        {/* HEADER */}
        <header className="header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
            <button
              className="mobile-menu-toggle"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              title="Menu"
            >
              ☰
            </button>
            <div className="header-title-area" style={{ minWidth: 0 }}>
              <h1 className="header-title" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTabTitle()}</h1>
              <span className="header-subtitle" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getTabSubtitle()}</span>
            </div>
          </div>

          <div className="header-actions">
            {/* Simulador de Rol (Para pruebas del cliente) */}
            <div className="simulator-panel">
              <span className="simulator-label">Simular:</span>
              <select
                className="simulator-select"
                value={activeRole}
                onChange={(e) => setActiveRole(e.target.value as any)}
              >
                <option value="superadmin">👑 Super Admin</option>
                <option value="comercial">💼 Comercial</option>
                <option value="operaciones">⚙️ Operaciones</option>
                <option value="administracion">💵 Admin</option>
                <option value="cliente">👤 Cliente</option>
              </select>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        <div className="content-body">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <PlatformLayout />
    </AppProvider>
  );
}

export default App;
