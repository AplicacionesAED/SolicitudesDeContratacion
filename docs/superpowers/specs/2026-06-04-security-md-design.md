# Design: SECURITY.md — Instrucciones de Seguridad para Claude Code

**Fecha:** 2026-06-04
**Estado:** Aprobado

## Decisiones de diseño

| Dimensión | Decisión | Razón |
|---|---|---|
| Propósito | Instrucciones para Claude Code | Claude las lee al inicio de cada sesión y las aplica al programar |
| Ubicación | `Proyectos AED/SECURITY.md` | Un solo archivo compartido; los proyectos lo referencian con `@../SECURITY.md` en su CLAUDE.md |
| Alcance | Código + infraestructura | Cubre lo que Claude programa + configuración de deployment |
| Formato | Secciones con reglas + razón breve | Claude aplica mejor las reglas cuando entiende el contexto |

## Proyectos que lo usan

- `Solicitudes-Indirectos/` → Next.js + Prisma
- `Software-Cartera-AED/` → Node.js + Express
- `Bitacora-de-obra-Baia-Kristal/` → Next.js
- `Oliv/landing-vive-oliv/` → Next.js

## Estructura (12 secciones)

1. Autenticación y Autorización
2. Validación de Inputs
3. Protección de Datos en Responses
4. Queries y Base de Datos
5. Manejo de Archivos
6. Headers HTTP de Seguridad
7. Gestión de Secrets
8. CORS
9. Rate Limiting y Brute Force
10. Configuración de Producción
11. Logging Seguro
12. Dependencias

## Implementación requerida

1. Crear `Proyectos AED/SECURITY.md` con las 12 secciones
2. Agregar `@../SECURITY.md` al CLAUDE.md de cada uno de los 4 proyectos
