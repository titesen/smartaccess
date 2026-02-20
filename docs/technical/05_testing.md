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

### Pirámide de Testing

- 70–75% Unit Tests
- 15–20% Integration Tests
- 5–10% E2E Tests
- Event Flow & Resilience Tests (críticos para este sistema)

## 2. Unit Tests

### Objetivo

Validar lógica de dominio, transiciones de estado, builders de eventos, lógica de idempotencia, políticas de retry, handlers de ACK y reglas de validación.

### Herramientas

- Vitest
- Supertest (para API aislada)
- Mocks del broker y repositorio

### Casos Críticos

**State Machine Tests:**

Validar transiciones de estado de dispositivos y alertas.

```
ACTIVE -> INACTIVE ✔
ACTIVE -> ERROR ✔
ERROR -> REGISTERED ✖ (inválido)
DECOMMISSIONED -> cualquiera ✖ (inválido)
```

**Idempotency Tests:**

Validar que si llega el mismo event_id dos veces, solo se procesa una vez, se registra en la tabla de idempotencia y el segundo intento es ignorado.

**Retry Policy Tests:**

Validar reintento con backoff exponencial, límite máximo de intentos y envío a DLQ cuando se exceden los reintentos.

**ACK Handling Tests:**

Simular ACK exitoso, NACK y timeout sin ACK.

## 3. Integration Tests

### Objetivo

Probar la interacción entre componentes reales: Backend + PostgreSQL, Backend + Broker, Consumer + DB, Outbox Pattern, WebSocket + emisión de eventos.

### Herramientas

- Vitest
- Docker Compose
- PostgreSQL real
- RabbitMQ real
- Test containers (opcional)

### Casos Críticos

**Event Processing Integration:**

Flujo completo: Device Simulator → Broker → Consumer → DB → WebSocket → Dashboard. Se verifica que el evento es almacenado, la proyección actualizada y el WebSocket notificado.

**Duplicate Event Integration:**

Enviar el mismo evento dos veces. Resultado esperado: 1 registro en `events`, 1 idempotency_key, 1 actualización en dashboard.

**Consumer Crash Simulation:**

1. Un evento entra al consumer
2. El consumer falla antes del ACK
3. El broker reentrega el evento

Se valida: no hay duplicación, idempotencia funciona correctamente, retry_count incrementado.

**Outbox Pattern Validation:**

1. Se guarda evento en DB
2. Outbox dispatcher lo publica
3. Evento se marca como `published = TRUE`

Se valida: no se pierde evento si el backend cae, el dispatcher retoma eventos pendientes.

**WebSocket Reconnection:**

Simular: cliente offline → se generan eventos → cliente vuelve online. Se valida: sincronización de estado y dashboard refleja estado actual.

## 4. E2E Tests

Framework: Playwright

### Flujos Críticos

**Device Lifecycle:**
Registrar dispositivo → recibir telemetría → generar alerta → resolver alerta → verificar dashboard actualizado.

**Alert Management:**
Evento de error → genera alerta → usuario cambia estado → estado se propaga correctamente.

**Real-Time Update:**
Simular dispositivo enviando evento → usuario observa dashboard → actualización automática sin refresh.

**Failure Recovery:**
Backend reinicia → consumer retoma → sistema sigue funcionando.

## 5. Tests Específicos de Arquitectura EDA

### Event Contract Testing

Validar schema del evento, versionado y compatibilidad backward. Opcional: JSON Schema validation, contract testing con Pact.

### Consistency Testing

Verificar consistencia eventual, que las proyecciones reflejen los eventos procesados y que no haya desincronización.

### Dead Letter Queue Testing

Simular evento inválido y consumer con fallo permanente. Validar que el evento termina en DLQ y no bloquea el procesamiento normal.

## 6. Cobertura Mínima

| Alcance | Cobertura Mínima |
|---------|-----------------|
| Dominio | 80% |
| General | 70% |
| Idempotencia | 100% |
| State transitions | 100% |
| Retry logic | 100% |

El pipeline de CI debe fallar si la cobertura mínima no se cumple.

## 7. Quality Gates

Antes de cada merge:

- Tests unitarios pasan
- Tests de integración pasan
- Cobertura ≥ mínima requerida
- Lint sin errores
- Build exitoso

## 8. Estrategia de Mocking

**Unit Tests:** Se mockean broker, DB y WebSocket emitter. La lógica de dominio nunca se mockea.

**Integration Tests:** No se mockean PostgreSQL ni el broker. Se utilizan contenedores reales.

**E2E Tests:** No se mockea el backend. Solo se mockean servicios externos si existieran.

## 9. Resilience Testing

Simulaciones obligatorias con tests automatizados:

| Escenario | Validación |
|-----------|-----------|
| Consumer crash | Evento no se pierde, se reentrega |
| Backend restart | Consumer retoma procesamiento |
| Duplicate messages | Idempotencia previene duplicados |
| Network partition | Broker retiene mensajes |
| Delayed ACK | Evento se reentrega tras timeout |
| Broker reconnection | Consumer se reconecta automáticamente |

## 10. Performance Testing

- Generar 1000 eventos simulados
- Medir latencia promedio y p95
- Validar throughput (> 50 EPS)
- Verificar ausencia de memory leaks

Herramientas: k6, Artillery.

## 11. Integración con CI/CD

Pipeline:

1. Install dependencies
2. Run lint
3. Run unit tests
4. Run integration tests (con Docker)
5. Check coverage
6. Build

Se aplica estrategia fail-fast: el pipeline se detiene ante el primer fallo.