# Constants

This directory contains app-wide constants and configuration.

## Colors.ts

Defines all color values for light and dark themes. This follows Expo's recommended approach for theming.

### Available Color Keys

| Key | Light Mode | Dark Mode | Usage |
|-----|------------|-----------|-------|
| `text` | `#11181C` | `#ECEDEE` | Primary text color |
| `background` | `#fff` | `#151718` | Main background |
| `tint` | `#0a7ea4` | `#fff` | Brand/accent color |
| `icon` | `#687076` | `#9BA1A6` | Icon color |
| `tabIconDefault` | `#687076` | `#9BA1A6` | Inactive tab icons |
| `tabIconSelected` | `#0a7ea4` | `#fff` | Active tab icons |
| `border` | `#e5e7eb` | `#374151` | Border color |
| `cardBackground` | `#f9fafb` | `#1f2937` | Cards/elevated surfaces |
| `buttonText` | `#11181C` | `#ECEDEE` | Text on buttons |
| `buttonBorder` | `#e5e7eb` | `#4b5563` | Button borders |
| `placeholderText` | `#9ca3af` | `#6b7280` | Input placeholders |
| `description` | `#6b7280` | `#9ca3af` | Secondary text |

### How to Add New Colors

1. Add the color to both `light` and `dark` objects in `Colors.ts`
2. Use TypeScript for auto-completion when using `useThemeColor`

Example:

```typescript
export const Colors = {
  light: {
    // ... existing colors
    myNewColor: '#FF0000',
  },
  dark: {
    // ... existing colors
    myNewColor: '#00FF00',
  },
};
```

Then use it:

```tsx
const myColor = useThemeColor({}, 'myNewColor');
```

