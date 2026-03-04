# Changelog

Todos los cambios notables de este proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.2.0] — Documentation & Testing

### Added
- **Test suite completa**: 92+ tests (39 unit + 53+ integration) con Vitest + Supertest
- `auth.service.test.ts`: 13 tests — token encrypt/decrypt, password hash/verify, login, register
- `token-blacklist.service.test.ts`: 7 tests — Redis blacklist, graceful degradation
- `device.service.test.ts`: 9 tests — cache hit/miss, state machine validation
- `dlq.service.test.ts`: 4 tests — dead letter insertion, status update
- `alert.service.test.ts`: 6 tests — alert creation, deduplication, acknowledgment
- 8 archivos de integration tests con patrón `dbAvailable` para skip graceful sin Docker
- **5 ADRs**: Token encryption, password hashing, DLQ strategy, container hardening, E2E pivot
- **Documentación completa**: INDEX.md, CONTRIBUTING.md, CHANGELOG.md, 07_security.md, diagrams/architecture.md
- Documentación de 6 capas de seguridad en profundidad
- 6 diagramas Mermaid (C4, event flow, ERD, state machine, security layers, infrastructura)

### Changed
- `README.md`: Reescrito con badges, stack detallado, API endpoints, proyecto tree, roadmap
- `docs/technical/01_architecture.md`: Sección de seguridad actualizada (9 capas con ADR links)
- `docs/technical/05_testing.md`: Reescrito con tests reales, archivos, conteos, comandos
- `docs/operations/01_infrastructure.md`: Reescrito con docker-compose hardened real
- Total de tests: 20 → 92+

## [1.1.0] — Security Hardening & Docker Expert

### Added
- **Token encryption**: ChaCha20-Poly1305 + HKDF (PASETO-inspired) reemplaza JWT plano
- **CSRF Protection**: Double-Submit Cookie Pattern
- **Token Blacklist**: Redis-backed con TTL y graceful degradation
- **HttpOnly cookies**: SameSite=Strict + Secure para tokens
- **Password hashing**: Scrypt nativo (crypto.scrypt) reemplaza dependencia bcrypt
- **Docker hardening**: `read_only: true` en 9/10 contenedores
- **Docker Secrets**: Credenciales en `/run/secrets/` (db_password, mq_password, grafana_password)
- **Resource limits**: CPU + RAM limitados en 10/10 servicios
- **Distroless**: Backend y Simulator usan `gcr.io/distroless/nodejs20-debian12`
- Helmet.js para headers de seguridad HTTP
- Input validation middleware con Zod schemas

### Fixed
- Nginx crash en `read_only` mode (faltaba tmpfs `/etc/nginx/conf.d`)
- RabbitMQ OOM kill (512M → 1024M para management plugin)
- Node.js IPv6 localhost resolution (Nginx `listen [::]:80`)
- Next.js SSR fetch error con dual-routing (`INTERNAL_API_URL` vs `NEXT_PUBLIC_API_URL`)

## [1.0.0] — Initial Release

### Added
- **Event-Driven Architecture** con RabbitMQ (AMQP)
- ACK manual con retry y backoff exponencial
- Dead Letter Queue con persistencia en PostgreSQL
- Idempotencia con constraint UNIQUE (`idempotency_key`)
- Outbox Pattern para consistencia DB ↔ Broker
- State Machine para transiciones de dispositivos
- Observer Pattern para event handlers
- Factory Pattern para parsing de eventos
- Dashboard PWA con Next.js + WebSocket en tiempo real
- API REST con Express.js + TypeScript
- RBAC (ADMIN, OPERATOR, VIEWER)
- Device Simulator con telemetría realista
- Observabilidad: Prometheus + Grafana + Jaeger + Winston JSON
- PostgreSQL 14+ con 10 tablas normalizadas (3NF+), triggers, enums
- Redis para cache + rate limiting
- Nginx como reverse proxy
- Docker Compose con 10 servicios
- GitHub Actions CI/CD pipeline
- Documentación: 21 archivos en `docs/`
