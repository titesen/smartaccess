# SmartAccess — Documentación del Proyecto

> Índice principal.
> Cada línea: descripción breve + ruta al archivo.

## Contexto del Proyecto
- [README.md](../README.md): Documentación principal — quick start, endpoints, configuración, roadmap

## Documentación Técnica
- [Arquitectura](technical/01_architecture.md): C4, EDA, resiliencia, persistencia, monolito modular
- [Patrones de Diseño](technical/02_design_patterns.md): Observer, Factory, Repository, State Machine, Unit of Work, Outbox
- [Data Dictionary](technical/03_data_dictionary.md): 10 tablas PostgreSQL, enums, constraints, triggers
- [Seguridad](technical/07_security.md): 6 capas de defensa en profundidad (ChaCha20, CSRF, RBAC, Distroless)
- [Testing](technical/05_testing.md): 92+ tests (unit + integration), archivos, comandos, desafíos resueltos
- [Design System](technical/04_design_system.md): Sistema de diseño del dashboard
- [Accesibilidad](technical/06_accessibility.md): Pautas de accesibilidad del dashboard
- [Diagramas](diagrams/architecture.md): Mermaid — C4, flujo de eventos, ERD, state machine, security layers

## Decisiones Arquitectónicas (ADR)
- [ADR-001](adr/001-token-encryption.md): Token encryption con ChaCha20-Poly1305 — payload confidencial vs JWT estándar
- [ADR-002](adr/002-password-hashing.md): Scrypt nativo sobre bcrypt — cero dependencias, Distroless-compatible
- [ADR-003](adr/003-dead-letter-strategy.md): DLQ con persistencia — trazabilidad completa de eventos fallidos
- [ADR-004](adr/004-container-hardening.md): Distroless + read_only — superficie de ataque cero
- [ADR-005](adr/005-e2e-testing-pivot.md): Pivot E2E → unit + integration — Docker Desktop IPv6 bugs

## Producto
- [Definición de Producto](product/01_definition.md): Visión, objetivos, usuarios
- [PRD](product/02_prd.md): Product Requirements Document completo
- [Arquitectura de Información](product/04_information_architecture.md): Estructura del dashboard
- [Design System Strategy](product/design_system_strategy.md): Estrategia de diseño visual

## Dominio
- [Reglas de Negocio](domain/business_rules.md): Reglas del dominio IoT (transiciones, alertas, telemetría)

## Operaciones
- [Infraestructura](operations/01_infrastructure.md): Docker hardened, 10 servicios, resource limits, secrets
- [Observabilidad](operations/02_observability.md): Prometheus + Grafana + Jaeger + Winston
- [Deployment](operations/03_deployment.md): Estrategia de despliegue
- [Auditoría](operations/04_audit.md): Audit trails y compliance

## Gobernanza
- [Ética](governance/01_ethics.md): Consideraciones éticas del sistema IoT
- [Cumplimiento](governance/02_compliance.md): Requisitos regulatorios

## Colaboración
- [Git Workflow](collaboration/02_git_workflow.md): Branching strategy, PR process
- [Coding Standards](collaboration/03_coding_standards.md): Convenciones de código TypeScript
- [Setup](collaboration/04_setup.md): Guía de configuración del entorno de desarrollo

## Código Fuente — Mapa de Módulos

### Backend (`backend/src/`)
- `main.ts`: Entry point — Express server, middleware pipeline, broker connection
- `config/env.ts`: Configuración centralizada desde .env y Docker Secrets
- `application/routes/`: Express routes — auth, devices, events, alerts, health
- `application/middleware/`: Auth, RBAC, CSRF, correlation ID, validation, error handler
- `application/services/auth.service.ts`: Login, register, token encrypt/decrypt (ChaCha20), password hash (Scrypt)
- `application/services/device.service.ts`: CRUD devices con cache Redis
- `application/services/alert.service.ts`: Alertas con deduplicación
- `application/services/dlq.service.ts`: Dead Letter Queue management
- `application/services/token-blacklist.service.ts`: Redis token blacklist con graceful degradation
- `application/consumers/event.consumer.ts`: AMQP consumer con ACK manual, retry, idempotencia
- `domain/events/event.factory.ts`: Factory para parsing y validación de eventos
- `domain/events/event-observer.ts`: Observer pattern para event handlers
- `domain/events/event-payload-builder.ts`: Builder fluent API para payloads
- `domain/devices/device-state-machine.ts`: State machine para transiciones de dispositivos
- `infrastructure/broker/`: RabbitMQ connection con reconnect automático
- `infrastructure/database/`: PostgreSQL pool
- `infrastructure/cache/`: Redis client
- `infrastructure/repositories/`: Data access layer (events, devices, alerts, DLQ)
- `infrastructure/retry/`: Retry strategy con backoff exponencial
- `infrastructure/outbox/`: Outbox pattern dispatcher
- `infrastructure/websocket/`: WebSocket gateway para tiempo real

### Simulator (`simulator/`)
- Generador de eventos IoT con comportamiento realista (telemetría, conexión/desconexión, alertas)

### Dashboard (`dashboard/`)
- Next.js PWA con WebSocket, soporte offline, reconexión automática
