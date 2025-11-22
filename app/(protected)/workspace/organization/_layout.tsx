import Tabs from "@/components/withLayoutContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/ui/useColors";
import { StyleSheet } from "react-native";
export default function OrganizationLayout() {  const { primary } = useColors();
    const { theme } = useTheme();
    const themeMode = theme === 'dark' ? 'dark' : 'light';
    const barStyle = themeMode === 'dark' ? 'light-content' : 'dark-content';
    return (<Tabs rippleColor={primary} minimizeBehavior={'automatic'} sidebarAdaptable={true}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="members" />
    </Tabs>);
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
    },
});     