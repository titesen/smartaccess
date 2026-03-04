# ADR-004: Container Hardening (Distroless + read_only + Secrets)

## Status

**Accepted** — Implementado en `docker-compose.yml` y `backend/Dockerfile`

## Contexto

El despliegue original usaba `node:20-alpine` como imagen base. Alpine es ligera (~50MB), pero incluye una shell (`ash`), gestión de paquetes (`apk`), utilidades de red (`wget`, `curl`) y otras herramientas que un atacante puede explotar si logra ejecución remota de código (RCE).

Además, las credenciales viajaban en texto plano dentro de `environment` en el `docker-compose.yml`, y los contenedores tenían sistema de archivos writable, permitiendo a un atacante dejar malware persistente.

### Alternativas Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| Node Alpine (status quo) | Simple, buena documentación | Shell accesible, atacable |
| Node Slim | Más pequeño que full | Aún tiene shell y apt |
| Distroless | Sin shell, mínima superficie | Debug más difícil en producción |
| Scratch | Absolutamente mínimo | Requiere binario estático, no aplica a Node.js |

## Decisión

Implementar un stack de seguridad de 4 niveles en **todos los contenedores** del sistema:

### 1. Distroless (Backend + Simulator)
Multi-stage build de 3 etapas con imagen final `gcr.io/distroless/nodejs20-debian12`. Es matemáticamente imposible abrir una shell porque la shell no existe.

### 2. read_only: true
Los 10 contenedores operan con sistema de archivos inmutable. Los procesos solo pueden escribir en particiones `tmpfs` (RAM) explícitamente declaradas.

### 3. Docker Secrets
Las credenciales se inyectan vía archivos montados en `/run/secrets/` en vez de env vars. Los contenedores de Node.js leen estos archivos programáticamente.

### 4. Resource Limits
CPU y RAM limitados por servicio con `deploy.resources.limits`, previniendo DoS y memory leaks.

## Consecuencias

### Positivas
- **Superficie de ataque cero** — sin shell, sin herramientas, sin gestor de paquetes
- **Inmutabilidad** — un atacante no puede modificar el filesystem del contenedor
- **Credenciales seguras** — no visibles en `docker inspect` ni en logs
- **DoS mitigation** — memory leaks no pueden consumir toda la RAM del host

### Negativas
- **Debug en producción más difícil** — no hay shell para `exec` al contenedor
- **Build más lento** — multi-stage de 3 etapas vs 1
- **tmpfs management** — hay que declarar explícitamente cada directorio temporal
- **Incompatibilidades descubiertas** — Nginx crash por falta de `/etc/nginx/conf.d` en tmpfs, RabbitMQ OOM con 512M

### Deuda Técnica Aceptada
- Dashboard (Next.js) tiene `read_only` commentado — Next.js cache no es compatible aún
- No hay monitoring del estado de secrets (rotación manual)
