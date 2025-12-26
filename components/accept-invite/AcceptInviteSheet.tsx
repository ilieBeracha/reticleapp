import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { CodeEntryStep } from './CodeEntryStep';
import { useAcceptInvite } from './hooks';
import { InvitationReviewStep } from './InvitationReviewStep';
import { SheetHeader } from './SheetHeader';
import { styles } from './styles';
import { SuccessView } from './SuccessView';

export function AcceptInviteSheet() {
  const colors = useColors();
  const {
    inviteCode,
    validatedInvite,
    isValidating,
    isAccepting,
    isAccepted,
    acceptedResult,
    error,
    setInviteCode,
    handleValidate,
    handleAccept,
    handleDecline,
    handleReset,
    handleCloseSheet,
    handleOpenTeam,
  } = useAcceptInvite();

  if (isAccepted && acceptedResult) {
    return (
      <SuccessView
        result={acceptedResult}
        onOpenTeam={handleOpenTeam}
        onClose={handleCloseSheet}
      />
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.card }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <SheetHeader onClose={handleCloseSheet} />

      <View style={styles.headerSection}>
        <View style={[styles.headerIcon, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="enter" size={28} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Join Team</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {validatedInvite ? 'Review invitation' : 'Enter invite code to get started'}
        </Text>

        {validatedInvite && (
          <TouchableOpacity
            style={[styles.resetBtn, { backgroundColor: colors.secondary, marginTop: 12 }]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={16} color={colors.text} />
            <Text style={[styles.resetBtnText, { color: colors.text }]}>Enter Different Code</Text>
          </TouchableOpacity>
        )}
      </View>

      {!validatedInvite ? (
        <CodeEntryStep
          inviteCode={inviteCode}
          error={error}
          isValidating={isValidating}
          onCodeChange={setInviteCode}
          onValidate={handleValidate}
        />
      ) : (
        <InvitationReviewStep
          invite={validatedInvite}
          isAccepting={isAccepting}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      )}
    </ScrollView>
  );
}
