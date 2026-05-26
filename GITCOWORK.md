---
name: gitcowork
trigger: "sync con socio, gitcowork, qué hizo mi socio, antes de rebase, conflictos git, workflow equipo, empezar tarea nueva, sincronizar con partner"
complexity: media
tools: [Bash, Read, Write]
tags: [workflow, git, colaboracion, equipo, rebase, pr, coordinacion]
updated: 2026-05-26
---

# Skill: GitCoWork — Workflow colaborativo con socio/equipo

## Problemas que resuelve

- Mergear a ciegas y romper el trabajo del socio (o que él rompa el tuyo)
- No saber qué está tocando el socio antes de empezar a codear
- Rebase que explota a mitad sin saber cómo salir
- PRs sin contexto que el reviewer no entiende
- Funciona igual si el socio usa Gemini, Cursor, Copilot, o cualquier IA

---

## Cómo invocar

```
"gitcowork: voy a tocar [archivos o área]"
```

Ejemplo: `"gitcowork: voy a tocar TramitarModal y ServiciosIndex"`

---

## Fase 0 — Setup inicial del proyecto (solo una vez)

Crear `WORKING_ON.md` en la raíz del repo y commitear:

```markdown
# WORKING_ON

_Actualizar al empezar y al terminar cada tarea._

## [Tu nombre]
<!-- vacío -->

## [Nombre socio]
<!-- vacío -->
```

**Convención de branches:**
```
feature/[area]-[descripcion]
fix/[area]-[descripcion]
```

**Convención de commits (ambos la siguen):**
```
feat(area): qué añadí
fix(area): qué reparé
refactor(area): qué restructuré
chore: tareas de mantenimiento

Ejemplos:
feat(auth): añadir middleware de protección de rutas
feat(ui): ServiciosIndex con lista vertical + modal centrado
```

---

## ENTRADA — Al invocar la skill

### 1. Leer estado actual del socio

```bash
cat WORKING_ON.md
git fetch origin
git log origin/main --oneline -15
```

→ Ver qué archivos tiene declarados el socio + sus últimos commits.
→ Si hay solapamiento con lo que tú vas a tocar: **avisar antes de continuar**.

### 2. Declarar lo que vas a tocar

Añadir bajo el nombre propio en `WORKING_ON.md`:

```markdown
## [Tu nombre]
- src/components/TramitarModal.tsx
- src/components/ServiciosIndex.tsx
- (descripción breve de la tarea)
```

Commitear:
```bash
git add WORKING_ON.md
git commit -m "chore: WORKING_ON — empezando [descripción de la tarea]"
```

---

## ANÁLISIS — Qué hizo el socio

### 3. Identificar archivos que divergen

```bash
git diff <mi-rama>...origin/main --name-only
```

Separar mentalmente:
- **Archivos que tú también tocas** → candidatos a conflicto real
- **Archivos que solo tocó el socio** → cambios nuevos, probablemente compatibles

### 4. Analizar cada archivo en conflicto

```bash
git diff <mi-rama> origin/main -- <archivo>
```

**Árbol de decisión:**

| Tipo | Qué pasó | Acción |
|---|---|---|
| A | Añadió lógica en archivo que tú también tocaste | Combinar ambos bloques |
| B | Refactorizó algo que tú usas (renombró, cambió props) | Entender su nueva API, adaptar el tuyo |
| C | Misma función, lógica distinta | Leer intención de ambos antes de decidir |
| D | Solo formato o lint | `git checkout --theirs <archivo>` |
| E | Solo tú tocaste ese archivo | Sin conflicto, continuar |

### 5. Revisar side effects (siempre, aunque no estén en conflicto)

```bash
git diff <mi-rama> origin/main -- package.json         # → npm install
git diff <mi-rama> origin/main -- prisma/schema.prisma # → prisma generate
git diff <mi-rama> origin/main -- src/middleware.ts    # → rutas protegidas nuevas
git diff <mi-rama> origin/main -- .env.example         # → variables nuevas en .env local
```

---

## REBASE — Sincronizar sin romper

### 6. Ejecutar el rebase

```bash
git checkout main && git pull origin main
npm install                    # si package.json cambió
npx prisma generate            # si schema.prisma cambió
git checkout <mi-rama>
git rebase main
```

### 7. Resolver conflictos durante el rebase

```bash
git status                     # ver archivos en conflicto

# Para cada archivo: editar manualmente combinando ambas versiones, luego:
git add <archivo-resuelto>

# Cuando todos resueltos:
git rebase --continue

# Si se rompe y no sabes cómo salir (vuelve al punto exacto de antes):
git rebase --abort
```

**Comandos de decisión rápida:**
```bash
git checkout --theirs <archivo>   # acepta la versión del socio completa (tipo D)
git checkout --ours <archivo>     # acepta tu versión completa
```

### 8. Verificar que no rompiste nada

```bash
npm run build      # o tsc --noEmit
npm run dev        # smoke test visual rápido
```

---

## CIERRE — PR y coordinación

### 9. Push y PR

```bash
git push origin <mi-rama>
```

**Descripción del PR:**
```markdown
## Qué añade esta rama
- [punto 1]
- [punto 2]

## Archivos principales tocados
- src/components/X → [por qué]

## Cómo probar
1. npm run dev
2. Ir a /ruta y hacer X
```

**Checklist antes de pedir review:**
- [ ] `npm run build` sin errores
- [ ] Sin `console.log` sueltos
- [ ] Sin credenciales ni `.env` commiteados
- [ ] Probado en local el flujo completo

### 10. Actualizar WORKING_ON.md al terminar

Vaciar tus entradas y commitear:
```bash
git add WORKING_ON.md
git commit -m "chore: WORKING_ON — completado [descripción de lo que se hizo]"
```

→ El socio ve que quedaste libre y puede tomar esos archivos si los necesita.
