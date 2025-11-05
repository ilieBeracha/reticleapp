import SocialLoginButton from "@/components/SocialLoginButton";
import { supabase } from "@/lib/supabase";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

// Configure WebBrowser for better UX
WebBrowser.maybeCompleteAuthSession();

export function SocialButtons() {
  // Warm up browser on mount for better UX
  useEffect(() => {
    if (Platform.OS === 'ios') {
      WebBrowser.warmUpAsync();
    }
    return () => {
      if (Platform.OS === 'ios') {
        WebBrowser.coolDownAsync();
      }
    };
  }, []);

  const handleOAuthLogin = async (provider: 'google' | 'apple' | 'facebook') => {
    console.log('🔵 handleOAuthLogin called with provider:', provider);
    
    try {
      // Build deep-link to bring the user back to the app after Supabase callback
      const redirectTo = 'reticle://auth/callback';

      console.log('🔵 Requesting OAuth URL from Supabase...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo, // final redirect handled by the app
          skipBrowserRedirect: true,
        },
      });

      console.log('🔵 Supabase response - data:', data);
      console.log('🔵 Supabase response - error:', error);

      if (error) {
        console.error('❌ OAuth error:', error);
        Alert.alert('Error', error.message);
        return;
      }

      if (!data.url) {
        console.error('❌ No OAuth URL received');
        Alert.alert('Error', 'No OAuth URL received');
        return;
      }

      console.log('🔵 About to open WebBrowser with URL:', data.url);

      // Open OAuth URL in in-app browser and wait for redirect back
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo
      );

      console.log('🔵 WebBrowser result type:', result.type);
      console.log('🔵 WebBrowser full result:', JSON.stringify(result, null, 2));

      if (result.type === 'success' && 'url' in result) {
        console.log('✅ OAuth success! Callback URL:', result.url);
        
        // Check if session was established
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (session) {
          console.log('✅ Session found after OAuth!');
          Alert.alert('Success', 'Signed in successfully!');
        } else {
          console.log('⚠️ No session found after OAuth');
          console.log('Session error:', sessionError);
        }
      } else if (result.type === 'cancel') {
        console.log('⚠️ User cancelled OAuth');
        Alert.alert('Cancelled', 'Sign in was cancelled');
      } else if (result.type === 'dismiss') {
        console.log('⚠️ Browser was dismissed');
      } else {
        console.log('⚠️ Unknown result type:', result.type);
      }
    } catch (error: any) {
      console.error('❌ OAuth error:', error);
      Alert.alert('Error', error.message || 'Failed to sign in');
    }
  };

  return (
    <View style={styles.container}>
      <SocialLoginButton 
        onPress={() => handleOAuthLogin('google')} 
        strategy="google" 
      />
      <SocialLoginButton 
        onPress={() => handleOAuthLogin('apple')} 
        strategy="apple" 
      />
      <SocialLoginButton 
        onPress={() => handleOAuthLogin('facebook')} 
        strategy="facebook" 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
  },
});
