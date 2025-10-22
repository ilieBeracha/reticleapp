# Project Architecture Overview

This structure is built for Expo + React Native using TypeScript, Expo Router, Zustand, and modular feature separation. The goal: scalability, maintainability, and clarity.

## 1. app/ — Screen Routing Layer

The app directory mirrors your app's navigation using Expo Router. Each file here is a route (like Next.js). It's intentionally kept thin — only screen logic and UI composition belong here.

- `index.tsx`: Root screen (/)
- `_layout.tsx`: Global layout — think headers, footers, or providers.
- Subfolders (`auth/`, `chat/`, `settings/`, etc.) represent route namespaces.

**Rule:** Never add logic here. Import from modules.

## 2. modules/ — Feature Modules

Each domain (auth, chat, profile, etc.) is fully self-contained here. This keeps logic, UI, and state close together. Every module should be plug-and-play.

Common internal folders:

- `components/`: Feature-specific UI elements (e.g., LoginForm, MessageBubble)
- `hooks/`: Custom React hooks for local business logic (useChat, useProfile)
- `services/`: API or backend logic for this module
- `store/`: Zustand or local state management for the module
- `utils/` or `validation/`: Helper or schema logic (Zod, formatting, etc.)

Pattern example:

```
modules/
└── chat/
    ├── components/
    ├── hooks/
    ├── services/
    ├── store/
    └── utils/
```

Each module is autonomous — meaning you can drop it into another app with minimal wiring.

## 3. components/ — Global Reusable Components

These are shared UI primitives, not tied to a feature. Buttons, Inputs, Loaders, Modals, and other universal UI elements live here. Keep them dumb and theme-aware — no business logic.

## 4. hooks/ — Global Hooks

Cross-cutting React hooks used by multiple modules. Examples include:

- `useTheme` — Manage light/dark mode
- `useNetwork` — Online/offline detection
- `useNotifications` — Push notification registration

## 5. store/ — Global State (Zustand)

Persistent app-wide stores live here:

- `useThemeStore` — Current theme and appearance
- `useUserStore` — Logged-in user and session info

Each feature manages its own local state inside its module. Only truly global concerns belong here.

## 6. services/ — API & Integration Layer

All backend or SDK calls belong here:

- `apiClient.ts`: Axios setup, interceptors, and base URL config.
- `notificationService.ts`: Push or in-app notification APIs.
- `uploadService.ts`: File/image upload handling.

**Rule:** Never call `fetch()` or `axios` from components or hooks directly.

## 7. utils/ — Utility Functions

Small pure functions used throughout the project:

- `formatDate.ts`
- `validateEmail.ts`
- `navigation.ts`
- `fileHelpers.ts`

No side effects, no API calls. Think of this as your functional Swiss army knife.

## 8. localization/ — Multi-Language Setup

Language files for i18n.

- `en.json`, `es.json`, etc.
- `index.ts` exports the initialized i18n instance or translator hook.

Keep keys flat and consistent across languages.

## 9. env/ — Environment Configuration

Each `.env` file corresponds to a specific build target:

- `.env.development`
- `.env.staging`
- `.env.production`

These integrate with Expo Config Plugins and expo-constants for runtime access.

## 10. **tests**/ — Testing Suite

Organized by test type:

- `unit/`: Jest or Vitest unit tests
- `e2e/`: Detox or Playwright end-to-end tests
- `jest.setup.ts`: Custom matchers and setup.

Run via: `npm run test`

## 11. Tooling & Configuration

- `.husky/`: Git hooks for lint, format, or commit checks
- `tailwind.config.js`: Design tokens, colors, spacing, and dark mode
- `app.config.ts`: Expo app metadata and runtime configs
- `tsconfig.json`: TypeScript compiler setup
- `package.json`: Scripts and dependencies
- `README.md`: Project introduction and setup guide

## Philosophy

This architecture follows **Domain-Driven Modularization**:

- The UI lives in `app/`
- The brains live in `modules/`
- The glue (global state, services, and hooks) lives at root level

This ensures:

- Predictable scaling (add new features by cloning a module)
- Clean isolation between features
- Minimal coupling across the app
