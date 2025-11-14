# Reticle

> **Professional sniper training management and performance analytics platform**

Reticle is a comprehensive training management system designed for military and law enforcement sniper units. Built with React Native and Expo, it enables seamless capture of training sessions, advanced performance analytics, and organizational training oversight—all while supporting offline-first operations in field environments.

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Authentication](#-authentication)
- [Database](#-database)
- [Documentation](#-documentation)
- [Contributing](#-contributing)
- [License](#-license)

---

## ✨ Features

### Personal Training Management
- **Session Capture**: Record paper target scans and steel target engagements with comprehensive metadata
- **Performance Analytics**: Track hit percentages, grouping metrics, time-to-first-shot, and long-term trends
- **Loadout Management**: Maintain weapon and optics configurations with zeroing history
- **Offline Operation**: Full functionality in field environments with automatic sync

### Organizational Capabilities
- **Hierarchical Structure**: Flexible unit → team → squad organization (any subset supported)
- **Training Planning**: Schedule and manage organizational training events
- **Commander Analytics**: Scope-based performance insights and readiness reporting
- **Role-Based Access**: Commander, instructor, member, and viewer roles with appropriate permissions
- **Invitation System**: Secure multi-use or single-use invitation codes for member onboarding

### Advanced Analytics
- **AI-Powered Insights**: Identify weaknesses and receive training recommendations
- **Performance Dashboards**: Scope-aware KPIs, trends, and comparative analytics
- **Training Mix Analysis**: Position × Range heat maps and role-based breakdowns
- **Export Capabilities**: CSV exports of filtered analytics data

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React Native](https://reactnative.dev/) with [Expo](https://expo.dev/)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (file-based routing)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction) (lightweight stores)
- **Styling**: [NativeWind](https://www.nativewind.dev/) + StyleSheet API
- **UI Components**: [Gluestack UI](https://ui.gluestack.io/)

### Backend
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (email/password + OAuth: Google, Apple)
- **Real-time**: Supabase Realtime (subscriptions for live updates)
- **Storage**: Supabase Storage (target images, attachments)

### External Services
- **Detection API**: FastAPI service for paper target analysis
- **AI Insights**: RAG-based training recommendations (planned)

### Development Tools
- **Language**: TypeScript (strict mode)
- **Linting**: ESLint
- **Code Quality**: CodeRabbit AI reviews
- **Version Control**: Git

---

## 🏗 Architecture

Reticle follows a **clean layered architecture** with strict separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                        Components                            │
│  (UI Presentation - screens, modals, forms)                 │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Stores / Hooks                            │
│  (State Management - Zustand stores, React hooks)           │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
│  (Business Logic - data fetching, transformations)          │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 AuthenticatedClient                          │
│  (Automatic JWT token injection)                            │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Supabase Client                            │
│  (Database queries + Row Level Security)                    │
└─────────────────────────────────────────────────────────────┘
```

### Core Principles

1. **Services Handle ALL Database Operations**: Components never touch the database directly
2. **Automatic Token Injection**: Services use `AuthenticatedClient.getClient()` for seamless auth
3. **Context-Based Filtering**: Personal vs organizational data separated by context (orgId)
4. **RLS Enforcement**: All permissions enforced at database level via PostgreSQL policies
5. **Offline First**: Local-first architecture with background sync

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and npm
- **Expo CLI**: `npm install -g expo-cli`
- **iOS Simulator** (macOS) or **Android Studio** (for emulators)
- **Supabase Account**: For database and authentication

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/reticle.git
   cd reticle
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env` file in the root:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_DETECTION_API_URL=your_detection_api_url
   ```

4. **Run database migrations**
   ```bash
   npx supabase db push
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on your device**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

---

## 📁 Project Structure

```
reticle/
├── app/                        # 🚨 Routes only (Expo Router)
│   ├── (auth)/                 # Authentication routes
│   │   ├── sign-in.tsx
│   │   ├── callback.tsx
│   │   └── _layout.tsx
│   ├── (protected)/            # Protected routes (require auth)
│   │   ├── (tabs)/             # Tab navigation
│   │   │   ├── index.tsx       # Dashboard
│   │   │   ├── sessions/
│   │   │   ├── trainings/
│   │   │   ├── loadouts.tsx
│   │   │   ├── stats.tsx
│   │   │   └── _layout.tsx
│   │   └── _layout.tsx
│   └── _layout.tsx             # Root layout
│
├── modules/                    # Feature modules (complete features)
│   ├── home/                   # Dashboard screens
│   ├── camera/                 # Target detection
│   ├── stats/                  # Analytics screens
│   ├── manage/                 # Organization management
│   └── ...
│
├── components/                 # Reusable UI components
│   ├── ui/                     # Gluestack UI components
│   ├── organizations/          # Org-specific components
│   ├── BaseBottomSheet.tsx
│   ├── Header.tsx
│   └── ...
│
├── services/                   # 💾 Database access layer
│   ├── sessionService.ts       # Session CRUD operations
│   ├── organizationsService.ts # Org hierarchy operations
│   ├── weaponsService.ts
│   └── ...
│
├── store/                      # 📦 Zustand state management
│   ├── sessionsStore.ts
│   ├── organizationsStore.ts
│   ├── weaponsStore.ts
│   └── ...
│
├── hooks/                      # Custom React hooks
│   ├── ui/                     # UI-specific hooks
│   │   ├── useColors.ts
│   │   └── useThemeColor.ts
│   ├── useIsOrgAdmin.ts
│   └── ...
│
├── contexts/                   # React contexts
│   ├── AuthContext.tsx         # Supabase Auth provider
│   └── ThemeContext.tsx
│
├── lib/                        # Core utilities
│   ├── authenticatedClient.ts  # Auto token injection
│   ├── supabase.ts            # Supabase client config
│   ├── errors.ts              # Custom error classes
│   └── ...
│
├── types/                      # TypeScript definitions
│   ├── database.ts            # Generated from Supabase
│   ├── api.ts
│   └── organizations.ts
│
├── theme/                      # Theme configuration
│   ├── colors.ts              # Light/dark color schemes
│   └── themeProvider.tsx
│
├── supabase/                   # Database & migrations
│   ├── migrations/            # SQL migration files
│   └── config.toml
│
├── assets/                     # Static assets
│   ├── images/
│   ├── fonts/
│   └── brand/
│
├── .cursorrules               # AI coding assistant rules
├── CLAUDE.md                  # Product specifications
├── .github/
│   └── copilot-instructions.md # GitHub Copilot rules
└── .coderabbit.yaml           # CodeRabbit configuration
```

### Key Directories

- **`app/`**: Routes ONLY. Minimal logic. Uses file-based routing via Expo Router.
- **`modules/`**: Complete feature implementations (screens + components + logic).
- **`services/`**: ALL database operations. Uses `AuthenticatedClient` for automatic token injection.
- **`store/`**: Zustand stores for shared state. Calls service layer only.
- **`components/`**: Reusable UI primitives. Colocated styles (no separate `.styles.ts` files).

---

## 💻 Development

### Development Workflow

1. **Start the dev server**
   ```bash
   npm start
   ```

2. **Run on specific platform**
   ```bash
   npm run ios      # iOS simulator
   npm run android  # Android emulator
   npm run web      # Web browser
   ```

3. **Type checking**
   ```bash
   npm run typecheck
   ```

4. **Linting**
   ```bash
   npm run lint
   npm run lint:fix
   ```

### Code Style Guidelines

#### Component Pattern
```typescript
import { useColors } from '@/hooks/ui/useColors'
import { StyleSheet, View, Text } from 'react-native'

interface CardProps {
  title: string
  count: number
}

export function Card({ title, count }: CardProps) {
  const colors = useColors()
  
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.count, { color: colors.textMuted }]}>{count}</Text>
    </View>
  )
}

// ✅ Colocate styles at bottom
const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  count: {
    fontSize: 14,
  },
})
```

#### Service Pattern
```typescript
import { AuthenticatedClient } from '@/lib/authenticatedClient'
import { DatabaseError } from '@/lib/errors'

/**
 * Get sessions for user (personal or org context)
 * @param userId - Current user ID (UUID from auth.users)
 * @param orgId - Optional organization ID for org context
 */
export async function getSessionsService(
  userId: string,
  orgId?: string
): Promise<Session[]> {
  const client = await AuthenticatedClient.getClient()
  
  let query = client.from('session_stats').select('*')
  
  if (orgId) {
    query = query.eq('organization_id', orgId)
  } else {
    query = query.eq('created_by', userId).is('organization_id', null)
  }
  
  const { data, error } = await query
  if (error) throw new DatabaseError(error.message)
  return data || []
}
```

### Adding a New Feature

Follow the **Migration Checklist** in `.cursorrules`:

1. Create database migration (`supabase/migrations/`)
2. Generate TypeScript types (`npm run db:types`)
3. Create service layer (`services/`)
4. Create Zustand store (`store/`)
5. Create components (`modules/` or `components/`)
6. Add routes (`app/`)
7. Test both personal and org contexts

---

## 🔐 Authentication

### Supabase Auth

Reticle uses **Supabase Auth** for authentication with support for:
- Email/password authentication
- OAuth providers (Google, Apple)
- JWT-based session management
- Automatic token refresh

### Usage in Components

```typescript
import { useAuth } from '@/contexts/AuthContext'

export function MyComponent() {
  const { user, session, loading, signIn, signOut } = useAuth()
  
  if (loading) return <LoadingSpinner />
  if (!user) return <SignInPrompt />
  
  const userId = user.id  // UUID from auth.users table
  
  return <Content userId={userId} />
}
```

### Authentication Flow

```
User → Sign In/Sign Up
  ↓
Supabase Auth (JWT token issued)
  ↓
AuthContext stores user + session
  ↓
AuthenticatedClient initialized with token provider
  ↓
All service calls auto-inject JWT
  ↓
Database RLS policies enforce permissions
```

---

## 🗄 Database

### Schema Overview

**Core Tables:**
- `users` - User profiles (synced from `auth.users`)
- `organizations` - Hierarchical org structure (unit → team → squad)
- `org_memberships` - User roles within organizations
- `session_stats` - Training session records
- `target_stats` - Target engagement data
- `group_scores` - Paper target grouping metrics
- `weapons` / `weapon_models` - Loadout management
- `sights` / `sight_models` - Optics management
- `trainings` - Organizational training events

### Row Level Security (RLS)

All tables use **PostgreSQL Row Level Security** for permission enforcement:

```sql
-- Example: Users can view their own sessions or org sessions
CREATE POLICY "session_stats_select" ON session_stats FOR SELECT
USING (
  created_by = auth.uid()  -- Personal sessions
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM org_memberships
      WHERE user_id = auth.uid()
      AND org_id = session_stats.organization_id
    )
  )  -- Organization sessions
);
```

### Migrations

```bash
# Create a new migration
npx supabase migration new feature_name

# Apply migrations
npx supabase db push

# Generate TypeScript types
npm run db:types
```
# reticleapp
