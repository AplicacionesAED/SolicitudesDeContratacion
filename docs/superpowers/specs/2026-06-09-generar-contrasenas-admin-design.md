# Spec: Generación y exportación de contraseñas — Panel Admin

**Fecha:** 2026-06-09  
**Estado:** Aprobado

---

## Resumen

El admin puede seleccionar usuarios mediante los checkboxes existentes en la tabla de Usuarios y Roles, hacer clic en "Generar contraseñas (N)", y el sistema resetea las contraseñas de los usuarios seleccionados con contraseñas aleatorias seguras. Las contraseñas generadas se acumulan en el estado React (efímeras) y se pueden exportar a Excel antes de salir de la página.

---

## Flujo de usuario

1. Admin abre `/configuracion/usuarios`.
2. Selecciona uno o varios usuarios con los checkboxes (mecanismo ya existente via `selectedIds`).
3. Aparece el botón **"Generar contraseñas (N)"** junto al botón "Asignar Frentes (N)" en el encabezado.
4. Admin hace clic → se generan contraseñas aleatorias en el cliente para cada usuario seleccionado.
5. Se llama `POST /api/users/reset-passwords` con los IDs y contraseñas en texto plano.
6. El servidor hashea cada contraseña y actualiza los registros en la BD.
7. Aparece un **banner de resultados** con el listado de contraseñas generadas y el botón "Exportar Excel".
8. El admin descarga el Excel y/o anota las contraseñas.
9. Puede hacer clic en "Limpiar" para cerrar el banner y resetear el estado.

---

## Generación de contraseñas (cliente)

- Longitud: 10 caracteres.
- Composición garantizada: al menos 1 mayúscula, 1 minúscula, 1 número, 1 símbolo (`!@#$%`).
- Los restantes caracteres son aleatorios de la unión de todos los grupos.
- El resultado se mezcla (shuffle) para evitar patrones posicionales.
- Implementada en el cliente con `Math.random()` — nunca se almacena en texto plano en el servidor.

```
Ejemplo: Kx7#mPq2Lw
```

---

## API: `POST /api/users/reset-passwords`

**Archivo:** `solicitudes-indirectos/src/app/api/users/reset-passwords/route.ts`

**Auth:** Solo `ADMIN`. Devuelve 403 si no.

**Request body:**
```json
{
  "users": [
    { "id": "uuid-1", "password": "Kx7#mPq2Lw" },
    { "id": "uuid-2", "password": "Rt4@nBz9Qv" }
  ]
}
```

**Procesamiento:**
- Validar que `users` es array no vacío.
- Para cada entrada: `bcrypt.hash(password, 12)` → `prisma.user.update({ where: { id }, data: { password: hashed } })`.
- Usar `Promise.all` para paralelizar.

**Response (200):**
```json
{ "success": true, "count": 2 }
```

**Errores:**
- 400 si `users` está vacío o malformado.
- 401 si no hay sesión.
- 403 si no es ADMIN.
- 500 en error interno.

---

## Cambios en la UI (`configuracion/usuarios/page.tsx`)

### Nuevo estado

```typescript
const [generatedPasswords, setGeneratedPasswords] = useState<
  { nombre: string; email: string; password: string }[]
>([]);
const [generatingPasswords, setGeneratingPasswords] = useState(false);
```

### Función `generatePassword()`

Función pura (no async) que genera una contraseña aleatoria de 10 caracteres siguiendo la composición descrita arriba.

### Función `handleGenerarContrasenas()`

1. Filtra `users` para obtener solo los que están en `selectedIds`.
2. Genera una contraseña por usuario.
3. Llama `POST /api/users/reset-passwords` con el array.
4. Si éxito: setea `generatedPasswords` con `[{ nombre, email, password }]` para cada usuario.
5. Si error: muestra `alert()` con el mensaje de error.

### Botón en el encabezado

Aparece junto a "Asignar Frentes (N)" cuando `selectedIds.length > 0`:

```tsx
{selectedIds.length > 0 && (
  <button onClick={handleGenerarContrasenas} disabled={generatingPasswords}>
    <KeyRound size={14} />
    Generar contraseñas ({selectedIds.length})
  </button>
)}
```

Estilo: similar al botón "Asignar Frentes" (fondo `emerald-600`).

### Banner de resultados

Aparece debajo del header cuando `generatedPasswords.length > 0`. Contiene:

- Ícono de advertencia + texto: *"Contraseñas generadas — expórtalas antes de salir, no se pueden recuperar después."*
- Tabla compacta: Nombre | Email | Contraseña (con fuente monospace).
- Botón **"Exportar Excel"** (llama `exportarContrasenas()`).
- Botón **"Limpiar"** (setea `generatedPasswords` a `[]`).

### Función `exportarContrasenas()`

Usa `xlsx` (SheetJS, ya instalado) en el cliente:

1. Crea una hoja con columnas: `Nombre`, `Email`, `Contraseña Temporal`.
2. Genera el archivo en memoria con `XLSX.utils.book_new()` / `XLSX.writeFile()`.
3. Nombre del archivo: `contraseñas-usuarios-YYYY-MM-DD.xlsx`.
4. Descarga automática via `<a>` element temporal o `XLSX.writeFile`.

---

## Seguridad

- Las contraseñas en texto plano **nunca se persisten en la BD** — solo el hash bcrypt.
- El texto plano vive únicamente en memoria React del cliente durante la sesión.
- El endpoint valida sesión ADMIN antes de cualquier operación.
- El Excel se genera client-side — las contraseñas no viajan de vuelta al servidor.
- El banner incluye advertencia explícita sobre la naturaleza efímera de los datos.

---

## Archivos afectados

| Archivo | Cambio |
|---|---|
| `src/app/api/users/reset-passwords/route.ts` | Nuevo endpoint |
| `src/app/(app)/configuracion/usuarios/page.tsx` | Botón, estado, banner, export |

---

## Fuera de alcance

- Envío de contraseñas por email al usuario.
- Forzar cambio de contraseña en el primer login.
- Historial de resets de contraseña.
