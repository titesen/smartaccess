# Reglas de Negocio

## 1. Propósito

Este documento define las reglas de negocio invariantes del dominio del sistema de procesamiento de eventos de dispositivos IoT. Las reglas describen restricciones, políticas y lógica que gobiernan el comportamiento del sistema independientemente de la implementación técnica.

> Las reglas de negocio son invariantes del dominio. Los requisitos funcionales son capacidades del sistema.

## 2. Reglas de Dispositivos

### 2.1 Registro de Dispositivo

| Regla | Descripción |
|-------|-------------|
| BR-DEV-001 | Todo dispositivo debe poseer un `device_uuid` (UUID v4) único e inmutable |
| BR-DEV-002 | El nombre del dispositivo es obligatorio y no puede superar 150 caracteres |
| BR-DEV-003 | El estado inicial de un dispositivo registrado es `REGISTERED` |
| BR-DEV-004 | Un dispositivo no puede pertenecer a más de un `location` simultáneamente |

### 2.2 Estado del Dispositivo

Estados válidos:

| Estado | Descripción |
|--------|-------------|
| REGISTERED | Dispositivo creado, sin conexión previa |
| ONLINE | Conectado activamente y emitiendo eventos |
| OFFLINE | Sin conexión activa |
| ERROR | Anomalía detectada |
| MAINTENANCE | Fuera de operación planificada |
| DECOMMISSIONED | Permanentemente fuera de servicio |

### 2.3 Transiciones de Estado

Reglas de transición:

| Regla | Descripción |
|-------|-------------|
| BR-STATE-001 | Un dispositivo en estado `DECOMMISSIONED` no puede transicionar a ningún otro estado |
| BR-STATE-002 | Toda transición de estado debe registrarse en `device_status_history` con timestamp, estado anterior, nuevo estado y actor |
| BR-STATE-003 | No se permite la transición a un estado idéntico al actual |
| BR-STATE-004 | Un dispositivo solo puede transicionar a `ONLINE` si previamente estaba en `REGISTERED`, `OFFLINE` o `ERROR` |

### Matriz de Transiciones

| Desde / Hacia | REGISTERED | ONLINE | OFFLINE | ERROR | MAINTENANCE | DECOMMISSIONED |
|--------------|------------|--------|---------|-------|-------------|----------------|
| REGISTERED | — | ✔ | — | — | — | ✔ |
| ONLINE | — | — | ✔ | ✔ | ✔ | ✔ |
| OFFLINE | — | ✔ | — | ✔ | ✔ | ✔ |
| ERROR | — | ✔ | ✔ | — | ✔ | ✔ |
| MAINTENANCE | — | ✔ | ✔ | — | — | ✔ |
| DECOMMISSIONED | — | — | — | — | — | — |

## 3. Reglas de Eventos

### 3.1 Generación

| Regla | Descripción |
|-------|-------------|
| BR-EVT-001 | Todo evento debe incluir un `event_uuid` (UUID v4) único |
| BR-EVT-002 | Todo evento debe incluir un `idempotency_key` único para prevenir procesamiento duplicado |
| BR-EVT-003 | El `payload` de un evento debe ser un objeto JSON válido (no vacío) |
| BR-EVT-004 | El `event_type` debe corresponder a un valor del enum `enum_event_type` |
| BR-EVT-005 | Todo evento debe referenciar un `device_id` válido y existente |

### 3.2 Tipos de Evento

| Tipo | Descripción | payload Esperado |
|------|-------------|-----------------|
| DEVICE_CONNECTED | Dispositivo se conecta | `{ device_id, timestamp }` |
| DEVICE_DISCONNECTED | Dispositivo se desconecta | `{ device_id, timestamp, reason }` |
| TELEMETRY_REPORTED | Datos de telemetría | `{ device_id, metrics: { cpu, mem, temp } }` |
| ALERT_TRIGGERED | Alerta disparada por umbral | `{ device_id, severity, threshold, value }` |
| COMMAND_RECEIVED | Comando recibido por dispositivo | `{ device_id, command_type }` |
| COMMAND_EXECUTED | Comando ejecutado por dispositivo | `{ device_id, command_type, result }` |

