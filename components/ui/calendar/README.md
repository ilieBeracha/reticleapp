# Calendar Component

Beautiful, professional calendar components with fluid animations and dark mode support.

## Features

✨ **Clean Design** - Matches your app's design system perfectly  
🌓 **Dark Mode** - Automatic theme switching  
📍 **Event Markers** - Multi-dot support for multiple events per day  
🎭 **Animations** - Smooth transitions with React Native Reanimated  
🎨 **Customizable** - Extensive theming and styling options  
📱 **Touch Optimized** - Large touch targets and smooth interactions  

---

## Components

### 1. `WeekCalendar` - 7-Day Week View (Recommended)

Beautiful horizontal week view showing the current week (Monday-Sunday).

```tsx
import { WeekCalendar } from '@/components/ui/WeekCalendar';
import { useState } from 'react';

function MyScreen() {
  const [selectedDate, setSelectedDate] = useState('');

  const markedDates = {
    '2024-11-15': {
      dots: [
        { color: '#5A8473' }, // Green
        { color: '#5A7A8C' }, // Blue
      ],
    },
  };

  return (
    <WeekCalendar
      selectedDate={selectedDate}
      onDayPress={setSelectedDate}
      markedDates={markedDates}
      showTitle={true}
      title="This Week"
    />
  );
}
```

**Props:**
- `selectedDate` - Currently selected date (YYYY-MM-DD)
- `onDayPress` - Callback when day is pressed, receives date string
- `markedDates` - Object with marked dates and dots
- `showTitle` - Show/hide title (default: false)
- `title` - Week title (default: "This Week")

**Features:**
- ✨ Horizontal scrollable 7-day view
- 📱 Touch-optimized day cards
- 🎯 Today indicator with accent border
- 📍 Multi-dot event markers
- 🎨 Smooth animations on mount
- 🌓 Automatic dark/light mode

---

### 2. `Calendar` - Main Calendar Component

Full-featured monthly calendar with customization options.

```tsx
import { Calendar } from '@/components/ui/Calendar';
import { useState } from 'react';

function MyScreen() {
  const [selectedDate, setSelectedDate] = useState('');

  const markedDates = {
    '2024-11-15': {
      dots: [
        { color: '#5A8473' }, // Green
        { color: '#5A7A8C' }, // Blue
      ],
    },
    '2024-11-20': {
      dots: [{ color: '#E76925' }], // Orange
    },
  };

  return (
    <Calendar
      title="Training Schedule"
      onDayPress={(day) => setSelectedDate(day.dateString)}
      selectedDate={selectedDate}
      markedDates={markedDates}
    />
  );
}
```

**Props:**
- `title` - Calendar title (default: "Schedule")
- `showTitle` - Show/hide title (default: true)
- `onDayPress` - Callback when day is pressed
- `selectedDate` - Currently selected date (YYYY-MM-DD)
- `markedDates` - Object with marked dates and dots
- All standard `react-native-calendars` props

---

### 3. `CompactCalendar` - Compact Month View

Smaller monthly calendar without title, perfect for embedding.

```tsx
import { CompactCalendar } from '@/components/ui/Calendar';

function DashboardWidget() {
  return (
    <CompactCalendar
      onDayPress={(day) => console.log(day)}
      markedDates={trainingDates}
    />
  );
}
```

---

### 4. `TrainingCalendar` - Training Integration

Full monthly training calendar with event list and creation button.

```tsx
import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent } from '@/hooks/ui/useCalendar';

function TrainingScreen() {
  const events: CalendarEvent[] = [
    {
      id: '1',
      date: '2024-11-15',
      title: 'Sniper Qualification',
      type: 'qualification',
    },
    {
      id: '2',
      date: '2024-11-15',
      title: 'Team Exercise',
      type: 'training',
    },
  ];

  return (
    <TrainingCalendar
      events={events}
      onEventPress={(event) => console.log('Event:', event)}
      onCreateTraining={(date) => console.log('Create on:', date)}
    />
  );
}
```

**Event Types:**
- `training` - Green
- `session` - Blue
- `assessment` - Orange
- `briefing` - Purple
- `qualification` - Red

---

## Hook: `useCalendar`

Simplifies calendar state management and event handling.

```tsx
import { useCalendar, CalendarEvent } from '@/hooks/ui/useCalendar';

function MyComponent() {
  const events: CalendarEvent[] = [
    {
      id: '1',
      date: '2024-11-15',
      title: 'Training Session',
      type: 'training',
    },
  ];

  const {
    selectedDate,
    markedDates,
    handleDayPress,
    selectedDateEvents,
    eventColors,
    getEventsForDate,
  } = useCalendar(events);

  return (
    <Calendar
      onDayPress={handleDayPress}
      selectedDate={selectedDate}
      markedDates={markedDates}
    />
  );
}
```

**Hook API:**
- `selectedDate` - Currently selected date string
- `setSelectedDate` - Update selected date
- `markedDates` - Formatted marked dates for calendar
- `handleDayPress` - Day press handler
- `selectedDateEvents` - Events for selected date
- `datesWithEvents` - Array of dates with events
- `getEventsForDate(date)` - Get events for specific date
- `getEventCount(date)` - Count events for date
- `getEventsForMonth(year, month)` - Get events for month
- `eventColors` - Color map for event types

