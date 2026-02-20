# Diccionario de Datos

## 1. Información General de la Base de Datos

| Atributo | Valor |
|----------|-------|
| DBMS | PostgreSQL 14+ |
| Estilo de Arquitectura | OLTP, Event-Driven |
| Collation | `en_US.UTF-8` |
| Encoding | `UTF-8` |
| Timezone | `UTC` |
| Nivel de Aislamiento | READ COMMITTED (default) |
| Modelo de Concurrencia | MVCC |

## 2. Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Tablas | plural snake_case | `devices` |
| Columnas | singular snake_case | `device_id` |
| Primary Keys | `id` | `id BIGSERIAL` |
| Foreign Keys | `{entity}_id` | `device_id` |
| Indexes | `{table}_{columns}_{type}` | `events_device_id_idx` |
| Enums | `enum_{domain}` | `enum_device_status` |
| Triggers | `tr_{table}_{action}` | `tr_devices_updated_at` |
| Functions | `fn_{purpose}` | `fn_validate_transition` |
| Views | `vw_{purpose}` | `vw_device_dashboard` |

Reglas generales:

- Idioma inglés exclusivamente
- Sin palabras reservadas de SQL
- Longitud máxima de 63 caracteres
- Constraints declarados explícitamente

## 3. Dominios del Sistema

La base de datos soporta los siguientes dominios:

1. Gestión de Dispositivos
2. Procesamiento de Eventos
3. Control de Idempotencia
4. Manejo de Reintentos
5. Outbox Pattern
6. Tracking de Acknowledgments
7. Transiciones de Estado
8. Agregación para Dashboard en Tiempo Real

## 4. Enumeraciones

### 4.1 Estado del Dispositivo

```sql
CREATE TYPE enum_device_status AS ENUM (
    'REGISTERED',
    'ONLINE',
    'OFFLINE',
    'ERROR',
    'MAINTENANCE',
    'DECOMMISSIONED'
);
```

### 4.2 Tipo de Evento

```sql
CREATE TYPE enum_event_type AS ENUM (
    'DEVICE_CONNECTED',
    'DEVICE_DISCONNECTED',
    'TELEMETRY_REPORTED',
    'ALERT_TRIGGERED',
    'COMMAND_RECEIVED',
    'COMMAND_EXECUTED'
);
```

### 4.3 Estado de Procesamiento de Evento

```sql
CREATE TYPE enum_event_processing_status AS ENUM (
    'RECEIVED',
    'VALIDATED',
    'PROCESSED',
    'FAILED',
    'RETRY_PENDING',
    'DEAD_LETTERED'
);
```

### 4.4 Estado de Acknowledgment

```sql
CREATE TYPE enum_ack_status AS ENUM (
    'PENDING',
    'ACKED',
    'NACKED',
    'TIMEOUT'
);
```

## 5. Tablas

### 5.1 `devices`

Dispositivos IoT registrados o simulados.

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| device_uuid | UUID | NO | — | UNIQUE |
| name | VARCHAR(150) | NO | — | NOT NULL |
| location | VARCHAR(150) | SÍ | NULL | — |
| status | enum_device_status | NO | 'REGISTERED' | NOT NULL |
| firmware_version | VARCHAR(50) | SÍ | NULL | — |
| last_seen_at | TIMESTAMPTZ | SÍ | NULL | — |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

Indexes:

```sql
CREATE UNIQUE INDEX devices_device_uuid_uniq ON devices(device_uuid);
CREATE INDEX devices_status_idx ON devices(status);
CREATE INDEX devices_last_seen_at_idx ON devices(last_seen_at);
```

### 5.2 `device_status_history`

Historial de transiciones de estado de dispositivos (3NF).

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| device_id | BIGINT | NO | — | FK → devices.id |
| previous_status | enum_device_status | NO | — | NOT NULL |
| new_status | enum_device_status | NO | — | NOT NULL |
| changed_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |
| changed_by | VARCHAR(100) | NO | — | NOT NULL |

FK Policy: `ON DELETE CASCADE ON UPDATE CASCADE`

### 5.3 `events`

Almacena todos los eventos de dominio entrantes (normalizado, sin duplicación).

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| event_uuid | UUID | NO | — | UNIQUE NOT NULL |
| device_id | BIGINT | NO | — | FK → devices.id |
| event_type | enum_event_type | NO | — | NOT NULL |
| payload | JSONB | NO | — | NOT NULL |
| received_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |
| processing_status | enum_event_processing_status | NO | 'RECEIVED' | NOT NULL |
| retry_count | INTEGER | NO | 0 | CHECK (>= 0) |
| idempotency_key | UUID | NO | — | UNIQUE NOT NULL |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

FK Policy: `ON DELETE CASCADE ON UPDATE CASCADE`

Indexes:

```sql
CREATE UNIQUE INDEX events_idempotency_key_uniq ON events(idempotency_key);
CREATE INDEX events_device_id_idx ON events(device_id);
CREATE INDEX events_processing_status_idx ON events(processing_status);
CREATE INDEX events_received_at_idx ON events(received_at);
CREATE INDEX events_payload_gin_idx ON events USING GIN(payload);
```

### 5.4 `event_processing_logs`

Registro de pasos de procesamiento interno por evento.

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| event_id | BIGINT | NO | — | FK → events.id |
| step_name | VARCHAR(150) | NO | — | NOT NULL |
| status | VARCHAR(50) | NO | — | NOT NULL |
| message | TEXT | SÍ | NULL | — |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

