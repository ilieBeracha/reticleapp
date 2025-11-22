import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { createOrgWorkspace } from '@/services/workspaceService';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BaseBottomSheet, type BaseBottomSheetRef } from './BaseBottomSheet';

interface CreateWorkspaceSheetProps {
  onWorkspaceCreated?: () => void;
}

export const CreateWorkspaceSheet = forwardRef<BaseBottomSheetRef, CreateWorkspaceSheetProps>(
  ({ onWorkspaceCreated }, ref) => {
    const colors = useColors();
    const { switchWorkspace } = useAppContext();
    const sheetRef = useRef<BaseBottomSheetRef>(null);
    
    const [workspaceName, setWorkspaceName] = useState('');
    const [description, setDescription] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => sheetRef.current?.open(),
      close: () => sheetRef.current?.close(),
      expand: () => sheetRef.current?.expand(),
    }));

    const handleCreate = async () => {
      if (!workspaceName.trim()) {
        Alert.alert('Error', 'Please enter a workspace name');
        return;
      }

      setIsCreating(true);
      try {
        const newWorkspace = await createOrgWorkspace({
          name: workspaceName.trim(),
          description: description.trim() || undefined,
        });

        // Reload workspaces
        await useWorkspaceStore.getState().loadWorkspaces();

        // Switch to new workspace
        await switchWorkspace(newWorkspace.id);

        // Reset form
        setWorkspaceName('');
        setDescription('');
        
        sheetRef.current?.close();
        
        // Call callback
        onWorkspaceCreated?.();
        
        Alert.alert('Success', `Organization "${newWorkspace.workspace_name}" created!`);
      } catch (error: any) {
        console.error('Failed to create workspace:', error);
        Alert.alert('Error', error.message || 'Failed to create workspace');
      } finally {
        setIsCreating(false);
      }
    };

    const handleCancel = () => {
      setWorkspaceName('');
      setDescription('');
      sheetRef.current?.close();
    };

    return (
      <BaseBottomSheet ref={sheetRef} snapPoints={['60%']} backdropOpacity={0.6}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: `${colors.accent}15` }]}>
              <Ionicons name="business" size={28} color={colors.accent} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              Create Organization
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Start a new workspace for your team
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Workspace Name */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Organization Name *
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <BottomSheetTextInput
                  style={[styles.input, { color: colors.text }]}
                  placeholder="e.g. Acme Corp"
                  placeholderTextColor={colors.textMuted}
                  value={workspaceName}
                  onChangeText={setWorkspaceName}
                  returnKeyType="next"
                  autoFocus
                />
              </View>
            </View>

            {/* Description */}
            <View style={styles.inputContainer}>
              <Text style={[styles.label, { color: colors.text }]}>
                Description (Optional)
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  styles.textAreaWrapper,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <BottomSheetTextInput
                  style={[styles.input, styles.textArea, { color: colors.text }]}
                  placeholder="What is this organization about?"
                  placeholderTextColor={colors.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  returnKeyType="done"
                />
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: colors.accent },
                (!workspaceName.trim() || isCreating) && styles.buttonDisabled,
              ]}
              onPress={handleCreate}
              disabled={!workspaceName.trim() || isCreating}
            >
              <Ionicons name="add-circle" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>
                {isCreating ? 'Creating...' : 'Create Organization'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.secondary }]}
              onPress={handleCancel}
              disabled={isCreating}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BaseBottomSheet>
    );
  }
);

CreateWorkspaceSheet.displayName = 'CreateWorkspaceSheet';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  icon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    gap: 20,
  },
  inputContainer: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  textAreaWrapper: {
    minHeight: 100,
  },
  input: {
    fontSize: 16,
    padding: 0,
  },
  textArea: {
    minHeight: 80,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});