---

## Marking Dates

### Single Event
```tsx
markedDates={{
  '2024-11-15': {
    dots: [{ color: '#E76925' }],
  },
}}
```

### Multiple Events
```tsx
markedDates={{
  '2024-11-15': {
    dots: [
      { color: '#5A8473' }, // Green
      { color: '#5A7A8C' }, // Blue
      { color: '#E76925' }, // Orange
    ],
  },
}}
```

### With Selection
```tsx
markedDates={{
  '2024-11-15': {
    selected: true,
    selectedColor: '#E76925',
    dots: [{ color: '#5A8473' }],
  },
}}
```

---

## Styling

Calendar automatically uses your theme colors:

**Light Mode:**
- Background: White (#FFFFFF)
- Text: Dark gray (#2A2A2A)
- Accent: Orange (#E76925)

**Dark Mode:**
- Background: Dark surface (#2A2A2A)
- Text: Light gray (#E8E8E8)
- Accent: Light orange (#FF7A3D)

---

## Examples

### 1. Week View (Dashboard)
```tsx
import { WeekCalendar } from '@/components/ui/WeekCalendar';

function Dashboard() {
  const [selectedDate, setSelectedDate] = useState('');
  
  return (
    <WeekCalendar
      selectedDate={selectedDate}
      onDayPress={setSelectedDate}
      markedDates={upcomingTrainings}
    />
  );
}
```

### 2. Simple Date Picker
```tsx
function DatePicker() {
  const [date, setDate] = useState('');

  return (
    <Calendar
      onDayPress={(day) => setDate(day.dateString)}
      selectedDate={date}
    />
  );
}
```

### 3. Training Schedule
```tsx
function TrainingSchedule() {
  const events: CalendarEvent[] = [
    { id: '1', date: '2024-11-15', title: 'Sniper Training', type: 'training' },
    { id: '2', date: '2024-11-18', title: 'Assessment', type: 'assessment' },
  ];

  return (
    <TrainingCalendar
      events={events}
      onEventPress={(event) => router.push(`/training/${event.id}`)}
    />
  );
}
```

### 4. Dashboard Widget
```tsx
function Dashboard() {
  return (
    <View>
      <Text>Upcoming Trainings</Text>
      <CompactCalendar
        markedDates={upcomingTrainings}
        onDayPress={(day) => navigateToDay(day)}
      />
    </View>
  );
}
```

---

## Utilities

```tsx
import {
  formatCalendarDate,
  getTodayString,
  isDateInPast,
  getDateRange,
} from '@/hooks/ui/useCalendar';

// Format date for display
formatCalendarDate('2024-11-15'); 
// → "Monday, November 15, 2024"

// Get today's date
getTodayString(); 
// → "2024-11-14"

// Check if past
isDateInPast('2024-11-10'); 
// → true

// Get date range
getDateRange('2024-11-01', '2024-11-05');
// → ['2024-11-01', '2024-11-02', '2024-11-03', '2024-11-04', '2024-11-05']
```

---

## Integration with Backend

```tsx
// services/trainingService.ts
export async function getTrainingEvents(userId: string, orgId?: string) {
  const client = await AuthenticatedClient.getClient();
  
  const { data, error } = await client
    .from('trainings')
    .select('*')
    .eq(orgId ? 'org_id' : 'created_by', orgId || userId);

  if (error) throw new DatabaseError(error.message);

  // Transform to CalendarEvent format
  return data.map(training => ({
    id: training.id,
    date: training.scheduled_date.split('T')[0], // YYYY-MM-DD
    title: training.name,
    type: 'training' as const,
  }));
}

// In component
function TrainingCalendarScreen() {
  const { userId, orgId } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    getTrainingEvents(userId, orgId).then(setEvents);
  }, [userId, orgId]);

  return <TrainingCalendar events={events} />;
}
```

---

## Troubleshooting

### Calendar not showing?
- Check if `react-native-calendars` is installed
- Restart Metro bundler
- Clear cache: `npm start -- --reset-cache`

### Dates not marking?
- Ensure date format is `YYYY-MM-DD`
- Check `markedDates` object structure
- Verify dots array has valid colors

### Theme not applying?
- Ensure `useColors` hook is working
- Check if ThemeProvider wraps your app
- Verify color values in theme files

---

## Performance Tips

1. **Memoize marked dates**: Use `useMemo` for large datasets
2. **Lazy load events**: Fetch only current month
3. **Debounce date changes**: Avoid rapid re-renders
4. **Use CompactCalendar**: For smaller views

```tsx
const markedDates = useMemo(() => {
  return computeMarkedDates(events);
}, [events]);
```

---

## Accessibility

✅ All components support:
- Large touch targets (36px)
- Screen readers
- Keyboard navigation
- High contrast mode
- Dynamic font sizes

---

## License

MIT - Part of Reticle Stats App

