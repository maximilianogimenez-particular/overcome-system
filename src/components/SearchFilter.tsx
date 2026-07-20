// SEARCHFILTER.TSX
// Componente de barra de búsqueda y filtros dinámicos reutilizable para todas las tablas.

import React from 'react';

interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface SearchFilterProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterOption[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Buscar...',
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters,
}) => {
  const hasActiveFilters = Object.values(activeFilters).some((val) => val !== '' && val !== 'ALL') || searchTerm !== '';

  return (
    <div className="search-filters-bar">
      {/* Buscador */}
      <div className="search-input-wrapper">
        <svg className="search-icon-svg" viewBox="0 0 24 24">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filtros Dinámicos */}
      {filters.map((filter) => (
        <select
          key={filter.key}
          className="filter-select"
          value={activeFilters[filter.key] || ''}
          onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
        >
          <option value="ALL">Todos los {filter.label}</option>
          {filter.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ))}

      {/* Botón Limpiar */}
      {hasActiveFilters && onClearFilters && (
        <button
          className="btn-secondary"
          style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          onClick={onClearFilters}
        >
          Limpiar
        </button>
      )}
    </div>
  );
};
