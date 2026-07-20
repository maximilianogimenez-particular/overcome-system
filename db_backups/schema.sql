-- SCHEMA.SQL
-- Base de Datos para Overcome Consulting (Supabase / PostgreSQL)

-- 1. Habilitar extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clientes (Empresas) - Multi-tenant
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    tax_id VARCHAR(50) NOT NULL UNIQUE, -- RUT / NIT / CUIT
    contact_name VARCHAR(255),
    contact_position VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Usuarios y Roles
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'cliente' CHECK (role IN ('superadmin', 'comercial', 'operaciones', 'administracion', 'cliente')),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL, -- NULL para consultores internos de Overcome
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Gestión Comercial: Cotizaciones
CREATE TABLE IF NOT EXISTS agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL para prospectos
    prospect_company_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    months INTEGER NOT NULL DEFAULT 1,
    currency VARCHAR(10) DEFAULT 'ARS',
    status VARCHAR(50) DEFAULT 'Negociacion' CHECK (status IN ('Negociacion', 'Aprobada', 'Perdida', 'Suspendida')),
    start_date DATE NOT NULL,
    end_date DATE,
    follow_up_comments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Gestión Comercial: Satisfacción (NPS)
CREATE TABLE IF NOT EXISTS satisfaction_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Usuario cliente que responde
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
    comments TEXT,
    survey_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Operaciones: Proyectos / Servicios
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning' CHECK (status IN ('planning', 'in_progress', 'review', 'completed', 'paused')),
    start_date DATE NOT NULL,
    end_date DATE,
    assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Consultor primario (compatibilidad)
    assigned_user_ids TEXT[] DEFAULT '{}'::text[], -- Lista de consultores asignados
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Administración: Facturas
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    description TEXT,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    file_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Administración: Cobranza
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    amount_collected NUMERIC(12, 2) NOT NULL,
    collection_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('transfer', 'cash', 'check', 'credit_card', 'e_cheq', 'other')),
    bank VARCHAR(50) CHECK (bank IN ('Galicia', 'Comafi', 'Santander', 'Uala')),
    reference_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Administración: Compras y Contrataciones
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider_name VARCHAR(255) NOT NULL,
    description TEXT,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    purchase_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL CHECK (category IN ('software_licenses', 'external_consulting', 'hardware', 'office_supplies', 'services', 'other')),
    status VARCHAR(50) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Administración: Pago a Proveedores
CREATE TABLE IF NOT EXISTS provider_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
    provider_name VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('transfer', 'cash', 'check', 'other')),
    bank VARCHAR(50) CHECK (bank IN ('Galicia', 'Comafi', 'Santander', 'Uala')),
    status VARCHAR(50) DEFAULT 'paid' CHECK (status IN ('pending', 'paid')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Registro de Respaldos de Base de Datos
CREATE TABLE IF NOT EXISTS db_backups_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    filename VARCHAR(255) NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    record_count JSONB NOT NULL, -- conteo de registros por tabla
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Proveedores (Maestro)
CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cuit VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_agreements_company_id ON agreements(company_id);
CREATE INDEX IF NOT EXISTS idx_satisfaction_surveys_company_id ON satisfaction_surveys(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_collections_invoice_id ON collections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_provider_payments_purchase_id ON provider_payments(purchase_id);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
