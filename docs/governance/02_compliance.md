# Cumplimiento Técnico y Regulatorio

## 1. Propósito

Este documento define el marco de cumplimiento técnico y regulatorio del sistema SmartAccess IoT Platform. Establece los requisitos regulatorios aplicables, los controles técnicos implementados, la evidencia verificable y los procedimientos de auditoría.

El cumplimiento no es declarativo. Si no puede demostrarse con evidencia técnica automatizada, no se considera implementado.

## 2. Marco Regulatorio de Referencia

| Normativa | Alcance | Aplicabilidad |
|----------|---------|---------------|
| GDPR (EU) | Protección de datos personales | Referencia para mejores prácticas |
| Ley 25.326 (Argentina) | Protección de datos personales | Obligatoria si hay datos personales |
| ISO 27001 | Seguridad de la información | Referencia para controles |
| SOC 2 Type II | Controles de seguridad y disponibilidad | Referencia para evidencia |

## 3. Controles Técnicos

### 3.1 Control de Acceso

| Control | Implementación | Evidencia |
|---------|---------------|----------|
| Autenticación | JWT con firma segura | Test automatizado de validación |
| Autorización | RBAC (ADMIN, OPERATOR, VIEWER) | Tests de permisos por rol |
| Sesiones | Expiración configurable | Logs de sesiones expiradas |
| Intento fallido | Registro en audit_log | Queries de auditoría |

### 3.2 Cifrado

| Control | Implementación | Evidencia |
|---------|---------------|----------|
| En tránsito | TLS 1.3 via Nginx | SSL Labs score A+ |
| En reposo | Cifrado a nivel de disco | Configuración del VPS |
| Secrets | Variables de entorno, no en código | Scan de repositorio |

### 3.3 Integridad de Datos

| Control | Implementación | Evidencia |
|---------|---------------|----------|
| Idempotencia | Constraint UNIQUE en `idempotency_key` | Test automatizado |
| Transacciones ACID | Unit of Work pattern | Tests de integración |
| Audit trail | Tabla `audit_log` inmutable | Query de auditoría |
| FK integrity | Foreign keys con políticas explícitas | Schema validation |

### 3.4 Disponibilidad

| Control | Implementación | Evidencia |
|---------|---------------|----------|
| Health checks | Endpoints `/health` | Monitoreo continuo |
| Auto-restart | Docker restart policy | Docker logs |
| Retry automático | Backoff exponencial | Métricas de retry |
| Backup | pg_dump diario | Cron job verificable |

## 4. Evidencia Automatizada

### 4.1 Tipos de Evidencia

| Tipo | Fuente | Frecuencia |
|------|--------|-----------|
| Test results | CI/CD pipeline | Cada push |
| Audit queries | PostgreSQL | Bajo demanda |
| Security scan | Dependabot | Continua |
| Coverage report | Vitest | Cada push |
| Health check logs | Prometheus | Continua |

### 4.2 Registro de Evidencia

Toda evidencia de cumplimiento se almacena y es verificable:

- Resultados de CI/CD en GitHub Actions (historial de runs)
- Audit log en PostgreSQL (inmutable, consultable)
- Métricas en Prometheus (retención de 90 días)
- Logs en archivos estructurados (retención de 30 días)

## 5. Gestión de Incidentes de Cumplimiento

### 5.1 Clasificación

| Severidad | Descripción | Tiempo de Respuesta |
|-----------|-------------|-------------------|
| Crítico | Violación de datos, acceso no autorizado | < 1 hora |
| Alto | Fallo de control de acceso, secret expuesto | < 4 horas |
| Medio | Anomalía detectada, log inconsistente | < 24 horas |
| Bajo | Mejora de control pendiente | Próximo sprint |

### 5.2 Procedimiento

1. **Detección:** Alertas automáticas o revisión manual
2. **Clasificación:** Determinación de severidad e impacto
3. **Contención:** Aislamiento del componente afectado
4. **Investigación:** Análisis de causa raíz usando audit log y correlation_id
5. **Remediación:** Corrección técnica y actualización de controles
6. **Post-mortem:** Documentación del incidente y lecciones aprendidas

## 6. Auditoría de Cumplimiento

### 6.1 Frecuencia

| Tipo de Auditoría | Frecuencia | Responsable |
|------------------|-----------|-------------|
| Automatizada (CI/CD) | Continua | Pipeline |
| Revisión de accesos | Mensual | Administrador |
| Revisión de secrets | Mensual | Administrador |
| Auditoría de logs | Semanal | Operaciones |

### 6.2 Checklist de Verificación

| Verificación | Método | Frecuencia |
|-------------|--------|-----------|
| Todos los endpoints autenticados | Test automatizado | Cada push |
| RBAC correctamente aplicado | Test por rol | Cada push |
| Audit log registra todas las operaciones | Query de integridad | Semanal |
| Secrets no expuestos en código | Repository scan | Cada push |
| TLS configurado correctamente | SSL Labs test | Mensual |
| Dependencias sin vulnerabilidades | Dependabot | Continua |

## 7. Mejora Continua

El marco de cumplimiento se actualiza cuando:

- Se identifican nuevos riesgos
- Se incorporan nuevas funcionalidades
- Ocurre un incidente de cumplimiento
- Se actualizan normativas aplicables
