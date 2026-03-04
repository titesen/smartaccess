# ADR-002: Password Hashing con Scrypt Nativo

## Status

**Accepted** — Implementado en `backend/src/application/services/auth.service.ts`

## Contexto

El hashing de contraseñas es un componente crítico de seguridad. Las opciones principales en el ecosistema Node.js son:

| Opción | Pros | Contras |
|--------|------|---------|
| bcrypt (npm) | Estándar de la industria, battle-tested | Dependencia nativa C++ (problemas en Docker/ARM) |
| argon2 (npm) | Ganador de PHC, estado del arte | Dependencia nativa, bindings complejos |
| Scrypt (`node:crypto`) | Nativo, sin dependencias, memory-hard | Menos conocido que bcrypt |
| PBKDF2 (`node:crypto`) | Nativo, simple | No es memory-hard, vulnerable a GPU |

## Decisión

Usar `crypto.scrypt()` nativo de Node.js con los siguientes parámetros:

- **Key length**: 64 bytes
- **Salt**: 32 bytes aleatorios (`crypto.randomBytes`)
- **Cost (N)**: 16384 (default de Node.js)
- **Formato de almacenamiento**: `salt_hex:hash_hex`

## Consecuencias

### Positivas
- **Cero dependencias** — no hay módulos nativos C++ que compilar
- **Memory-hard** — resistente a ataques con GPU/ASIC (a diferencia de PBKDF2)
- **Mantenido por Node.js** — actualizaciones de seguridad incluidas en el runtime
- **Compatible con Distroless** — sin necesidad de headers de compilación

### Negativas
- Menos ecosistema — la mayoría de tutoriales usan bcrypt
- API asíncrona con callbacks — requiere wrappear en Promises
- Parámetros de cost menos documentados que bcrypt rounds

### Nota
La seguridad de Scrypt es equivalente a bcrypt para los parámetros usados. La decisión se basa en minimizar dependencias externas en un proyecto que ya usa contenedores Distroless donde compilar módulos nativos no es posible.
