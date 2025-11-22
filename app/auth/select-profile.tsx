import { ProfileOption, ProfileSelector } from "@/components/auth/ProfileSelector";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

export default function SelectProfilePage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ProfileOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfiles();
  }, [user]);

  const loadProfiles = async () => {
    if (!user) {
      router.replace("/auth/sign-in");
      return;
    }

    try {
      setLoading(true);
      
      // Call the RPC function to get user's profiles
      const { data, error } = await supabase
        .rpc('get_my_profiles')
        .returns<ProfileOption[]>();

      if (error) throw error;

      setProfiles((data as ProfileOption[]) || []);

      // If user has only one profile, auto-select it
      if (data && (data as ProfileOption[]).length === 1) {
        handleSelectProfile((data as ProfileOption[])[0]?.profile_id || '');
      }
    } catch (error: any) {
      console.error('Error loading profiles:', error);
      Alert.alert('Error', 'Failed to load your profiles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = async (profileId: string) => {
    try {
      // Store selected profile in user metadata
      const { error } = await supabase.auth.updateUser({
        data: { active_profile_id: profileId }
      });

      if (error) throw error;

      // Navigate to protected area
      router.replace("/(protected)");
    } catch (error: any) {
      console.error('Error selecting profile:', error);
      Alert.alert('Error', 'Failed to select profile. Please try again.');
    }
  };

  const handleCreateOrg = () => {
    // Navigate to org creation flow (can implement later)
    Alert.alert(
      'Create Organization',
      'This feature will allow you to create a new organization workspace.',
      [{ text: 'OK' }]
    );
  };

  return (
    <ProfileSelector
      profiles={profiles}
      loading={loading}
      onSelectProfile={handleSelectProfile}
      onCreateOrg={handleCreateOrg}
    />
  );
}

