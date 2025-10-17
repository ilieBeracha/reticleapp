import { useThemeColor } from "@/hooks/useThemeColor";
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
          { borderColor: isSelected ? "#3b82f6" : borderColor },
          isSelected && { backgroundColor: "#3b82f6" },
        ]}
        onPress={() => onChange(value)}
      >
        <Text
          style={[
            styles.optionText,
            { color: isSelected ? "white" : textColor },
          ]}
        >
          {label}
        </Text>
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
    borderWidth: 1,
    borderRadius: 10,
    padding: 7,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 14,
  },
});
