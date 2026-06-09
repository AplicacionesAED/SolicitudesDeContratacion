---
target: formulario de solicitud
total_score: 28
p0_count: 0
p1_count: 0
timestamp: 2026-06-05T13-51-24Z
slug: formulario-de-solicitud
---
## Design Health Score: 28/40

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No success state when tercero data saves; fetch failure shows nothing |
| 2 | Match System / Real World | 3 | "Objeto", "SAGRILAFT", "PreBEP" — domain acronyms with no inline gloss |
| 3 | User Control and Freedom | 3 | No confirmation before navigating away with unsaved changes |
| 4 | Consistency and Standards | 3 | Label casing mixes title case and sentence case |
| 5 | Error Prevention | 3 | type=number allows browser spinners, negative values possible via keyboard |
| 6 | Recognition Rather Than Recall | 3 | PreBEP note only appears when Diseño is selected |
| 7 | Flexibility and Efficiency | 2 | No Ctrl+S shortcut; no duplicate-from-previous |
| 8 | Aesthetic and Minimalist Design | 3 | Encabezado section adds visual overhead with 3 read-only fields |
| 9 | Help Users Recover from Errors | 3 | Frentes/terceros fetch failure: empty state, no retry |
| 10 | Help and Documentation | 2 | No tooltips for domain terms; no document checklist on arrival |

P2: No success confirmation when tercero data saves.
P2: No retry on frentes/terceros fetch failure.
P2: type=number on valorFinal allows browser spinners and negative input.
P3: Ctrl+S does not trigger Guardar Borrador.
P3: Label casing inconsistency (title case vs sentence case).
Detector: 2 findings, both confirmed false positives (conditional className, never simultaneously applied).