## 4. Reglas de Idempotencia

| Regla | Descripción |
|-------|-------------|
| BR-IDP-001 | Un evento con `idempotency_key` ya existente en la base de datos debe descartarse sin error |
| BR-IDP-002 | El descarte de un evento duplicado debe registrarse en auditoría |
| BR-IDP-003 | La idempotencia se garantiza a nivel de base de datos (constraint UNIQUE), no solo aplicativo |

## 5. Reglas de Procesamiento

### 5.1 ACK y NACK

| Regla | Descripción |
|-------|-------------|
| BR-ACK-001 | El ACK al broker solo se envía después del commit exitoso en base de datos |
| BR-ACK-002 | Si la persistencia falla, no se envía ACK y el broker reentrega el mensaje |
| BR-ACK-003 | Todo ACK/NACK debe registrarse en `event_acknowledgments` |

### 5.2 Retry

| Regla | Descripción |
|-------|-------------|
| BR-RET-001 | Los eventos fallidos se reintentan con backoff exponencial |
| BR-RET-002 | Existe un límite máximo de reintentos (configurable, default: 5) |
| BR-RET-003 | Cada reintento se registra en `event_retries` con attempt, timestamp y error |

### 5.3 Dead Letter Queue

| Regla | Descripción |
|-------|-------------|
| BR-DLQ-001 | Los eventos que superan el límite de reintentos se mueven a DLQ |
| BR-DLQ-002 | Los eventos en DLQ se persisten en `dead_letter_events` para análisis |
| BR-DLQ-003 | Un evento en DLQ no bloquea el procesamiento de eventos posteriores |

## 6. Reglas de Outbox

| Regla | Descripción |
|-------|-------------|
| BR-OBX-001 | La inserción en `outbox_events` ocurre dentro de la misma transacción que la operación de negocio |
| BR-OBX-002 | Un worker background lee eventos pendientes (`published = FALSE`) y los publica al broker |
| BR-OBX-003 | Si el proceso se interrumpe, el worker retoma los eventos pendientes en el siguiente ciclo |

## 7. Reglas de Auditoría

| Regla | Descripción |
|-------|-------------|
| BR-AUD-001 | Toda operación de dominio, técnica y de seguridad debe registrarse en `audit_log` |
| BR-AUD-002 | Los registros de auditoría son inmutables: no se permite UPDATE ni DELETE |
| BR-AUD-003 | Cada registro de auditoría incluye actor, timestamp, tipo, resultado y correlation_id |
| BR-AUD-004 | Las categorías de auditoría son: DOMAIN, TECHNICAL, SECURITY |

## 8. Reglas de Telemetría

| Regla | Descripción |
|-------|-------------|
| BR-TEL-001 | Un evento de telemetría solo se acepta si el dispositivo está ONLINE |
| BR-TEL-002 | Los valores de telemetría (CPU, temperatura, memoria) deben estar dentro de rangos válidos |
| BR-TEL-003 | La telemetría se persiste junto con el evento en la misma transacción |

## 9. Reglas de Alertas

| Regla | Descripción |
|-------|-------------|
| BR-ALT-001 | Una alerta se genera automáticamente cuando un valor de telemetría supera un umbral definido |
| BR-ALT-002 | Las alertas críticas generan notificación inmediata vía WebSocket |
| BR-ALT-003 | Las alertas poseen severidad (CRITICAL, HIGH, MEDIUM, LOW) |

## 10. Reglas de Seguridad y Acceso

| Regla | Descripción |
|-------|-------------|
| BR-SEC-001 | Toda petición de API debe estar autenticada con JWT válido |
| BR-SEC-002 | Los roles válidos son: ADMIN, OPERATOR, VIEWER |
| BR-SEC-003 | Solo ADMIN puede descomisionar dispositivos |
| BR-SEC-004 | Solo ADMIN y OPERATOR pueden ejecutar comandos sobre dispositivos |
