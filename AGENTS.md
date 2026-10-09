# AGENTS.md — Solicitudes de Contratacion AED

Este archivo lo lee **cualquier agente** que trabaje en este repositorio, sin importar
con qué motor corra (OpenCode lee `AGENTS.md`; Claude Code lee `CLAUDE.md` y también
este). Es corto a propósito: solo dice qué leer y en qué orden.

## Orden de lectura obligatorio, antes de tocar un archivo

1. **`plantilla-arquitectura/agentes/AED-REGLAS.md`** — la constitución común de todos
   los proyectos AED. Stack fijo, reglas duras de backend y frontend, y **cómo se
   trabaja** (verificación obligatoria, fixtures, datos reales, documentación, git).
   Se lee entera. No es larga.
2. **`plantilla-arquitectura/agentes/roles/<tu-rol>.md`** — tu recorte: qué posees, qué
   no tocas, tus trampas conocidas, tu checklist de entrega. Roles disponibles:
   `backend`, `frontend`, `database`, `reviewer`, `devops`, `tech-writer`.
3. **`CLAUDE.md` de este repositorio** — la historia real de ESTE proyecto: decisiones
   tomadas, bugs ya vividos, quirks portados a propósito, qué está fuera de alcance.
   Manda sobre cualquier suposición tuya.

> Si `plantilla-arquitectura/` no existe en este repo (no está vinculada como submódulo),
> la fuente de verdad es:
> `C:\Users\GabrielEliasValdelam\Desktop\Proyectos AED\Plantilla-Arquitectura-AED\`

## Detalle, solo cuando lo necesites

No leas estos completos "por si acaso" — son ~190 KB entre todos y hay presupuesto de
tokens. Busca la sección que te toca:

- `plantilla-arquitectura/arquitectura/ARQUITECTURA-BACKEND.md`
- `plantilla-arquitectura/arquitectura/ARQUITECTURA-FRONTEND.md`
- `plantilla-arquitectura/diseno/DESIGN.md` + `diseno/tokens.css`
- `plantilla-arquitectura/componentes/` — los archivos que se copian tal cual

## Las cinco que más se rompen

Si no recuerdas nada más de `AED-REGLAS.md`, recuerda esto:

1. **Verifica antes de decir "listo"** — `node --check` / `esbuild --bundle` + `curl`
   real. Y di explícitamente qué **no** probaste.
2. **Copia los componentes de la plantilla, no los reimplementes** desde la descripción.
3. **Fechas**: `DATEONLY` + `zDateOnly()`. Nunca `new Date('YYYY-MM-DD')` antes de
   guardar.
4. **Ningún `max-width`** en una page/card/tabla/formulario.
5. **Nunca commitees sin que el humano lo pida.**

## Comandos de este proyecto

```
# Desde la raiz
npm run dev            # backend (:3021) + frontend Vite (:5193) juntos
npm run install:all    # instala ambos sub-paquetes
npm run db:migrate     # proxea al backend

# Desde backend/
npm run dev            # nodemon src/server.js
npm start              # sin watch: corre db:migrate y arranca (esto usa produccion)
npm run db:migrate     # sequelize-cli, idempotente
npm run db:seed        # SOLO en desarrollo -- produccion nunca corre seeders
```

Requiere un `backend/.env` (copiar de `.env.example`). Todas las rutas de API viven bajo
`/api/*`. No hay suite de tests automatizada: la verificacion es `node --check` /
`esbuild --bundle` + `curl` real contra el servidor corriendo.

