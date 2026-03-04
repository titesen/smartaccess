# ADR-003: Dead Letter Queue con Persistencia

## Status

**Accepted** — Implementado en `backend/src/application/services/dlq.service.ts`

## Contexto

En una arquitectura event-driven con at-least-once delivery, los eventos que fallan repetidamente necesitan un destino final que no bloquee el pipeline de procesamiento. Sin una estrategia definida, estos eventos quedan en un limbo: el broker los reentrega infinitamente o los descarta silenciosamente.

### Alternativas Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| Retry infinito | Simple, eventual consistency | Bloquea el consumer indefinidamente |
| Descartar tras N intentos | No bloquea | Pérdida de datos, sin trazabilidad |
| DLQ en RabbitMQ (nativo) | Automático | Sin metadata de error, difícil de consultar |
| DLQ con persistencia en DB | Trazabilidad completa, consultable | Mayor complejidad, doble storage |

## Decisión

Implementar una estrategia de **DLQ dual**:

1. **Retry con backoff exponencial** (máximo 5 intentos): `delay = base * 2^(attempt - 1)`
2. **Persistencia en PostgreSQL**: Los eventos que agotan reintentos se guardan en la tabla `dead_letter_events` con:
   - Payload original completo
   - Error message y stack trace
   - Número de intentos realizados
   - Timestamp de cada intento
   - Status (`PENDING`, `RETRIED`, `DISCARDED`)
3. **Audit log**: Cada movimiento a DLQ genera un registro de auditoría

## Consecuencias

### Positivas
- **Cero pérdida de datos** — todo evento fallido queda persistido
- **Consultable vía API** — endpoint `GET /api/v1/events/dlq/list` para operaciones
- **Trazabilidad completa** — se sabe exactamente por qué falló y cuántas veces
- **Retry manual** — operadores pueden reintentar eventos desde el dashboard

### Negativas
- Doble storage (broker + DB) para eventos fallidos
- Retry manual — no hay auto-retry programado desde DLQ
- La tabla puede crecer si hay problemas sistémicos persistentes

### Deuda Técnica Aceptada
- No hay auto-cleanup de eventos DLQ antiguos (requiere job de mantenimiento)
- No hay alertas automáticas cuando la DLQ supera un umbral
