import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { createOrgWorkspace } from "@/services/workspaceService";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * CREATE WORKSPACE - Native Form Sheet
 * 
 * Clean, calm flow for creating organizations.
 * Detects if this is the user's first org and shows a welcoming message.
 * 
 * Usage:
 *   router.push('/(protected)/createWorkspace')
 *   router.push({ pathname: '/(protected)/createWorkspace', params: { isFirst: 'true' } })
 */
export default function CreateWorkspaceSheet() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ isFirst?: string }>();
  const { workspaces } = useAppContext();
  
  // Detect if this is user's first org
  const isFirstOrg = params.isFirst === 'true' || workspaces.length === 0;
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [createdWorkspace, setCreatedWorkspace] = useState<{ id: string; name: string } | null>(null);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    Keyboard.dismiss();
    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const newWorkspace = await createOrgWorkspace({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      
      await useWorkspaceStore.getState().loadWorkspaces();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setCreatedWorkspace({ id: newWorkspace.id, name: newWorkspace.workspace_name });
      setStep('success');
      
    } catch (error: any) {
      console.error("Failed to create workspace:", error);
      Alert.alert("Couldn't create", error.message || "Something went wrong. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsCreating(false);
    }
  }, [name, description]);

  const handleOpenWorkspace = useCallback(() => {
    if (!createdWorkspace) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    useWorkspaceStore.getState().setIsSwitching(true);
    useWorkspaceStore.getState().setActiveWorkspace(createdWorkspace.id);
    
    setTimeout(() => {
      router.replace('/(protected)/org' as any);
      setTimeout(() => {
        useWorkspaceStore.getState().setIsSwitching(false);
      }, 300);
    }, 200);
  }, [createdWorkspace]);

  const handleStayHere = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (router.canGoBack()) {
      router.back();
    }
  }, []);

  // Success state
  if (step === 'success' && createdWorkspace) {
    return (
      <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
        <View style={styles.grabberSpacer} />
        
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: colors.primary + '15' }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.primary} />
          </View>
          
          <Text style={[styles.successTitle, { color: colors.text }]}>
            You're all set!
          </Text>
          
          <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>
            <Text style={{ fontWeight: '600', color: colors.text }}>{createdWorkspace.name}</Text>
            {' '}is ready. You can invite team members anytime.
          </Text>
          
          <View style={styles.successActions}>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={handleOpenWorkspace}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-forward" size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>Open Workspace</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.border }]}
              onPress={handleStayHere}
              activeOpacity={0.7}
            >
              <Text style={[styles.secondaryBtnText, { color: colors.textMuted }]}>
                Stay in Personal Mode
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.sheet, { backgroundColor: colors.card }]} edges={['bottom']}>
      <View style={styles.grabberSpacer} />
      
      <KeyboardAvoidingView 
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.headerIcon, { backgroundColor: colors.primary + '12' }]}>
              <Ionicons name="business" size={28} color={colors.primary} />
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>
              {isFirstOrg ? "Create your first org" : "New Organization"}
            </Text>
            
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isFirstOrg 
                ? "A workspace where you can train with others"
                : "Start a new workspace for your team"
              }
            </Text>
          </View>

          {/* First-time hint */}
          {isFirstOrg && (
            <View style={[styles.hintCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
              <Ionicons name="sparkles" size={18} color={colors.primary} />
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Organizations let you manage teams, track training, and collaborate with others.
              </Text>
            </View>
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.text }]}>Name</Text>
              <View style={[styles.inputWrapper, { 
                backgroundColor: colors.background, 
                borderColor: colors.border 
              }]}>
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. CrossFit Downtown"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  returnKeyType="next"
                  autoFocus
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.text }]}>Description</Text>
                <Text style={[styles.labelHint, { color: colors.textMuted }]}>optional</Text>
              </View>
              <View style={[styles.inputWrapper, styles.textAreaWrapper, { 
                backgroundColor: colors.background, 
                borderColor: colors.border 
              }]}>
                <TextInput
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  placeholder="What's this workspace about?"
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Create Button */}
          <TouchableOpacity
            style={[
              styles.createBtn,
              { backgroundColor: name.trim() ? colors.primary : colors.muted }
            ]}
            onPress={handleCreate}
            disabled={!name.trim() || isCreating}
            activeOpacity={0.8}
          >
            {isCreating ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createBtnText}>Create</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={handleStayHere}
            disabled={isCreating}
            activeOpacity={0.7}
          >
            <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  grabberSpacer: {
    height: 12,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Hint card
  hintCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },

  // Form
  form: {
    gap: 20,
    marginBottom: 28,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  labelHint: {
    fontSize: 12,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
  },
  textAreaWrapper: {
    minHeight: 88,
  },
  input: {
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },

  // Buttons
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
  },
  createBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  successActions: {
    width: '100%',
    gap: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

