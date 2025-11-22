import { useAuth } from '@/contexts/AuthContext';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';

/**
 * Root redirect based on auth state
 */
export default function RootPage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    console.log('🏠 Root page - Auth state:', { user: !!user, loading });
  }, [user, loading]);

  if (loading) {
    return null; // Let auth context handle loading
  }

  if (!user) {
    return <Redirect href="/auth/sign-in" />;
  }

  return <Redirect href="/(protected)" />;
}