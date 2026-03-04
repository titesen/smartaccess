# ADR-001: Token Encryption con ChaCha20-Poly1305

## Status

**Accepted** — Implementado en `backend/src/application/services/auth.service.ts`

## Contexto

El estándar de la industria para autenticación stateless son los JSON Web Tokens (JWT). Sin embargo, JWT tiene una limitación de diseño fundamental: el payload se codifica en Base64, **no se encripta**. Cualquier intermediario puede decodificar el payload y leer el contenido (rol del usuario, email, ID) sin necesidad de la clave secreta.

En un sistema IoT con datos potencialmente sensibles y múltiples niveles de acceso (ADMIN, OPERATOR, VIEWER), la exposición del payload representa un vector de información para atacantes.

### Alternativas Consideradas

| Opción | Pros | Contras |
|--------|------|---------|
| JWT estándar (HS256) | Amplio soporte, librerías maduras | Payload visible en Base64 |
| JWE (JSON Web Encryption) | Estándar, encripta payload | Complejidad alta, tokens muy largos |
| PASETO v4 | Diseño seguro por defecto | Menos soporte en ecosistema Node.js |
| ChaCha20-Poly1305 custom | Algoritmo rápido, nativo en Node.js | Implementación custom |

## Decisión

Implementar un esquema de token **inspirado en PASETO v4** usando primitivas criptográficas nativas de Node.js:

1. **Derivación de clave**: HKDF (HMAC-based Key Derivation Function) desde un master secret
2. **Encriptación**: ChaCha20-Poly1305 (AEAD — Authenticated Encryption with Associated Data)
3. **Formato**: `version.nonce_hex.ciphertext_hex.tag_hex`

El payload queda **completamente inaccesible** sin la clave maestra. El tag de autenticación garantiza integridad.

## Consecuencias

### Positivas
- Payload confidencial — imposible leer contenido sin la clave
- Autenticación + encriptación en una sola operación (AEAD)
- Sin dependencias externas — usa `node:crypto` nativo
- Rendimiento excelente — ChaCha20 es más rápido que AES en software

### Negativas
- Implementación custom — más riesgo que usar una librería auditada
- No es un estándar abierto — herramientas de debugging JWT no sirven
- Requiere documentación clara para futuros developers

### Deuda Técnica Aceptada
- Si Node.js depreca la API crypto usada, habrá que migrar
- No hay rotación automática de claves (manual via env var)
