# External Integrations

**Analysis Date:** 2026-01-14

## APIs & External Services

**AI/ML Processing:**
- Custom ML API (FastAPI Backend on Render) - Bullet detection
  - SDK/Client: REST API via fetch (`services/detectionService.ts`)
  - Base URL: `EXPO_PUBLIC_DETECT_BASE_URL` env var
  - Endpoints: `/analyze`, `/analyze_document`, `/detect_document`, `/rectify_only`, `/training/submit`
  - Parameters: min_confidence (0.2), clustering_distance (120), enhance_closeup (true)

- Anthropic Claude API (claude-3-haiku-20240307) - AI insights
  - SDK/Client: REST API via fetch (`supabase/functions/generate-insights/index.ts`)
  - Auth: `OPEN_AI_KEY` env var (note: named OpenAI but uses Anthropic)
  - Features: Widget insights, daily tips, chat Q&A about performance

**Weather:**
- OpenWeather API - Training session weather context
  - SDK/Client: REST API via fetch (`services/weather/openWeatherService.ts`)
  - Auth: `EXPO_PUBLIC_OPENWEATHER_API_KEY` env var
  - Features: Current weather by coordinates, metric units

## Data Storage

**Databases:**
- PostgreSQL on Supabase - Primary data store
  - Connection: `EXPO_PUBLIC_SUPABASE_URL` env var
  - Client: @supabase/supabase-js v2.79 (`lib/supabase.ts`)
  - Auth: `EXPO_PUBLIC_SUPABASE_ANON_KEY` (client), Service Role Key (Edge Functions)
  - Tables: sessions, session_targets, paper_target_results, tactical_target_results, trainings, training_drills, teams, team_members, profiles, user_weapons, push_tokens, session_insights, session_features

**Vector Database:**
- Pinecone - Session similarity search
  - SDK/Client: REST API via fetch (`supabase/functions/generate-insights/index.ts`)
  - Auth: `PINECONE_API_KEY` env var
  - Index: `PINECONE_INDEX_HOST` env var
  - Embedding Model: `llama-text-embed-v2`
  - Namespace: `user_{userId}`
  - Metadata: accuracy, grouping, distance, weapon category, drill goal, weather, biometrics

**File Storage:**
- Supabase Storage - User uploads and training data
  - Bucket: `training-corrections` (`services/detectionService.ts`)
  - Folders: `images/` (training data), `targets/` (scanned session targets)
  - Features: Base64 image upload, public URL generation

**Caching:**
- AsyncStorage - Local session persistence
  - Usage: Auth token storage, user preferences (`lib/supabase.ts`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password + OAuth
  - Implementation: @supabase/supabase-js with AsyncStorage (`lib/supabase.ts`, `contexts/AuthContext.tsx`)
  - Token storage: AsyncStorage via @supabase/supabase-js
  - Session management: Auto-refresh JWT enabled
  - Events: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT

**OAuth Integrations:**
- Not currently configured (prepared for social sign-in)

## Monitoring & Observability

**Error Tracking:**
- Sentry - Server and client errors
  - DSN: Via Expo plugins (configured in `app.config.js`)
  - Auth Token: `SENTRY_AUTH_TOKEN` env var
  - Organization: `reticle`
  - Project: `retic`
  - Release tracking: Git commit SHA

**Analytics:**
- Custom instrumentation (`services/_shared/instrumentation.ts`)
  - Features: Training data logging, performance metrics, diagnostics

**Logs:**
- Console logging (development)
- Supabase Edge Function logs (production)

## CI/CD & Deployment

**Hosting:**
- Mobile: EAS Build (Expo Application Services)
  - Project ID: `a6389fa6-2be9-4cf2-803c-58ceab564997`
  - Profiles: development (debug), preview (internal), production
  - OTA Updates: `https://u.expo.dev/a6389fa6-2be9-4cf2-803c-58ceab564997`

- Edge Functions: Supabase Edge Functions (`supabase/functions/`)
  - Functions: `generate-insights`, `send-push-notification`

**CI Pipeline:**
- Not configured (no GitHub Actions workflows)

## Environment Configuration

**Development:**
- Required env vars: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_DETECT_BASE_URL`
- Secrets location: `.env.local` (gitignored)
- App variant: `APP_VARIANT=development` for dev builds

**Preview:**
- App variant: `APP_VARIANT=preview`
- Same backend as production, separate bundle ID

**Production:**
- Secrets management: EAS secrets, Supabase dashboard
- Edge function secrets: Supabase function secrets

## Webhooks & Callbacks

**Incoming:**
- None currently configured

**Outgoing:**
- Supabase Edge Functions
  - `send-push-notification` - Triggered for training events
  - `generate-insights` - Triggered after session completion
  - Events: training_created, training_started, training_completed, team_invite, member_joined

## Wearable Integration

**Garmin Connect IQ:**
- SDK: react-native-garmin-connect 0.3.0 (`services/garminService.ts`)
- App ID: `5af8baf3-c28a-4998-9353-8c75aa77a0c8`
- Features: Bidirectional messaging, biometrics (heart rate, stress), session data sync
- Message Types: `SESSION_START`, `SESSION_END`, `SYNC_DRILL`, `TIMELINE_CHUNK`, `ACK`
- Data: shots fired, duration, distance, steadiness metrics, shot biometrics
- State: Managed in `store/garminStore.tsx`

## Push Notifications

**Push Provider:**
- Expo Push Service (`supabase/functions/send-push-notification/index.ts`)
  - Endpoint: `https://exp.host/--/api/v2/push/send`
  - Channels: `trainings`, `teams`, `default`
  - Token storage: `push_tokens` table in Supabase
  - Client setup: `hooks/usePushNotifications.ts`

## Database Procedures

**Supabase RPC:**
- `refresh_user_baseline` - Updates condition-specific baseline metrics (`supabase/functions/generate-insights/index.ts`)
- `auto_close_training_if_complete` - Automatic training completion (`services/session/mutations.ts`)

---

*Integration audit: 2026-01-14*
*Update when adding/removing external services*
