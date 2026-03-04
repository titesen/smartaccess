# Contribuir a SmartAccess

¡Gracias por tu interés en contribuir! Este es un proyecto educativo, pero las contribuciones son bienvenidas.

## Requisitos Previos

- Node.js 20+
- Docker & Docker Compose
- Git

## Flujo de Trabajo

1. **Fork** el repositorio
2. **Crear branch** desde `main`:
   ```bash
   git checkout -b feat/mi-feature
   ```
3. **Implementar** cambios siguiendo los patrones del proyecto
4. **Ejecutar tests** (todos deben pasar):
   ```bash
   cd backend && npm test
   ```
5. **Commit** usando [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: agregar soporte para filtrado de alertas por prioridad
   fix: corregir retry counter en DLQ service
   docs: actualizar diagrama de arquitectura
   test: agregar tests para token blacklist service
   refactor: extraer validación de eventos a middleware
   ```
6. **Push** y crear **Pull Request** contra `main`

## Reglas de Código

- **Lenguaje del código**: Inglés (variables, funciones, clases, interfaces)
- **Lenguaje de negocio**: Español (documentación, comentarios de intención, logs de usuario)
- **TypeScript strict**: `strictNullChecks`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Logging**: Siempre `logger.info/warn/error()` (Winston JSON) — nunca `console.log()`
- **Error handling**: `asyncHandler` wrapper para rutas — nunca `try/catch` directo en routes
- **Tests**: Todo cambio debe incluir tests. No se aceptan PRs que rompan tests existentes
- **Seguridad**: Nunca hardcodear secrets. Usar Docker Secrets o `.env`

## Estructura de PRs

- **Título**: Seguir Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Descripción**: Explicar qué cambia y por qué
- **Tests**: Indicar qué tests se agregaron o modificaron
- **Checklist**:
  - [ ] Los tests pasan (`cd backend && npm test`)
  - [ ] ESLint sin errores (`cd backend && npm run lint`)
  - [ ] Se respetan las reglas de dependencia entre capas
  - [ ] No hay `console.log()` en código runtime
  - [ ] No hay secrets hardcodeados

## Reglas de Dependencia (Clean Architecture)

```
routes/       → puede importar de services/ y middleware/
services/     → puede importar de repositories/ y domain/
repositories/ → puede importar de infrastructure/ y domain/
domain/       → NO puede importar de application/ ni infrastructure/
middleware/   → puede importar de services/ y shared/
```

> **Regla de oro**: `domain/` no depende de nada externo. Si necesitás una dependencia en domain, usá una abstracción (interface/type).

## Arquitectura de Testing

```
Unit Tests (services/__tests__/)
├── Mockear: getPool(), cache, logger
├── NO mockear: lógica de dominio
└── Usar: vi.mock(), vi.hoisted()

Integration Tests (__tests__/integration/)
├── Usar: supertest contra app Express
├── DB disponible: tests completos
├── DB no disponible: skip gracefully (patrón dbAvailable)
└── NO mockear: middleware pipeline
```

## Variables de Entorno

Copiar `.env.example` a `.env`. Las credenciales de producción van en `secrets/`.

## ¿Preguntas?

Abrí un Issue describiendo tu duda o propuesta antes de empezar a implementar.

## Licencia

Al contribuir, aceptás que tus contribuciones se licencian bajo [MIT](LICENSE).
