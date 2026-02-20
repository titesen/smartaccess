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
| Tiempo Real | WebSockets |
| Proxy Reverso | Nginx |
| Contenedores | Docker + Docker Compose |

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
| Nginx | 80 | Proxy reverso |
| Backend API | 3000 (interno) | API REST + WebSocket |
| RabbitMQ Management | 15672 | UI de administración del broker |
| PostgreSQL | 5432 (interno) | Base de datos |
| Redis | 6379 (interno) | Cache |

## Documentación

Toda la documentación del proyecto se encuentra en el directorio `docs/`:

- `docs/technical/` — Arquitectura, patrones de diseño, data dictionary, testing
- `docs/product/` — Definición de producto, PRD, arquitectura de información
- `docs/domain/` — Reglas de negocio
- `docs/operations/` — Infraestructura, observabilidad, deployment, auditoría
- `docs/governance/` — Ética, cumplimiento
- `docs/collaboration/` — Git workflow, coding standards, setup
