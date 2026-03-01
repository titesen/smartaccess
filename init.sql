-- =============================================================================
-- SmartAccess IoT Platform — PostgreSQL Schema
-- DBMS: PostgreSQL 14+
-- Architecture: OLTP, Event-Driven
-- Encoding: UTF-8 | Collation: en_US.UTF-8 | Timezone: UTC
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. ENUMERATIONS
-- ---------------------------------------------------------------------------

CREATE TYPE enum_device_status AS ENUM (
    'REGISTERED',
    'ONLINE',
    'OFFLINE',
    'ERROR',
    'MAINTENANCE',
    'DECOMMISSIONED'
);

CREATE TYPE enum_event_type AS ENUM (
    'DEVICE_CONNECTED',
    'DEVICE_DISCONNECTED',
    'TELEMETRY_REPORTED',
    'ALERT_TRIGGERED',
    'COMMAND_RECEIVED',
    'COMMAND_EXECUTED'
);

CREATE TYPE enum_event_processing_status AS ENUM (
    'RECEIVED',
    'VALIDATED',
    'PROCESSED',
    'FAILED',
    'RETRY_PENDING',
    'DEAD_LETTERED'
);

CREATE TYPE enum_ack_status AS ENUM (
    'PENDING',
    'ACKED',
    'NACKED',
    'TIMEOUT'
);

-- ---------------------------------------------------------------------------
-- 2. CORE TABLES
-- ---------------------------------------------------------------------------

-- 2.1 devices
-- Registered IoT or simulated devices.

