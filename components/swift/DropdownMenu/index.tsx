import { Button, ContextMenu, Host, Picker } from '@expo/ui/swift-ui';
import { useState } from 'react';

export default function DropdownMenu({ options, label }: { options: string[], label: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | undefined>(undefined);
  return (
    <Host style={{ width: 150, height: 50 }}>
      <ContextMenu>
        <ContextMenu.Items>
          <Button systemImage="person.crop.circle.badge.xmark" onPress={() => console.log('Pressed1')}>
            Hello
          </Button>
          <Button variant="bordered" systemImage="heart" onPress={() => console.log('Pressed2')}>
            Love it
          </Button>
          <Picker
            label={label}
            options={options}
            variant="menu"
            selectedIndex={selectedIndex ?? null}
            onOptionSelected={({ nativeEvent: { index } }) => setSelectedIndex(index ?? undefined)}
          />
        </ContextMenu.Items>
        <ContextMenu.Trigger>
          <Button variant="bordered">Show Menu</Button>
        </ContextMenu.Trigger>
      </ContextMenu>
    </Host>
  );
}
