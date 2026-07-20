// SVGCHARTS.TSX
// Componentes de gráficos interactivos construidos completamente en SVG y CSS.
// Garantiza total compatibilidad, cero dependencias externas y personalización estética (naranja/grises).

import React from 'react';

// --- GRÁFICO DE BARRAS ---
interface BarData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarData[];
  title?: string;
  height?: number;
  prefix?: string;
}

export const BarChart: React.FC<BarChartProps> = ({ data, title, height = 200, prefix = '' }) => {
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const chartHeight = height - 40;
  const paddingBottom = 30;
  const paddingLeft = 50;
  const chartWidth = 500;
  const graphWidth = chartWidth - paddingLeft;
  const graphHeight = chartHeight - paddingBottom;

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', flex: 1 }}>
      {title && (
        <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-light-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h4>
      )}
      <div style={{ position: 'relative', width: '100%' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" height={height} style={{ overflow: 'visible' }}>
          {/* Grillas horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
            const y = graphHeight - ratio * graphHeight;
            const val = Math.round(ratio * maxVal);
            return (
              <g key={i}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth}
                  y2={y}
                  stroke="var(--border-dark)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  fill="var(--text-light-muted)"
                  fontSize="10"
                  textAnchor="end"
                >
                  {prefix}{val.toLocaleString()}
                </text>
              </g>
            );
          })}

          {/* Eje X y Y */}
          <line
            x1={paddingLeft}
            y1={graphHeight}
            x2={chartWidth}
            y2={graphHeight}
            stroke="var(--border-dark)"
            strokeWidth="1.5"
          />
          <line
            x1={paddingLeft}
            y1={0}
            x2={paddingLeft}
            y2={graphHeight}
            stroke="var(--border-dark)"
            strokeWidth="1.5"
          />

          {/* Barras */}
          {data.map((item, index) => {
            const barWidth = Math.min(30, graphWidth / data.length / 2);
            const spacing = graphWidth / data.length;
            const x = paddingLeft + index * spacing + spacing / 2 - barWidth / 2;
            const barValHeight = (item.value / maxVal) * graphHeight;
            const y = graphHeight - barValHeight;

            return (
              <g key={index} style={{ cursor: 'pointer' }}>
                <title>{`${item.label}: ${prefix}${item.value.toLocaleString()}`}</title>
                {/* Gradiente Naranja */}
                <defs>
                  <linearGradient id={`orange-grad-${index}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary-orange)" />
                    <stop offset="100%" stopColor="#8A2B00" />
                  </linearGradient>
                </defs>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barValHeight}
                  fill={`url(#orange-grad-${index})`}
                  rx="3"
                  style={{
                    transition: 'height 0.8s ease, y 0.8s ease',
                    transformOrigin: 'bottom',
                  }}
                />
                {/* Valor superior */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  fill="var(--text-light-primary)"
                  fontSize="10"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {prefix}{item.value > 1000 ? `${(item.value / 1000).toFixed(1)}k` : item.value}
                </text>
                {/* Etiqueta Eje X */}
                <text
                  x={x + barWidth / 2}
                  y={graphHeight + 16}
                  fill="var(--text-light-muted)"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

// --- GRÁFICO DONUT / TORTA ---
interface DonutData {
  label: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutData[];
  title?: string;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, title, size = 180 }) => {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Colores por defecto (escala de naranjas/grises)
  const defaultColors = [
    'var(--primary-orange)',
    '#D05600',
    '#903D00',
    '#4E545C',
    '#2E3339',
  ];

  let accumulatedPercent = 0;

  return (
    <div className="glass-card" style={{ padding: '20px', borderRadius: '12px', flex: 1, display: 'flex', flexDirection: 'column' }}>
      {title && (
        <h4 style={{ marginBottom: '16px', fontSize: '0.9rem', color: 'var(--text-light-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h4>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', flexWrap: 'wrap', flex: 1 }}>
        <div style={{ position: 'relative', width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Círculo base de fondo */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke="var(--bg-panel-dark)"
              strokeWidth={strokeWidth}
            />

            {data.map((item, index) => {
              const percent = item.value / total;
              const strokeOffset = circumference - (accumulatedPercent * circumference);
              accumulatedPercent += percent;
              const color = item.color || defaultColors[index % defaultColors.length];

              return (
                <circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{
                    transition: 'stroke-dashoffset 0.8s ease',
                  }}
                >
                  <title>{`${item.label}: ${item.value} (${Math.round(percent * 100)}%)`}</title>
                </circle>
              );
            })}
          </svg>
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '1.4rem', fontWeight: '700', color: 'var(--text-light-primary)' }}>
              {total.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-light-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Registros
            </div>
          </div>
        </div>

        {/* Leyenda */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '120px' }}>
          {data.map((item, index) => {
            const percent = (item.value / total) * 100;
            const color = item.color || defaultColors[index % defaultColors.length];
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: color,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '500', color: 'var(--text-light-secondary)' }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-light-muted)' }}>
                    {item.value} ({Math.round(percent)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
