import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { Controller } from "react-hook-form";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const RadioButtonInput = ({
  control,
  placeholder,
  required,
  label,
  name,
  options,
}: {
  control: any;
  placeholder: string;
  required?: boolean;
  label: string;
  name: string;
  options: { label: string; value: string }[];
}) => {
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "border");
  const placeholderColor = useThemeColor({}, "placeholderText");
  const tintColor = useThemeColor({}, "tint");
  const mutedColor = useThemeColor({}, "description");
  const cardBackground = useThemeColor({}, "cardBackground");

  const Option = ({
    label,
    value,
    onChange,
    isSelected,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    isSelected: boolean;
  }) => {
    return (
      <TouchableOpacity
        style={[
          styles.option,
          {
            borderColor: isSelected ? tintColor : borderColor,
            backgroundColor: cardBackground,
          },
        ]}
        onPress={() => onChange(value)}
      >
        <Ionicons
          name={isSelected ? "radio-button-on" : "radio-button-off"}
          size={20}
          color={isSelected ? tintColor : mutedColor}
        />
        <Text
          style={[
            styles.optionText,
            { color: isSelected ? tintColor : textColor },
          ]}
        >
          {label}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={18} color={tintColor} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Controller
      control={control}
      render={({
        field: { onChange, onBlur, value },
        fieldState: { error },
      }) => (
        <View style={styles.container}>
          <Text style={[styles.label, { color: textColor }]}>
            {label}

            {required && <Text style={{ color: "#ef4444" }}>*</Text>}
          </Text>
          {placeholder && (
            <Text style={{ color: placeholderColor, fontSize: 12 }}>
              {placeholder}
            </Text>
          )}
          <View style={styles.optionsContainer}>
            {options.map((option) => (
              <Option
                key={option.value}
                label={option.label}
                value={option.value}
                onChange={onChange}
                isSelected={value === option.value}
              />
            ))}
          </View>
          {error && <Text style={{ color: "#ef4444" }}>{error.message}</Text>}
        </View>
      )}
      name={name}
      rules={{ required: required && "This field is required !" }}
    />
  );
};

export default RadioButtonInput;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 5,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
  optionsContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 5,
  },
  option: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
});
