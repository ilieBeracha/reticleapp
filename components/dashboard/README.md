# Dashboard Components

Production-quality, modular dashboard components for the personal/organization view.

## Components

### `DashboardHeader.tsx`
Main page title with optional count badge.
- Props: `title`, `count?`

### `PersonalStatsCard.tsx`
Card showing personal statistics (sessions, shots, hit rate).
- Props: `sessions`, `shots`, `hitRate`
- Used in: Personal view (no organizations)

### `StatsRow.tsx`
Horizontal row of 3 stats (sessions, hit rate, grouping).
- Props: `stats` (DashboardStats)
- Used in: Organization view

### `StatItem.tsx`
Individual stat display (value + label).
- Props: `value`, `label`
- Used by: StatsRow

### `ConnectOrgBanner.tsx`
Call-to-action banner for users not connected to any organization.
- Props: `onCreatePress`, `onJoinPress`
- Features: Two buttons (Create Organization / Join with Code)

### `SectionHeader.tsx`
Section title with optional "See more" link.
- Props: `title`, `showSeeMore?`, `onSeeMorePress?`

### `OrganizationCard.tsx`
Colored card showing organization info.
- Props: `organization`, `onPress`
- Colors: mint, yellow, blue, purple

### `ActivityCard.tsx`
Card showing recent activity with progress circle.
- Props: `activity`
- Features: Progress percentage, title, metadata

## Usage

### Personal View (No Organizations)
```tsx
<PersonalStatsCard sessions={47} shots={1834} hitRate={94} />
<ConnectOrgBanner onCreatePress={...} onJoinPress={...} />
```

### Organization View (Has Organizations)
```tsx
<StatsRow stats={stats} />
<OrganizationCard organization={org} onPress={...} />
<ActivityCard activity={activity} />
```

## Flow

1. Check if user has organizations (`organizations.length > 0`)
2. If YES → Show organization view with team stats
3. If NO → Show personal view with connect banner

## Next Steps

- Implement `handleCreateOrg()` - Navigate to create organization flow
- Implement `handleJoinOrg()` - Navigate to join with code modal
- Replace mock data in `services/dashboardService.ts` with real API calls

