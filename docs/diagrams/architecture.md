# Diagramas de Arquitectura — SmartAccess

Todos los diagramas usan [Mermaid.js](https://mermaid.js.org/) y se renderizan automáticamente en GitHub, VS Code y cualquier visor Markdown moderno.

---

## 1. Arquitectura General (C4 — Nivel Contexto)

```mermaid
graph TB
    SIM["🔧 Device Simulator<br>Node.js + TypeScript"]
    RMQ["📨 RabbitMQ<br>Message Broker"]
    BE["🖥️ SmartAccess Backend<br>Express + TypeScript"]
    PG["🐘 PostgreSQL<br>OLTP (10 tablas)"]
    RD["⚡ Redis<br>Cache + Blacklist"]
    FE["📊 Dashboard<br>Next.js PWA"]
    USER["👤 Operador<br>(Browser)"]

    SIM -->|Publica eventos AMQP| RMQ
    RMQ -->|Consume con ACK manual| BE
    BE -->|SQL Transactions| PG
    BE -->|Cache + Token Blacklist| RD
    BE -->|WebSocket push| FE
    USER -->|HTTP/REST| FE
    FE -->|API calls| BE

    style BE fill:#2196F3,color:#fff
    style RMQ fill:#FF6F00,color:#fff
    style PG fill:#336791,color:#fff
    style FE fill:#000,color:#fff
```

---

## 2. Arquitectura Interna (C4 — Nivel Contenedores)

```mermaid
graph TB
    subgraph "Application Layer"
        direction TB
        RT["Routes<br>auth · devices · events · alerts"]
        MW["Middleware<br>auth · RBAC · CSRF · correlationId · validation"]
        SVC["Services<br>auth · device · alert · DLQ · blacklist"]
        CON["Consumers<br>event.consumer.ts"]
    end

    subgraph "Domain Layer"
        direction TB
        SM["State Machine<br>device-state-machine.ts"]
        EF["Event Factory<br>event.factory.ts"]
        OBS["Event Observer<br>event-observer.ts"]
        EPB["Payload Builder<br>event-payload-builder.ts"]
    end

    subgraph "Infrastructure Layer"
        direction TB
        BRK["Broker<br>RabbitMQ connection"]
        DB["Database<br>PostgreSQL pool"]
        CAC["Cache<br>Redis client"]
        REP["Repositories<br>events · devices · alerts · DLQ"]
        RET["Retry Strategy<br>backoff exponencial"]
        OUT["Outbox Dispatcher<br>outbox pattern"]
        WS["WebSocket<br>gateway"]
    end

    subgraph "External Systems"
        direction TB
        PG[(PostgreSQL)]
        RMQ[(RabbitMQ)]
        REDIS[(Redis)]
    end

    RT --> MW
    MW --> SVC
    SVC --> REP
    SVC --> SM
    CON --> EF
    CON --> OBS
    CON --> RET
    REP --> DB
    DB --> PG
    BRK --> RMQ
    CAC --> REDIS
    OUT --> BRK
    WS -.->|Push events| FE["Dashboard"]

    style SVC fill:#2196F3,color:#fff
    style SM fill:#4CAF50,color:#fff
    style REP fill:#FF9800,color:#fff
```

---

## 3. Flujo de Procesamiento de Eventos

```mermaid
flowchart TD
    A["📡 Simulator genera evento"] --> B["Publica a RabbitMQ<br>(exchange: smartaccess)"]
    B --> C["Consumer recibe mensaje"]
    C --> D{"¿Esquema válido?"}
    D -->|No| E["NACK + log error"]
    D -->|Sí| F{"¿Idempotency key<br>ya existe?"}
    F -->|Sí| G["ACK (descarta duplicado)<br>+ audit log"]
    F -->|No| H["Inicia transacción PostgreSQL"]
    H --> I["Persiste evento en DB"]
    I --> J["Actualiza estado del dispositivo"]
    J --> K["State Machine valida transición"]
    K -->|Inválida| L["Rollback TX<br>+ NACK"]
    K -->|Válida| M["Commit TX"]
    M --> N["ACK al broker"]
    N --> O["Notifica vía WebSocket"]
    O --> P["📊 Dashboard actualizado"]

    L --> Q{"¿retry_count < 5?"}
    Q -->|Sí| R["Requeue con<br>backoff exponencial"]
    Q -->|No| S["Mueve a DLQ<br>+ persiste en dead_letter_events"]

    style H fill:#2196F3,color:#fff
    style S fill:#F44336,color:#fff
    style P fill:#4CAF50,color:#fff
```

---

## 4. Diagrama Entidad-Relación (ERD)

```mermaid
erDiagram
    devices ||--o{ events : "genera"
    devices ||--o{ device_telemetry : "reporta"
    devices ||--o{ alerts : "dispara"
    events ||--o{ event_processing_log : "audita"
    events ||--|| idempotency_keys : "tiene"

    devices {
        uuid device_id PK
        varchar name
        device_type_enum type
        device_status_enum status
        jsonb metadata
        timestamp registered_at
        timestamp last_seen_at
    }

    events {
        uuid event_id PK
        uuid device_id FK
        event_type_enum event_type
        processing_status_enum processing_status
        jsonb payload
        int retry_count
        timestamp received_at
        timestamp processed_at
    }

    device_telemetry {
        uuid telemetry_id PK
        uuid device_id FK
        real temperature
        real humidity
        real battery_level
        timestamp reported_at
    }

    alerts {
        uuid alert_id PK
        uuid device_id FK
        alert_severity_enum severity
        alert_status_enum status
        varchar message
        timestamp triggered_at
        timestamp acknowledged_at
    }

    idempotency_keys {
        uuid idempotency_key PK
        uuid event_id FK
        timestamp created_at
    }

    dead_letter_events {
        uuid id PK
        uuid original_event_id
        jsonb original_payload
        varchar error_message
        int retry_count
        dlq_status_enum status
        timestamp moved_at
    }

    outbox_events {
        uuid id PK
        varchar event_type
        jsonb payload
        boolean published
        timestamp created_at
        timestamp published_at
    }

    event_processing_log {
        uuid id PK
        uuid event_id FK
        varchar action
        varchar result
        timestamp created_at
    }

    users {
        uuid user_id PK
        varchar email UK
        varchar password_hash
        user_role_enum role
        timestamp created_at
    }

    audit_log {
        uuid id PK
        varchar entity_type
        uuid entity_id
        varchar action
        jsonb changes
        timestamp created_at
    }
```

---

## 5. State Machine — Dispositivos

```mermaid
stateDiagram-v2
    [*] --> REGISTERED

    REGISTERED --> ONLINE : DEVICE_CONNECTED
    ONLINE --> OFFLINE : DEVICE_DISCONNECTED
    OFFLINE --> ONLINE : DEVICE_CONNECTED
    ONLINE --> ERROR : ALERT_TRIGGERED (critical)
    ERROR --> MAINTENANCE : operator action
    MAINTENANCE --> ONLINE : repair complete
    ONLINE --> DECOMMISSIONED : decommission
    OFFLINE --> DECOMMISSIONED : decommission
    MAINTENANCE --> DECOMMISSIONED : decommission

    DECOMMISSIONED --> [*]

    note right of ERROR
        Transición automática cuando
        se dispara alerta de severidad
        CRITICAL en el dispositivo
    end note

    note right of DECOMMISSIONED
        Estado terminal. No se permiten
        transiciones desde DECOMMISSIONED.
    end note
```

---

## 6. Security Layers (Defensa en Profundidad)

```mermaid
flowchart TD
    REQ["🌐 HTTP Request"] --> TLS["🔒 Capa 1: TLS 1.3<br>Nginx termination"]
    TLS --> CSRF["🛡️ Capa 2: CSRF<br>Double-Submit Cookie"]
    CSRF --> TOKEN["🔑 Capa 3: Token Decrypt<br>ChaCha20-Poly1305"]
    TOKEN --> BL{"🚫 ¿Token en<br>Blacklist?"}
    BL -->|Sí| DENY["401 Unauthorized"]
    BL -->|No| RBAC["👥 Capa 4: RBAC<br>Verificar rol"]
    RBAC -->|Sin permisos| FORBID["403 Forbidden"]
    RBAC -->|OK| VALID["✅ Capa 5: Validation<br>Zod schemas"]
    VALID --> APP["🖥️ Application Logic"]
    APP --> DOCKER["🐳 Capa 6: Container<br>Distroless + read_only"]

    style TLS fill:#1565C0,color:#fff
    style CSRF fill:#2E7D32,color:#fff
    style TOKEN fill:#E65100,color:#fff
    style RBAC fill:#6A1B9A,color:#fff
    style VALID fill:#00838F,color:#fff
    style DOCKER fill:#37474F,color:#fff
    style DENY fill:#C62828,color:#fff
    style FORBID fill:#C62828,color:#fff
```
