# Component Restructure Migration

**Date:** January 10, 2026  
**Type:** Route-Based Component Architecture

## Overview

Migrated from a flat/feature-based component structure to a **route-based** structure where components live next to the routes that use them.

---

## Before vs After

```
BEFORE                              AFTER
components/                         components/
├── addTarget/                      ├── auth/
├── auth/                           ├── home/
├── createTraining/                 ├── insights/
├── drills/                         ├── session/
├── home/                           │   ├── activeSession/
├── insights/                       │   ├── creation/
├── session/                        │   ├── form/
├── sessionHistory/                 │   └── history/
├── team/                           ├── shared/
├── training-detail/                │   ├── drills/
├── trainings/                      │   └── ui/
├── ui/                             ├── targets/
├── weapons/                        ├── teams/
├── BaseAvatar.tsx                  ├── training/
├── Header.tsx                      │   └── create/
├── LoadingScreen.tsx               └── weapons/
├── ThemedText.tsx
└── ThemedView.tsx
```

---

## Migration Map

| Old Location | New Location | Reason |
|--------------|--------------|--------|
| `addTarget/` | `targets/` | Matches target-related routes |
| `team/` | `teams/` | Plural naming convention |
| `sessionHistory/` | `session/history/` | Sub-feature of session |
| `training-detail/` | `training/` | Main training components |
| `trainings/` | `training/` | Merged with training-detail |
| `createTraining/` | `training/create/` | Sub-route of training |
| `drills/` | `shared/drills/` | Used by session & training |
| `ui/` | `shared/ui/` | Used across all routes |
| `BaseAvatar.tsx` | `shared/Avatar.tsx` | Used across routes |
| `Header.tsx` | `shared/Header.tsx` | Used across routes |
| `LoadingScreen.tsx` | `shared/LoadingScreen.tsx` | Used across routes |
| `ThemedText.tsx` | `shared/ThemedText.tsx` | Used across routes |
| `ThemedView.tsx` | `shared/ThemedView.tsx` | Used across routes |

---

## Execution Process

### Phase 1: Create Folder Structure
```bash
mkdir -p components/shared/ui
mkdir -p components/shared/drills
mkdir -p components/targets
mkdir -p components/teams
mkdir -p components/training/create
mkdir -p components/session/history
mkdir -p components/session/active
```

### Phase 2.1: Targets Migration (Low Risk)
```bash
# Move files
mv components/addTarget/* components/targets/

# Update imports
sed -i '' 's|@/components/addTarget|@/components/targets|g' \
  app/(protected)/addTarget.tsx \
  app/(protected)/tacticalTarget.tsx \
  app/(protected)/scanTarget.tsx

# Remove old folder
rmdir components/addTarget
```

**Files affected:** 3

### Phase 2.2: Teams Migration (Low Risk)
```bash
# Move files
mv components/team/* components/teams/

# Update imports
sed -i '' 's|@/components/team/|@/components/teams/|g' \
  app/(protected)/(tabs)/team.tsx

# Remove old folder
rmdir components/team
```

**Files affected:** 1

### Phase 2.3: Session History Migration (Medium Risk)
```bash
# Move files
mv components/sessionHistory/* components/session/history/

# Update imports
sed -i '' 's|@/components/sessionHistory|@/components/session/history|g' \
  app/(protected)/sessionHistory.tsx

# Remove old folder
rmdir components/sessionHistory
```

**Files affected:** 1

### Phase 2.4: Training Migration (High Risk - Many Files)
```bash
# Copy training-detail to training
cp -r components/training-detail/* components/training/

# Copy trainings files (except index.ts to avoid conflict)
cp components/trainings/trainings.* components/training/
cp components/trainings/useTrainings.ts components/training/

# Copy createTraining to training/create
cp -r components/createTraining/* components/training/create/

# Update imports
sed -i '' 's|@/components/training-detail|@/components/training|g' <files>
sed -i '' 's|@/components/trainings|@/components/training|g' <files>
sed -i '' 's|@/components/createTraining|@/components/training/create|g' <files>

# Remove old folders
rm -rf components/training-detail components/trainings components/createTraining
```

**Files affected:** 3

### Phase 2.5: Shared Components Migration (Bulk)
```bash
# Move UI components
cp -r components/ui/* components/shared/ui/

# Move drills
cp -r components/drills/* components/shared/drills/

# Move standalone files
cp components/BaseAvatar.tsx components/shared/Avatar.tsx
cp components/Header.tsx components/shared/
cp components/LoadingScreen.tsx components/shared/
cp components/ThemedText.tsx components/shared/
cp components/ThemedView.tsx components/shared/

# Update imports (bulk replace)
sed -i '' 's|@/components/ui/|@/components/shared/ui/|g' <files>
sed -i '' 's|@/components/drills|@/components/shared/drills|g' <files>
sed -i '' 's|@/components/BaseAvatar|@/components/shared/Avatar|g' <files>
sed -i '' 's|@/components/Header|@/components/shared/Header|g' <files>
sed -i '' 's|@/components/LoadingScreen|@/components/shared/LoadingScreen|g' <files>
sed -i '' 's|@/components/ThemedText|@/components/shared/ThemedText|g' <files>
sed -i '' 's|@/components/ThemedView|@/components/shared/ThemedView|g' <files>

# Remove old files and folders
rm -rf components/ui components/drills
rm -f components/BaseAvatar.tsx components/Header.tsx \
      components/LoadingScreen.tsx components/ThemedText.tsx \
      components/ThemedView.tsx
```

**Files affected:** ~15

### Phase 3: Cleanup
```bash
# Create barrel files for new folders
# components/teams/index.ts
# components/shared/index.ts

# Remove empty folders
rmdir components/garmin components/session/active

# Verify no linter errors
npx tsc --noEmit
```

---

## Rules Applied

| Rule | Description |
|------|-------------|
| **1** | Component folder name = route name |
| **2** | If component used in 1 route → put in that route's folder |
| **3** | If component used in 2+ routes → put in `shared/` |
| **4** | Sub-routes get sub-folders |

---

## Import Path Changes Summary

```typescript
// OLD → NEW

// Targets
'@/components/addTarget' → '@/components/targets'

// Teams
'@/components/team/' → '@/components/teams/'

// Session History
'@/components/sessionHistory' → '@/components/session/history'

// Training
'@/components/training-detail' → '@/components/training'
'@/components/trainings' → '@/components/training'
'@/components/createTraining' → '@/components/training/create'

// Shared
'@/components/ui/' → '@/components/shared/ui/'
'@/components/drills' → '@/components/shared/drills'
'@/components/BaseAvatar' → '@/components/shared/Avatar'
'@/components/Header' → '@/components/shared/Header'
'@/components/LoadingScreen' → '@/components/shared/LoadingScreen'
'@/components/ThemedText' → '@/components/shared/ThemedText'
'@/components/ThemedView' → '@/components/shared/ThemedView'
```

---

## Verification

```bash
# Check for broken imports
grep -r "@/components/addTarget\|@/components/team/\|@/components/sessionHistory" .

# TypeScript check
npx tsc --noEmit

# Linter check
npm run lint
```

---

## Benefits

1. **Easy to find** – Looking for session components? Check `components/session/`
2. **Easy to delete** – Remove a route? Delete matching component folder
3. **Clear ownership** – Every component has one home
4. **Natural code splitting** – Route-based chunks
5. **Scalable** – New routes get new folders automatically
