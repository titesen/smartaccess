# Definición del Producto

## 1. Descripción General

### 1.1 Problema que Resuelve

Las arquitecturas modernas basadas en eventos (EDA) son ampliamente utilizadas en sistemas distribuidos, IoT, fintech y e-commerce. Sin embargo, muchos proyectos implementan brokers sin abordar correctamente:

- Idempotencia
- ACK y NACK
- Retry controlado
- Dead Letter Queues
- Outbox Pattern
- Consistencia eventual
- Auditoría formal

El resultado son sistemas frágiles que duplican datos, pierden eventos, carecen de auditabilidad y no toleran fallos reales.

### 1.2 Solución Propuesta

SmartAccess IoT Platform es una arquitectura completa orientada a eventos que:

- Simula dispositivos IoT con comportamiento realista
- Publica eventos en un message broker (RabbitMQ)
- Procesa eventos con consumidores resilientes
- Aplica ACK manual, retry con backoff exponencial y DLQ
- Garantiza idempotencia a nivel de base de datos
- Persiste en PostgreSQL con modelo OLTP normalizado (3NF+)
- Mantiene auditoría completa e inmutable
- Soporta reconexión y tolerancia a fallos

El sistema permite demostrar y validar arquitecturas distribuidas reales en un entorno controlado y reproducible.

### 1.3 Propuesta de Valor

| Dimensión | Descripción |
|-----------|-------------|
| **Resiliencia formal** | ACK manual, retry controlado, DLQ, Outbox Pattern |
| **Idempotencia real** | Constraint UNIQUE en base de datos, no solo lógica aplicativa |
| **Auditoría inmutable** | Toda operación registrada, sin UPDATE ni DELETE en tablas de auditoría |
| **Simulación realista** | Dispositivos virtuales con fallos, desconexiones y duplicados |
| **Reproducibilidad** | Docker Compose con infraestructura completa |

## 2. Audiencia

| Perfil | Necesidad Principal |
|--------|-------------------|
| Desarrollador Backend | Comprender la implementación correcta de EDA con resiliencia |
| Arquitecto de Software | Validar patrones de consistencia eventual e idempotencia |
| Ingeniero DevOps | Despliegue reproducible con Docker Compose y CI/CD |

## 3. Alcance del MVP

### 3.1 Incluido

- Simulación de dispositivos IoT con generación de eventos periódicos
- Publicación de eventos al broker con confirmación
- Procesamiento con ACK manual y persistencia ACID
- Idempotencia basada en constraint UNIQUE
- Retry con backoff exponencial y límite configurable
- Dead Letter Queue para fallos permanentes
- Outbox Pattern para publicación confiable
- Dashboard en tiempo real con WebSocket
- PWA con soporte offline (IndexedDB + Service Workers)
- Auditoría completa de eventos de dominio, técnicos y de seguridad
- Despliegue automatizado con Docker Compose y CI/CD (GitHub Actions)

### 3.2 Excluido

- Multi-tenancy
- Escalamiento horizontal automático
- Replicación de base de datos
- Integración con dispositivos IoT físicos
- Aplicaciones móviles nativas

## 4. Stack Tecnológico

| Componente | Tecnología |
|-----------|-----------|
| Backend | Node.js + TypeScript (Monolito Modular) |
| Message Broker | RabbitMQ (AMQP) |
| Base de Datos | PostgreSQL 14+ |
| Cache | Redis |
| Frontend | Next.js (PWA) |
| Tiempo Real | WebSockets |
| Contenedores | Docker + Docker Compose |
| CI/CD | GitHub Actions |
| Proxy Reverso | Nginx (TLS termination) |
| Observabilidad | Winston (logging), Prometheus (métricas) |

## 5. Criterios de Éxito

| Criterio | Métrica | Objetivo |
|----------|---------|----------|
| Confiabilidad | Eventos procesados sin pérdida | 100% |
| Idempotencia | Eventos duplicados en base de datos | 0 |
| Resiliencia | Tiempo de recuperación tras caída del backend | < 30s |
| Trazabilidad | Eventos con registro de auditoría | 100% |
| Rendimiento | Latencia de procesamiento p95 | < 200ms |
