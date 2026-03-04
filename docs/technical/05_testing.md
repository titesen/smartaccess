# Estrategia de Testing

## 1. Visión General

El sistema implementa una arquitectura orientada a eventos con message broker, ACK manual, retry, idempotencia, Outbox Pattern, WebSockets en tiempo real y simulación de dispositivos IoT. La estrategia de testing debe validar:

1. Lógica de dominio
2. Persistencia ACID
3. Flujo de eventos end-to-end
4. Resiliencia ante fallos
5. Idempotencia y manejo de duplicados
6. Reintentos automáticos
7. Reconexión WebSocket
8. Consistencia eventual

### Principios Fundamentales

| Principio | Descripción | Impacto |
|-----------|-------------|---------|
| Test-Driven Development | Los tests se escriben antes del código | Diseño más limpio |
| Event-Driven Validation | Se verifican eventos además de estados | Garantía de EDA real |
| Idempotency First | Los duplicados se prueban explícitamente | Prevención de corrupción |
| Failure Simulation | Se simulan caídas reales | Sistema resiliente |
| Observability Testing | Se validan logs, métricas y estados | Visibilidad operativa |
| Automatización Completa | Todo es ejecutable por CI | Consistencia garantizada |

### Testing Trophy (Metodología adoptada)

- 70–75% Unit Tests
- 15–20% Integration Tests
- 5–10% E2E Tests (pivoteado a integration, ver [ADR-005](../adr/005-e2e-testing-pivot.md))
- Event Flow & Resilience Tests (críticos para este sistema)

## 2. Tests Implementados

### Unit Tests — 5 archivos, 39 tests ✅

Se ejecutan **sin Docker** y mockean todas las dependencias externas (PostgreSQL, Redis, Logger):

```bash
cd backend && npx vitest run src/application/services/__tests__/ --reporter=verbose
```

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `auth.service.test.ts` | 13 | Token encrypt/decrypt (ChaCha20), password hash/verify (Scrypt), login, register, refresh, revoke |
| `token-blacklist.service.test.ts` | 7 | Redis blacklist add/check, graceful degradation cuando Redis cae |
| `device.service.test.ts` | 9 | Cache hit/miss, DB delegation, state machine validation |
| `dlq.service.test.ts` | 4 | Dead letter insertion, status update, audit log |
| `alert.service.test.ts` | 6 | Alert creation, deduplication, acknowledgment |

**Herramientas:** Vitest, `vi.mock()`, `vi.hoisted()`

**Estrategia de Mocking:**
- `getPool()` → mock del pool de PostgreSQL (sin conexión real)
- `cache` → mock de Redis
- `logger` → mock de Winston (suprime logs en tests)
- `device-state-machine` → mock de validación de transiciones

### Integration Tests — 8 archivos, 53+ tests ✅

Prueban el pipeline completo de Express (middleware → routing → response) usando Supertest:

```bash
cd backend && npx vitest run src/__tests__/integration/ --reporter=verbose
```

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `auth.integration.test.ts` | 6 | Login validation, HttpOnly cookies, refresh 401, logout 204 |
| `device.integration.test.ts` | 4 | GET devices 401/200, GET by UUID 404/200 |
| `event.integration.test.ts` | 4 | GET events pagination, 404 UUID, DLQ list |
| `alert.integration.test.ts` | 3 | GET alerts 401/200, acknowledge 401 |
| `middleware.integration.test.ts` | 7 | Correlation ID, RBAC 403, RFC 7807 format, auth Bearer |
| `validate-input.integration.test.ts` | 13 | Login/register/device schemas, UUID validation |
| `health.integration.test.ts` | 3 | Auth middleware, validation middleware, 404 handler |
| `event-observer.integration.test.ts` | 8 | Handler registration, multiple handlers, async handlers |
| `event-payload-builder.integration.test.ts` | 9 | Builder fluent API, immutability, validation |

**Diseño resiliente al entorno:**
Los tests auth-dependientes detectan si PostgreSQL está disponible y se **saltan gracefully** cuando Docker no está corriendo (patrón `dbAvailable`). Esto permite ejecutar siempre los tests sin errores falsos.

### Tests Pre-existentes del Dominio

| Archivo | Tests | Qué cubre |
|---------|-------|-----------|
| `event.factory.test.ts` | 6 | Parsing de eventos, validación de tipos, timestamp |
| `event.value-objects.test.ts` | 14 | Value objects del dominio |

## 3. Casos Críticos de Testing

### State Machine Tests

Validar transiciones de estado de dispositivos y alertas:

```
REGISTERED -> ONLINE ✔
ONLINE -> OFFLINE ✔
OFFLINE -> ONLINE ✔
ERROR -> MAINTENANCE ✔
DECOMMISSIONED -> cualquiera ✖ (inválido)
```

### Idempotency Tests

Validar que si llega el mismo `event_id` dos veces, solo se procesa una vez, se registra en la tabla de idempotencia y el segundo intento es ignorado.

### Retry Policy Tests

Validar reintento con backoff exponencial, límite máximo de intentos y envío a DLQ cuando se exceden los reintentos.

### ACK Handling Tests

Simular ACK exitoso, NACK y timeout sin ACK.

## 4. E2E Tests — Abortados

**Framework original:** Playwright

**Decisión:** Removido del proyecto ([ADR-005](../adr/005-e2e-testing-pivot.md)).

**Razón:** Bugs de red exclusivos de Docker Desktop en Windows (IPv6 loopback, DNS proxy) impedían la ejecución confiable. La cobertura se suplió fortaleciendo los integration tests con Supertest.

## 5. Cobertura Mínima

| Alcance | Cobertura Mínima |
|---------|-----------------|
| Dominio | 80% |
| General | 70% |
| Idempotencia | 100% |
| State transitions | 100% |
| Retry logic | 100% |

## 6. Quality Gates

Antes de cada merge:

- Tests unitarios pasan
- Tests de integración pasan
- Cobertura ≥ mínima requerida
- Lint sin errores
- Build exitoso

## 7. Integración con CI/CD

Pipeline:

1. Install dependencies
2. Run lint
3. Run unit tests
4. Run integration tests (con Docker)
5. Check coverage
6. Build

Se aplica estrategia fail-fast: el pipeline se detiene ante el primer fallo.

## 8. Desafíos Técnicos Resueltos

| Problema | Causa | Solución |
|----------|-------|---------|
| `vi.mock()` path resolution | Paths se resuelven desde el test file, no el módulo | Usar `../../../` en vez de `../../` desde `__tests__/` |
| `vi.mock()` hoisting | Factory functions no acceden a variables externas | Usar `vi.hoisted()` para declarar mocks antes del hoisting |
| Date serialization | `JSON.parse()` convierte Date en strings ISO | Usar `toMatchObject()` en vez de `toEqual()` para cache |
| DB-dependent tests sin Docker | Login falla con 500 cuando Postgres no está corriendo | Patrón `dbAvailable`: probe login, skip si DB no responde |