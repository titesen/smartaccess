# ADR-005: E2E Testing Pivot a Unit + Integration

## Status

**Accepted** — Playwright removido del proyecto

## Contexto

La capa superior del Testing Trophy (E2E Tests) se intentó implementar con Playwright para testear el flujo crítico Login → Dashboard. Sin embargo, la arquitectura fuertemente fortificada con Docker planteó desafíos de red insuperables en el entorno local (Windows + Docker Desktop).

### Problemas Encontrados

| Issue | Causa Raíz | Impact |
|-------|-----------|--------|
| Navegador no resuelve `localhost` | Node.js v18+ fuerza IPv6 (`::1`), Docker expone solo IPv4 | Timeout en todas las peticiones |
| Nginx proxy dual | SSR necesita DNS interno Docker, browser necesita `localhost` | Next.js fetch falla en SSR |
| RabbitMQ OOM | 512MB insuficiente con tests + management plugin | Crash del bus de eventos durante tests |

Estos problemas son **exclusivos de Docker Desktop en Windows** y no se reproducen en Linux nativo ni en CI/CD.

### Alternativas Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| Arreglar la red de Docker Desktop | Solución completa | Fuera de nuestro control, bug de Docker |
| Playwright con WSL2 | Evita IPv6 de Windows | Duplica el entorno de desarrollo |
| Cypress en vez de Playwright | Diferente motor de red | Mismo problema de base |
| Pivot a integration tests | Control total, sin Docker deps | Sin cobertura de UI |

## Decisión

1. **Remover Playwright** del proyecto (directorio `e2e/` y dependencias)
2. **Fortalecer integration tests** con Supertest para cubrir el pipeline HTTP completo
3. **Implementar unit tests exhaustivos** para toda la lógica de negocio
4. La cobertura de UI se valida **manualmente** hasta que CI/CD corra en Linux

### Cobertura resultante

| Capa | Tests | Herramienta |
|------|-------|-------------|
| Unit (lógica de negocio) | 39 | Vitest + vi.mock |
| Integration (HTTP pipeline) | 53+ | Vitest + Supertest |
| E2E (UI) | 0 (manual) | — |

## Consecuencias

### Positivas
- **Pipeline CI no depende de Docker Desktop** — tests corren en cualquier entorno
- **Desarrollo más rápido** — sin overhead de browser automation
- **Cobertura equivalente** — Supertest prueba el mismo pipeline que Playwright tocaba (excepto UI render)

### Negativas
- Sin cobertura automatizada de interacciones de UI
- Sin regression tests visuales (screenshot comparison)
- Validación manual del flujo Login → Dashboard requerida antes de cada release

### Plan Futuro
- Cuando el proyecto migre a CI/CD en Linux, re-evaluar Playwright
- Considerar Testcontainers para levantar Postgres/RabbitMQ en los tests
