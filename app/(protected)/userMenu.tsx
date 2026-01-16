import { Redirect } from 'expo-router';

/**
 * User Menu - Redirects to unified Settings sheet
 */
export default function UserMenuSheet() {
  return <Redirect href="/(protected)/profileSheet" />;
}
