# Sistema de Diseño Técnico

## 1. Propósito

Este documento define la implementación técnica del sistema de diseño del dashboard IoT en tiempo real. Constituye la fuente de verdad para el desarrollo frontend e incluye tokens de diseño, componentes reutilizables, patrones para estados en tiempo real, convenciones para eventos críticos y requisitos de accesibilidad.

## 2. Design Tokens

### 2.1 Sistema de Colores

El sistema de colores está optimizado para estados operativos, alertas, severidad, diferenciación visual rápida y entornos oscuros (modo operador).

#### `src/design-system/tokens/colors.ts`

```ts
export const colorTokens = {
  primary: {
    400: 'hsl(217, 88%, 48%)',
    500: 'hsl(217, 88%, 37%)',
    600: 'hsl(217, 87%, 30%)'
  },
  device: {
    online: 'hsl(158, 64%, 40%)',
    offline: 'hsl(0, 0%, 50%)',
    error: 'hsl(354, 82%, 45%)',
    warning: 'hsl(44, 100%, 45%)',
    maintenance: 'hsl(204, 100%, 45%)'
  },
  severity: {
    critical: 'hsl(354, 82%, 35%)',
    high: 'hsl(14, 90%, 45%)',
    medium: 'hsl(44, 100%, 40%)',
    low: 'hsl(158, 64%, 35%)',
    info: 'hsl(204, 100%, 35%)'
  },
  surface: {
    background: 'hsl(0, 0%, 98%)',
    card: 'hsl(0, 0%, 100%)',
    elevated: 'hsl(0, 0%, 100%)'
  },
  text: {
    primary: 'hsl(0, 0%, 15%)',
    secondary: 'hsl(0, 0%, 40%)',
    inverse: 'hsl(0, 0%, 100%)'
  },
  border: {
    default: 'hsl(0, 0%, 85%)',
    subtle: 'hsl(0, 0%, 92%)'
  }
} as const;
```

#### CSS Variables

```ts
export const lightThemeCSS = `
:root {
  --color-primary: ${colorTokens.primary[500]};

  --color-device-online: ${colorTokens.device.online};
  --color-device-offline: ${colorTokens.device.offline};
  --color-device-error: ${colorTokens.device.error};
  --color-device-warning: ${colorTokens.device.warning};
  --color-device-maintenance: ${colorTokens.device.maintenance};

  --color-severity-critical: ${colorTokens.severity.critical};
  --color-severity-high: ${colorTokens.severity.high};
  --color-severity-medium: ${colorTokens.severity.medium};
  --color-severity-low: ${colorTokens.severity.low};
  --color-severity-info: ${colorTokens.severity.info};
}
`;
```

### 2.2 Tipografía

Optimizada para densidad de datos, tablas, métricas y consolas técnicas.

#### `src/design-system/tokens/typography.ts`

```ts
export const typographyTokens = {
  heading: {
    lg: { fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.4 },
    md: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5 }
  },
  body: {
    md: { fontSize: '1rem', fontWeight: 400, lineHeight: 1.6 },
    sm: { fontSize: '0.875rem', fontWeight: 400, lineHeight: 1.6 }
  },
  metric: {
    lg: { fontSize: '2rem', fontWeight: 700, lineHeight: 1.2 }
  },
  mono: {
    fontFamily: 'Consolas, Monaco, monospace',
    fontSize: '0.875rem'
  }
} as const;
```

### 2.3 Spacing (Grid de 4px)

```ts
export const spacingTokens = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '24px',
  6: '32px'
} as const;
```

### 2.4 Elevación

```ts
export const shadowTokens = {
  sm: '0 1px 2px rgba(0,0,0,0.05)',
  md: '0 4px 8px rgba(0,0,0,0.08)',
  lg: '0 12px 20px rgba(0,0,0,0.12)'
};
```

## 3. Componentes Atómicos

### 3.1 StatusBadge

Componente crítico que representa estado de dispositivo, severidad de evento y conectividad WebSocket.

#### `components/StatusBadge.tsx`

```tsx
import React from 'react';
import styled from '@emotion/styled';

type StatusType =
  | 'online' | 'offline' | 'error' | 'warning' | 'maintenance'
  | 'critical' | 'high' | 'medium' | 'low' | 'info';

interface Props {
  status: StatusType;
}

const Badge = styled.span<{ $status: StatusType }>`
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: white;
  background-color: ${({ $status }) => {
    switch ($status) {
      case 'online': return 'var(--color-device-online)';
      case 'offline': return 'var(--color-device-offline)';
      case 'error':
      case 'critical': return 'var(--color-severity-critical)';
      case 'high': return 'var(--color-severity-high)';
      case 'medium': return 'var(--color-severity-medium)';
      case 'low': return 'var(--color-severity-low)';
      case 'info': return 'var(--color-severity-info)';
      default: return 'var(--color-device-maintenance)';
    }
  }};
`;

export const StatusBadge: React.FC<Props> = ({ status }) => {
  return <Badge $status={status}>{status}</Badge>;
};
```

## 4. Patrones de Tiempo Real

### 4.1 LiveIndicator

Indica el estado de la conexión WebSocket.

```tsx
export const LiveIndicator = ({ connected }: { connected: boolean }) => (
  <StatusBadge status={connected ? 'online' : 'offline'} />
);
```

### 4.2 Animated Event Highlight

Resalta visualmente eventos nuevos recibidos por WebSocket.

```css
.event-row--new {
  animation: highlight 1.5s ease-out;
}

@keyframes highlight {
  from { background-color: rgba(33, 150, 243, 0.2); }
  to { background-color: transparent; }
}
```

## 5. Patrones de Layout

### 5.1 MonitoringCard

```tsx
import styled from '@emotion/styled';

export const MonitoringCard = styled.div`
  background: var(--color-surface-card);
  padding: 16px;
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
```

### 5.2 Data Table (Eventos)

Características requeridas:

- Ordenable por columnas
- Virtual scrolling para listas grandes
- Resaltado de eventos nuevos
- Densidad alta de información

```css
.timestamp {
  font-family: var(--text-code-font);
}
```

## 6. Accesibilidad (WCAG AA)

Requisitos obligatorios del sistema de diseño:

- Contraste mínimo 4.5:1
- Navegación completa por teclado
- Focus visible obligatorio en todos los elementos interactivos
- `aria-live="polite"` para notificaciones de eventos en tiempo real

```tsx
<div aria-live="polite">
  {latestEvent && <span>New event received</span>}
</div>
```

## 7. Consideraciones PWA

- Indicador de modo offline visible cuando la conexión se pierde
- Estrategia cache-first para assets de UI
- Estrategia network-first para datos de eventos

```tsx
{!navigator.onLine && (
  <StatusBadge status="warning" />
)}
```
