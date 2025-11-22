import { Colors } from '@/constants/Colors';
import { useModals } from '@/contexts/ModalContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Feather } from '@expo/vector-icons';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function NoOrgScreen() {
    const { theme } = useTheme();
    const colors = Colors[theme];
    const { createWorkspaceSheetRef, acceptInviteSheetRef } = useModals();   

    const handleCreateOrg = () => {
        // Open create workspace modal
        createWorkspaceSheetRef?.current?.open();
    };

    const handleJoinOrg = () => {
        // Open accept invite modal
        acceptInviteSheetRef?.current?.open();
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

            <View style={styles.content}>
                {/* Icon */}
                <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
                    <Feather name="user" size={48} color={colors.icon} />
                </View>

                {/* Title */}
                <Text style={[styles.title, { color: colors.text }]}>
                    Personal Mode
                </Text>

                {/* Description */}
                <Text style={[styles.description, { color: colors.textMuted }]}>
                    You're currently working independently. Create or join a workspace to collaborate with your team.
                </Text>

                {/* Action Buttons */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: colors.indigo }]}
                        onPress={handleCreateOrg}
                    >
                        <Feather name="plus-circle" size={20} color="#FFFFFF" />
                        <Text style={styles.primaryButtonText}>Create Workspace</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.secondaryButton, { 
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                        }]}
                        onPress={handleJoinOrg}
                    >
                        <Feather name="log-in" size={20} color={colors.text} />
                        <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                            Join Workspace
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Info Cards */}
                <View style={styles.infoContainer}>
                    <Text style={[styles.benefitsTitle, { color: colors.text }]}>
                        Benefits of Workspaces:
                    </Text>
                    <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                        <Feather name="check-circle" size={20} color={colors.green} />
                        <Text style={[styles.infoText, { color: colors.textMuted }]}>
                            Collaborate with your team in real-time
                        </Text>
                    </View>
                    <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                        <Feather name="check-circle" size={20} color={colors.green} />
                        <Text style={[styles.infoText, { color: colors.textMuted }]}>
                            Manage members, roles, and permissions
                        </Text>
                    </View>
                    <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                        <Feather name="check-circle" size={20} color={colors.green} />
                        <Text style={[styles.infoText, { color: colors.textMuted }]}>
                            Track team progress and analytics
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingTop: 10,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    iconContainer: {
        width: 96,
        height: 96,
        borderRadius: 48,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginBottom: 32,
        maxWidth: 320,
    },
    buttonContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 32,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    infoContainer: {
        width: '100%',
        gap: 12,
    },
    benefitsTitle: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        fontSize: 14,
        flex: 1,
    },
});
