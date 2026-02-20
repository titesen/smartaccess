# Documento de Requisitos del Producto (PRD)

## 1. Resumen Ejecutivo

SmartAccess IoT Platform es una solución técnica que permite simular dispositivos IoT y procesar eventos en una arquitectura orientada a eventos (EDA) resiliente, garantizando idempotencia, trazabilidad y tolerancia a fallos.

El sistema se centra en:

- Procesamiento confiable de eventos
- Prevención de duplicados
- Tolerancia a fallos del backend y consumers
- Auditoría completa
- Visualización en tiempo real

## 2. Objetivos y Contexto

### 2.1 Justificación

Las arquitecturas EDA suelen implementarse de forma superficial. Muchos sistemas:

- No manejan ACK manual
- No implementan idempotencia real
- No controlan retry ni DLQ
- No garantizan consistencia transaccional

SmartAccess resuelve ese vacío técnico construyendo un sistema completo que demuestra el funcionamiento real de un broker, el comportamiento ante caídas de backend y consumers, la prevención de duplicados y la integridad de datos.

### 2.2 Alcance

| Dimensión | Incluido en MVP | Excluido |
|-----------|----------------|----------|
| Usuarios | Desarrolladores, arquitectos técnicos | Usuarios finales no técnicos |
| Flujos | Simulación → Publicación → Procesamiento → Persistencia → Auditoría → Visualización | Replay histórico completo |
| Plataformas | Web (dashboard PWA) | App móvil nativa |
| Infraestructura | VPS + Docker Compose | Multi-región |

## 3. Requisitos Funcionales

### 3.1 Priorización

| ID | Descripción | Prioridad |
|----|------------|-----------|
| US-101 | Simular dispositivos IoT generando eventos estructurados periódicamente | P0 |
| US-102 | Publicar eventos en broker con confirmación | P0 |
| US-103 | Procesar eventos con ACK manual | P0 |
| US-104 | Implementar idempotencia en consumidor | P0 |
| US-105 | Implementar DLQ para fallos permanentes | P1 |
| US-106 | Dashboard en tiempo real | P2 |

### 3.2 Especificaciones Detalladas

#### US-101: Simulación de Dispositivo IoT

> Como sistema simulador, el componente genera eventos estructurados periódicamente para simular dispositivos IoT reales.

**Criterios de aceptación:**

```gherkin
Scenario: Generación periódica de eventos
  Given que el simulador está activo
  When transcurre el intervalo configurado
  Then se genera un evento con:
    - device_id válido
    - timestamp UTC
    - payload estructurado JSON
  And el evento tiene un event_id único
```

#### US-103: Procesamiento con ACK Manual

> Como consumer del broker, el componente confirma manualmente la recepción del mensaje para evitar pérdida de eventos.

```gherkin
Scenario: Procesamiento exitoso
  Given que el mensaje fue recibido
  When la persistencia en PostgreSQL es exitosa
  Then el sistema envía ACK al broker
  And el mensaje no se reentrega

Scenario: Falla en procesamiento
  Given que ocurre un error en persistencia
  When el mensaje no fue procesado completamente
  Then el sistema NO envía ACK
  And el broker reentrega el mensaje
```

#### US-104: Idempotencia

> Como sistema backend, el componente detecta eventos ya procesados para evitar duplicación de datos.

```gherkin
Scenario: Evento duplicado
  Given que el event_id ya existe en la tabla de idempotencia
  When el evento es recibido nuevamente
  Then el sistema descarta el procesamiento
  And registra auditoría de evento duplicado
```

## 4. Requisitos No Funcionales

### 4.1 Rendimiento

| Requisito | Métrica | Objetivo | Herramienta |
|-----------|---------|----------|-------------|
| Latencia de procesamiento | p95 | < 200ms | k6 |
| Throughput | Eventos por segundo | > 50 EPS | k6 |
| Dashboard tiempo real | Delay de actualización | < 2s | WebSocket monitor |

### 4.2 Seguridad

| Requisito | Estándar | Implementación |
|-----------|---------|---------------|
| Autenticación | JWT | Validación server-side |
| Autorización | RBAC | Roles ADMIN / OPERATOR / VIEWER |
| Transporte seguro | TLS 1.3 | HTTPS obligatorio via Nginx |
| Auditoría | Log estructurado | Trazabilidad completa |

### 4.3 Accesibilidad

| Criterio | Nivel | Ejemplo |
|----------|-------|---------|
| Contraste | WCAG 2.1 AA | 4.5:1 mínimo |
| Navegación teclado | AA | Dashboard navegable por teclado |
| ARIA roles | AA | Componentes dinámicos accesibles |

### 4.4 Resiliencia

| Requisito | Métrica | Estrategia |
|-----------|---------|-----------|
| Disponibilidad | 99% | Health checks + restart automático |
| Recuperación | < 30s | Restart automático vía Docker |
| Idempotencia | 100% endpoints críticos | Constraint UNIQUE en base de datos |
| Retry controlado | Máximo 5 intentos | Backoff exponencial |
| DLQ | 100% fallos permanentes | Cola dedicada en RabbitMQ |

## 5. Métricas de Éxito

### 5.1 KPIs Técnicos

| Métrica | Umbral de Alerta | Herramienta |
|---------|-----------------|-------------|
| Error rate | > 1% | Prometheus |
| Latencia p99 | > 1s | Grafana |
| Reintentos excesivos | > 5 por evento | Métricas del broker |
| Duplicados detectados | > 0 | Verificación en base de datos |

### 5.2 KPIs de Validación

| Métrica | Objetivo |
|---------|----------|
| Casos de fallo demostrables | 3 escenarios mínimo |
| Integridad de datos | 0 inconsistencias (validación FK) |
| Cobertura de auditoría | 100% eventos críticos |

## 6. Dependencias y Restricciones

### 6.1 Dependencias Técnicas

| Dependencia | Tipo | Riesgo si Falla | Mitigación |
|------------|------|-----------------|-----------|
| RabbitMQ | Infraestructura | Sin mensajería | Retry de conexión |
| PostgreSQL | Infraestructura | Pérdida temporal de datos | Backup + constraints |
| VPS | Infraestructura | Caída total | Restart manual |
| Docker | Plataforma | No reproducible | Documentación de setup |

### 6.2 Restricciones de Diseño

| Restricción | Origen | Impacto |
|------------|--------|---------|
| Monolito modular | Decisión arquitectónica | Menor complejidad operativa |
| VPS único | Optimización de costos | Recursos limitados |

## 7. Glosario

| Término | Definición |
|---------|-----------|
| EDA | Event-Driven Architecture |
| ACK | Confirmación manual de mensaje procesado |
| DLQ | Dead Letter Queue — cola para mensajes fallidos permanentemente |
| Idempotencia | Garantía de que un evento no produce efectos duplicados |
| Outbox | Patrón de consistencia entre base de datos y broker |
