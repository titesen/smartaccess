# Auditoría y Cumplimiento

## 1. Propósito

Este documento establece los requisitos, controles y procedimientos para garantizar que todas las operaciones del sistema orientado a eventos sean auditables, trazables y verificables. La auditoría permite:

- Evidencia objetiva de cumplimiento
- Detección de actividad anómala
- Investigación forense
- Verificación de integridad del flujo de eventos

## 2. Alcance

### 2.1 Componentes Auditados

| Componente | Tipo de Auditoría | Frecuencia |
|-----------|------------------|-----------|
| Event Processing | Automática | Continua (cada evento) |
| Device State Changes | Automática | Cada transición |
| Authentication | Automática | Cada intento |
| API Access | Automática | Cada request |
| Infrastructure Changes | Manual | Cada cambio |

### 2.2 Categorías de Auditoría

| Categoría | Descripción | Ejemplo |
|-----------|-------------|---------|
| DOMAIN | Operaciones de negocio | Evento procesado, estado de dispositivo cambiado |
| TECHNICAL | Operaciones técnicas | Retry ejecutado, DLQ ingresado |
| SECURITY | Operaciones de seguridad | Login exitoso, acceso denegado |

## 3. Registro de Auditoría

### 3.1 Estructura

Todos los registros de auditoría se almacenan en la tabla `audit_log`:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | BIGSERIAL | Identificador único |
| event_type | VARCHAR(100) | Tipo de operación auditada |
| category | VARCHAR(50) | DOMAIN, TECHNICAL, SECURITY |
| aggregate_type | VARCHAR(100) | Entidad afectada (Device, Event, User) |
| aggregate_id | VARCHAR(100) | Identificador de la entidad |
| previous_state | JSONB | Estado antes de la operación |
| new_state | JSONB | Estado después de la operación |
| actor | VARCHAR(150) | Quien ejecutó la acción |
| ip_address | VARCHAR(45) | Dirección IP del actor |
| correlation_id | UUID | Trazabilidad con otros registros |
| result | VARCHAR(20) | SUCCESS o FAILURE |
| created_at | TIMESTAMPTZ | Timestamp UTC |

### 3.2 Inmutabilidad

Los registros de auditoría son inmutables:

- No se permite UPDATE sobre la tabla `audit_log`
- No se permite DELETE sobre la tabla `audit_log`
- Solo INSERT está habilitado
- La retención es indefinida

## 4. Eventos Auditados

### 4.1 Eventos de Dominio

| Evento | Trigger | Datos Registrados |
|--------|---------|------------------|
| DEVICE_REGISTERED | Nuevo dispositivo creado | device_id, actor |
| DEVICE_STATUS_CHANGED | Transición de estado | previous_status, new_status, actor |
| EVENT_PROCESSED | Evento procesado exitosamente | event_id, event_type, duration_ms |
| EVENT_DUPLICATE_DETECTED | Idempotency key duplicada | event_id, idempotency_key |
| ALERT_TRIGGERED | Alerta generada | device_id, severity, threshold |

### 4.2 Eventos Técnicos

| Evento | Trigger | Datos Registrados |
|--------|---------|------------------|
| EVENT_RETRY | Reintento ejecutado | event_id, attempt, error |
| EVENT_DLQ | Evento movido a DLQ | event_id, failure_reason |
| OUTBOX_PUBLISHED | Outbox event publicado | outbox_id, event_type |
| CONSUMER_RECONNECTED | Consumer se reconectó | consumer_name, downtime_ms |

### 4.3 Eventos de Seguridad

| Evento | Trigger | Datos Registrados |
|--------|---------|------------------|
| LOGIN_SUCCESS | Autenticación exitosa | user_id, ip_address |
| LOGIN_FAILURE | Autenticación fallida | username, ip_address, reason |
| ACCESS_DENIED | Autorización denegada | user_id, resource, action |
| TOKEN_EXPIRED | JWT expirado | user_id |

## 5. Trazabilidad

### 5.1 Correlation ID

Cada flujo de evento tiene un `correlation_id` que permite rastrear toda la cadena:

```
Device Simulator (genera correlation_id)
→ RabbitMQ (propaga en headers)
→ Consumer (registra en audit)
→ PostgreSQL (persiste)
→ WebSocket (propaga al frontend)
```

### 5.2 Consultas de Auditoría

**Historial completo de un dispositivo:**

```sql
SELECT * FROM audit_log
WHERE aggregate_type = 'Device'
AND aggregate_id = :device_id
ORDER BY created_at DESC;
```

**Todos los fallos de seguridad:**

```sql
SELECT * FROM audit_log
WHERE category = 'SECURITY'
AND result = 'FAILURE'
ORDER BY created_at DESC;
```

**Timeline de un evento por correlation_id:**

```sql
SELECT * FROM audit_log
WHERE correlation_id = :correlation_id
ORDER BY created_at ASC;
```

## 6. Controles

### 6.1 Controles Preventivos

| Control | Descripción | Verificación |
|---------|-------------|-------------|
| JWT obligatorio | Toda petición autenticada | Middleware de autenticación |
| RBAC | Roles con permisos definidos | Middleware de autorización |
| Idempotencia | Constraint UNIQUE en DB | Test automatizado |
| Validación de input | Schemas validados | Middleware de validación |

### 6.2 Controles Detectivos

| Control | Descripción | Verificación |
|---------|-------------|-------------|
| Alertas Prometheus | Umbrales de error rate | Dashboard Grafana |
| Audit log queries | Consultas de auditoría | Reportes periódicos |
| DLQ monitoring | >10 eventos/hora | Alerta automática |

## 7. Retención

| Tipo de Registro | Retención | Justificación |
|-----------------|-----------|--------------|
| Auditoría de dominio | Indefinida | Trazabilidad completa |
| Auditoría de seguridad | Indefinida | Cumplimiento normativo |
| Auditoría técnica | 90 días | Análisis operativo |
| Logs de aplicación | 30 días | Debugging |
| Métricas | 90 días | Tendencias |

## 8. Verificación de Integridad

La integridad del log de auditoría se verifica mediante:

- Conteo de registros diarios
- Verificación de secuencia de IDs (sin gaps)
- Validación de que todo evento procesado tiene entrada de auditoría correspondiente
- Alertas si se detectan anomalías en la frecuencia de registros
