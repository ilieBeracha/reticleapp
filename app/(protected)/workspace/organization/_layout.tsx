import { useTheme } from "@/contexts/ThemeContext";
import { useColors } from "@/hooks/ui/useColors";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";

export default function OrganizationLayout() {
    const { primary } = useColors();
    const { theme } = useTheme();
    const { activeWorkspaceId, workspaces, loading } = useWorkspaceStore();
    const router = useRouter();
    const segments = useSegments();
    const themeMode = theme === 'dark' ? 'dark' : 'light';
    const barStyle = themeMode === 'dark' ? 'light-content' : 'dark-content';
    
    // Check if user has an organization selected (not in Personal Mode)
    const hasOrganization = activeWorkspaceId !== null;
    
    // Handle routing based on organization status
    useEffect(() => {
        if (loading) return;
        
        const inOrgRoute = segments[segments.length - 1];
        
        if (!hasOrganization && inOrgRoute !== 'no-org') {
            // User is in Personal Mode but trying to access org routes - redirect to no-org
            router.replace('/workspace/organization/no-org');
        } else if (hasOrganization && inOrgRoute === 'no-org') {
            // User has org selected but on no-org screen - redirect to org index
            router.replace('/workspace/organization');
        }
    }, [hasOrganization, loading, segments]);
    
    // While loading, return null or a loading screen
    if (loading) {
        return null;
    }
    
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            {/* Always register all routes, but control access via redirect */}
            <Stack.Screen name="index" />
            <Stack.Screen name="members" />
            <Stack.Screen name="no-org" />
        </Stack>
    );
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