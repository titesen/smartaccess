# Estándares de Código

## 1. Visión General

Este documento define los estándares de código obligatorios para el proyecto SmartAccess IoT Platform. Se aplican a todo el código fuente del backend (Node.js + TypeScript), frontend (Next.js + TypeScript), Device Simulator y scripts de infraestructura.

### Principios Fundamentales

| Principio | Descripción |
|-----------|-------------|
| Legibilidad | El código se lee más de lo que se escribe |
| Consistencia | Mismo estilo en todo el proyecto |
| Explicitud | Preferir código explícito sobre implícito |
| Testabilidad | Todo código debe ser testeable |
| Simplicidad | La solución más simple que funcione correctamente |

## 2. TypeScript

### 2.1 Configuración General

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "declaration": true,
    "outDir": "./dist"
  }
}
```

### 2.2 Reglas de TypeScript

| Regla | Descripción |
|-------|-------------|
| Strict mode | Siempre habilitado |
| `any` | Prohibido. Usar `unknown` si el tipo es desconocido |
| Type assertions | Evitar `as`. Usar type guards |
| Enums | Usar `as const` o union types sobre enums cuando sea posible |
| Interfaces | Preferir `interface` para objetos, `type` para unions y utils |
| Null checks | Strict null checks obligatorio |

### 2.3 Naming Conventions

| Elemento | Convención | Ejemplo |
|----------|-----------|---------|
| Variables | camelCase | `deviceStatus` |
| Constantes | UPPER_SNAKE | `MAX_RETRY_ATTEMPTS` |
| Funciones | camelCase | `processEvent()` |
| Clases | PascalCase | `DeviceService` |
| Interfaces | PascalCase con prefijo I (opcional) | `DeviceRepository` |
| Types | PascalCase | `EventPayload` |
| Archivos | kebab-case | `device-service.ts` |
| Directorios | kebab-case | `event-processing/` |

## 3. Estructura de Archivos

### 3.1 Backend

```
src/
├── domain/
│   ├── events/
│   │   ├── event.entity.ts
│   │   ├── event.factory.ts
│   │   └── event.types.ts
│   └── devices/
│       ├── device.entity.ts
│       └── device.types.ts
├── application/
│   ├── services/
│   │   ├── event.service.ts
│   │   └── device.service.ts
│   └── consumers/
│       └── event.consumer.ts
├── infrastructure/
│   ├── repositories/
│   │   ├── event.repository.ts
│   │   └── device.repository.ts
│   ├── adapters/
│   │   ├── rabbitmq.adapter.ts
│   │   └── redis.adapter.ts
│   ├── database/
│   │   └── unit-of-work.ts
│   └── outbox/
│       └── outbox.processor.ts
└── shared/
    ├── errors/
    └── utils/
```

### 3.2 Reglas de Estructura

| Regla | Descripción |
|-------|-------------|
| Un archivo por clase/función principal | No agrupar múltiples clases en un archivo |
| Index files | Solo para exports públicos del módulo |
| Circular dependencies | Prohibidas. Usar eventos o interfaces |
| Barrel exports | `index.ts` en cada directorio de módulo |

## 4. Estilo de Código

### 4.1 ESLint

```json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "warn",
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "no-unused-vars": "off",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

### 4.2 Prettier

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2
}
```

## 5. Patrones Obligatorios

### 5.1 Manejo de Errores

El sistema utiliza error classes tipadas en lugar de strings:

```ts
export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class DeviceNotFoundError extends DomainError {
  constructor(deviceId: string) {
    super(`Device not found: ${deviceId}`, 'DEVICE_NOT_FOUND', { deviceId });
  }
}
```

### 5.2 Logging

Se utilizan loggers estructurados, nunca `console.log`:

```ts
logger.info('Event processed', {
  eventId: event.id,
  deviceId: event.deviceId,
  durationMs: elapsed,
});
```

### 5.3 Validación de Input

Todo input externo se valida en el boundary del sistema:

```ts
// Correcto: validación en el controller/consumer
const validated = schema.parse(rawInput);
service.process(validated);

// Incorrecto: validación dentro del servicio de dominio
```

## 6. SQL

### 6.1 Convenciones

| Regla | Descripción |
|-------|-------------|
| Palabras clave | UPPERCASE (`SELECT`, `WHERE`, `INSERT`) |
| Nombres | snake_case, plural para tablas |
| Queries | Parametrizadas siempre (prevención de SQL injection) |
| Migraciones | Archivos numerados, idempotentes |

### 6.2 Ejemplo

```sql
SELECT
    d.id,
    d.device_uuid,
    d.status,
    COUNT(e.id) AS event_count
FROM devices d
LEFT JOIN events e ON e.device_id = d.id
WHERE d.status = 'ONLINE'
GROUP BY d.id
ORDER BY d.last_seen_at DESC;
```

## 7. Tests

### 7.1 Convenciones

| Regla | Descripción |
|-------|-------------|
| Naming | `describe('ClassName')` → `it('should behavior')` |
| Archivos | `*.test.ts` junto al archivo testado |
| Arrange-Act-Assert | Estructura obligatoria |
| Mocking | Solo en boundaries (broker, DB, HTTP) |
| Datos de test | Factories, no literales repetidos |

### 7.2 Ejemplo

```ts
describe('EventConsumer', () => {
  it('should process event and send ACK', async () => {
    // Arrange
    const event = EventFactory.create({ type: 'TELEMETRY_REPORTED' });

    // Act
    const result = await consumer.process(event);

    // Assert
    expect(result.status).toBe('PROCESSED');
    expect(broker.ack).toHaveBeenCalledWith(event.id);
  });

  it('should discard duplicate event', async () => {
    // Arrange
    const event = EventFactory.create();
    await consumer.process(event);

    // Act
    const result = await consumer.process(event);

    // Assert
    expect(result.status).toBe('DUPLICATE');
    expect(repository.save).toHaveBeenCalledTimes(1);
  });
});
```

## 8. Documentación en Código

### 8.1 JSDoc

Se documenta la API pública de cada módulo:

```ts
/**
 * Processes an incoming domain event from the message broker.
 * Validates idempotency, persists the event, and sends ACK.
 *
 * @param event - The raw event received from the broker
 * @returns Processing result with status and metadata
 * @throws DomainError if the event payload is invalid
 */
async processEvent(event: RawEvent): Promise<ProcessingResult> {
  // ...
}
```

### 8.2 Cuándo Documentar

| Cuándo | Cuándo No |
|--------|----------|
| API pública de módulos | Getters/setters simples |
| Lógica de negocio compleja | Código autoexplicativo |
| Decisiones no obvias | Implementaciones estándar |
| Workarounds | Funciones triviales |

## 9. Herramientas de Calidad

| Herramienta | Propósito | Ejecución |
|------------|----------|----------|
| ESLint | Análisis estático | Pre-commit + CI |
| Prettier | Formateo | Pre-commit |
| Vitest | Testing | CI |
| Husky | Git hooks | Pre-commit |
| lint-staged | Lint solo archivos staged | Pre-commit |