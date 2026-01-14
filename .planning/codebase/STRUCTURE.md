# Codebase Structure

**Analysis Date:** 2026-01-14

## Directory Layout

```
reticle2/
├── app/                    # Expo Router pages (file-based routing)
│   ├── _layout.tsx        # Root layout: providers, Sentry, fonts
│   ├── index.tsx          # Auth check redirect
│   ├── auth/              # Authentication flows
│   └── (protected)/       # Protected routes (authenticated users)
│       ├── _layout.tsx    # Stack navigation with modals
│       └── (tabs)/        # Tab navigation group
├── components/            # Reusable React components (~60 files)
│   ├── shared/           # Shared: Avatar, Header, LoadingScreen
│   ├── ui/               # Gluestack UI wrapper components
│   ├── home/             # Home page components
│   ├── training/         # Training-related components
│   ├── session/          # Session-related components
│   ├── teams/            # Team UI components
│   ├── weapons/          # Weapon detail components
│   ├── targets/          # Target scanning components
│   ├── insights/         # Analytics components
│   ├── standards/        # Standards management
│   └── auth/             # Auth form components
├── services/              # Business logic (42 files)
│   ├── session/          # Session operations
│   ├── drills/           # Drill operations
│   ├── insights/         # Analytics services
│   ├── standards/        # Performance standards
│   ├── weather/          # Weather API integration
│   ├── garmin/           # Garmin-specific operations
│   └── _shared/          # Shared utilities
├── store/                 # Zustand state management (5 stores)
│   └── _shared/          # AsyncState pattern
├── contexts/              # React Context providers (3 contexts)
├── hooks/                 # Custom React hooks (11 hooks)
│   ├── ui/               # UI hooks (colors, theme)
│   └── team/             # Team hooks
├── types/                 # TypeScript definitions
├── lib/                   # Core libraries
├── utils/                 # Utility functions
├── helpers/               # Helper functions
│   └── team/             # Team-specific helpers
├── constants/             # App constants
├── theme/                 # Theming
├── assets/                # Static assets
│   ├── fonts/            # Custom fonts
│   ├── images/           # App images
│   └── brand/            # Brand assets
├── supabase/              # Backend configuration
│   ├── migrations/       # Database migrations
│   └── functions/        # Edge functions
├── android/               # Android native code
├── ios/                   # iOS native code
├── modules/               # Native modules
├── plugins/               # Expo plugins
└── docs/                  # Documentation
```

## Directory Purposes

