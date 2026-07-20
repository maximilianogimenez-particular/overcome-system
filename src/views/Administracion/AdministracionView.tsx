// ADMINISTRACIONVIEW.TSX
// Módulo de Administración de Overcome Consulting.
// Sub-módulos: 1. Facturación (con importador), 2. Cobranza, 3. Compras, 4. Pago a proveedores.

import React, { useState, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { SearchFilter } from '../../components/SearchFilter';

export const AdministracionView: React.FC = () => {
  const {
    companies,
    invoices,
    collections,
    purchases,
    payments,
    vendors,
    activeRole,
    currentUser,
    createRecord,
    updateRecord,
    deleteRecord,
  } = useApp();

  const isClient = activeRole === 'cliente';
  const clientCompanyId = currentUser?.company_id;

  // Tabs de Administración
  const [activeSubTab, setActiveSubTab] = useState<'facturacion' | 'cobranza' | 'compras' | 'pagos'>('facturacion');
  
  // Sub-tabs de Compras (copiado del módulo Relación con Proveedores del Sistema New-ISO)
  const [activePurchaseTab, setActivePurchaseTab] = useState<'compras' | 'evaluacion' | 'maestro'>('compras');

  // Estados de Búsqueda y Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState(isClient ? clientCompanyId || 'ALL' : 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [companySearch, setCompanySearch] = useState('');
  
  // Filtros secundarios de Compras
  const [purchaseStatusFilter, setPurchaseStatusFilter] = useState('ALL');
  const [purchaseApprovedFilter, setPurchaseApprovedFilter] = useState('ALL');
  const [vendorStatusFilter, setVendorStatusFilter] = useState('ALL');

  // Modales Facturación y Cobranza
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any>(null);
  const [editingInvoice, setEditingInvoice] = useState<any>(null);
  const [editingPayment, setEditingPayment] = useState<any>(null);

  // Modales de Compras (New-ISO)
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<any>(null);
  
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<any>(null);
  const [showViewPurchaseModal, setShowViewPurchaseModal] = useState<any>(null);

  // Estados de Formularios - Facturas y Cobros
  const [newInvoice, setNewInvoice] = useState({
    company_id: '',
    invoice_number: '',
    amount: '',
    currency: '$',
    description: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'sent' as const,
  });

  const [newCollection, setNewCollection] = useState({
    invoice_id: '',
    amount_collected: '',
    collection_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer' as const,
    bank: '' as const,
  });

  const [newPayment, setNewPayment] = useState({
    purchase_id: '',
    provider_name: '',
    amount: '',
    currency: '$',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'transfer' as const,
    bank: '' as const,
  });

  // Estados de Formularios - Compras y Proveedores (New-ISO)
  const [vendorForm, setVendorForm] = useState({
    name: '',
    cuit: '',
    category: '',
    responsible: '',
    email: '',
    phone: '',
  });



  const [purchaseForm, setPurchaseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor_id: '',
    projectName: '',
    responsible: '',
    status: 'pending' as 'pending' | 'approved' | 'delivered' | 'paid',
    approved: 'No' as 'Sí' | 'No',
    invoiceNumber: '',
  });

  // Items de la orden de compra dinámica
  const [purchaseItems, setPurchaseItems] = useState<Array<{ description: string; quantity: number; unitPrice: number }>>([
    { description: '', quantity: 1, unitPrice: 0 }
  ]);

  // --- CARGADOR MASIVO DE HISTORIAL DE FACTURACIÓN ---
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [pdfAlertMessage, setPdfAlertMessage] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          validateAndPreviewInvoices(parsed);
          return;
        }
      } catch (err) {
        parseCSVInvoices(text);
      }
    };
    reader.readAsText(file);
  };

  const parseCSVInvoices = (text: string) => {
    const lines = text.split('\n');
    if (lines.length < 2) {
      alert('El archivo CSV está vacío o no contiene encabezados.');
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const parsedData: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const rowObj: any = {};
      
      headers.forEach((header, index) => {
        rowObj[header] = values[index];
      });

      parsedData.push({
        invoice_number: rowObj.invoice_number,
        company_name: rowObj.company_name || rowObj.client,
        amount: parseFloat(rowObj.amount),
        currency: '$',
        description: rowObj.description || rowObj.detail || rowObj.concept || 'Servicios Profesionales de Consultoría',
        issue_date: rowObj.issue_date,
        due_date: rowObj.due_date,
        status: rowObj.status || 'sent',
      });
    }

    validateAndPreviewInvoices(parsedData);
  };

  const validateAndPreviewInvoices = (data: any[]) => {
    const mappedPreview = data.map((inv) => {
      const company = companies.find(
        (c) => c.name.toLowerCase().trim() === (inv.company_name || '').toLowerCase().trim()
      );
      
      return {
        ...inv,
        company_id: company ? company.id : null,
        company_name_found: company ? company.name : '⚠️ CLIENTE NO ENCONTRADO',
        isValid: !!company && !!inv.invoice_number && !isNaN(inv.amount),
      };
    });

    setBulkPreview(mappedPreview);
    setShowBulkModal(true);
  };

  const handleImportInvoices = async () => {
    const validInvoices = bulkPreview.filter(i => i.isValid);
    if (validInvoices.length === 0) {
      alert('No hay facturas válidas para importar.');
      return;
    }

    for (const inv of validInvoices) {
      await createRecord('invoices', {
        company_id: inv.company_id,
        invoice_number: inv.invoice_number,
        amount: inv.amount,
        currency: '$',
        description: inv.description || 'Servicios Profesionales',
        issue_date: inv.issue_date,
        due_date: inv.due_date,
        status: inv.status,
        file_url: '#',
      });
    }

    alert(`Se importaron ${validInvoices.length} facturas con éxito.`);
    setShowBulkModal(false);
    setBulkPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- ESCANER MOCK DE FACTURA EN PDF ---
  const handlePDFUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPDF(true);
    setPdfAlertMessage('');

    setTimeout(() => {
      setIsProcessingPDF(false);
      
      const filename = file.name;
      let detectedAmount = '185000';
      let detectedCompanyId = '';

      const nameClean = filename.toLowerCase();
      
      const matchedCompany = companies.find(c => 
        nameClean.includes(c.name.toLowerCase()) || 
        (c.name.toLowerCase().split(' ')[0] !== '' && nameClean.includes(c.name.toLowerCase().split(' ')[0]))
      );

      if (matchedCompany) {
        detectedCompanyId = matchedCompany.id;
      } else if (companies.length > 0) {
        detectedCompanyId = [...companies].sort((a,b)=>a.name.localeCompare(b.name))[0].id;
      }

      const numbersInName = filename.match(/\d+/g);
      if (numbersInName && numbersInName.length > 0) {
        const parsedNums = numbersInName.map(n => parseInt(n));
        const amountCandidate = parsedNums.find(n => n > 1000);
        if (amountCandidate) {
          detectedAmount = amountCandidate.toString();
        }
      }

      setNewInvoice({
        company_id: detectedCompanyId,
        invoice_number: `FAC-0004-${Math.floor(100000 + Math.random() * 900000)}`,
        amount: detectedAmount,
        currency: '$',
        description: `Importación de Servicios - PDF ${filename.split('.')[0]}`,
        issue_date: initialIssueDate,
        due_date: calculateDueDate(initialIssueDate),
        status: 'sent',
      });

      setPdfAlertMessage(`✨ Datos leídos con éxito del PDF "${filename}" (Cliente y monto autodetectados).`);
      setCompanySearch('');
      setShowInvoiceModal(true);
      
      e.target.value = '';
    }, 1500);
  };

  // --- REGISTRAR REGISTROS INDIVIDUALES ---

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoice.company_id || !newInvoice.invoice_number || !newInvoice.amount) return;
    await createRecord('invoices', {
      ...newInvoice,
      amount: parseFloat(newInvoice.amount),
      description: newInvoice.description || 'Servicios Profesionales',
      file_url: '#',
    });
    setShowInvoiceModal(false);
    setNewInvoice({
      company_id: '',
      invoice_number: '',
      amount: '',
      currency: '$',
      description: '',
      issue_date: initialIssueDate,
      due_date: calculateDueDate(initialIssueDate),
      status: 'sent',
    });
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice.company_id || !editingInvoice.invoice_number || !editingInvoice.amount) return;
    await updateRecord('invoices', editingInvoice.id, {
      company_id: editingInvoice.company_id,
      invoice_number: editingInvoice.invoice_number,
      amount: parseFloat(editingInvoice.amount),
      description: editingInvoice.description || 'Servicios Profesionales',
      issue_date: editingInvoice.issue_date,
      due_date: editingInvoice.due_date,
      status: editingInvoice.status,
    });
    setEditingInvoice(null);
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollection.invoice_id || !newCollection.amount_collected) return;
    
    await createRecord('collections', {
      invoice_id: newCollection.invoice_id,
      amount_collected: parseFloat(newCollection.amount_collected),
      collection_date: newCollection.collection_date,
      payment_method: newCollection.payment_method,
      bank: newCollection.bank || null,
      reference_number: null,
      status: 'completed',
    });

    await updateRecord('invoices', newCollection.invoice_id, { status: 'paid' });

    setShowCollectionModal(false);
    setNewCollection({
      invoice_id: '',
      amount_collected: '',
      collection_date: new Date().toISOString().split('T')[0],
      payment_method: 'transfer',
      bank: '',
    });
  };

  const handleUpdateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCollection.invoice_id || !editingCollection.amount_collected) return;
    
    await updateRecord('collections', editingCollection.id, {
      invoice_id: editingCollection.invoice_id,
      amount_collected: parseFloat(editingCollection.amount_collected),
      collection_date: editingCollection.collection_date,
      payment_method: editingCollection.payment_method,
      bank: editingCollection.bank || null,
    });
    
    setEditingCollection(null);
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.provider_name || !newPayment.amount) return;
    
    await createRecord('provider_payments', {
      purchase_id: newPayment.purchase_id || null,
      provider_name: newPayment.provider_name,
      amount: parseFloat(newPayment.amount),
      currency: newPayment.currency,
      payment_date: newPayment.payment_date,
      payment_method: newPayment.payment_method,
      bank: newPayment.bank || null,
      status: 'paid',
    });

    if (newPayment.purchase_id) {
      await updateRecord('purchases', newPayment.purchase_id, { status: 'paid' });
    }

    setShowPaymentModal(false);
    setNewPayment({
      purchase_id: '',
      provider_name: '',
      amount: '',
      currency: '$',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'transfer',
      bank: '',
    });
  };

  const handleUpdatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment.provider_name || !editingPayment.amount) return;
    
    await updateRecord('provider_payments', editingPayment.id, {
      purchase_id: editingPayment.purchase_id || null,
      provider_name: editingPayment.provider_name,
      amount: parseFloat(editingPayment.amount),
      currency: editingPayment.currency,
      payment_date: editingPayment.payment_date,
      payment_method: editingPayment.payment_method,
      bank: editingPayment.payment_method === 'transfer' ? (editingPayment.bank || null) : null,
    });
    
    setEditingPayment(null);
  };

  const handleDeleteItem = async (table: any, id: string) => {
    if (window.confirm('¿Está seguro de eliminar este registro?')) {
      await deleteRecord(table, id);
    }
  };

  // --- MÉTODOS CRUD COMPRAS Y PROVEEDORES (NEW-ISO) ---
  
  const handleCreateOrUpdateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name) return;

    if (editingVendor) {
      await updateRecord('vendors', editingVendor.id, {
        ...vendorForm,
      });
      setEditingVendor(null);
    } else {
      await createRecord('vendors', {
        ...vendorForm,
        evalQuality: 5,
        evalDelivery: 5,
        evalPrice: 5,
        evalService: 5,
        evalAdmin: 5,
        status: 'Aprobado',
        lastEvaluation: 'Sin evaluar',
      });
    }

    setShowVendorModal(false);
    setVendorForm({ name: '', cuit: '', category: '', responsible: '', email: '', phone: '' });
  };



  const handleAddItemRow = () => {
    setPurchaseItems([...purchaseItems, { description: '', quantity: 1, unitPrice: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(purchaseItems.filter((_, i) => i !== idx));
  };

  const handleItemRowChange = (idx: number, field: string, val: string) => {
    const updated = purchaseItems.map((item, i) => {
      if (i !== idx) return item;
      if (field === 'quantity') return { ...item, quantity: Math.max(1, parseInt(val) || 0) };
      if (field === 'unitPrice') return { ...item, unitPrice: Math.max(0, parseFloat(val) || 0) };
      return { ...item, [field]: val };
    });
    setPurchaseItems(updated);
  };

  const handleCreateOrUpdatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseForm.vendor_id) {
      alert('Debe seleccionar un proveedor');
      return;
    }

    const selectedVendor = vendors.find(v => v.id === purchaseForm.vendor_id);
    const vendorName = selectedVendor ? selectedVendor.name : 'Proveedor';
    
    // Calcular total de la compra
    const totalAmount = purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const firstItemDesc = purchaseItems[0]?.description || 'Gasto Operativo';

    const recordData = {
      purchase_date: purchaseForm.date,
      vendor_id: purchaseForm.vendor_id,
      provider_name: vendorName,
      projectName: purchaseForm.projectName,
      responsible: purchaseForm.responsible || currentUser?.name || 'Staff',
      items_json: JSON.stringify(purchaseItems),
      amount: totalAmount,
      currency: '$',
      description: firstItemDesc,
      category: (selectedVendor?.category?.toLowerCase().includes('licencia') ? 'software_licenses' : 'services') as any,
      status: purchaseForm.status,
      approved: purchaseForm.approved,
      invoiceNumber: purchaseForm.invoiceNumber,
    };

    if (editingPurchase) {
      await updateRecord('purchases', editingPurchase.id, recordData);
      setEditingPurchase(null);
    } else {
      await createRecord('purchases', recordData);
    }

    setShowPurchaseModal(false);
    setPurchaseForm({
      date: new Date().toISOString().split('T')[0],
      vendor_id: '',
      projectName: '',
      responsible: '',
      status: 'pending',
      approved: 'No',
      invoiceNumber: '',
    });
    setPurchaseItems([{ description: '', quantity: 1, unitPrice: 0 }]);
  };

  // --- Helper to calculate 15 days from issue date ---
  const calculateDueDate = (issueDateStr: string) => {
    if (!issueDateStr) return '';
    const date = new Date(issueDateStr + 'T12:00:00');
    date.setDate(date.getDate() + 15);
    return date.toISOString().split('T')[0];
  };

  const initialIssueDate = new Date().toISOString().split('T')[0];

  // --- FORMATEADORES ---
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount)) return '$ 0,00';
    return `$ ${amount.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPaymentMethod = (method: string) => {
    if (method === 'transfer') return 'Transferencia';
    if (method === 'cash') return 'Efectivo';
    if (method === 'check') return 'Cheque';
    if (method === 'credit_card') return 'Tarjeta de Crédito';
    if (method === 'e_cheq') return 'E-cheq';
    if (method === 'other') return 'Otro';
    return method;
  };

  // --- FILTRADOS ---

  // 1. Facturas
  const filteredInvoices = invoices
    .filter((i) => {
      if (isClient && i.company_id !== clientCompanyId) return false;
      if (!isClient && companyFilter !== 'ALL' && i.company_id !== companyFilter) return false;
      if (statusFilter !== 'ALL' && i.status !== statusFilter) return false;
      
      const company = companies.find((c) => c.id === i.company_id);
      const searchString = `${i.invoice_number} ${company?.name || ''} ${i.description || ''}`.toLowerCase();
      return searchString.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      if (a.issue_date !== b.issue_date) {
        return b.issue_date.localeCompare(a.issue_date);
      }
      return a.invoice_number.localeCompare(b.invoice_number);
    });

  // 2. Cobranzas
  const filteredCollections = collections.filter((c) => {
    const invoice = invoices.find((inv) => inv.id === c.invoice_id);
    if (!invoice) return false;
    if (isClient && invoice.company_id !== clientCompanyId) return false;
    if (!isClient && companyFilter !== 'ALL' && invoice.company_id !== companyFilter) return false;

    const company = companies.find((comp) => comp.id === invoice.company_id);
    const searchString = `${invoice.invoice_number} ${company?.name || ''} ${c.bank || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  // 3. Compras (Soportando la lógica del Sistema New-ISO)
  const filteredPurchases = isClient
    ? []
    : purchases.filter((p) => {
        // Filtro de búsqueda textual
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const vendor = vendors.find(v => v.id === p.vendor_id);
          const vendorName = vendor ? vendor.name.toLowerCase() : p.provider_name.toLowerCase();
          const project = (p.projectName || '').toLowerCase();
          const itemsText = (() => {
            try {
              const arr = JSON.parse(p.items_json || '[]');
              return arr.map((item: any) => item.description.toLowerCase()).join(' ');
            } catch (e) {
              return (p.description || '').toLowerCase();
            }
          })();
          const responsibleName = (p.responsible || '').toLowerCase();
          
          if (!vendorName.includes(q) && !project.includes(q) && !itemsText.includes(q) && !responsibleName.includes(q)) {
            return false;
          }
        }

        // Filtro de estados
        if (purchaseStatusFilter !== 'ALL') {
          const pStatusStr = p.status === 'paid' ? 'Pagado' : p.status === 'approved' ? 'Aprobado' : 'Pendiente';
          if (pStatusStr !== purchaseStatusFilter) return false;
        }

        // Filtro de aprobaciones
        if (purchaseApprovedFilter !== 'ALL') {
          const isApprovedStr = p.status === 'approved' || p.status === 'paid' || (p as any).approved === 'Sí' ? 'Sí' : 'No';
          if (isApprovedStr !== purchaseApprovedFilter) return false;
        }

          return true;
      })
      .sort((a, b) => (b.purchase_date || '').localeCompare(a.purchase_date || ''));

  // 4. Pagos a Proveedores
  const filteredPayments = isClient
    ? []
    : payments.filter((p) => {
        const searchString = `${p.provider_name} ${p.payment_method}`.toLowerCase();
        return searchString.includes(searchTerm.toLowerCase());
      });

  // 5. Proveedores (Maestro)
  const filteredVendors = isClient
    ? []
    : vendors.filter((v) => {
        if (searchTerm) {
          const q = searchTerm.toLowerCase();
          const matches = v.name.toLowerCase().includes(q) || 
                          v.cuit.includes(q) || 
                          v.category.toLowerCase().includes(q) ||
                          (v.responsible || '').toLowerCase().includes(q);
          if (!matches) return false;
        }

        if (vendorStatusFilter !== 'ALL' && v.status !== vendorStatusFilter) return false;

        return true;
      });

  // Opciones de filtrado
  const companyOptions = [...companies].sort((a, b) => a.name.localeCompare(b.name)).map((c) => ({ value: c.id, label: c.name }));
  const invoiceStatusOptions = [
    { value: 'sent', label: 'Enviada' },
    { value: 'paid', label: 'Pagada' },
    { value: 'overdue', label: 'Vencida' },
    { value: 'draft', label: 'Borrador' },
  ];



  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Administración Financiera</h2>
          <p style={{ color: 'var(--text-light-muted)', fontSize: '0.9rem' }}>
            Control de cobros a clientes, pagos a proveedores, emisión de facturas y costos operativos.
          </p>
        </div>

        {/* Sub-menú de Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-card-dark)', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-dark)' }}>
          <button
            onClick={() => { setActiveSubTab('facturacion'); setSearchTerm(''); setStatusFilter('ALL'); }}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSubTab === 'facturacion' ? 'var(--primary-orange)' : 'transparent',
              color: activeSubTab === 'facturacion' ? 'white' : 'var(--text-light-secondary)',
              fontSize: '0.85rem',
            }}
          >
            Facturación
          </button>
          <button
            onClick={() => { setActiveSubTab('cobranza'); setSearchTerm(''); setStatusFilter('ALL'); }}
            className="btn-secondary"
            style={{
              padding: '8px 14px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: activeSubTab === 'cobranza' ? 'var(--primary-orange)' : 'transparent',
              color: activeSubTab === 'cobranza' ? 'white' : 'var(--text-light-secondary)',
              fontSize: '0.85rem',
            }}
          >
            Cobranza
          </button>

          {!isClient && (
            <>
              <button
                onClick={() => { setActiveSubTab('compras'); setSearchTerm(''); setStatusFilter('ALL'); setActivePurchaseTab('compras'); }}
                className="btn-secondary"
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: activeSubTab === 'compras' ? 'var(--primary-orange)' : 'transparent',
                  color: activeSubTab === 'compras' ? 'white' : 'var(--text-light-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                Compras y Contrataciones
              </button>
              <button
                onClick={() => { setActiveSubTab('pagos'); setSearchTerm(''); setStatusFilter('ALL'); }}
                className="btn-secondary"
                style={{
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: activeSubTab === 'pagos' ? 'var(--primary-orange)' : 'transparent',
                  color: activeSubTab === 'pagos' ? 'white' : 'var(--text-light-secondary)',
                  fontSize: '0.85rem',
                }}
              >
                Pago a Proveedores
              </button>
            </>
          )}
        </div>
      </div>

      {/* --- 1. SUB-TAB: FACTURACIÓN --- */}
      {activeSubTab === 'facturacion' && (
        <div>
          {/* Filtros */}
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por nro. factura, cliente o descripción..."
              filters={[
                ...(!isClient ? [{ key: 'company', label: 'Clientes', options: companyOptions }] : []),
                { key: 'status', label: 'Estados', options: invoiceStatusOptions },
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

            {!isClient && (activeRole === 'superadmin' || activeRole === 'administracion') && (
              <div style={{ display: 'flex', gap: '10px' }}>
                {/* Importer PDF */}
                <button
                  className="btn-secondary"
                  onClick={() => pdfInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', borderColor: 'var(--primary-orange)', color: 'var(--primary-orange)' }}
                >
                  📄 Importar desde PDF
                </button>
                <input
                  type="file"
                  ref={pdfInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf"
                  onChange={handlePDFUpload}
                />

                {/* Cargador Masivo CSV */}
                <button
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  📥 Subir Historial (CSV/JSON)
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".csv,.json"
                  onChange={handleFileUpload}
                />
                
                <button className="btn-primary" onClick={() => { setShowInvoiceModal(true); setCompanySearch(''); setPdfAlertMessage(''); }}>
                  + Generar Factura
                </button>
              </div>
            )}
          </div>

          {/* Tabla de Facturas */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Emisión</th>
                  <th>Cliente</th>
                  <th>Descripción del servicio</th>
                  <th>Nro. Factura</th>
                  <th style={{ minWidth: '200px' }}>Importe C/ IVA</th>
                  <th>Vencimiento</th>
                  <th>Estado</th>
                  {!isClient && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={isClient ? 7 : 8} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                      No se encontraron facturas.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => {
                    const comp = companies.find((c) => c.id === inv.company_id);
                    return (
                      <tr key={inv.id}>
                        <td>{formatDate(inv.issue_date)}</td>
                        <td>{comp?.name || 'S/N'}</td>
                        <td>{inv.description || 'Servicios Profesionales'}</td>
                        <td style={{ fontWeight: 600 }}>{inv.invoice_number}</td>
                        <td style={{ fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                        <td>{formatDate(inv.due_date)}</td>
                        <td>
                          <span className={`badge ${inv.status === 'paid' ? 'badge-success' : inv.status === 'sent' ? 'badge-info' : inv.status === 'overdue' ? 'badge-danger' : 'badge-warning'}`}>
                            {inv.status === 'paid' ? 'Pagada' : inv.status === 'sent' ? 'Enviada' : inv.status === 'overdue' ? 'Vencida' : 'Borrador'}
                          </span>
                        </td>
                        {!isClient && (
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {inv.status !== 'paid' && (
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setNewCollection({ ...newCollection, invoice_id: inv.id, amount_collected: inv.amount.toString() });
                                    setShowCollectionModal(true);
                                  }}
                                >
                                  Cobrar
                                </button>
                              )}
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => {
                                  setEditingInvoice({
                                    ...inv,
                                    amount: inv.amount.toString(),
                                  });
                                  setCompanySearch('');
                                }}
                              >
                                Editar
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                onClick={() => handleDeleteItem('invoices', inv.id)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 2. SUB-TAB: COBRANZA --- */}
      {activeSubTab === 'cobranza' && (
        <div>
          {/* Filtros */}
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por factura, cliente o banco..."
              filters={!isClient ? [{ key: 'company', label: 'Clientes', options: companyOptions }] : []}
              activeFilters={{ company: companyFilter }}
              onFilterChange={(_, val) => setCompanyFilter(val)}
              onClearFilters={() => {
                setSearchTerm('');
                setCompanyFilter(isClient ? clientCompanyId || 'ALL' : 'ALL');
              }}
            />
          </div>

          {/* Tabla de cobros */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Factura Asociada</th>
                  <th>Cliente</th>
                  <th>Monto Cobrado</th>
                  <th>Fecha Cobro</th>
                  <th>Medio de Pago</th>
                  <th>Banco</th>
                  {!isClient && <th>Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={isClient ? 6 : 7} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                      No hay registros de cobranza.
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((col) => {
                    const inv = invoices.find((i) => i.id === col.invoice_id);
                    const comp = companies.find((c) => c.id === inv?.company_id);
                    return (
                      <tr key={col.id}>
                        <td style={{ fontWeight: 600 }}>{inv?.invoice_number || 'Eliminada'}</td>
                        <td>{comp?.name || 'S/N'}</td>
                        <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                          {formatCurrency(col.amount_collected)}
                        </td>
                        <td>{formatDate(col.collection_date)}</td>
                        <td>{formatPaymentMethod(col.payment_method)}</td>
                        <td>{col.bank || 'Ninguno'}</td>
                        {!isClient && (
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                onClick={() => setEditingCollection({
                                  ...col,
                                  amount_collected: col.amount_collected.toString()
                                })}
                              >
                                Editar
                              </button>
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                onClick={() => handleDeleteItem('collections', col.id)}
                              >
                                Eliminar
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- 3. SUB-TAB: COMPRAS (TRAÍDO E INTEGRADO DEL SISTEMA NEW-ISO) --- */}
      {activeSubTab === 'compras' && !isClient && (
        <div>
          {/* Sub-menú secundario del módulo de Compras (New-ISO) */}
          <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-dark)', marginBottom: '20px', width: 'fit-content' }}>
            <button
              onClick={() => { setActivePurchaseTab('compras'); setSearchTerm(''); }}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activePurchaseTab === 'compras' ? 'var(--primary-orange)' : 'transparent',
                color: activePurchaseTab === 'compras' ? 'white' : 'var(--text-light-secondary)',
                fontSize: '0.8rem',
              }}
            >
              🛒 Compras y Contrataciones
            </button>
            <button
              onClick={() => { setActivePurchaseTab('maestro'); setSearchTerm(''); }}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: activePurchaseTab === 'maestro' ? 'var(--primary-orange)' : 'transparent',
                color: activePurchaseTab === 'maestro' ? 'white' : 'var(--text-light-secondary)',
                fontSize: '0.8rem',
              }}
            >
              🗂️ Maestro de Proveedores
            </button>
          </div>

          {/* ACCIONES DE BOTONES FLOTANTES SEGÚN SUB-TAB */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              {activePurchaseTab === 'compras' && (
                <SearchFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="🔍 Buscar por proveedor, proyecto o ítem..."
                  filters={[
                    { key: 'status', label: 'Estados de Entrega', options: [{ value: 'Pendiente', label: 'Pendiente' }, { value: 'Enviado', label: 'Enviado' }, { value: 'Recibido', label: 'Recibido' }, { value: 'Pagado', label: 'Pagado' }] },
                    { key: 'approved', label: 'Aprobado', options: [{ value: 'Sí', label: 'Sí' }, { value: 'No', label: 'No' }] }
                  ]}
                  activeFilters={{ status: purchaseStatusFilter, approved: purchaseApprovedFilter }}
                  onFilterChange={(key, val) => {
                    if (key === 'status') setPurchaseStatusFilter(val);
                    if (key === 'approved') setPurchaseApprovedFilter(val);
                  }}
                  onClearFilters={() => { setSearchTerm(''); setPurchaseStatusFilter('ALL'); setPurchaseApprovedFilter('ALL'); }}
                />
              )}



              {activePurchaseTab === 'maestro' && (
                <SearchFilter
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchPlaceholder="🔍 Buscar proveedor por razón social, CUIT..."
                  filters={[{ key: 'status', label: 'Estados', options: [{ value: 'Aprobado', label: 'Aprobado' }, { value: 'Rechazado', label: 'Rechazado' }] }]}
                  activeFilters={{ status: vendorStatusFilter }}
                  onFilterChange={(_, val) => setVendorStatusFilter(val)}
                  onClearFilters={() => { setSearchTerm(''); setVendorStatusFilter('ALL'); }}
                />
              )}
            </div>

            {(activeRole === 'superadmin' || activeRole === 'administracion') && (
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditingVendor(null);
                    setVendorForm({ name: '', cuit: '', category: '', responsible: '', email: '', phone: '' });
                    setShowVendorModal(true);
                  }}
                >
                  ➕ Registrar Proveedor
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (vendors.length === 0) {
                      alert('Registre primero un proveedor en el maestro.');
                      return;
                    }
                    setEditingPurchase(null);
                    setPurchaseForm({
                      date: new Date().toISOString().split('T')[0],
                      vendor_id: vendors[0]?.id || '',
                      projectName: '',
                      responsible: currentUser?.name || '',
                      status: 'pending',
                      approved: 'No',
                      invoiceNumber: '',
                    });
                    setPurchaseItems([{ description: '', quantity: 1, unitPrice: 0 }]);
                    setShowPurchaseModal(true);
                  }}
                >
                  ➕ Registrar Compra
                </button>
              </div>
            )}
          </div>

          {/* CONTENIDO PRINCIPAL SEGÚN COMPRAS SUB-TAB */}
          
          {/* A. SUB-TAB: COMPRAS Y CONTRATACIONES */}
          {activePurchaseTab === 'compras' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor</th>
                    <th>Proyecto / Destino</th>
                    <th>Detalle de Compra (Items)</th>
                    <th>Importe C/ IVA</th>
                    <th style={{ textAlign: 'center' }}>Aprobado</th>
                    <th>Estado</th>
                    <th>Factura Nro.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                        No se encontraron registros de compras.
                      </td>
                    </tr>
                  ) : (
                    filteredPurchases.map((p) => {
                      const vendor = vendors.find(v => v.id === p.vendor_id);
                      
                      // Extraer items del json o simular si no tiene
                      let itemsArr: any[] = [];
                      try {
                        itemsArr = p.items_json ? JSON.parse(p.items_json) : [];
                      } catch (e) {
                        itemsArr = [];
                      }
                      if (itemsArr.length === 0) {
                        itemsArr = [{ description: p.description || 'Gasto de servicio', quantity: 1, unitPrice: p.amount }];
                      }

                      const isApproved = p.status === 'approved' || p.status === 'paid' || (p as any).approved === 'Sí';

                      return (
                        <tr key={p.id}>
                          <td>{formatDate(p.purchase_date)}</td>
                          <td><strong>{vendor?.name || p.provider_name}</strong></td>
                          <td>{p.projectName || 'General / Interno'}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '350px', fontSize: '0.8rem' }}>
                              {itemsArr.map((item, idx) => (
                                <div key={idx} style={{ paddingBottom: '4px', borderBottom: idx === itemsArr.length - 1 ? 'none' : '1px dotted rgba(255,255,255,0.05)' }}>
                                  <span style={{ fontWeight: 600 }}>• {item.description}</span><br />
                                  <span style={{ color: 'var(--text-light-muted)' }}>
                                    Cant: {item.quantity} | Unit: {formatCurrency(item.unitPrice)} | Sub: <strong>{formatCurrency(item.quantity * item.unitPrice)}</strong>
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td style={{ fontWeight: 600 }}>{formatCurrency(p.amount)}</td>
                          <td style={{ textAlign: 'center' }}>
                            <span className={`badge ${isApproved ? 'badge-success' : 'badge-danger'}`}>
                              {isApproved ? 'Sí' : 'No'}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'approved' ? 'badge-info' : p.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                              {p.status === 'paid' ? 'Pagado' : p.status === 'approved' ? 'Aprobado' : p.status === 'rejected' ? 'Rechazado' : 'Pendiente'}
                            </span>
                          </td>
                          <td>{p.invoiceNumber || <span style={{ color: 'var(--text-light-muted)' }}>-</span>}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', backgroundColor: 'var(--primary-orange-alpha)', color: 'var(--primary-orange)' }}
                                onClick={() => setShowViewPurchaseModal(p)}
                              >
                                Ver
                              </button>
                              {(activeRole === 'superadmin' || activeRole === 'administracion') && (
                                <>
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                    onClick={() => {
                                      setEditingPurchase(p);
                                      setPurchaseForm({
                                        date: p.purchase_date,
                                        vendor_id: p.vendor_id || '',
                                        projectName: p.projectName || '',
                                        responsible: p.responsible || '',
                                        status: p.status as any,
                                        approved: (p as any).approved || (isApproved ? 'Sí' : 'No'),
                                        invoiceNumber: p.invoiceNumber || '',
                                      });
                                      setPurchaseItems(itemsArr);
                                      setShowPurchaseModal(true);
                                    }}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="btn-secondary"
                                    style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                    onClick={() => handleDeleteItem('purchases', p.id)}
                                  >
                                    Eliminar
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}



          {/* C. SUB-TAB: MAESTRO DE PROVEEDORES */}
          {activePurchaseTab === 'maestro' && (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Razón Social / Proveedor</th>
                    <th>CUIT</th>
                    <th>Rubro / Categoría</th>
                    <th>Responsable Contacto</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                        No se encontraron proveedores registrados.
                      </td>
                    </tr>
                  ) : (
                    filteredVendors.map((v) => (
                      <tr key={v.id}>
                        <td><strong>{v.name}</strong></td>
                        <td>{v.cuit}</td>
                        <td><span className="badge badge-info">{v.category}</span></td>
                        <td>{v.responsible}</td>
                        <td>{v.email}</td>
                        <td>{v.phone}</td>
                        <td>
                          <span className={`badge ${v.status === 'Aprobado' ? 'badge-success' : 'badge-danger'}`}>
                            {v.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {(activeRole === 'superadmin' || activeRole === 'administracion') && (
                              <>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setEditingVendor(v);
                                    setVendorForm({
                                      name: v.name,
                                      cuit: v.cuit,
                                      category: v.category,
                                      responsible: v.responsible,
                                      email: v.email,
                                      phone: v.phone,
                                    });
                                    setShowVendorModal(true);
                                  }}
                                >
                                  Editar
                                </button>
                                <button
                                  className="btn-secondary"
                                  style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                                  onClick={() => handleDeleteItem('vendors', v.id)}
                                >
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- 4. SUB-TAB: PAGO A PROVEEDORES (STAFF ONLY) --- */}
      {activeSubTab === 'pagos' && !isClient && (
        <div>
          {/* Filtros */}
          <div className="view-header-actions">
            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              searchPlaceholder="Buscar por proveedor..."
              onClearFilters={() => setSearchTerm('')}
            />

            {(activeRole === 'superadmin' || activeRole === 'administracion') && (
              <button className="btn-primary" onClick={() => setShowPaymentModal(true)}>
                + Registrar Pago Directo
              </button>
            )}
          </div>

          {/* Tabla de Pagos */}
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Monto Pagado</th>
                  <th>Fecha Pago</th>
                  <th>Método</th>
                  <th>Banco</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-light-muted)' }}>
                      No se encontraron pagos a proveedores.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 600 }}>{p.provider_name}</td>
                      <td style={{ fontWeight: 600, color: 'var(--accent-red)' }}>
                        {formatCurrency(p.amount)}
                      </td>
                      <td>{formatDate(p.payment_date)}</td>
                      <td>{formatPaymentMethod(p.payment_method)}</td>
                      <td>{p.bank || 'Ninguno'}</td>
                      <td>
                        <span className="badge badge-success">Pagado</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setEditingPayment({
                                ...p,
                                amount: p.amount.toString(),
                                bank: p.bank || '',
                              });
                            }}
                          >
                            Editar
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '0.75rem', borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}
                            onClick={() => handleDeleteItem('provider_payments', p.id)}
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

      {/* --- MODALES --- */}

      {/* 1. Modal de Historial Bulk Preview */}
      {showBulkModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Previsualizar Historial a Importar</h3>
              <button className="modal-close" onClick={() => setShowBulkModal(false)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-light-muted)', marginBottom: '14px' }}>
                Se detectaron {bulkPreview.length} registros. A continuación se detallan las facturas detectadas. Las marcadas con advertencia no se importarán.
              </p>
              <div className="table-container" style={{ maxHeight: '350px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Nro. Factura</th>
                      <th>Cliente del Historial</th>
                      <th>Estado Enlace</th>
                      <th>Importe C/ IVA</th>
                      <th>Emisión</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkPreview.map((inv, idx) => (
                      <tr key={idx} style={{ opacity: inv.isValid ? 1 : 0.6 }}>
                        <td>{inv.invoice_number || 'FALTA NRO'}</td>
                        <td>{inv.company_name}</td>
                        <td style={{ color: inv.isValid ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                          {inv.company_name_found}
                        </td>
                        <td>{formatCurrency(inv.amount)}</td>
                        <td>{formatDate(inv.issue_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleImportInvoices}>
                Importar {bulkPreview.filter(i => i.isValid).length} Facturas Válidas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal de Factura */}
      {showInvoiceModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Generar Nueva Factura</h3>
              <button className="modal-close" onClick={() => setShowInvoiceModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateInvoice}>
              <div className="modal-body">
                {pdfAlertMessage && (
                  <div style={{
                    backgroundColor: 'var(--primary-orange-alpha)',
                    border: '1px solid var(--primary-orange)',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    marginBottom: '16px',
                    fontSize: '0.85rem',
                    color: 'var(--primary-orange)',
                    fontWeight: 500,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span>{pdfAlertMessage}</span>
                    <button 
                      type="button" 
                      onClick={() => setPdfAlertMessage('')} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-orange)', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
                    >
                      ×
                    </button>
                  </div>
                )}

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
                    value={newInvoice.company_id}
                    onChange={(e) => setNewInvoice({ ...newInvoice, company_id: e.target.value })}
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
                  <label>Número de Factura *</label>
                  <input
                    type="text"
                    value={newInvoice.invoice_number}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoice_number: e.target.value })}
                    placeholder="Ej. FAC-0001-00002043"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción del servicio *</label>
                  <input
                    type="text"
                    value={newInvoice.description}
                    onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                    placeholder="Ej. Consultoría en Procesos de Transformación Digital"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Importe C/ IVA *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newInvoice.amount}
                      onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      placeholder="Importe C/ IVA"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Moneda</label>
                    <input
                      type="text"
                      value="$"
                      disabled
                      style={{ backgroundColor: 'var(--bg-panel-dark)', color: 'var(--text-light-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Emisión *</label>
                    <input
                      type="date"
                      value={newInvoice.issue_date}
                      onChange={(e) => {
                        const newIssue = e.target.value;
                        setNewInvoice({
                          ...newInvoice,
                          issue_date: newIssue,
                          due_date: calculateDueDate(newIssue),
                        });
                      }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Vencimiento (15 días corridos)</label>
                    <input
                      type="date"
                      value={newInvoice.due_date}
                      disabled
                      style={{ backgroundColor: 'var(--bg-panel-dark)', color: 'var(--text-light-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Generar Factura</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Modificar Factura (ABM) */}
      {editingInvoice && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Modificar Factura</h3>
              <button className="modal-close" onClick={() => setEditingInvoice(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateInvoice}>
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
                    value={editingInvoice.company_id}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, company_id: e.target.value })}
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
                  <label>Número de Factura *</label>
                  <input
                    type="text"
                    value={editingInvoice.invoice_number}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, invoice_number: e.target.value })}
                    placeholder="Ej. FAC-0001-00002043"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Descripción del servicio *</label>
                  <input
                    type="text"
                    value={editingInvoice.description}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, description: e.target.value })}
                    placeholder="Ej. Consultoría en Procesos de Transformación Digital"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Importe C/ IVA *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingInvoice.amount}
                      onChange={(e) => setEditingInvoice({ ...editingInvoice, amount: e.target.value })}
                      placeholder="Importe C/ IVA"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Moneda</label>
                    <input
                      type="text"
                      value="$"
                      disabled
                      style={{ backgroundColor: 'var(--bg-panel-dark)', color: 'var(--text-light-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Emisión *</label>
                    <input
                      type="date"
                      value={editingInvoice.issue_date}
                      onChange={(e) => {
                        const newIssue = e.target.value;
                        setEditingInvoice({
                          ...editingInvoice,
                          issue_date: newIssue,
                          due_date: calculateDueDate(newIssue),
                        });
                      }}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha de Vencimiento (15 días corridos)</label>
                    <input
                      type="date"
                      value={editingInvoice.due_date}
                      disabled
                      style={{ backgroundColor: 'var(--bg-panel-dark)', color: 'var(--text-light-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Estado de Factura</label>
                  <select
                    value={editingInvoice.status}
                    onChange={(e) => setEditingInvoice({ ...editingInvoice, status: e.target.value as any })}
                  >
                    <option value="sent">Enviada</option>
                    <option value="paid">Pagada</option>
                    <option value="overdue">Vencida</option>
                    <option value="draft">Borrador</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingInvoice(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal de Cobranza (Registrar cobro) */}
      {showCollectionModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Registrar Cobranza</h3>
              <button className="modal-close" onClick={() => setShowCollectionModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateCollection}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Seleccionar Factura a Cobrar *</label>
                  <select
                    value={newCollection.invoice_id}
                    onChange={(e) => {
                      const inv = invoices.find((i) => i.id === e.target.value);
                      setNewCollection({
                        ...newCollection,
                        invoice_id: e.target.value,
                        amount_collected: inv ? inv.amount.toString() : '',
                      });
                    }}
                    required
                  >
                    <option value="">Seleccione una factura</option>
                    {invoices
                      .filter((i) => i.status !== 'paid')
                      .map((i) => {
                        const comp = companies.find((c) => c.id === i.company_id);
                        return (
                          <option key={i.id} value={i.id}>
                            {i.invoice_number} - {comp?.name} ({formatCurrency(i.amount)})
                          </option>
                        );
                      })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Monto Recibido *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newCollection.amount_collected}
                    onChange={(e) => setNewCollection({ ...newCollection, amount_collected: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Cobro *</label>
                  <input
                    type="date"
                    value={newCollection.collection_date}
                    onChange={(e) => setNewCollection({ ...newCollection, collection_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Medio de Pago</label>
                  <select
                    value={newCollection.payment_method}
                    onChange={(e) => setNewCollection({ ...newCollection, payment_method: e.target.value as any })}
                  >
                    <option value="transfer">Transferencia Bancaria</option>
                    <option value="cash">Efectivo</option>
                    <option value="check">Cheque</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                    <option value="e_cheq">E-cheq</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Banco</label>
                  <select
                    value={newCollection.bank}
                    onChange={(e) => setNewCollection({ ...newCollection, bank: e.target.value as any })}
                  >
                    <option value="">Ninguno / Otro</option>
                    <option value="Galicia">Galicia</option>
                    <option value="Comafi">Comafi</option>
                    <option value="Santander">Santander</option>
                    <option value="Uala">Ualá</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCollectionModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal de Modificar Cobranza (ABM) */}
      {editingCollection && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Modificar Cobranza</h3>
              <button className="modal-close" onClick={() => setEditingCollection(null)}>×</button>
            </div>
            <form onSubmit={handleUpdateCollection}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Seleccionar Factura Asociada *</label>
                  <select
                    value={editingCollection.invoice_id}
                    onChange={(e) => {
                      const inv = invoices.find((i) => i.id === e.target.value);
                      setEditingCollection({
                        ...editingCollection,
                        invoice_id: e.target.value,
                        amount_collected: inv ? inv.amount.toString() : editingCollection.amount_collected,
                      });
                    }}
                    required
                  >
                    <option value="">Seleccione una factura</option>
                    {invoices.map((i) => {
                      const comp = companies.find((c) => c.id === i.company_id);
                      return (
                        <option key={i.id} value={i.id}>
                          {i.invoice_number} - {comp?.name} ({formatCurrency(i.amount)})
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="form-group">
                  <label>Monto Recibido *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingCollection.amount_collected}
                    onChange={(e) => setEditingCollection({ ...editingCollection, amount_collected: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Cobro *</label>
                  <input
                    type="date"
                    value={editingCollection.collection_date}
                    onChange={(e) => setEditingCollection({ ...editingCollection, collection_date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Medio de Pago</label>
                  <select
                    value={editingCollection.payment_method}
                    onChange={(e) => setEditingCollection({ ...editingCollection, payment_method: e.target.value as any })}
                  >
                    <option value="transfer">Transferencia Bancaria</option>
                    <option value="cash">Efectivo</option>
                    <option value="check">Cheque</option>
                    <option value="credit_card">Tarjeta de Crédito</option>
                    <option value="e_cheq">E-cheq</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Banco</label>
                  <select
                    value={editingCollection.bank || ''}
                    onChange={(e) => setEditingCollection({ ...editingCollection, bank: e.target.value as any })}
                  >
                    <option value="">Ninguno / Otro</option>
                    <option value="Galicia">Galicia</option>
                    <option value="Comafi">Comafi</option>
                    <option value="Santander">Santander</option>
                    <option value="Uala">Ualá</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingCollection(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Modal de Registrar/Editar Proveedor (Maestro New-ISO) */}
      {showVendorModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {editingVendor ? 'Editar Proveedor' : 'Registrar Proveedor'}
              </h3>
              <button className="modal-close" onClick={() => setShowVendorModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateOrUpdateVendor}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Razón Social / Nombre de Fantasía *</label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    placeholder="Ej. Metrología Central S.A."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>CUIT / Identificación Fiscal</label>
                  <input
                    type="text"
                    value={vendorForm.cuit}
                    onChange={(e) => setVendorForm({ ...vendorForm, cuit: e.target.value })}
                    placeholder="Ej. 30-71829304-2"
                  />
                </div>
                <div className="form-group">
                  <label>Rubro / Categoría</label>
                  <input
                    type="text"
                    value={vendorForm.category}
                    onChange={(e) => setVendorForm({ ...vendorForm, category: e.target.value })}
                    placeholder="Ej. Insumos Químicos, Licencias de Software"
                  />
                </div>
                <div className="form-group">
                  <label>Responsable de Contacto</label>
                  <input
                    type="text"
                    value={vendorForm.responsible}
                    onChange={(e) => setVendorForm({ ...vendorForm, responsible: e.target.value })}
                    placeholder="Nombre del comercial o contacto"
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      placeholder="proveedor@empresa.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input
                      type="text"
                      value={vendorForm.phone}
                      onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                      placeholder="+54 9 11..."
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowVendorModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* 7. Modal de Registrar/Editar Compra Relacional (Items Builder) */}
      {showPurchaseModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                {editingPurchase ? 'Editar Registro de Compra' : 'Registrar Nueva Compra / Contratación'}
              </h3>
              <button className="modal-close" onClick={() => setShowPurchaseModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateOrUpdatePurchase}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Compra *</label>
                    <input
                      type="date"
                      value={purchaseForm.date}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Seleccionar Proveedor Homologado *</label>
                    <select
                      value={purchaseForm.vendor_id}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, vendor_id: e.target.value })}
                      required
                    >
                      <option value="">-- Seleccionar --</option>
                      {[...vendors]
                        .sort((a,b)=>a.name.localeCompare(b.name))
                        .map(v => (
                          <option key={v.id} value={v.id}>
                            {v.name} ({v.category}) - Evaluado: {v.status}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Proyecto / Servicio Destinatario</label>
                    <input
                      type="text"
                      value={purchaseForm.projectName}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, projectName: e.target.value })}
                      placeholder="Ej. Proyecto Central de Transformación Digital"
                    />
                  </div>
                  <div className="form-group">
                    <label>Responsable de la Compra</label>
                    <input
                      type="text"
                      value={purchaseForm.responsible}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, responsible: e.target.value })}
                      placeholder="Ej. Ing. Marcos Gómez"
                    />
                  </div>
                </div>

                {/* Items Dynamic List */}
                <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Detalle de Ítems / Conceptos *</label>
                    <button type="button" className="btn-secondary" onClick={handleAddItemRow} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
                      ➕ Añadir Ítem
                    </button>
                  </div>
                  
                  {purchaseItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                      <div style={{ flex: 3 }}>
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleItemRowChange(idx, 'description', e.target.value)}
                          placeholder="Descripción del insumo o servicio..."
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemRowChange(idx, 'quantity', e.target.value)}
                          placeholder="Cant"
                          style={{ textAlign: 'center' }}
                          required
                        />
                      </div>
                      <div style={{ flex: 1.5 }}>
                        <input
                          type="number"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(e) => handleItemRowChange(idx, 'unitPrice', e.target.value)}
                          placeholder="Precio Unit."
                          required
                        />
                      </div>
                      <div style={{ flex: 1.5, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', fontWeight: 600, fontSize: '0.85rem', textAlign: 'right', paddingRight: '8px' }}>
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 4px' }}
                        title="Quitar"
                        disabled={purchaseItems.length === 1}
                      >
                        🗑️
                      </button>
                    </div>
                  ))}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-dark)', fontWeight: 700, fontSize: '0.9rem' }}>
                    Total Consolidado: &nbsp;<span style={{ color: 'var(--primary-orange)' }}>
                      {formatCurrency(purchaseItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0))}
                    </span>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Aprobado</label>
                    <select
                      value={purchaseForm.approved}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, approved: e.target.value as any })}
                    >
                      <option value="No">No</option>
                      <option value="Sí">Sí</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Estado de Compra</label>
                    <select
                      value={purchaseForm.status}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, status: e.target.value as any })}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="approved">Enviado / Aprobado</option>
                      <option value="delivered">Recibido</option>
                      <option value="paid">Pagado</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Nro. de Factura Proveedor</label>
                    <input
                      type="text"
                      value={purchaseForm.invoiceNumber}
                      onChange={(e) => setPurchaseForm({ ...purchaseForm, invoiceNumber: e.target.value })}
                      placeholder="Ej. FAC-A-0012-9843"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPurchaseModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Compra</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 8. Modal de Visualización Detallada de Compra */}
      {showViewPurchaseModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Detalle de Orden de Compra</h3>
              <button className="modal-close" onClick={() => setShowViewPurchaseModal(null)}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border-dark)', paddingBottom: '16px' }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)' }}>Proveedor</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{vendors.find(v => v.id === showViewPurchaseModal.vendor_id)?.name || showViewPurchaseModal.provider_name}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)' }}>Fecha de Compra</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{formatDate(showViewPurchaseModal.purchase_date)}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)' }}>Proyecto / Destinatario</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{showViewPurchaseModal.projectName || 'General / Interno'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)' }}>Responsable</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>👤 {showViewPurchaseModal.responsible || 'S/N'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)' }}>Factura Proveedor</span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{showViewPurchaseModal.invoiceNumber || 'No registrada'}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-light-muted)' }}>Aprobado / Estado</span>
                  <div>
                    <span className={`badge ${showViewPurchaseModal.status === 'paid' || showViewPurchaseModal.status === 'approved' || (showViewPurchaseModal as any).approved === 'Sí' ? 'badge-success' : 'badge-danger'}`} style={{ marginRight: '6px' }}>
                      {showViewPurchaseModal.status === 'paid' || showViewPurchaseModal.status === 'approved' || (showViewPurchaseModal as any).approved === 'Sí' ? 'Aprobado: Sí' : 'Aprobado: No'}
                    </span>
                    <span className={`badge ${showViewPurchaseModal.status === 'paid' ? 'badge-success' : showViewPurchaseModal.status === 'approved' ? 'badge-info' : 'badge-warning'}`}>
                      {showViewPurchaseModal.status}
                    </span>
                  </div>
                </div>
              </div>

              <h5 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '8px' }}>Ítems Detallados</h5>
              <div className="table-container" style={{ background: 'var(--bg-panel-dark)', borderRadius: '6px', border: '1px solid var(--border-dark)', maxHeight: '200px' }}>
                <table style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ background: 'transparent' }}>Descripción</th>
                      <th style={{ background: 'transparent', textAlign: 'center' }}>Cant.</th>
                      <th style={{ background: 'transparent', textAlign: 'right' }}>Precio Unit.</th>
                      <th style={{ background: 'transparent', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      let itemsArr: any[] = [];
                      try {
                        itemsArr = showViewPurchaseModal.items_json ? JSON.parse(showViewPurchaseModal.items_json) : [];
                      } catch (e) {
                        itemsArr = [];
                      }
                      if (itemsArr.length === 0) {
                        itemsArr = [{ description: showViewPurchaseModal.description || 'Concepto de Gasto', quantity: 1, unitPrice: showViewPurchaseModal.amount }];
                      }
                      return itemsArr.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.description}</td>
                          <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                          <td style={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatCurrency(item.quantity * item.unitPrice)}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', fontWeight: 700, fontSize: '1rem', color: 'var(--primary-orange)' }}>
                Total: &nbsp;{formatCurrency(showViewPurchaseModal.amount)}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-primary" onClick={() => setShowViewPurchaseModal(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal de Registrar Pago Directo / Vinculado */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Efectuar Pago a Proveedor</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreatePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Vincular a Compra Aprobada</label>
                  <select
                    value={newPayment.purchase_id}
                    onChange={(e) => {
                      const pur = purchases.find((p) => p.id === e.target.value);
                      setNewPayment({
                        ...newPayment,
                        purchase_id: e.target.value,
                        provider_name: pur ? pur.provider_name : '',
                        amount: pur ? pur.amount.toString() : '',
                      });
                    }}
                  >
                    <option value="">Ninguna (Pago Directo)</option>
                    {purchases
                      .filter((p) => p.status === 'approved')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.provider_name} - {p.description || 'Gasto'} ({formatCurrency(p.amount)})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre del Proveedor *</label>
                  <input
                    type="text"
                    value={newPayment.provider_name}
                    onChange={(e) => setNewPayment({ ...newPayment, provider_name: e.target.value })}
                    placeholder="Nombre del proveedor"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Monto Pagado *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newPayment.amount}
                      onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Moneda</label>
                    <input
                      type="text"
                      value="$"
                      disabled
                      style={{ backgroundColor: 'var(--bg-panel-dark)', color: 'var(--text-light-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Pago *</label>
                    <input
                      type="date"
                      value={newPayment.payment_date}
                      onChange={(e) => setNewPayment({ ...newPayment, payment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Método de Pago</label>
                    <select
                      value={newPayment.payment_method}
                      onChange={(e) => {
                        const method = e.target.value as any;
                        setNewPayment({
                          ...newPayment,
                          payment_method: method,
                          bank: method === 'transfer' ? newPayment.bank : '',
                        });
                      }}
                    >
                      <option value="transfer">Transferencia Bancaria</option>
                      <option value="cash">Efectivo</option>
                      <option value="check">Cheque</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>

                {newPayment.payment_method === 'transfer' && (
                  <div className="form-group">
                    <label>Banco de Origen *</label>
                    <select
                      value={newPayment.bank}
                      onChange={(e) => setNewPayment({ ...newPayment, bank: e.target.value as any })}
                      required
                    >
                      <option value="">Seleccione un banco...</option>
                      <option value="Santander">Santander</option>
                      <option value="Comafi">Comafi</option>
                      <option value="Galicia">Galicia</option>
                      <option value="Uala">Ualá</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Registrar Pago</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Modificar Pago (ABM) */}
      {editingPayment && (
        <div className="modal-overlay">
          <div className="modal-content animate-fade-in">
            <div className="modal-header">
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Modificar Pago a Proveedor</h3>
              <button className="modal-close" onClick={() => setEditingPayment(null)}>×</button>
            </div>
            <form onSubmit={handleUpdatePayment}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Vincular a Compra Aprobada</label>
                  <select
                    value={editingPayment.purchase_id || ''}
                    onChange={(e) => {
                      const pur = purchases.find((p) => p.id === e.target.value);
                      setEditingPayment({
                        ...editingPayment,
                        purchase_id: e.target.value || null,
                        provider_name: pur ? pur.provider_name : editingPayment.provider_name,
                        amount: pur ? pur.amount.toString() : editingPayment.amount,
                      });
                    }}
                  >
                    <option value="">Ninguna (Pago Directo)</option>
                    {purchases
                      .filter((p) => p.status === 'approved' || p.id === editingPayment.purchase_id)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.provider_name} - {p.description || 'Gasto'} ({formatCurrency(p.amount)})
                        </option>
                      ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Nombre del Proveedor *</label>
                  <input
                    type="text"
                    value={editingPayment.provider_name}
                    onChange={(e) => setEditingPayment({ ...editingPayment, provider_name: e.target.value })}
                    placeholder="Nombre del proveedor"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Monto Pagado *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editingPayment.amount}
                      onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Moneda</label>
                    <input
                      type="text"
                      value="$"
                      disabled
                      style={{ backgroundColor: 'var(--bg-panel-dark)', color: 'var(--text-light-muted)', cursor: 'not-allowed' }}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Fecha de Pago *</label>
                    <input
                      type="date"
                      value={editingPayment.payment_date}
                      onChange={(e) => setEditingPayment({ ...editingPayment, payment_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Método de Pago</label>
                    <select
                      value={editingPayment.payment_method}
                      onChange={(e) => {
                        const method = e.target.value as any;
                        setEditingPayment({
                          ...editingPayment,
                          payment_method: method,
                          bank: method === 'transfer' ? editingPayment.bank : '',
                        });
                      }}
                    >
                      <option value="transfer">Transferencia Bancaria</option>
                      <option value="cash">Efectivo</option>
                      <option value="check">Cheque</option>
                      <option value="other">Otro</option>
                    </select>
                  </div>
                </div>

                {editingPayment.payment_method === 'transfer' && (
                  <div className="form-group">
                    <label>Banco de Origen *</label>
                    <select
                      value={editingPayment.bank || ''}
                      onChange={(e) => setEditingPayment({ ...editingPayment, bank: e.target.value as any })}
                      required
                    >
                      <option value="">Seleccione un banco...</option>
                      <option value="Santander">Santander</option>
                      <option value="Comafi">Comafi</option>
                      <option value="Galicia">Galicia</option>
                      <option value="Uala">Ualá</option>
                    </select>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEditingPayment(null)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CARGANDO PDF SPINNER OVERLAY --- */}
      {isProcessingPDF && (
        <div className="modal-overlay">
          <div className="glass-card animate-fade-in" style={{ padding: '32px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', border: '1px solid var(--primary-orange)', backgroundColor: 'var(--bg-card-dark)' }}>
            <div className="spinner" style={{
              width: '40px',
              height: '40px',
              border: '4px solid var(--border-dark)',
              borderTopColor: 'var(--primary-orange)',
              borderRadius: '50%',
              margin: '0 auto 16px auto',
              animation: 'spin 1s linear infinite'
            }}></div>
            <h4 style={{ fontSize: '1.1rem', marginBottom: '8px', color: 'white' }}>Procesando PDF con OCR e IA</h4>
            <p style={{ color: 'var(--text-light-muted)', fontSize: '0.85rem' }}>
              Extrayendo de forma inteligente la razón social, nro. de comprobante e importe de la factura...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
