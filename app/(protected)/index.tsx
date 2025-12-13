import { Redirect } from "expo-router";

/**
 * Protected Index - Redirect to Unified Tabs
 * 
 * This simply redirects to the unified tab layout.
 * No more personal vs team mode selection.
 */
export default function ProtectedIndex() {
    return <Redirect href="/(protected)/(tabs)" />;
}
