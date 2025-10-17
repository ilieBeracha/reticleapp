import { useThemeColor } from "@/hooks/useThemeColor";
import { Controller } from "react-hook-form";
import { TextInput as RNTextInput, StyleSheet, Text, View } from "react-native";

const TextInput = ({
  control,
  placeholder,
  required,
  label,
  name,
}: {
  control: any;
  placeholder: string;
  required?: boolean;
  label: string;
  name: string;
}) => {
  const textColor = useThemeColor({}, "buttonText");
  const borderColor = useThemeColor({}, "border");
  const placeholderColor = useThemeColor({}, "placeholderText");

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
          <RNTextInput
            placeholder={placeholder}
            placeholderTextColor={placeholderColor}
            onBlur={onBlur}
            onChangeText={onChange}
            value={value}
            style={[
              styles.textInput,
              {
                borderColor: error ? "#ef4444" : borderColor,
                color: textColor,
              },
            ]}
            autoComplete="off"
            autoCapitalize="none"
          />
          {error && <Text style={{ color: "#ef4444" }}>{error.message}</Text>}
        </View>
      )}
      name={name}
      rules={{ required: required && "This field is required !" }}
    />
  );
};

export default TextInput;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    width: "100%",
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
  },
});
