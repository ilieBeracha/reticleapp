# Technology Stack

**Analysis Date:** 2026-01-14

## Languages

**Primary:**
- TypeScript 5.9.2 - All application code (`package.json`, `tsconfig.json`)

**Secondary:**
- JavaScript - Build scripts, config files (`app.config.js`, `babel.config.js`, `metro.config.js`)

## Runtime

**Environment:**
- React Native 0.81.5 with Expo 54.0.29 (`package.json`)
- React 19.1.0 (`package.json`)
- Node.js (for development and build tooling)

**Package Manager:**
- npm (no yarn.lock in project root)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Expo 54.0.29 - React Native framework (`package.json`)
- Expo Router 6.0.19 - File-based routing (`package.json`, `app/` directory)
- React Navigation 7.1.8 - Core navigation (`package.json`)

**UI & Styling:**
- NativeWind 4.2.1 - Tailwind CSS for React Native (`package.json`, `nativewind-env.d.ts`)
- Tailwind CSS 3.4.18 - Style definitions (`tailwind.config.js`, `global.css`)
- Gluestack UI 3.0.10 - Component library (`package.json`)

**State Management:**
- Zustand 5.0.8 - Client state management (`package.json`, `store/`)

**Testing:**
- None currently configured (no test framework)

**Build/Dev:**
- Metro - React Native bundler (`metro.config.js`)
- Babel with Expo preset (`babel.config.js`)
- EAS Build - Expo Application Services (`eas.json`)
- Patch Package 8.0.1 - Post-install patches (`package.json`)

## Key Dependencies

**Critical:**
- @supabase/supabase-js ^2.79.0 - Database, auth, storage (`lib/supabase.ts`)
- react-native-garmin-connect 0.3.0 - Garmin watch integration (`services/garminService.ts`)
- expo-camera ~17.0.10 - Target scanning (`package.json`)
- expo-image-picker ~17.0.10 - Image selection (`package.json`)
- @sentry/react-native ~7.2.0 - Error tracking (`app.config.js`, `app/_layout.tsx`)
- date-fns ^4.1.0 - Date utilities (`package.json`)

**UI Components:**
- react-native-gifted-charts 1.4.65 - Data visualization (`package.json`)
- lucide-react-native 0.548.0 - Icons (`package.json`)
- react-native-svg 15.12.1 - SVG rendering (`package.json`)
- expo-linear-gradient 15.0.8 - Gradients (`package.json`)

**Navigation:**
- @react-navigation/drawer ^7.5.0 - Drawer navigation (`package.json`)
- react-native-screens 4.16.0 - Native screen management (`package.json`)
- react-native-gesture-handler 2.28.0 - Gesture support (`package.json`)
- react-native-safe-area-context 5.6.0 - Safe area handling (`package.json`)

**Infrastructure:**
- @react-native-async-storage/async-storage 2.2.0 - Local storage (`lib/supabase.ts`)
- expo-secure-store 15.0.8 - Secure credential storage (`package.json`)
- expo-notifications 0.32.15 - Push notifications (`package.json`)
- expo-updates 29.0.15 - OTA updates (`package.json`)

## Configuration

**Environment:**
- `.env.local` - Environment variables (gitignored)
- Variables prefixed with `EXPO_PUBLIC_` exposed to client
- Key configs: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DETECT_BASE_URL`

**Build:**
- `app.config.js` - Expo configuration (environment-dependent: development/preview/production)
- `tsconfig.json` - TypeScript config with strict mode and `@/*` path alias
- `babel.config.js` - Babel config with NativeWind JSX source
- `tailwind.config.js` - Tailwind CSS configuration
- `metro.config.js` - Metro bundler configuration
- `eas.json` - EAS Build profiles

## Platform Requirements

**Development:**
- macOS/Linux/Windows with Node.js
- Xcode for iOS builds
- Android Studio for Android builds
- EAS CLI >= 16.25.1 for cloud builds

**Production:**
- iOS: Built via EAS, distributed via App Store or TestFlight
- Android: Built via EAS, distributed via Play Store or APK
- EAS Project ID: `a6389fa6-2be9-4cf2-803c-58ceab564997`
- OTA Updates via: `https://u.expo.dev/a6389fa6-2be9-4cf2-803c-58ceab564997`

---

*Stack analysis: 2026-01-14*
*Update after major dependency changes*
