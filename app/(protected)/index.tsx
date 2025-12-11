import { Redirect } from 'expo-router';

/**
 * Protected Index - Redirects to Home (personal folder)
 * 
 * This handles the root protected route and sends users to their home screen.
 * The personal/index.tsx will show PersonalHomePage or TeamHomePage based on activeTeam.
 */
export default function ProtectedIndex() {
  return <Redirect href="/(protected)/personal" />;
}







