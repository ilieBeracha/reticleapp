# Session Stats Setup with Clerk Authentication

## Overview

The `session_stats` table is designed to track shooting session statistics while using **Clerk for authentication** instead of Supabase's built-in auth. Supabase handles data storage with Row Level Security (RLS) policies that validate Clerk JWT tokens.

## Database Schema

### Table: `session_stats`

```sql
CREATE TABLE session_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id UUID REFERENCES trainings(id) ON DELETE SET NULL, -- NULL = personal/standalone
  organization_id TEXT, -- Clerk org id (org_*), nullable for personal sessions
  name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  range_location TEXT,
  weather JSONB, -- Wind, temp, visibility, pressure, etc.
  day_period day_period, -- 'day' or 'night'
  is_squad BOOLEAN DEFAULT FALSE,
  comments TEXT,
  created_by TEXT NOT NULL, -- Clerk user id (user_*)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Row Level Security (RLS)

All queries to `session_stats` are protected by RLS policies that validate Clerk JWT tokens:

- **Read**: Users can read their own stats OR stats from organizations they belong to
- **Insert**: Users can only insert stats where `created_by` matches their Clerk user ID
- **Update**: Users can only update their own stats
- **Delete**: Users can only delete their own stats

## TypeScript Types

```typescript
// Weather conditions (JSONB)
interface WeatherConditions {
  wind_mps?: number;
  wind_direction?: string;
  temp_c?: number;
  pressure_hpa?: number;
  visibility?: string;
  humidity?: number;
  [key: string]: any;
}

// Session stats record
interface SessionStats {
  id: string;
  training_id?: string | null;
  organization_id?: string | null;
  name?: string | null;
  started_at: string;
  ended_at?: string | null;
  range_location?: string | null;
  weather?: WeatherConditions | null;
  day_period?: DayPeriod | null;
  is_squad: boolean;
  comments?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

## Usage Examples

### 1. Create a New Session Stats Entry

```typescript
import { sessionStatsStore } from '@/store/sessionStatsStore';
import { useAuth } from '@clerk/clerk-expo';

function MyComponent() {
  const { getToken, userId } = useAuth();
  const createSessionStats = sessionStatsStore(state => state.createSessionStats);

  const handleCreateSession = async () => {
    const token = await getToken();
    if (!token || !userId) return;

    const newSession = await createSessionStats(
      token,
      {
        name: 'Morning Training',
        range_location: 'Outdoor Range',
        day_period: 'day',
        is_squad: false,
        weather: {
          wind_mps: 5,
          wind_direction: 'N',
          temp_c: 22,
          pressure_hpa: 1013,
        },
      },
      userId,
      orgId // Current organization ID or null for personal
    );
  };
}
```

### 2. Fetch Session Stats

```typescript
import { sessionStatsStore } from '@/store/sessionStatsStore';
import { useAuth } from '@clerk/clerk-expo';

function SessionsList() {
  const { getToken, userId } = useAuth();
  const { sessionStats, loading, fetchSessionStats } = sessionStatsStore();

  useEffect(() => {
    const loadSessions = async () => {
      const token = await getToken();
      if (!token || !userId) return;

      await fetchSessionStats(token, userId, orgId);
    };

    loadSessions();
  }, [orgId]);

  return (
    <View>
      {sessionStats.map((stats) => (
        <View key={stats.id}>
          <Text>{stats.name}</Text>
          <Text>Started: {stats.started_at}</Text>
          <Text>Weather: {JSON.stringify(stats.weather)}</Text>
        </View>
      ))}
    </View>
  );
}
```

### 3. Start/End a Session

```typescript
const { getToken } = useAuth();
const { startSession, endSession } = sessionStatsStore();

// Start session
const handleStart = async () => {
  const token = await getToken();
  if (!token) return;
  
  await startSession(token, sessionStatsId);
};

// End session
const handleEnd = async () => {
  const token = await getToken();
  if (!token) return;
  
  await endSession(token, sessionStatsId);
};
```

### 4. Update Session Stats

```typescript
const { getToken } = useAuth();
const { updateSessionStats } = sessionStatsStore();

const handleUpdate = async () => {
  const token = await getToken();
  if (!token) return;

  await updateSessionStats(token, sessionStatsId, {
    weather: {
      wind_mps: 8,
      temp_c: 25,
    },
    comments: 'Updated weather conditions',
  });
};
```

## Important Notes

### Clerk Integration

- All authentication is handled by Clerk, not Supabase
- Clerk JWT tokens are passed in the `Authorization` header
- The token contains:
  - `sub`: Clerk user ID (`user_*`)
  - `org_id`: Clerk organization ID (`org_*`) when in an org context

### Organization vs Personal Sessions

- **Personal Sessions**: Set `organization_id` to `null` - these are user's personal shooting sessions
- **Organization Sessions**: Set `organization_id` to the Clerk org ID - these are team training sessions

### Weather JSONB Field

The `weather` field is flexible JSONB, allowing you to store any weather-related data:

```typescript
{
  wind_mps: 5,           // Wind speed in m/s
  wind_direction: 'N',   // Wind direction
  temp_c: 22,            // Temperature in Celsius
  pressure_hpa: 1013,    // Atmospheric pressure
  visibility: 'Clear',   // Visibility conditions
  humidity: 65           // Humidity percentage
}
```

You can add any additional fields as needed.

## Running the Migration

Apply the migration to your Supabase database:

```bash
supabase db push
```

Or if using remote Supabase:

```bash
supabase migration up
```

## Clerk JWT Configuration

Make sure your Clerk JWT includes the organization ID in its claims. In your Clerk dashboard:

1. Go to **Sessions** → **Token Templates**
2. Create/Edit a token template
3. Add the `org_id` claim if not already present
4. Ensure the JWT is passed to Supabase with the correct format

The RLS policies expect JWT claims accessible via:
- `auth.jwt()->>'sub'` for user ID
- `auth.jwt()->>'org_id'` for organization ID


