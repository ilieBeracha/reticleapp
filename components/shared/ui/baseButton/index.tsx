import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

export function BaseButton({ children, onPress, style }: { children: React.ReactNode, onPress: () => void, style?: StyleProp<ViewStyle> }){

    return (
        <TouchableOpacity style={[styles.button, style]} onPress={onPress}>
            {children}
        </TouchableOpacity>
    )
}
const styles = StyleSheet.create({  
    button: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 14,
        gap: 10,
    }
});