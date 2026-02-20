# Marco Ético

## 1. Propósito

Este documento define el marco de gobernanza ética del proyecto. Establece los principios fundamentales, procedimientos de evaluación, estructuras de responsabilidad y protocolos de toma de decisiones que garantizan que las decisiones arquitectónicas, técnicas y de producto respeten la privacidad, la autonomía y el bienestar.

## 2. Principios Fundamentales

### 2.1 Declaración de Principios

| Principio | Definición |
|-----------|-----------|
| Privacidad por Diseño | La protección de datos se incorpora desde la arquitectura, no como parche posterior |
| Transparencia Operativa | El sistema expone su estado, decisiones y errores de forma explícita |
| Autonomía del Usuario | El usuario controla sus datos y puede revocar acceso en cualquier momento |
| Proporcionalidad | Solo se recopilan y almacenan los datos estrictamente necesarios |
| Responsabilidad | Toda acción del sistema es trazable y auditable |

### 2.2 Aplicación en la Arquitectura

| Principio | Implementación Técnica |
|-----------|----------------------|
| Privacidad por Diseño | Datos mínimos en eventos, sin datos personales en payloads de telemetría |
| Transparencia | Audit log inmutable, logs estructurados, observabilidad completa |
| Autonomía | API de eliminación de datos, gestión de consentimiento |
| Proporcionalidad | Eventos contienen solo datos operativos, no identificación personal |
| Responsabilidad | Correlation ID end-to-end, actor registrado en toda auditoría |

## 3. Evaluación de Impacto

### 3.1 Preguntas de Evaluación

Antes de implementar una nueva funcionalidad, se evalúan los siguientes criterios:

| Dimensión | Pregunta |
|-----------|---------|
| Datos | ¿Qué datos se recopilan? ¿Son estrictamente necesarios? |
| Almacenamiento | ¿Cuánto tiempo se retienen? ¿Existe política de eliminación? |
| Acceso | ¿Quién puede acceder a estos datos? ¿Están los permisos correctos? |
| Transparencia | ¿El usuario sabe que estos datos se recopilan? |
| Impacto | ¿Qué ocurre si estos datos se filtran? |

### 3.2 Clasificación de Datos

| Clasificación | Descripción | Ejemplo | Controles |
|--------------|-------------|---------|----------|
| Público | Información no sensible | Tipos de evento, estados de dispositivo | Ninguno especial |
| Interno | Información operativa | Telemetría, métricas | Autenticación requerida |
| Confidencial | Información sensible | Credenciales, tokens | Cifrado, acceso restringido |

## 4. Prácticas Obligatorias

### 4.1 Desarrollo

| Práctica | Requisito |
|----------|----------|
| No recopilar datos innecesarios | Payloads de eventos contienen solo datos operativos |
| Logs sin datos sensibles | Credenciales, tokens y datos personales excluidos de logs |
| Audit trail completo | Toda operación de dominio, técnica y de seguridad registrada |
| Secrets management | Credenciales en variables de entorno, nunca en código |

### 4.2 Operaciones

| Práctica | Requisito |
|----------|----------|
| Acceso mínimo | Cada rol accede solo a lo necesario (RBAC) |
| Cifrado en tránsito | TLS 1.3 obligatorio |
| Retención definida | Políticas explícitas de retención para cada tipo de dato |
| Eliminación segura | Procedimiento definido para eliminación de datos |

## 5. Gobernanza

### 5.1 Responsabilidades

| Rol | Responsabilidad Ética |
|-----|----------------------|
| Arquitecto | Garantizar que el diseño cumple principios de privacidad y transparencia |
| Desarrollador | Implementar controles técnicos y no exponer datos sensibles |
| Operaciones | Gestionar accesos, rotación de credenciales y respuesta a incidentes |

### 5.2 Revisión

Los aspectos éticos se revisan durante:

- Code review (verificación de datos en logs y respuestas)
- Design review (evaluación de impacto antes de nuevas features)
- Incident response (análisis de implicaciones éticas tras incidentes)

## 6. Incidentes Éticos

### 6.1 Proceso de Respuesta

1. Detección del incidente
2. Evaluación de impacto (datos afectados, usuarios impactados)
3. Contención (revocación de accesos, rotación de credenciales)
4. Comunicación (notificación a usuarios afectados si aplica)
5. Remediación (corrección técnica y de procedimiento)
6. Post-mortem (análisis de causa raíz y prevención)

### 6.2 Ejemplos de Incidentes

| Incidente | Clasificación | Respuesta |
|-----------|--------------|----------|
| Datos sensibles en logs | Medio | Eliminar logs, corregir código, rotar credenciales |
| Acceso no autorizado | Alto | Revocar acceso, auditoría completa, notificación |
| Filtración de credenciales | Crítico | Rotación inmediata, análisis de impacto |