FK Policy: `ON DELETE CASCADE ON UPDATE CASCADE`

### 5.5 `event_acknowledgments`

Tracking explícito de ACK/NACK por evento y consumer.

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| event_id | BIGINT | NO | — | FK → events.id |
| ack_status | enum_ack_status | NO | 'PENDING' | NOT NULL |
| acked_at | TIMESTAMPTZ | SÍ | NULL | — |
| consumer_name | VARCHAR(100) | NO | — | NOT NULL |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

FK Policy: `ON DELETE CASCADE ON UPDATE CASCADE`

### 5.6 `event_retries`

Control explícito de reintentos (desacoplado del evento).

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| event_id | BIGINT | NO | — | FK → events.id |
| retry_attempt | INTEGER | NO | — | CHECK (>= 1) |
| next_retry_at | TIMESTAMPTZ | NO | — | NOT NULL |
| error_message | TEXT | SÍ | NULL | — |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

FK Policy: `ON DELETE CASCADE ON UPDATE CASCADE`

### 5.7 `dead_letter_events`

Eventos fallidos permanentemente tras agotar reintentos.

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| original_event_id | BIGINT | NO | — | FK → events.id |
| payload | JSONB | NO | — | NOT NULL |
| failure_reason | TEXT | NO | — | NOT NULL |
| moved_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

FK Policy: `ON DELETE CASCADE ON UPDATE CASCADE`

### 5.8 `outbox_events`

Implementación del Outbox Pattern para publicación confiable.

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| aggregate_type | VARCHAR(100) | NO | — | NOT NULL |
| aggregate_id | BIGINT | NO | — | NOT NULL |
| event_type | VARCHAR(100) | NO | — | NOT NULL |
| payload | JSONB | NO | — | NOT NULL |
| published | BOOLEAN | NO | FALSE | NOT NULL |
| published_at | TIMESTAMPTZ | SÍ | NULL | — |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

Index:

```sql
CREATE INDEX outbox_unpublished_idx
ON outbox_events(published)
WHERE published = FALSE;
```

### 5.9 `audit_log`

Registro de auditoría inmutable para eventos de dominio, técnicos y de seguridad.

| Columna | Tipo | Null | Default | Constraints |
|---------|------|------|---------|-------------|
| id | BIGSERIAL | NO | nextval() | PK |
| event_type | VARCHAR(100) | NO | — | NOT NULL |
| category | VARCHAR(50) | NO | — | CHECK (IN 'DOMAIN', 'TECHNICAL', 'SECURITY') |
| aggregate_type | VARCHAR(100) | NO | — | NOT NULL |
| aggregate_id | VARCHAR(100) | NO | — | NOT NULL |
| previous_state | JSONB | SÍ | NULL | — |
| new_state | JSONB | SÍ | NULL | — |
| actor | VARCHAR(150) | NO | — | NOT NULL |
| ip_address | VARCHAR(45) | SÍ | NULL | — |
| correlation_id | UUID | SÍ | NULL | — |
| result | VARCHAR(20) | NO | — | CHECK (IN 'SUCCESS', 'FAILURE') |
| created_at | TIMESTAMPTZ | NO | CURRENT_TIMESTAMP | NOT NULL |

## 6. Integridad Referencial

| Relación | On Delete | On Update |
|----------|-----------|-----------|
| devices → events | CASCADE | CASCADE |
| events → event_processing_logs | CASCADE | CASCADE |
| events → event_retries | CASCADE | CASCADE |
| events → event_acknowledgments | CASCADE | CASCADE |
| events → dead_letter_events | CASCADE | CASCADE |
| devices → device_status_history | CASCADE | CASCADE |

Justificación: los eventos no pueden existir sin dispositivo, y los registros de procesamiento, reintentos y acknowledgments no pueden existir sin evento. La integridad referencial se aplica estrictamente.

## 7. Validación de Transiciones de Estado

```sql
CREATE OR REPLACE FUNCTION fn_validate_device_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'DECOMMISSIONED' THEN
        RAISE EXCEPTION 'Cannot change status of decommissioned device';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

El trigger `tr_devices_validate_status_transition` se ejecuta antes de cada UPDATE de la columna `status` en la tabla `devices`.

## 8. Justificación de Normalización

El esquema satisface:

- **1NF:** Valores atómicos exclusivamente
- **2NF:** Sin dependencias parciales
- **3NF:** Sin dependencias transitivas
- Separación de dominios en tablas dedicadas
- Datos multivaluados separados en tablas propias
- Transiciones de estado registradas explícitamente
- Sin strings duplicados (uso de enums)
- Sin lógica de negocio en campos de texto

## 9. Estrategia de Rendimiento

- Columnas FK indexadas
- GIN indexes para consultas JSONB
- Partial indexes para colas activas (outbox pendiente)
- Composite indexes para filtrado en dashboard
- Preparado para particionamiento por `received_at`
- Diseñado para ingesta intensiva de eventos (write-heavy)

## 10. Estrategia de Idempotencia (Nivel de Base de Datos)

- Constraint UNIQUE sobre `idempotency_key` en la tabla `events`
- La lógica del consumer verifica existencia antes de insertar
- Previene procesamiento duplicado incluso ante reentrega del broker
