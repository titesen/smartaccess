# Patrones de Diseño

## 1. Visión General

El sistema implementa un conjunto seleccionado de patrones de diseño orientados a resiliencia, desacoplamiento y procesamiento confiable de eventos. Cada patrón se justifica por su contribución directa a la arquitectura event-driven y a la integridad del flujo de datos.

## 2. Patrones Creacionales

### 2.1 Factory Method

**Propósito:** Crear instancias de eventos de dominio de forma estandarizada, garantizando que cada evento contenga los campos obligatorios (event_id, correlation_id, timestamp, versión).

**Aplicación:** El simulador de dispositivos utiliza factories especializadas para generar cada tipo de evento (`DeviceConnectedEvent`, `TelemetryReportedEvent`, `AlertTriggeredEvent`).

**Cuándo usarlo:**
- Creación de eventos con estructura validada
- Múltiples tipos de eventos con campos comunes
- Garantía de campos obligatorios en cada instancia

**Referencia:** `src/domain/events/event.factory.ts`

### 2.2 Builder

**Propósito:** Construir payloads complejos de eventos paso a paso, separando la construcción de la representación final.

**Aplicación:** Los eventos de telemetría y alertas requieren payloads con múltiples campos opcionales y validaciones condicionales. El builder permite construir el payload de forma legible y validada.

**Cuándo usarlo:**
- Payloads con muchos campos opcionales
- Validación progresiva durante la construcción
- Necesidad de inmutabilidad del objeto final

**Referencia:** `src/domain/events/event-payload.builder.ts`

## 3. Patrones Estructurales

### 3.1 Repository

**Propósito:** Abstraer el acceso a datos detrás de una interfaz de dominio, desacoplando la lógica de negocio de la implementación de persistencia.

**Aplicación:** Cada módulo del sistema (Device, Event, Telemetry) expone un repositorio con operaciones de dominio. La implementación concreta utiliza PostgreSQL con queries parametrizadas.

**Cuándo usarlo:**
- Desacoplamiento entre dominio e infraestructura
- Facilitar testing con repositorios en memoria
- Centralizar reglas de acceso a datos

**Cuándo evitarlo:**
- Queries analíticas complejas que requieren acceso directo a SQL
- Operaciones bulk que no se benefician de abstracción

**Referencia:** `src/infrastructure/repositories/`

### 3.2 Adapter

**Propósito:** Desacoplar la lógica de negocio de implementaciones concretas de infraestructura (broker, cache, notificaciones).

**Aplicación:** El backend define interfaces abstractas para el broker (publish, subscribe, ack) y utiliza adaptadores concretos para RabbitMQ. Esto permite cambiar de broker sin modificar la lógica de negocio.

**Cuándo usarlo:**
- Integración con infraestructura externa (RabbitMQ, Redis, servicios terceros)
- Necesidad de intercambiar implementaciones
- Testing con mocks de infraestructura

**Referencia:** `src/infrastructure/adapters/`

## 4. Patrones de Comportamiento

### 4.1 Observer

**Propósito:** Habilitar actualizaciones en tiempo real vía WebSocket cuando ocurren eventos de dominio.

**Aplicación:** Cuando se procesa telemetría, se dispara una alerta o cambia el estado de un dispositivo, los observers notifican a:

- WebSocket Gateway (actualizaciones al dashboard)
- Módulo de logging (trazabilidad)
- Collector de métricas (observabilidad)

**Cuándo usarlo:**
- Desacoplamiento de efectos secundarios de la lógica de dominio
- Broadcasting de cambios de estado
- Sistemas en tiempo real

**Referencia:** `src/application/events/event.observer.ts`

### 4.2 Strategy

**Propósito:** Encapsular algoritmos de retry intercambiables, permitiendo cambiar la estrategia de reintento sin modificar el consumer.

**Aplicación:** El sistema soporta múltiples estrategias de retry:

| Estrategia | Descripción | Uso |
|-----------|-------------|-----|
| Exponential Backoff | `delay = base * 2^(attempt-1)` | Estrategia por defecto |
| Fixed Delay | Delay constante entre intentos | Entornos de test |
| Linear Backoff | `delay = base * attempt` | Cargas predecibles |

**Cuándo usarlo:**
- Múltiples algoritmos para el mismo comportamiento
- Necesidad de cambiar estrategia en runtime
- Testing con estrategias simplificadas

**Referencia:** `src/infrastructure/retry/retry.strategy.ts`

## 5. Patrones Arquitectónicos

### 5.1 Unit of Work

**Propósito:** Garantizar atomicidad en operaciones que involucran múltiples escrituras dentro de una transacción.

**Aplicación:** Al procesar un evento, el sistema ejecuta dentro de una única transacción PostgreSQL:

1. Persistir el evento en `events`
2. Actualizar estado del dispositivo en `devices`
3. Registrar en `event_processing_logs`
4. Insertar en `outbox_events` para publicación confiable

Si cualquier paso falla, toda la transacción se revierte y no se envía ACK al broker.

**Cuándo usarlo:**
- Múltiples escrituras que deben ser atómicas
- Consistencia transaccional entre tablas
- Prevención de estados parciales

**Referencia:** `src/infrastructure/database/unit-of-work.ts`

### 5.2 Outbox Pattern

**Propósito:** Garantizar publicación confiable de eventos al broker sin riesgo de inconsistencia dual-write.

**Aplicación:** En lugar de publicar directamente al broker:

1. El evento se almacena en la tabla `outbox_events` dentro de la transacción de negocio
2. La transacción se confirma
3. Un worker background consulta eventos pendientes y los publica al broker
4. El worker marca los eventos como publicados

Si el proceso se interrumpe entre los pasos 2 y 3, el worker retoma los eventos pendientes en el siguiente ciclo.

**Cuándo usarlo:**
- Consistencia fuerte entre base de datos y broker
- Sistemas que no pueden tolerar pérdida de mensajes
- Prevención de inconsistencia dual-write

**Referencia:** `src/infrastructure/outbox/outbox.processor.ts`

### 5.3 Idempotent Consumer

**Propósito:** Garantizar que un evento procesado múltiples veces produzca el mismo resultado que si se procesara una sola vez.

**Aplicación:** Cada evento incluye un `idempotency_key` (UUID). Antes de procesar, el consumer verifica si la clave ya existe en la base de datos:

- Si existe: el evento se descarta y se registra en auditoría como duplicado
- Si no existe: se procesa normalmente y se persiste la clave dentro de la misma transacción

La protección se implementa a dos niveles:
1. **Aplicativo:** Verificación previa con SELECT
2. **Base de datos:** Constraint UNIQUE en `events.idempotency_key`

**Cuándo usarlo:**
- Brokers con semántica at-least-once
- Prevención de efectos duplicados
- Sistemas donde la reentrega de mensajes es esperada

**Referencia:** `src/application/consumers/idempotent.consumer.ts`

## 6. Resumen de Patrones por Capa

| Capa | Patrón | Propósito |
|------|--------|----------|
| Dominio | Factory Method | Creación estandarizada de eventos |
| Dominio | Builder | Construcción de payloads complejos |
| Aplicación | Observer | Notificación de efectos secundarios |
| Aplicación | Strategy | Algoritmos de retry intercambiables |
| Aplicación | Idempotent Consumer | Prevención de duplicados |
| Infraestructura | Repository | Abstracción de persistencia |
| Infraestructura | Adapter | Desacoplamiento de broker/cache |
| Infraestructura | Unit of Work | Atomicidad transaccional |
| Infraestructura | Outbox Pattern | Publicación confiable |
