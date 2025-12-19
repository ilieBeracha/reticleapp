## helpers/

Pure, reusable functions (no React, no Zustand, no Supabase).

### Rules

- **Must be pure**: deterministic in/out, no side effects.
- **No React**: don’t import `react` or hooks.
- **No Supabase**: DB/network belongs in `services/`.
- **Prefer small files** grouped by domain:
  - `helpers/team/*`
  - `helpers/session/*`
  - `helpers/training/*`
  - `helpers/ui/*`

### Examples

- Validation: `validateTeamName(name)`
- Normalization: `normalizeSquadName(name)`
- Calculations: `computeAccuracyPct(hits, shots)`









