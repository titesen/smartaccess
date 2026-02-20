# Infraestructura

## 1. Visión General

SmartAccess se despliega en un VPS (Virtual Private Server) utilizando Docker Compose como herramienta de orquestación. La infraestructura comprende todos los servicios necesarios para el funcionamiento del sistema: backend, message broker, base de datos, cache, proxy reverso y herramientas de observabilidad.

### Diagrama de Infraestructura

```mermaid
flowchart TD
    subgraph VPS["VPS (Docker Host)"]
        subgraph Network["Red Interna Docker"]
            NGINX[Nginx<br>Proxy Reverso]
            API[Backend API<br>Node.js]
            SIM[Device Simulator]
            PG[(PostgreSQL)]
            RMQ[(RabbitMQ)]
            REDIS[(Redis)]
        end
    end

    INET[Internet] --> NGINX
    NGINX -->|Proxy| API
    SIM -->|AMQP| RMQ
    RMQ -->|AMQP| API
    API -->|SQL| PG
    API -->|Cache| REDIS
```

## 2. Servicios

### 2.1 Catálogo de Servicios

| Servicio | Imagen | Puerto Externo | Puerto Interno | Propósito |
|----------|--------|---------------|---------------|----------|
| nginx | nginx:alpine | 80, 443 | 80, 443 | Proxy reverso, TLS |
| backend | build local | — | 3000 | API REST + WebSocket |
| simulator | build local | — | — | Generación de eventos |
| postgres | postgres:14 | — | 5432 | Base de datos OLTP |
| rabbitmq | rabbitmq:management | — | 5672, 15672 | Message broker |
| redis | redis:7-alpine | — | 6379 | Cache |

### 2.2 Configuración de Red

```yaml
networks:
  smartaccess_network:
    driver: bridge
```

Todos los servicios operan en una red Docker interna. Solo Nginx expone puertos al exterior. Los servicios internos se comunican por nombre de servicio (DNS Docker).

### 2.3 Volúmenes

| Volumen | Servicio | Mount Point | Propósito |
|---------|---------|-------------|----------|
| postgres_data | postgres | /var/lib/postgresql/data | Persistencia de datos |
| rabbitmq_data | rabbitmq | /var/lib/rabbitmq | Cola de mensajes |
| redis_data | redis | /data | Cache persistente |

## 3. Docker Compose

### 3.1 Estructura del Archivo

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend
    networks:
      - smartaccess_network

  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://user:pass@postgres:5432/smartaccess
      - RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - smartaccess_network
    restart: unless-stopped

  simulator:
    build: ./simulator
    environment:
      - RABBITMQ_URL=amqp://user:pass@rabbitmq:5672
    depends_on:
      rabbitmq:
        condition: service_healthy
    networks:
      - smartaccess_network
    restart: unless-stopped

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_DB=smartaccess
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - smartaccess_network

  rabbitmq:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_DEFAULT_USER=user
      - RABBITMQ_DEFAULT_PASS=pass
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "check_running"]
      interval: 10s
      timeout: 10s
      retries: 5
    networks:
      - smartaccess_network

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    networks:
      - smartaccess_network

volumes:
  postgres_data:
  rabbitmq_data:
  redis_data:

networks:
  smartaccess_network:
    driver: bridge
```

## 4. Health Checks

| Servicio | Comando | Intervalo | Timeout | Retries |
|----------|---------|-----------|---------|---------|
| postgres | `pg_isready -U user` | 5s | 5s | 5 |
| rabbitmq | `rabbitmq-diagnostics check_running` | 10s | 10s | 5 |
| backend | `curl -f http://localhost:3000/health` | 10s | 5s | 3 |

## 5. Seguridad de Infraestructura

### 5.1 Red

- Solo Nginx expone puertos al exterior
- Red Docker interna bridge aislada
- Comunicación inter-servicios por nombre de servicio

### 5.2 Secrets

| Secret | Mecanismo |
|--------|----------|
| Database credentials | Variables de entorno (`.env` no versionado) |
| RabbitMQ credentials | Variables de entorno |
| JWT secret | Variables de entorno |
| TLS certificates | Montados como volumen read-only |

### 5.3 TLS

- Nginx actúa como TLS termination point
- TLS 1.3 obligatorio
- HSTS habilitado
- Certificados Let's Encrypt (renovación automática)

## 6. Nginx Configuración Base

```nginx
upstream backend {
    server backend:3000;
}

server {
    listen 443 ssl http2;
    server_name smartaccess.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.3;

    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 7. Backup

| Componente | Mecanismo | Frecuencia |
|-----------|----------|-----------|
| PostgreSQL | `pg_dump` | Diario |
| RabbitMQ | Definiciones exportadas | Semanal |
| Configuración | Versionada en Git | Cada cambio |

## 8. Requisitos de Hardware

| Recurso | Mínimo | Recomendado |
|---------|--------|-------------|
| CPU | 2 vCPU | 4 vCPU |
| RAM | 4 GB | 8 GB |
| Almacenamiento | 40 GB SSD | 80 GB SSD |
| Red | 100 Mbps | 1 Gbps |
