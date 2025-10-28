import { PickerProps } from "@react-native-picker/picker";

export default function PickerComponent({
  prompt,
  itemStyle,
  dropdownIconColor,
  selectedValue,
  onValueChange,
  style,
  children,
}: PickerProps) {
  return (
    <PickerComponent
      prompt={prompt}
      itemStyle={itemStyle}
      dropdownIconColor={dropdownIconColor}
      selectedValue={selectedValue}
      onValueChange={onValueChange}
      style={style}
    >
      {children}
    </PickerComponent>
  );
}