**app/**
- Purpose: Expo Router pages (file-based routing)
- Contains: Screen components, layouts, navigation groups
- Key files: `_layout.tsx` (root), `index.tsx` (entry redirect)
- Subdirectories: `auth/` (sign-in), `(protected)/` (authenticated routes), `(tabs)/` (tab navigation)

**components/**
- Purpose: Reusable UI components
- Contains: Domain-specific components organized by feature
- Key files: `shared/Avatar.tsx`, `shared/Header.tsx`, `shared/LoadingScreen.tsx`
- Subdirectories: Feature folders (home, training, session, teams, etc.)

**services/**
- Purpose: Business logic and data operations
- Contains: Service modules with Supabase operations
- Key files: `teamService.ts`, `sessionService.ts`, `trainingService.ts`, `detectionService.ts`, `garminService.ts`
- Subdirectories: `session/` (queries, mutations, targets, timeline), `drills/`, `insights/`, `standards/`, `weather/`, `garmin/`

**store/**
- Purpose: Zustand state management
- Contains: Domain stores with async state pattern
- Key files: `teamStore.tsx`, `sessionStore.tsx`, `detectionStore.tsx`, `garminStore.tsx`, `trainingStore.tsx`
- Subdirectories: `_shared/` (asyncState.ts)

**contexts/**
- Purpose: React Context providers for global state
- Contains: Auth, Theme, Modal contexts
- Key files: `AuthContext.tsx`, `ThemeContext.tsx`, `ModalContext.tsx`

**hooks/**
- Purpose: Custom React hooks
- Contains: Reusable hook logic
- Key files: `useAppContext.ts`, `useNotifications.ts`, `usePushNotifications.ts`, `usePermissions.ts`
- Subdirectories: `ui/` (useColors, useThemeColor), `team/` (useCreateTeamForm)

**types/**
- Purpose: TypeScript type definitions
- Contains: Shared types and interfaces
- Key files: `api.ts` (API types), `workspace.ts` (team types), `drillTypes.ts` (drill types)

**lib/**
- Purpose: Core library configurations
- Contains: Supabase client, error classes
- Key files: `supabase.ts`, `errors.ts`

**constants/**
- Purpose: Application constants
- Contains: Drill definitions, weapon categories, session defaults
- Key files: `categoryDrills.ts` (61KB), `standardDrills.ts`, `weaponCategories.ts` (16KB), `drill.ts`, `session.ts`, `Colors.ts`

**supabase/**
- Purpose: Supabase backend configuration
- Contains: Migrations and Edge Functions
- Key files: `functions/generate-insights/index.ts`, `functions/send-push-notification/index.ts`
- Subdirectories: `migrations/` (SQL files), `functions/` (Edge Functions)

## Key File Locations

**Entry Points:**
- `app/_layout.tsx` - Root layout (providers, Sentry, fonts)
- `app/index.tsx` - Auth check redirect
- `app/auth/sign-in.tsx` - Sign in screen
- `app/(protected)/(tabs)/index.tsx` - Home dashboard

**Configuration:**
- `app.config.js` - Expo configuration
- `tsconfig.json` - TypeScript config with `@/*` alias
- `tailwind.config.js` - Tailwind CSS config
- `babel.config.js` - Babel config with NativeWind
- `metro.config.js` - Metro bundler config
- `eas.json` - EAS Build profiles
- `.env.local` - Environment variables (gitignored)

**Core Logic:**
- `lib/supabase.ts` - Supabase client initialization
- `services/teamService.ts` - Team CRUD operations
- `services/session/mutations.ts` - Session lifecycle
- `services/detectionService.ts` - ML bullet detection
- `services/garminService.ts` - Garmin watch integration

**State Management:**
- `store/teamStore.tsx` - Teams, members, active team
- `store/sessionStore.tsx` - Session state
- `store/garminStore.tsx` - Watch data
- `contexts/AuthContext.tsx` - User auth state

**Testing:**
- No test files currently (test framework not configured)

**Documentation:**
- `README.md` - Project overview
- `AGENTS.md` - AI agent context
- `docs/` - Feature documentation (15 files)

## Naming Conventions

**Files:**
- PascalCase.tsx: React components (`Avatar.tsx`, `Header.tsx`)
- camelCase.ts: Services, hooks, utils (`teamService.ts`, `useAppContext.ts`)
- kebab-case.tsx: Route files (`sign-in.tsx`, `activeSession.tsx`)
- UPPER_CASE.md: Important docs (`README.md`, `AGENTS.md`)

**Directories:**
- lowercase: Domain groupings (`services/`, `hooks/`, `store/`)
- (parentheses): Expo Router groups (`(protected)/`, `(tabs)/`)
- Plural: Collections (`components/`, `helpers/`, `constants/`)

**Special Patterns:**
- `index.ts`: Barrel exports (`components/shared/index.ts`)
- `_layout.tsx`: Expo Router layouts
- `*Service.ts`: Business logic services
- `*Store.tsx`: Zustand stores
- `use*.ts`: React hooks

## Where to Add New Code

**New Feature:**
- Primary code: `services/{feature}Service.ts` (business logic)
- Components: `components/{feature}/` (UI components)
- Store: `store/{feature}Store.tsx` (if needs state)
- Tests: Not currently implemented

**New Component:**
- Implementation: `components/{domain}/{ComponentName}.tsx`
- Types: Inline or `types/{domain}.ts` if shared
- Styles: Use NativeWind classes or `.styles.ts` file for complex components

**New Screen:**
- Route: `app/(protected)/{screen-name}.tsx`
- Modal: Add to `app/(protected)/_layout.tsx` Stack.Screen
- Form Sheet: Use `presentation: 'formSheet'`

**New Service:**
- Implementation: `services/{serviceName}.ts`
- Sub-operations: `services/{domain}/{operation}.ts`
- Follow pattern: Export async functions, use `lib/supabase.ts`

**New Hook:**
- Implementation: `hooks/use{HookName}.ts`
- Domain-specific: `hooks/{domain}/use{HookName}.ts`

**Utilities:**
- Shared helpers: `utils/{name}.ts` (pure functions)
- Domain helpers: `helpers/{domain}/{name}.ts`

## Special Directories

**supabase/functions/**
- Purpose: Supabase Edge Functions (serverless)
- Source: Deployed via Supabase CLI
- Committed: Yes (source of truth)

**android/ & ios/**
- Purpose: Native platform code
- Source: Generated by Expo prebuild, customized
- Committed: Yes (contains native modifications)

**node_modules/**
- Purpose: Dependencies
- Source: Installed via npm
- Committed: No (.gitignore)

**.planning/**
- Purpose: Project planning documents
- Source: Created by GSD commands
- Committed: Yes

---

*Structure analysis: 2026-01-14*
*Update when directory structure changes*
