# SmartAccess — IoT Device Monitoring Platform

**Proyecto educativo**: Plataforma de monitoreo de dispositivos IoT en tiempo real con Event-Driven Architecture (EDA), procesamiento resiliente de eventos, dashboard PWA, y seguridad enterprise-grade.

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Distroless-2496ED.svg)](https://github.com/GoogleContainerTools/distroless)
[![Tests](https://img.shields.io/badge/Tests-92+_passing-brightgreen.svg)](backend/src/__tests__/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📚 Documentación

| Documento | Audiencia | Descripción |
|-----------|-----------|-------------|
| [docs/INDEX.md](docs/INDEX.md) | 👤 Todos | **Índice principal** de toda la documentación + mapa de módulos |
| [docs/diagrams/architecture.md](docs/diagrams/architecture.md) | 👤 Todos | 6 diagramas Mermaid — C4, event flow, ERD, state machine, security |
| [docs/technical/01_architecture.md](docs/technical/01_architecture.md) | 🏗️ Arquitectos | C4 Mermaid, EDA, resiliencia, persistencia |
| [docs/technical/07_security.md](docs/technical/07_security.md) | 🔒 Security | 6 capas de defensa en profundidad |
| [docs/technical/05_testing.md](docs/technical/05_testing.md) | 🧪 QA/Dev | 92+ tests, archivos, comandos, desafíos |
| [docs/technical/02_design_patterns.md](docs/technical/02_design_patterns.md) | 👨‍💻 Developers | Patrones de diseño implementados |
| [docs/operations/01_infrastructure.md](docs/operations/01_infrastructure.md) | ⚙️ DevOps | Docker hardened, resource limits, secrets |
| [docs/adr/](docs/adr/) | 🏗️ Arquitectos | 5 ADRs con contexto, alternativas y trade-offs |
| [docs/product/02_prd.md](docs/product/02_prd.md) | 📋 Product | Product Requirements Document |
| [docs/domain/business_rules.md](docs/domain/business_rules.md) | 📋 Domain | Reglas de negocio del sistema |
| [data_dictionary.md](data_dictionary.md) | 👨‍💻 Developers | 10 tablas PostgreSQL, enums, constraints |
| [CHANGELOG.md](CHANGELOG.md) | 👤 Todos | Historial de cambios (Keep a Changelog) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 👨‍💻 Developers | Guía de contribución + reglas de código |

## 📋 Descripción

### Stack Tecnológico

| Categoría | Tecnología | Versión | Propósito |
|-----------|-----------|---------|-----------|
| **Runtime** | Node.js | 20.x LTS | Backend + Simulator |
| **Lenguaje** | TypeScript | 5.x | Tipado estricto con `exactOptionalPropertyTypes` |
| **Web Framework** | Express.js | 4.x | API REST + middleware pipeline |
| **Message Broker** | RabbitMQ | 3.x | Eventos AMQP con ACK manual |
| **Base de Datos** | PostgreSQL | 14+ | OLTP normalizado (3NF+), triggers, enums |
| **Cache** | Redis | 7+ | Cache de dispositivos + Token Blacklist |
| **Frontend** | Next.js | 14.x | Dashboard PWA con SSR |
| **Tiempo Real** | WebSockets | ws | Proyección de estado al dashboard |
| **Proxy Reverso** | Nginx | alpine | Reverse proxy, IPv4/IPv6, routing |
| **Métricas** | Prometheus | latest | Pull-based scraping cada 15s |
| **Dashboards** | Grafana | latest | Visualización de métricas operacionales |
| **Tracing** | Jaeger | latest | Distributed tracing via OTLP |
| **Contenedores** | Docker (Distroless) | — | `read_only`, secrets, resource limits |
| **Testing** | Vitest + Supertest | 2.x | 92+ tests (unit + integration) |
| **Linting** | ESLint | strict | `strict-type-checking` config |
| **HTTP Security** | Helmet | 7.x | Headers de seguridad |
| **CI/CD** | GitHub Actions | — | Pipeline fail-fast |

SmartAccess simula una plataforma IoT completa que:

- ✅ **Simula dispositivos IoT** con comportamiento realista (telemetría, conexión/desconexión, alertas)
- ✅ **Procesa eventos** con ACK manual, retry con backoff exponencial y Dead Letter Queue
- ✅ **Garantiza idempotencia** — eventos duplicados no generan efectos duplicados
- ✅ **Persiste con Outbox Pattern** — consistencia entre base de datos y broker
- ✅ **Proyecta en tiempo real** vía WebSocket al dashboard PWA
- ✅ **Autenticación enterprise** — tokens encriptados ChaCha20-Poly1305 (no JWT plano)
- ✅ **CSRF Protection** — Double-Submit Cookie Pattern
- ✅ **RBAC por ruta** — ADMIN, OPERATOR, VIEWER con middleware
- ✅ **Token Blacklist** — revocación inmediata via Redis
- ✅ **Docker hardened** — Distroless, `read_only`, secrets, resource limits
- ✅ **Observabilidad completa** — Prometheus + Grafana + Jaeger + Winston JSON
- ✅ **92+ tests** automatizados (unit + integration) con Vitest

## 🏗️ Arquitectura

```mermaid
graph TB
    SIM["🔧 Device Simulator<br>Node.js + TypeScript"] -->|AMQP publish| RMQ["📨 RabbitMQ<br>Message Broker"]
    RMQ -->|AMQP consume<br>ACK manual| BE["🖥️ Backend API<br>Express + TypeScript"]
    BE -->|SQL transactions| PG["🐘 PostgreSQL<br>10 tablas, 3NF+"]
    BE -->|Cache + Blacklist| RD["⚡ Redis<br>Cache + Rate Limit"]
    BE -->|WebSocket| FE["📊 Dashboard<br>Next.js PWA"]
    FE -->|HTTP/REST| BE
    BE -->|/metrics| PROM["📈 Prometheus"]
    RMQ -->|/metrics| PROM
    PROM --> GF["📊 Grafana"]
    BE -->|OTLP| JG["🔍 Jaeger"]
    INET(("🌐 Internet")) --> NGX["🔒 Nginx<br>Reverse Proxy"]
    NGX -->|Proxy| BE
    NGX -->|Proxy| FE

    style BE fill:#2196F3,color:#fff
    style RMQ fill:#FF6F00,color:#fff
    style PG fill:#336791,color:#fff
    style FE fill:#000,color:#fff
    style NGX fill:#009639,color:#fff
```

> 📐 Diagramas detallados (C4, ERD, flujo de eventos) en [docs/technical/01_architecture.md](docs/technical/01_architecture.md)

**Patrones clave:** ACK Manual, Retry + DLQ, Idempotencia, Outbox Pattern, Unit of Work, State Machine, Observer, Factory, Repository, Adapter.

## 🚀 Quick Start

### 1. Requisitos Previos

- Docker & Docker Compose
- Node.js 20+ (solo para desarrollo local)
- Git

### 2. Instalación

```bash
# Clonar repositorio
git clone https://github.com/facundognz/smartaccess.git
cd smartaccess

# Configurar variables de entorno
cp .env.example .env
# Editar .env si es necesario (funciona con defaults)
```

### 3. Levantar Todos los Servicios

```bash
# Levantar 10 servicios (Nginx, Backend, Dashboard, Simulator,
# PostgreSQL, RabbitMQ, Redis, Prometheus, Grafana, Jaeger)
docker compose up -d

# Verificar que todos estén healthy
docker compose ps
```

### 4. Verificar Funcionamiento

```bash
# Health check
curl http://localhost/api/health

# Ver dashboard (browser)
open http://localhost

# Ver métricas (Grafana)
open http://localhost:3001      # admin / (ver secrets/grafana_password.txt)

# Ver traces (Jaeger)
open http://localhost:16686

# Ver colas (RabbitMQ Management)
open http://localhost:15672      # smartaccess / smartaccess
```

### 5. Desarrollo Local (sin Docker)

```bash
# Backend
cd backend && npm install && npm run dev

# Dashboard
cd dashboard && npm install && npm run dev
```

## 📁 Estructura del Proyecto

```
smartaccess/
├── backend/                        # Backend API (Node.js + TypeScript)
│   └── src/
│       ├── application/
│       │   ├── consumers/         # Consumers AMQP (event processing)
│       │   ├── middleware/        # Auth, RBAC, CSRF, correlation ID, validation
│       │   ├── routes/            # Express routes (auth, devices, events, alerts)
│       │   └── services/          # Business logic (auth, device, alert, DLQ)
│       │       └── __tests__/     # Unit tests (5 archivos, 39 tests)
│       ├── domain/
│       │   ├── auth/              # Auth types, token encryption
│       │   ├── devices/           # Device types, state machine
│       │   └── events/            # Event types, factory, observer, payload builder
│       ├── infrastructure/
│       │   ├── broker/            # RabbitMQ connection + consumer
│       │   ├── cache/             # Redis client
│       │   ├── database/          # PostgreSQL pool + connection
│       │   ├── repositories/      # Data access layer
│       │   ├── retry/             # Retry strategy (backoff exponencial)
│       │   ├── websocket/         # WebSocket gateway
│       │   └── outbox/            # Outbox pattern dispatcher
│       ├── shared/
│       │   ├── errors/            # Error classes (AppError, NotFoundError)
│       │   ├── logger/            # Winston JSON structured logging
│       │   └── utils/             # asyncHandler, helpers
│       ├── config/                # Environment config
│       ├── __tests__/integration/ # Integration tests (8 archivos, 53+ tests)
│       └── main.ts                # App entry point
├── dashboard/                      # Frontend PWA (Next.js)
├── simulator/                      # Device Simulator (Node.js + TypeScript)
├── nginx/                          # Nginx config (reverse proxy)
├── prometheus/                     # Prometheus scraping config
├── grafana/                        # Grafana provisioning + dashboards
├── secrets/                        # Docker Secrets (db, mq, grafana passwords)
├── docs/
│   ├── technical/                 # Arquitectura, patrones, testing, seguridad
│   ├── adr/                       # 5 Architectural Decision Records
│   ├── product/                   # PRD, información de producto
│   ├── domain/                    # Reglas de negocio
│   ├── operations/                # Infraestructura, observabilidad, deployment
│   ├── governance/                # Ética, cumplimiento
│   └── collaboration/             # Git workflow, coding standards
├── docker-compose.yml             # 10 servicios hardened
├── init.sql                       # Schema PostgreSQL (10 tablas, triggers, enums)
├── data_dictionary.md             # Diccionario de datos completo
└── .env.example                   # Variables de entorno
```

## 🔒 Seguridad

El sistema implementa **6 capas de defensa en profundidad**:

| Capa | Implementación | Vector Mitigado |
|------|---------------|-----------------|
| **Tokens** | ChaCha20-Poly1305 + HKDF (PASETO-inspired) | Token interception |
| **Cookies** | HttpOnly + SameSite=Strict + Secure | XSS robo de tokens |
| **CSRF** | Double-Submit Cookie Pattern | Cross-Site Request Forgery |
| **Passwords** | Scrypt (Node.js crypto nativo) | Brute force |
| **Revocación** | Redis Token Blacklist con TTL | Token reuse post-logout |
| **Containers** | Distroless + read_only + Docker Secrets | Container escape, credential exposure |

> 🔐 Detalle completo en [docs/technical/07_security.md](docs/technical/07_security.md)

## 📊 API Endpoints

### Autenticación

| Método | Endpoint | Descripción |
|--------|----------|------------|
| `POST` | `/api/auth/login` | Login con email/password → HttpOnly cookies |
| `POST` | `/api/auth/register` | Registro de nuevo usuario |
| `POST` | `/api/auth/refresh` | Refresh del access token |
| `POST` | `/api/auth/logout` | Logout + clear cookies + blacklist token |

### Dispositivos (requiere auth)

| Método | Endpoint | Descripción |
|--------|----------|------------|
| `GET` | `/api/v1/devices` | Lista todos los dispositivos |
| `GET` | `/api/v1/devices/:uuid` | Detalle de un dispositivo |
| `PATCH` | `/api/v1/devices/:uuid/status` | Cambiar estado (state machine) |

### Eventos (requiere auth)

| Método | Endpoint | Descripción |
|--------|----------|------------|
| `GET` | `/api/v1/events` | Eventos paginados (`limit`, `offset`) |
| `GET` | `/api/v1/events/:uuid` | Detalle de un evento |
| `GET` | `/api/v1/events/dlq/list` | Eventos en Dead Letter Queue |

### Alertas (requiere auth)

| Método | Endpoint | Descripción |
|--------|----------|------------|
| `GET` | `/api/v1/alerts` | Lista de alertas |
| `POST` | `/api/v1/alerts/:id/acknowledge` | Marcar alerta como reconocida |

### Sistema

| Método | Endpoint | Descripción |
|--------|----------|------------|
| `GET` | `/health` | Health check (DB + Redis + RabbitMQ) |
| `GET` | `/api/v1/metrics/summary` | Resumen de métricas del sistema |

## 🧪 Testing

```bash
# Unit Tests — sin Docker (39 tests, 5 archivos)
cd backend && npx vitest run src/application/services/__tests__/ --reporter=verbose

# Integration Tests — con o sin Docker (53+ tests, 8 archivos)
cd backend && npx vitest run src/__tests__/integration/ --reporter=verbose

# Todos los tests
cd backend && npm test
```

| Suite | Archivos | Tests | Requiere Docker |
|-------|----------|-------|----------------|
| Unit (services) | 5 | 39 | ❌ No |
| Integration (HTTP pipeline) | 8 | 53+ | ⚠️ Opcional |
| Domain (pre-existing) | 2 | 20 | ❌ No |
| **Total** | **15** | **92+** | — |

> 🧪 Detalle en [docs/technical/05_testing.md](docs/technical/05_testing.md)

## 🔐 Variables de Entorno

```bash
# --- Database (PostgreSQL) ---
POSTGRES_DB=smartaccess
POSTGRES_USER=smartaccess
POSTGRES_PASSWORD=smartaccess
DATABASE_URL=postgres://smartaccess:smartaccess@postgres:5432/smartaccess

# --- Message Broker (RabbitMQ) ---
RABBITMQ_DEFAULT_USER=smartaccess
RABBITMQ_DEFAULT_PASS=smartaccess
RABBITMQ_URL=amqp://smartaccess:smartaccess@rabbitmq:5672

# --- Cache (Redis) ---
REDIS_URL=redis://redis:6379

# --- Application ---
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# --- Authentication ---
JWT_SECRET=change-this-in-production   # Master key para ChaCha20
JWT_EXPIRATION=1h

# --- Simulator ---
SIM_DEVICE_COUNT=5
SIM_TELEMETRY_INTERVAL_MS=5000
SIM_CONNECTION_TOGGLE_PROB=0.05
SIM_ALERT_PROB=0.08
```

> ⚠️ En producción, las credenciales se inyectan vía **Docker Secrets** (no env vars).

## 🏗️ Decisiones Arquitectónicas (ADRs)

| # | Decisión | Alternativas Evaluadas | Status |
|---|----------|----------------------|--------|
| [001](docs/adr/001-token-encryption.md) | Token encryption con ChaCha20-Poly1305 | JWT, JWE, PASETO v4 | Accepted |
| [002](docs/adr/002-password-hashing.md) | Password hashing con Scrypt nativo | bcrypt, argon2, PBKDF2 | Accepted |
| [003](docs/adr/003-dead-letter-strategy.md) | DLQ con persistencia en PostgreSQL | Retry infinito, descartar, DLQ nativo | Accepted |
| [004](docs/adr/004-container-hardening.md) | Distroless + read_only + Secrets | Alpine, Slim, Scratch | Accepted |
| [005](docs/adr/005-e2e-testing-pivot.md) | Pivot E2E → unit + integration | Playwright, Cypress, WSL2 | Accepted |

## 🐳 Docker Hardening

Todos los contenedores están fortificados:

| Medida | Qué hace | Alcance |
|--------|---------|---------|
| `read_only: true` | Filesystem inmutable | 9/10 servicios |
| Docker Secrets | Credenciales en `/run/secrets/` | Postgres, Backend, Simulator, Grafana |
| Resource Limits | CPU + RAM limitados | 10/10 servicios |
| Distroless | Sin shell, sin herramientas | Backend, Simulator |
| tmpfs | Solo escritura en RAM | 9/10 servicios |

> ⚙️ Detalle en [docs/operations/01_infrastructure.md](docs/operations/01_infrastructure.md)

## 📈 Roadmap

- [x] Event-Driven Architecture con RabbitMQ (ACK manual, retry, DLQ)
- [x] Outbox Pattern para consistencia DB ↔ Broker
- [x] Idempotencia con constraint UNIQUE
- [x] State Machine para transiciones de dispositivos
- [x] Dashboard PWA con WebSocket en tiempo real
- [x] API REST con RFC 7807 (Problem Details)
- [x] Auth: ChaCha20 tokens + HttpOnly cookies + CSRF + Redis Blacklist
- [x] RBAC por ruta (ADMIN, OPERATOR, VIEWER)
- [x] Docker Hardening (Distroless, read_only, secrets, resource limits)
- [x] Observabilidad (Prometheus + Grafana + Jaeger + Winston)
- [x] 92+ tests automatizados (unit + integration)
- [x] 5 ADRs formalizados
- [x] Documentación técnica completa (27+ archivos)
- [ ] CI/CD pipeline con GitHub Actions
- [ ] Performance testing con k6
- [ ] E2E tests en CI Linux (Playwright)

## 🤝 Contribuir

Este es un proyecto educativo. Pull requests son bienvenidos.

## 📄 Licencia

MIT License — Proyecto educativo de código abierto.

## 👤 Autor

**Facundo Nicolás González**

---

⭐ Si este proyecto te fue útil, dale una star en GitHub!
