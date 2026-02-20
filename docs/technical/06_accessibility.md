# Accesibilidad (WCAG 2.1 AA)

## 1. Propósito

Este documento define la estrategia integral de accesibilidad del sistema de monitoreo y gestión de eventos en tiempo real, incluyendo el panel de control web (PWA), dashboards de dispositivos IoT, formularios administrativos y notificaciones en tiempo real. Constituye la guía normativa y técnica obligatoria para el desarrollo frontend, backend y QA.

La accesibilidad es un requisito no funcional obligatorio. Ningún componente se considera completo si no cumple WCAG 2.1 AA.

## 2. Compromiso y Alcance

### 2.1 Alcance del Sistema

| Componente | Nivel Objetivo | Observaciones |
|-----------|---------------|--------------|
| PWA Web Dashboard | WCAG 2.1 AA | Panel en tiempo real con WebSocket |
| Formularios Administrativos | WCAG 2.1 AA | Gestión de dispositivos y eventos |
| Notificaciones en Tiempo Real | WCAG 2.1 AA | ARIA live regions |
| Documentación Técnica Web | WCAG 2.1 AA | Markdown render accesible |

### 2.2 Marco Legal de Referencia

| Normativa | Aplicabilidad |
|----------|---------------|
| Ley 26.653 (Argentina) | Accesibilidad web sector público |
| ADA Title III (USA) | Aplicaciones comerciales |
| EN 301 549 (EU) | Estándar europeo |

## 3. Principios WCAG (POUR)

El sistema cumple los cuatro principios fundamentales:

| Principio | Requisito |
|-----------|----------|
| Perceptible | La información puede percibirse por todos los usuarios |
| Operable | La interfaz es usable con teclado y tecnologías asistivas |
| Comprensible | La información y la interacción son predecibles |
| Robusto | El sistema funciona con screen readers actuales y futuros |

## 4. Requisitos Técnicos Específicos

### 4.1 Accesibilidad en Sistemas en Tiempo Real

Las actualizaciones en tiempo real pueden interrumpir screen readers, cambiar contenido sin aviso y generar ruido cognitivo. Se aplican los siguientes requisitos:

**ARIA Live Regions:**

| Tipo de Evento | aria-live |
|---------------|-----------|
| Evento informativo | `polite` |
| Evento crítico (alerta IoT) | `assertive` |
| Actualización frecuente (telemetría) | `off` o batch |

```html
<div aria-live="polite" aria-atomic="true" id="event-notifications"></div>
```

**Actualización de DOM:** Está prohibido re-renderizar toda la tabla en cada evento. Solo se actualiza la fila afectada.

**Reducción de movimiento:**

```css
@media (prefers-reduced-motion: reduce) {
  animation: none;
  transition: none;
}
```

### 4.2 Formularios

Requisitos para la gestión de dispositivos:

- `<label>` obligatorio para cada input
- `aria-describedby` para ayuda contextual
- `aria-invalid` en validaciones
- No se utiliza solo color para indicar errores
- Confirmaciones explícitas en acciones destructivas

### 4.3 Dashboard de Eventos

El dashboard es el componente más crítico en términos de accesibilidad.

**Estructura semántica:**

```html
<header>
<nav>
<main>
<section>
<table>
```

**Tablas de eventos:**

- `<caption>` descriptivo obligatorio
- `<thead>` y `<tbody>` obligatorios
- `scope="col"` en headers de columna
- Está prohibido usar tablas para layout

### 4.4 Notificaciones en Tiempo Real

- `role="alert"` para errores críticos
- `role="status"` para información
- `aria-live` en contenedores de notificación
- Botón de cerrar accesible por teclado
- Las notificaciones de error no desaparecen automáticamente

### 4.5 WebSocket y Accesibilidad

Cuando se pierde la conexión:

```html
<div role="alert" aria-live="assertive">
  Conexión perdida. Intentando reconectar...
</div>
```

Cuando se restablece:

```html
<div role="status" aria-live="polite">
  Conexión restablecida.
</div>
```

### 4.6 PWA y Modo Offline

Cuando el sistema entra en modo offline:

- Se indica claramente con texto e icono (no solo color)
- No se bloquea la navegación por teclado
- Se permite la navegación local de datos cacheados

## 5. Herramientas de Validación

**Automatizadas:**
- axe-core
- Lighthouse (score ≥ 90)
- eslint-plugin-jsx-a11y

**Manuales:**
- Navegación exclusiva por teclado
- Pruebas con NVDA
- Pruebas con zoom al 200%
- Pruebas en modo de alto contraste

## 6. Proceso de Validación

Ningún PR puede mergearse si:

- axe reporta errores críticos
- jsx-a11y tiene errores
- La navegación por teclado falla
- La jerarquía de headings se rompe
- Los eventos WebSocket no se anuncian correctamente

## 7. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Saturación por eventos frecuentes | Batch updates en live regions |
| Alertas repetitivas | Throttling de anuncios |
| Cambios bruscos de layout | Sin reflow inesperado |
| Pérdida de foco en re-render | Mantener foco programáticamente |
| Información transmitida solo por color | Texto adicional obligatorio |

## 8. Definición de Cumplimiento

El sistema se considera accesible cuando:

- Cumple WCAG 2.1 AA
- Lighthouse reporta ≥ 90 en accesibilidad
- No existen violaciones críticas en axe
- Es usable completamente con teclado
- Funciona correctamente con screen reader
- No depende exclusivamente de indicadores visuales de WebSocket
