import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { styles } from './styles';

interface CodeEntryStepProps {
  inviteCode: string;
  error: string | null;
  isValidating: boolean;
  onCodeChange: (code: string) => void;
  onValidate: () => void;
}

export function CodeEntryStep({
  inviteCode,
  error,
  isValidating,
  onCodeChange,
  onValidate,
}: CodeEntryStepProps) {
  const colors = useColors();

  return (
    <>
      <View style={[styles.inputCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.inputLabel, { color: colors.text }]}>
          <Ionicons name="key-outline" size={14} color={colors.text} /> Invite Code
        </Text>
        <View
          style={[
            styles.inputWrapper,
            {
              backgroundColor: colors.background,
              borderColor: error ? colors.destructive : colors.border,
            },
          ]}
        >
          <TextInput
            style={[styles.input, { color: colors.text }]}
            placeholder="e.g. ABC123XY"
            placeholderTextColor={colors.textMuted}
            value={inviteCode}
            onChangeText={onCodeChange}
            autoCapitalize="characters"
            maxLength={8}
            returnKeyType="go"
            onSubmitEditing={onValidate}
            autoFocus
          />
        </View>
        <Text style={[styles.inputHint, { color: colors.textMuted }]}>
          8 characters • letters and numbers
        </Text>
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={14} color={colors.destructive} />
            <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.validateButton,
          {
            backgroundColor: isValidating ? colors.secondary : colors.primary,
            opacity: isValidating || !inviteCode.trim() ? 0.7 : 1,
          },
        ]}
        onPress={onValidate}
        disabled={isValidating || !inviteCode.trim()}
        activeOpacity={0.8}
      >
        {isValidating ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={styles.validateButtonText}>Validate Code</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={[styles.helpCard, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Ionicons name="help-circle-outline" size={20} color={colors.textMuted} />
        <View style={styles.helpContent}>
          <Text style={[styles.helpTitle, { color: colors.text }]}>
            How to get an invite code?
          </Text>
          <Text style={[styles.helpText, { color: colors.textMuted }]}>
            Ask a team owner or commander to generate an invite code for you. They can share it via
            any messaging app.
          </Text>
        </View>
      </View>
    </>
  );
}
