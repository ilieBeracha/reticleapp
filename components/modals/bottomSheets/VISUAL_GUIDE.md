# Visual Guide: Slightly Open Bottom Sheet

## How It Looks

```
┌─────────────────────────────────────┐
│                                     │
│      Your Main Screen Content      │
│                                     │
│      (ScrollView, Views, etc)      │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤ ← Slightly open by default
│         ─────────────               │
│                                     │
│       Bottom Sheet Content          │
│    (Drag up to see more ↑)          │
└─────────────────────────────────────┘
```

## Snap Points Visualization

### Example: `["20%", "50%", "90%"]` with `initialSnapIndex={0}`

```
POSITION 3 (90%) - Fully expanded
┌─────────────────────────────────────┐
│         ─────────────               │ ← Handle
│ ┌─────────────────────────────────┐ │
│ │                                 │ │
│ │                                 │ │
│ │                                 │ │
│ │     Bottom Sheet Content        │ │
│ │                                 │ │
│ │                                 │ │
│ │                                 │ │
│ │                                 │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘


POSITION 2 (50%) - Half screen
┌─────────────────────────────────────┐
│      Main Screen (visible)          │
│                                     │
│                                     │
├─────────────────────────────────────┤
│         ─────────────               │ ← Handle
│ ┌─────────────────────────────────┐ │
│ │   Bottom Sheet Content          │ │
│ │   (scrollable if needed)        │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘


POSITION 1 (20%) - Slightly open (INITIAL ✨)
┌─────────────────────────────────────┐
│                                     │
│      Main Screen (mostly visible)   │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│         ─────────────               │ ← Handle (user can drag)
│   Quick Actions or Preview          │
└─────────────────────────────────────┘


POSITION 0 (Closed) - Swipe down to close
┌─────────────────────────────────────┐
│                                     │
│      Main Screen (fully visible)    │
│                                     │
│                                     │
│                                     │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

## User Interactions

### Initial State (On Mount)
```
User opens screen
        ↓
Bottom sheet appears at 20% (initialSnapIndex=0)
        ↓
User sees main content + small preview of sheet
```

### Dragging Up
```
User drags handle up
        ↓
Sheet snaps to 50% (middle position)
        ↓
User continues dragging up
        ↓
Sheet snaps to 90% (fully expanded)
```

### Dragging Down
```
User drags handle down
        ↓
Sheet snaps to 50%
        ↓
User continues dragging down
        ↓
Sheet snaps to 20% (back to initial)
        ↓
User drags all the way down
        ↓
Sheet closes completely (if enablePanDownToClose=true)
```

## Real-World Examples

### 1. Quick Actions Menu
```
┌─────────────────────────────────────┐
│    📱 Your Main App Screen          │
│                                     │
│    ┌───────────────────────────┐   │
│    │  Content Card 1           │   │
│    └───────────────────────────┘   │
│    ┌───────────────────────────┐   │
│    │  Content Card 2           │   │
│    └───────────────────────────┘   │
├─────────────────────────────────────┤ ← 22% height
│         ─────────────               │
│    Quick Actions                    │
│    🎯 New Session                   │
│    📊 View Stats                    │
└─────────────────────────────────────┘
        ↑ Slightly visible
```

### 2. Filters / Controls
```
┌─────────────────────────────────────┐
│    📊 Dashboard View                │
│                                     │
│    [Charts and Graphs]              │
│                                     │
│                                     │
├─────────────────────────────────────┤ ← 15% height
│         ─────────────               │
│    🔍 Filters (drag to expand)      │
└─────────────────────────────────────┘
        ↑ Just a peek
```

### 3. Player Controls (Like Spotify)
```
┌─────────────────────────────────────┐
│    🎵 Browse Music                  │
│                                     │
│    [Song List]                      │
│                                     │
│                                     │
├─────────────────────────────────────┤ ← 12% height
│  🎵 Now Playing: Song Name  ▶️ ⏸    │
└─────────────────────────────────────┘
        ↑ Mini player (drag up for full player)
```

## Component Structure

```
<View style={{ flex: 1 }}>
  
  {/* Main Screen Content */}
  <ScrollView>
    <YourContent />
  </ScrollView>
  
  {/* Slightly Open Bottom Sheet */}
  <SlightlyOpenBottomSheet
    snapPoints={["20%", "50%", "90%"]}
    initialSnapIndex={0}
  >
    <SheetContent />
  </SlightlyOpenBottomSheet>
  
</View>
```

## Props Impact Visualization

### `snapPoints={["20%", "50%", "90%"]}`
Defines three stopping positions:
- 20% = Slightly open
- 50% = Half screen
- 90% = Almost full screen

### `initialSnapIndex={0}`
Opens at first snap point (20%)

### `initialSnapIndex={1}`
Opens at second snap point (50%)

### `defaultIsOpen={true}`
Sheet visible on mount

### `defaultIsOpen={false}`
Sheet hidden on mount (default behavior)

## Color Legend

```
┌─────────────────────────────────────┐  ← Main content area
│                                     │
│                                     │
├─────────────────────────────────────┤  ← Sheet drag handle
│                                     │  ← Sheet content area
└─────────────────────────────────────┘
```

## Tips for Snap Point Selection

**For Peek View (Just visible):**
- Use 10-15% for first snap point
- Example: `["12%", "60%"]`

**For Quick Actions (Small menu):**
- Use 18-25% for first snap point
- Example: `["22%", "50%"]`

**For Preview (Show meaningful content):**
- Use 30-40% for first snap point
- Example: `["35%", "75%"]`

**For Player Controls:**
- Use 8-12% for first snap point
- Example: `["10%", "95%"]`

## Testing Different Heights

Try these configurations in the demo:

```tsx
// Tiny peek
snapPoints={["8%", "50%", "95%"]} 
initialSnapIndex={0}

// Small preview
snapPoints={["15%", "60%", "90%"]}
initialSnapIndex={0}

// Quarter screen
snapPoints={["25%", "50%", "85%"]}
initialSnapIndex={0}

// Third screen
snapPoints={["33%", "66%", "95%"]}
initialSnapIndex={0}

// Custom
snapPoints={["18%", "45%", "88%"]}
initialSnapIndex={0}
```

## Animation Flow

```
Mount → Auto-open to initialSnapIndex
         ↓
User drags handle
         ↓
Animates to nearest snap point
         ↓
Settles at snap point
         ↓
User can drag again
```

---

**Pro Tip:** Start with `["20%", "50%", "90%"]` and adjust based on your content!

