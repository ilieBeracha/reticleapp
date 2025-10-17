# Theming Guide

This app follows Expo's best practices for dark/light mode theming. The theming system is centralized and easy to use.

## How it Works

### 1. Color Definitions (`constants/Colors.ts`)

All colors are defined in the `Colors` object with separate definitions for light and dark modes:

```typescript
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    border: '#e5e7eb',
    // ... more colors
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    border: '#374151',
    // ... more colors
  },
};
```

### 2. Theme Hook (`hooks/useThemeColor.ts`)

The `useThemeColor` hook automatically returns the correct color based on the current color scheme:

```typescript
const textColor = useThemeColor({}, "text");
const backgroundColor = useThemeColor({}, "background");
```

You can also override colors for specific themes:

```typescript
const color = useThemeColor(
  { light: "#FF0000", dark: "#00FF00" },
  "text"
);
```

### 3. Themed Components

#### ThemedView

A drop-in replacement for `View` that automatically uses the theme's background color:

```tsx
import { ThemedView } from '@/components/ThemedView';

<ThemedView style={styles.container}>
  {/* Your content */}
</ThemedView>
```

#### ThemedText

A drop-in replacement for `Text` with multiple built-in styles:

```tsx
import { ThemedText } from '@/components/ThemedText';

<ThemedText type="default">Regular text</ThemedText>
<ThemedText type="title">Large title</ThemedText>
<ThemedText type="subtitle">Subtitle</ThemedText>
<ThemedText type="defaultSemiBold">Bold text</ThemedText>
<ThemedText type="link">Link text</ThemedText>
```

## Usage Examples

### Basic Usage

```tsx
import { StyleSheet } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

export default function MyScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Welcome</ThemedText>
      <ThemedText>This text adapts to the theme</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
});
```

### Custom Components with Theme

```tsx
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColor } from '@/hooks/useThemeColor';

export function MyButton() {
  const backgroundColor = useThemeColor({}, 'cardBackground');
  const textColor = useThemeColor({}, 'text');
  const borderColor = useThemeColor({}, 'border');

  return (
    <View style={[styles.button, { backgroundColor, borderColor }]}>
      <Text style={[styles.text, { color: textColor }]}>
        Press me
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  text: {
    fontSize: 16,
  },
});
```

## Available Colors

### Light Mode
- `text`: Main text color
- `background`: Main background color
- `tint`: Accent/brand color
- `icon`: Icon color
- `border`: Border color
- `cardBackground`: Background for cards/elevated surfaces
- `buttonText`: Text on buttons
- `buttonBorder`: Button border color
- `placeholderText`: Placeholder text in inputs
- `description`: Secondary/description text

### Dark Mode
Same keys as light mode, with appropriate dark theme values.

## Customizing Colors

To customize the color scheme:

1. Open `constants/Colors.ts`
2. Modify the color values in the `light` and `dark` objects
3. All components using the theme will automatically update

Example:

```typescript
export const Colors = {
  light: {
    text: '#000000',        // Change to pure black
    background: '#F5F5F5',  // Change to light gray
    // ...
  },
  dark: {
    text: '#FFFFFF',        // Change to pure white
    background: '#000000',  // Change to pure black
    // ...
  },
};
```

## Best Practices

1. **Always use theme colors**: Avoid hardcoded colors like `color: "white"` or `backgroundColor: "black"`
2. **Use ThemedView and ThemedText**: These components handle theming automatically
3. **For custom components**: Use `useThemeColor` hook to get theme-aware colors
4. **Test both themes**: Always test your UI in both light and dark modes
5. **Consistent spacing**: Keep spacing/padding values in styles, only theme colors should change

## Testing

To test dark/light mode:

1. **iOS Simulator**: Settings → Developer → Dark Appearance
2. **Android Emulator**: Settings → Display → Dark theme
3. **Physical Device**: Change system theme in device settings

The app will automatically switch between light and dark themes based on the system preference.

