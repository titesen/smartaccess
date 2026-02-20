# Guía de Setup

## 1. Prerrequisitos

### 1.1 Software Requerido

| Software | Versión Mínima | Propósito |
|----------|---------------|----------|
| Node.js | 20 LTS | Runtime del backend y frontend |
| npm | 10+ | Gestión de dependencias |
| Docker | 24+ | Contenedores |
| Docker Compose | 2.20+ | Orquestación de servicios |
| Git | 2.40+ | Control de versiones |

### 1.2 Verificación de Instalación

```bash
node --version    # >= 20.x
npm --version     # >= 10.x
docker --version  # >= 24.x
docker compose version  # >= 2.20
git --version     # >= 2.40
```

## 2. Clonar el Repositorio

```bash
git clone https://github.com/user/smartaccess.git
cd smartaccess
```

## 3. Variables de Entorno

Crear el archivo `.env` en la raíz del proyecto:

```bash
cp .env.example .env
```

Contenido de `.env`:

```env
# Database
DATABASE_URL=postgres://smartaccess:smartaccess@localhost:5432/smartaccess

# RabbitMQ
RABBITMQ_URL=amqp://smartaccess:smartaccess@localhost:5672

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=development-secret-change-in-production
JWT_EXPIRATION=1h

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

## 4. Levantar Infraestructura

### 4.1 Iniciar Servicios con Docker Compose

```bash
docker compose up -d postgres rabbitmq redis
```

### 4.2 Verificar que los Servicios Están Funcionando

```bash
docker compose ps
```

Resultado esperado:

```
NAME                STATUS
smartaccess-postgres    Up (healthy)
smartaccess-rabbitmq    Up (healthy)
smartaccess-redis       Up
```

### 4.3 Verificación Manual

| Servicio | Comando | Resultado Esperado |
|----------|---------|-------------------|
| PostgreSQL | `docker compose exec postgres pg_isready` | `accepting connections` |
| RabbitMQ | `docker compose exec rabbitmq rabbitmq-diagnostics check_running` | `is running` |
| Redis | `docker compose exec redis redis-cli ping` | `PONG` |

## 5. Setup del Backend

```bash
cd backend
npm install
npm run build
npm run dev
```

Verificación:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{
  "service": "backend",
  "status": "healthy",
  "checks": {
    "database": "ok",
    "rabbitmq": "ok",
    "redis": "ok"
  }
}
```

## 6. Setup del Device Simulator

```bash
cd simulator
npm install
npm run dev
```

El simulador comienza a generar eventos periódicos y a publicarlos en RabbitMQ.

## 7. Setup del Frontend

```bash
cd dashboard
npm install
npm run dev
```

Acceder al dashboard en `http://localhost:3001`.

## 8. Inicialización de la Base de Datos

El schema se aplica automáticamente al iniciar PostgreSQL con Docker Compose (via `init.sql` montado en `/docker-entrypoint-initdb.d/`).

Para reinicializar manualmente:

```bash
docker compose exec postgres psql -U smartaccess -d smartaccess -f /docker-entrypoint-initdb.d/init.sql
```

## 9. Herramientas de Desarrollo

### 9.1 Linting y Formateo

```bash
npm run lint          # Ejecutar ESLint
npm run lint:fix      # Corregir errores automáticos
npm run format        # Ejecutar Prettier
```

### 9.2 Testing

```bash
npm run test          # Ejecutar todos los tests
npm run test:unit     # Solo tests unitarios
npm run test:int      # Solo tests de integración
npm run test:cov      # Tests con reporte de cobertura
```

### 9.3 Git Hooks

Husky se configura automáticamente al ejecutar `npm install`. Los hooks configurados:

| Hook | Acción |
|------|--------|
| pre-commit | lint-staged (ESLint + Prettier sobre archivos staged) |
| commit-msg | Validación de formato Conventional Commits |

## 10. Acceso a Herramientas

| Herramienta | URL | Credenciales |
|------------|-----|-------------|
| Backend API | `http://localhost:3000` | — |
| Dashboard | `http://localhost:3001` | — |
| RabbitMQ Management | `http://localhost:15672` | guest / guest |
| PostgreSQL | `localhost:5432` | smartaccess / smartaccess |

## 11. Troubleshooting

| Problema | Solución |
|---------|---------|
| Puerto 5432 en uso | Detener servicio PostgreSQL local o cambiar puerto en `.env` |
| Puerto 5672 en uso | Detener servicio RabbitMQ local o cambiar puerto |
| Docker no inicia | Verificar que Docker Desktop está corriendo |
| `npm install` falla | Verificar versión de Node.js (≥ 20) |
| Health check falla | Verificar que todos los servicios Docker están `Up (healthy)` |
| Base de datos vacía | Verificar que `init.sql` está montado correctamente en Docker Compose |