CREATE TABLE devices (
    id               BIGSERIAL        PRIMARY KEY,
    device_uuid      UUID             NOT NULL UNIQUE,
    name             VARCHAR(150)     NOT NULL,
    location         VARCHAR(150)     NULL,
    status           enum_device_status NOT NULL DEFAULT 'REGISTERED',
    firmware_version VARCHAR(50)      NULL,
    last_seen_at     TIMESTAMPTZ      NULL,
    created_at       TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX devices_device_uuid_uniq ON devices(device_uuid);
CREATE INDEX devices_status_idx ON devices(status);
CREATE INDEX devices_last_seen_at_idx ON devices(last_seen_at);

-- 2.2 device_status_history
-- Tracks device state transitions (3NF compliant).

CREATE TABLE device_status_history (
    id              BIGSERIAL          PRIMARY KEY,
    device_id       BIGINT             NOT NULL,
    previous_status enum_device_status NOT NULL,
    new_status      enum_device_status NOT NULL,
    changed_at      TIMESTAMPTZ        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    changed_by      VARCHAR(100)       NOT NULL,

    CONSTRAINT fk_device_status_history_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX device_status_history_device_id_idx ON device_status_history(device_id);
CREATE INDEX device_status_history_changed_at_idx ON device_status_history(changed_at);

-- 2.3 events
-- Stores all incoming domain events (normalized, no duplication).

CREATE TABLE events (
    id                BIGSERIAL                    PRIMARY KEY,
    event_uuid        UUID                         NOT NULL UNIQUE,
    device_id         BIGINT                       NOT NULL,
    event_type        enum_event_type              NOT NULL,
    payload           JSONB                        NOT NULL,
    received_at       TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processing_status enum_event_processing_status NOT NULL DEFAULT 'RECEIVED',
    retry_count       INTEGER                      NOT NULL DEFAULT 0 CHECK (retry_count >= 0),
    idempotency_key   UUID                         NOT NULL,
    created_at        TIMESTAMPTZ                  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_events_device
        FOREIGN KEY (device_id)
        REFERENCES devices(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE UNIQUE INDEX events_idempotency_key_uniq ON events(idempotency_key);
CREATE INDEX events_device_id_idx ON events(device_id);
CREATE INDEX events_processing_status_idx ON events(processing_status);
CREATE INDEX events_received_at_idx ON events(received_at);
CREATE INDEX events_payload_gin_idx ON events USING GIN(payload);

-- 2.4 event_processing_logs
-- Tracks internal processing steps per event.

CREATE TABLE event_processing_logs (
    id         BIGSERIAL    PRIMARY KEY,
    event_id   BIGINT       NOT NULL,
    step_name  VARCHAR(150) NOT NULL,
    status     VARCHAR(50)  NOT NULL,
    message    TEXT         NULL,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_processing_logs_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX event_processing_logs_event_id_idx ON event_processing_logs(event_id);

-- 2.5 event_acknowledgments
-- Tracks ACK/NACK status explicitly per event and consumer.

CREATE TABLE event_acknowledgments (
    id            BIGSERIAL       PRIMARY KEY,
    event_id      BIGINT          NOT NULL,
    ack_status    enum_ack_status NOT NULL DEFAULT 'PENDING',
    acked_at      TIMESTAMPTZ     NULL,
    consumer_name VARCHAR(100)    NOT NULL,
    created_at    TIMESTAMPTZ     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_acknowledgments_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX event_ack_event_id_idx ON event_acknowledgments(event_id);

-- 2.6 event_retries
-- Explicit retry control (decoupled from event).

CREATE TABLE event_retries (
    id            BIGSERIAL   PRIMARY KEY,
    event_id      BIGINT      NOT NULL,
    retry_attempt INTEGER     NOT NULL CHECK (retry_attempt >= 1),
    next_retry_at TIMESTAMPTZ NOT NULL,
    error_message TEXT        NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_retries_event
        FOREIGN KEY (event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX event_retries_event_id_idx ON event_retries(event_id);
CREATE INDEX event_retries_next_retry_at_idx ON event_retries(next_retry_at);

-- 2.7 dead_letter_events
-- Events that failed permanently after exhausting retry attempts.

CREATE TABLE dead_letter_events (
    id                BIGSERIAL   PRIMARY KEY,
    original_event_id BIGINT      NOT NULL,
    payload           JSONB       NOT NULL,
    failure_reason    TEXT        NOT NULL,
    moved_at          TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_dead_letter_events_event
        FOREIGN KEY (original_event_id)
        REFERENCES events(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE INDEX dead_letter_events_original_event_id_idx ON dead_letter_events(original_event_id);
CREATE INDEX dead_letter_events_moved_at_idx ON dead_letter_events(moved_at);

-- 2.8 outbox_events
-- Implements the Outbox Pattern for reliable event publication.

CREATE TABLE outbox_events (
    id             BIGSERIAL    PRIMARY KEY,
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   BIGINT       NOT NULL,
    event_type     VARCHAR(100) NOT NULL,
    payload        JSONB        NOT NULL,
    published      BOOLEAN      NOT NULL DEFAULT FALSE,
    published_at   TIMESTAMPTZ  NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX outbox_unpublished_idx
    ON outbox_events(published)
    WHERE published = FALSE;

-- 2.9 audit_log
-- Immutable audit trail for all domain, technical, and security events.

CREATE TABLE audit_log (
    id             BIGSERIAL    PRIMARY KEY,
    event_type     VARCHAR(100) NOT NULL,
    category       VARCHAR(50)  NOT NULL CHECK (category IN ('DOMAIN', 'TECHNICAL', 'SECURITY')),
    aggregate_type VARCHAR(100) NOT NULL,
    aggregate_id   VARCHAR(100) NOT NULL,
    previous_state JSONB        NULL,
    new_state      JSONB        NULL,
    actor          VARCHAR(150) NOT NULL,
    ip_address     VARCHAR(45)  NULL,
    correlation_id UUID         NULL,
    result         VARCHAR(20)  NOT NULL CHECK (result IN ('SUCCESS', 'FAILURE')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX audit_log_aggregate_idx ON audit_log(aggregate_type, aggregate_id);
CREATE INDEX audit_log_category_idx ON audit_log(category);
CREATE INDEX audit_log_created_at_idx ON audit_log(created_at);
CREATE INDEX audit_log_correlation_id_idx ON audit_log(correlation_id);


-- ---------------------------------------------------------------------------
-- 3. FUNCTIONS & TRIGGERS
-- ---------------------------------------------------------------------------

-- 3.1 Automatic updated_at trigger function (must be defined before it is used)

CREATE OR REPLACE FUNCTION fn_update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2.10 users
-- Platform users for authentication and RBAC.

CREATE TYPE enum_user_role AS ENUM ('ADMIN', 'OPERATOR', 'VIEWER');

CREATE TABLE users (
    id             BIGSERIAL        PRIMARY KEY,
    email          VARCHAR(255)     NOT NULL UNIQUE,
    password_hash  TEXT             NOT NULL,
    role           enum_user_role   NOT NULL DEFAULT 'VIEWER',
    is_active      BOOLEAN          NOT NULL DEFAULT TRUE,
    created_at     TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX users_email_uniq ON users(email);

CREATE TRIGGER tr_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- 2.11 system_settings
-- System-wide configuration flags and preferences.

CREATE TABLE system_settings (
    key             VARCHAR(100)     PRIMARY KEY,
    value           JSONB            NOT NULL,
    updated_at      TIMESTAMPTZ      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by      VARCHAR(150)     NOT NULL
);

CREATE TRIGGER tr_system_settings_updated_at
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- Seed: default admin
-- password: admin123
-- hash generated via scrypt (salt:key format used by AuthService)
-- Replace by calling POST /api/auth/register once the system is up
INSERT INTO users (email, password_hash, role) VALUES
    ('admin@smartaccess.io',
     '14ff939792e442f2c1623a318042a287:113bfb5d11e269349d8d8e1a01891cadb8a8869adef2c394449fa585dd570d90fbda3aa66decb9736af7dfeef8acaa5e5635f73491ea50194e7a0f52d83535f5',
     'ADMIN')
ON CONFLICT (email) DO NOTHING;


CREATE TRIGGER tr_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION fn_update_timestamp();

-- 3.2 Device status transition validation

CREATE OR REPLACE FUNCTION fn_validate_device_status_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'DECOMMISSIONED' THEN
        RAISE EXCEPTION 'Cannot change status of decommissioned device';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_devices_validate_status_transition
    BEFORE UPDATE OF status ON devices
    FOR EACH ROW
    EXECUTE FUNCTION fn_validate_device_status_transition();

-- 3.3 Automatic device_status_history logging on status change

CREATE OR REPLACE FUNCTION fn_log_device_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO device_status_history (device_id, previous_status, new_status, changed_by)
        VALUES (NEW.id, OLD.status, NEW.status, 'SYSTEM');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_devices_log_status_change
    AFTER UPDATE OF status ON devices
    FOR EACH ROW
    EXECUTE FUNCTION fn_log_device_status_change();
