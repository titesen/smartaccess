# SmartAccess IoT Platform

Sistema de monitoreo de dispositivos IoT en tiempo real basado en Event-Driven Architecture (EDA). Procesa eventos de dispositivos simulados con resiliencia, idempotencia y trazabilidad completa.

## Stack

| Componente | Tecnología |
|-----------|-----------|
| Backend | Node.js + TypeScript (Monolito Modular) |
| Message Broker | RabbitMQ (AMQP) |
| Base de Datos | PostgreSQL 14+ |
| Cache | Redis |
| Frontend | Next.js (PWA) |
| Device Simulator | Node.js + TypeScript |
| Tiempo Real | WebSockets |
| Proxy Reverso | Nginx |
| Observabilidad | Prometheus + Grafana + Jaeger |
| Contenedores | Docker + Docker Compose |
| CI/CD | GitHub Actions |

## Arquitectura

```
┌──────────┐     AMQP      ┌──────────┐    PostgreSQL    ┌──────────┐
│Simulator │ ──────────────▶│ Backend  │ ◀──────────────▶ │PostgreSQL│
└──────────┘                │(Consumer)│                  └──────────┘
                            │(API+WS)  │──────▶ Redis (cache)
                            └────┬─────┘
                       WebSocket │  REST
                            ┌────▼─────┐
                            │Dashboard │
                            │(Next.js) │
                            └──────────┘
```

**Patrones clave:** ACK Manual, Retry + DLQ, Idempotencia, Outbox Pattern, Unit of Work, State Machine, Observer, Factory, Repository.

## Quick Start

```bash
# 1. Copiar variables de entorno
cp .env.example .env

# 2. Levantar todos los servicios
docker compose up -d

# 3. Verificar
docker compose ps
curl http://localhost/api/health
```

## Servicios

| Servicio | Puerto | Descripción |
|----------|--------|------------|
| Nginx | 80 | Proxy reverso (API + Dashboard + WS) |
| Backend API | 3000 (interno) | API REST + WebSocket + Consumer AMQP |
| Dashboard | interno | Next.js PWA (accesible vía Nginx) |
| Simulator | — | Generador de eventos IoT simulados |
| PostgreSQL | 5432 (interno) | Base de datos (10 tablas) |
| RabbitMQ | 15672 | Broker de mensajes (Management UI) |
| Redis | 6379 (interno) | Cache + Rate Limiting |
| Prometheus | 9090 | Recolector de métricas |
| Grafana | 3001 | Dashboards de observabilidad |
| Jaeger | 16686 | Distributed Tracing UI |

## Testing

```bash
# Backend
cd backend && npm test

# Simulator
cd simulator && npm test
```

## Documentación

Toda la documentación del proyecto se encuentra en el directorio `docs/`:

- `docs/technical/` — Arquitectura, patrones de diseño, data dictionary, testing
- `docs/product/` — Definición de producto, PRD, arquitectura de información
- `docs/domain/` — Reglas de negocio
- `docs/operations/` — Infraestructura, observabilidad, deployment, auditoría
- `docs/governance/` — Ética, cumplimiento
- `docs/collaboration/` — Git workflow, coding standards, setup
