# Diseño: Reemplazar carga de archivos por URLs en Anexos

**Fecha:** 2026-05-20  
**Alcance:** Solo `archivosAnexos` en el flujo de aprobación (estado `CREACION_MINUTA`, rol `CONTRATOS`)  
**Fuera de alcance:** Archivos del formulario inicial (Cuadro Comparativo, Cotización, etc.)

---

## Problema

El panel de "Anexos de la solicitud" en `solicitudActions.tsx` actualmente permite subir archivos al servidor (`/api/upload` → `public/uploads/`). El equipo prefiere trabajar con documentos ya almacenados en OneDrive, Google Drive o SharePoint, por lo que la carga directa de archivos es innecesaria y agrega fricción.

---

## Diseño

### Interfaz (panel de acción)

El área de carga se reemplaza por un formulario de dos campos:
- **Nombre del documento** (texto, obligatorio) — el usuario escribe un nombre descriptivo legible
- **URL del enlace** (texto, obligatorio) — debe comenzar con `http://` o `https://`
- Botón **"Agregar enlace"**

Los enlaces agregados se muestran como **chips** con:
- Icono de plataforma detectado automáticamente
- Nombre descriptivo (bold)
- Plataforma en texto pequeño (ej. "SharePoint")
- Flecha ↗ que abre el link en nueva pestaña
- Botón ✕ para eliminar

### Detección de plataforma (client-side, desde la URL)

| Patrón en URL | Plataforma | Icono | Color chip |
|---|---|---|---|
| `sharepoint.com`, `1drv.ms`, `onedrive.live.com` | SharePoint | 📘 | Azul |
| `drive.google.com`, `docs.google.com` | Google Drive | 📗 | Verde |
| `dropbox.com` | Dropbox | 📦 | Gris |
| Cualquier otra URL | Enlace | 🔗 | Gris neutro |

### Vista en detalles de la solicitud

Se agrega una sección **"Documentos Anexos"** en `page.tsx`, visible para todos los roles en todos los estados, siempre que `archivosAnexos` tenga al menos un elemento. Cada entrada muestra:
- Icono de plataforma + nombre (clickable, abre en nueva pestaña)
- Plataforma detectada en texto secundario

---

## Estructura de datos

Sin cambios — `archivosAnexos` sigue siendo `JSON.stringify(Anexo[])` donde:

```typescript
interface Anexo {
  url: string;    // URL completa ingresada por el usuario
  nombre: string; // Nombre descriptivo ingresado por el usuario
}
```

---

## Cambios por archivo

### `src/features/solicitudes/components/solicitudActions.tsx`

- **Eliminar:** estado `uploadingAnexo`, función `handleAnexoUpload`, `<input type="file">`, import de `Upload`
- **Agregar:** estados `urlInput: string`, `nombreInput: string`
- **Agregar:** función `detectPlatform(url): { label, icon, chipClass }` — pure utility
- **Agregar:** función `handleAddUrl()` — valida nombre y URL, hace PATCH, actualiza chips
- **Modificar:** UI del bloque `showAnexosUpload` — chips existentes + formulario URL/nombre
- **Mantener:** función `removeAnexo`, lógica de PATCH a `/api/solicitudes/[id]`

### `src/app/(app)/solicitudes/[id]/page.tsx`

- **Agregar:** sección "Documentos Anexos" — lista de links clickables con icono de plataforma
- **Condición:** solo renderiza si `solicitud.archivosAnexos` tiene al menos un elemento
- **Función:** `detectPlatform` (misma lógica, puede duplicarse o extraerse a utils)

### `src/lib/utils.ts` (opcional)

- Si `detectPlatform` se necesita en más de un componente, exportarla desde aquí. Por ahora, puede vivir localmente en cada componente.

---

## Validaciones

- Nombre: requerido, no vacío
- URL: requerida, debe empezar con `http://` o `https://`
- Errores mostrados inline (debajo del campo) antes de hacer PATCH

---

## Lo que NO cambia

- La API `/api/solicitudes/[id]` (PATCH con `archivosAnexos`) — sin cambios
- La lógica de `canAvanzarContratos` (sigue requiriendo `anexos.length > 0`)
- El endpoint `/api/upload` — sigue en uso para el formulario inicial
- La estructura JSON del campo `archivosAnexos` en la DB
