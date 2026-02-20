# Despliegue y CI/CD

## 1. Visión General

SmartAccess se despliega en un VPS utilizando Docker Compose. El proceso de despliegue se automatiza mediante GitHub Actions, siguiendo una estrategia de Continuous Integration y Continuous Deployment.

### Diagrama de Pipeline

```mermaid
flowchart LR
    A[Push a main] --> B[GitHub Actions]
    B --> C[Install]
    C --> D[Lint]
    D --> E[Unit Tests]
    E --> F[Integration Tests]
    F --> G[Build]
    G --> H[Deploy via SSH]
    H --> I[Health Check]
```

## 2. Entornos

| Entorno | Propósito | Trigger |
|---------|----------|---------|
| Development | Desarrollo local | `docker-compose up` |
| Staging | Validación pre-producción | Push a `develop` |
| Production | Sistema en producción | Push a `main` |

## 3. Pipeline de CI

### 3.1 Workflow: CI

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_DB: smartaccess_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      rabbitmq:
        image: rabbitmq:3-management
        ports:
          - 5672:5672
        options: >-
          --health-cmd "rabbitmq-diagnostics check_running"
          --health-interval 10s
          --health-timeout 10s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci

      - run: npm run lint

      - run: npm run test:unit

      - run: npm run test:integration
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/smartaccess_test
          RABBITMQ_URL: amqp://guest:guest@localhost:5672

      - run: npm run build
```

### 3.2 Quality Gates

El pipeline falla si:

- Lint reporta errores
- Cualquier test falla
- La cobertura está por debajo del mínimo (70% general, 100% idempotencia)
- El build no es exitoso

## 4. Pipeline de CD

### 4.1 Workflow: Deploy

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: ci

    steps:
      - uses: actions/checkout@v4

      - name: Deploy to VPS
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/smartaccess
            git pull origin main
            docker-compose build --no-cache
            docker-compose up -d
            sleep 10
            curl -f http://localhost:3000/health || exit 1

      - name: Notify deployment
        if: success()
        run: echo "Deployment successful"
```

### 4.2 Estrategia de Rollback

Si el health check falla tras el despliegue:

1. Se revierte al commit anterior: `git checkout HEAD~1`
2. Se reconstruyen los contenedores: `docker-compose build && docker-compose up -d`
3. Se verifica el health check nuevamente
4. Se notifica el fallo y se investiga

## 5. Gestión de Secrets

| Secret | Ubicación | Uso |
|--------|----------|-----|
| VPS_HOST | GitHub Secrets | Dirección del servidor |
| VPS_USER | GitHub Secrets | Usuario SSH |
| VPS_SSH_KEY | GitHub Secrets | Clave SSH privada |
| DATABASE_URL | `.env` en VPS | Conexión a PostgreSQL |
| RABBITMQ_URL | `.env` en VPS | Conexión a RabbitMQ |
| JWT_SECRET | `.env` en VPS | Firma de tokens |

El archivo `.env` no se versiona en Git (incluido en `.gitignore`).

## 6. Docker

### 6.1 Dockerfile (Backend)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### 6.2 Multi-Stage Build

Se utiliza multi-stage build para:

- Reducir el tamaño de la imagen final
- No incluir dependencias de desarrollo en producción
- Optimizar layer caching

## 7. Proceso de Despliegue Manual (Fallback)

En caso de fallo del pipeline automatizado:

```bash
ssh user@vps
cd /opt/smartaccess
git pull origin main
docker-compose down
docker-compose build --no-cache
docker-compose up -d
docker-compose ps
curl -f http://localhost:3000/health
```

## 8. Monitoreo Post-Despliegue

Después de cada despliegue se verifican:

| Check | Comando | Resultado Esperado |
|-------|---------|-------------------|
| Health endpoint | `curl /health` | Status 200 |
| DB connectivity | Health check: database | `ok` |
| Broker connectivity | Health check: rabbitmq | `ok` |
| Consumer running | `docker-compose ps` | Estado `Up` |
| Logs sin errores | `docker-compose logs --tail=50` | Sin errores críticos |