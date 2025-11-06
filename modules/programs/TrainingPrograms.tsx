import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { SessionStats } from "@/services/sessionService";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { sessionStatsStore } from "@/store/sessionsStore";
import { trainingsStore } from "@/store/trainingsStore";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useStore } from "zustand";

export function TrainingPrograms() {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, allOrgs } = useOrganizationsStore();
  const { trainings, loading: trainingsLoading, fetchTrainings } = useStore(trainingsStore);
  const { sessions, loading: sessionsLoading, fetchSessions } = useStore(sessionStatsStore);

  const [activeTab, setActiveTab] = useState<"programs" | "sessions">("programs");
  const [selectedTraining, setSelectedTraining] = useState<string | null>(null);

  const currentOrg = selectedOrgId
    ? allOrgs.find((org) => org.id === selectedOrgId)
    : null;

  useEffect(() => {
    if (user?.id) {
      fetchTrainings(user.id, selectedOrgId || null);
      fetchSessions(user.id, selectedOrgId || null);
    }
  }, [user?.id, selectedOrgId]);

  const trainingSessionsMap = new Map<string, SessionStats[]>();
  sessions.forEach((session) => {
    const trainingId = session.training_id || "general";
    if (!trainingSessionsMap.has(trainingId)) {
      trainingSessionsMap.set(trainingId, []);
    }
    trainingSessionsMap.get(trainingId)?.push(session);
  });

  const generalSessions = trainingSessionsMap.get("general") || [];

  const formatSessionDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatSessionDateLong = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            {selectedOrgId ? "Training Programs" : "My Training"}
          </Text>
          <Text style={[styles.subtitle, { color: colors.description }]}>
            {currentOrg?.name || "Personal workspace"}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeTab === "programs" ? colors.indigo + "15" : "transparent",
              borderBottomColor:
                activeTab === "programs" ? colors.indigo : "transparent",
            },
          ]}
          onPress={() => setActiveTab("programs")}
        >
          <Ionicons
            name="folder"
            size={18}
            color={activeTab === "programs" ? colors.indigo : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "programs" ? colors.indigo : colors.textMuted,
              },
            ]}
          >
            Programs ({trainings.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            {
              backgroundColor:
                activeTab === "sessions" ? colors.green + "15" : "transparent",
              borderBottomColor:
                activeTab === "sessions" ? colors.green : "transparent",
            },
          ]}
          onPress={() => setActiveTab("sessions")}
        >
          <Ionicons
            name="list"
            size={18}
            color={activeTab === "sessions" ? colors.green : colors.textMuted}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "sessions" ? colors.green : colors.textMuted,
              },
            ]}
          >
            All Sessions ({sessions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "programs" ? (
          <View style={styles.programsView}>
            {trainingsLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.indigo} />
              </View>
            ) : trainings.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="folder-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Training Programs
                </Text>
                <Text style={[styles.emptyText, { color: colors.description }]}>
                  Create a program to organize your sessions
                </Text>
              </View>
            ) : (
              <>
                {trainings.map((training) => {
                  const trainingSessions = trainingSessionsMap.get(training.id) || [];
                  const isExpanded = selectedTraining === training.id;

                  return (
                    <View key={training.id} style={styles.programCard}>
                      <TouchableOpacity
                        style={[
                          styles.programHeader,
                          {
                            backgroundColor: colors.cardBackground,
                            borderColor: colors.border,
                          },
                        ]}
                        onPress={() =>
                          setSelectedTraining(isExpanded ? null : training.id)
                        }
                      >
                        <View
                          style={[
                            styles.programIcon,
                            { backgroundColor: colors.indigo + "20" },
                          ]}
                        >
                          <Ionicons name="folder" size={24} color={colors.indigo} />
                        </View>
                        <View style={styles.programInfo}>
                          <Text style={[styles.programName, { color: colors.text }]}>
                            {training.name}
                          </Text>
                          {training.description && (
                            <Text
                              style={[
                                styles.programDescription,
                                { color: colors.description },
                              ]}
                            >
                              {training.description}
                            </Text>
                          )}
                          <View style={styles.programMeta}>
                            <View
                              style={[
                                styles.sessionCount,
                                { backgroundColor: colors.green + "15" },
                              ]}
                            >
                              <Ionicons name="list" size={12} color={colors.green} />
                              <Text
                                style={[styles.sessionCountText, { color: colors.green }]}
                              >
                                {trainingSessions.length} sessions
                              </Text>
                            </View>
                          </View>
                        </View>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={22}
                          color={colors.textMuted}
                        />
                      </TouchableOpacity>

                      {/* Expanded Sessions */}
                      {isExpanded && trainingSessions.length > 0 && (
                        <View style={styles.sessionsList}>
                          {trainingSessions.map((session) => (
                            <View
                              key={session.id}
                              style={[
                                styles.sessionItem,
                                {
                                  backgroundColor: colors.background,
                                  borderColor: colors.border,
                                },
                              ]}
                            >
                              <Ionicons
                                name={session.ended_at ? "checkmark-circle" : "time"}
                                size={18}
                                color={session.ended_at ? colors.green : colors.orange}
                              />
                              <View style={styles.sessionInfo}>
                                <Text style={[styles.sessionName, { color: colors.text }]}>
                                  {session.name || "Unnamed Session"}
                                </Text>
                                <Text
                                  style={[
                                    styles.sessionDate,
                                    { color: colors.description },
                                  ]}
                                >
                                  {formatSessionDate(session.started_at)}
                                  {session.range_location && ` • ${session.range_location}`}
                                </Text>
                              </View>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {/* General Sessions (no training) */}
                {generalSessions.length > 0 && (
                  <View style={styles.programCard}>
                    <View
                      style={[
                        styles.programHeader,
                        {
                          backgroundColor: colors.cardBackground,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.programIcon,
                          { backgroundColor: colors.textMuted + "20" },
                        ]}
                      >
                        <Ionicons name="list" size={24} color={colors.textMuted} />
                      </View>
                      <View style={styles.programInfo}>
                        <Text style={[styles.programName, { color: colors.text }]}>
                          General Sessions
                        </Text>
                        <Text
                          style={[
                            styles.programDescription,
                            { color: colors.description },
                          ]}
                        >
                          Sessions without a specific program
                        </Text>
                        <View style={styles.programMeta}>
                          <View
                            style={[
                              styles.sessionCount,
                              { backgroundColor: colors.textMuted + "15" },
                            ]}
                          >
                            <Ionicons name="list" size={12} color={colors.textMuted} />
                            <Text
                              style={[
                                styles.sessionCountText,
                                { color: colors.textMuted },
                              ]}
                            >
                              {generalSessions.length} sessions
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        ) : (
          <View style={styles.sessionsView}>
            {sessionsLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color={colors.green} />
              </View>
            ) : sessions.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="list-outline" size={56} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Sessions Yet
                </Text>
                <Text style={[styles.emptyText, { color: colors.description }]}>
                  Start tracking your training sessions
                </Text>
              </View>
            ) : (
              sessions.map((session) => {
                const training = trainings.find((t) => t.id === session.training_id);
                const isActive = !session.ended_at;

                return (
                  <View
                    key={session.id}
                    style={[
                      styles.sessionCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <View style={styles.sessionCardHeader}>
                      <View
                        style={[
                          styles.sessionIcon,
                          { 
                            backgroundColor: isActive 
                              ? colors.orange + "20" 
                              : colors.green + "20" 
                          },
                        ]}
                      >
                        <Ionicons 
                          name={isActive ? "time" : "checkmark-circle"} 
                          size={20} 
                          color={isActive ? colors.orange : colors.green} 
                        />
                      </View>
                      <View style={styles.sessionCardInfo}>
                        <View style={styles.sessionTitleRow}>
                          <Text style={[styles.sessionCardName, { color: colors.text }]}>
                            {session.name || "Unnamed Session"}
                          </Text>
                          {isActive && (
                            <View style={[styles.activeBadge, { backgroundColor: colors.orange + "15" }]}>
                              <Text style={[styles.activeBadgeText, { color: colors.orange }]}>
                                Active
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.sessionCardDate, { color: colors.description }]}
                        >
                          {formatSessionDateLong(session.started_at)}
                          {session.range_location && ` • ${session.range_location}`}
                        </Text>
                        {training && (
                          <View
                            style={[
                              styles.trainingBadge,
                              { backgroundColor: colors.indigo + "15" },
                            ]}
                          >
                            <Ionicons name="folder" size={12} color={colors.indigo} />
                            <Text
                              style={[styles.trainingBadgeText, { color: colors.indigo }]}
                            >
                              {training.name}
                            </Text>
                          </View>
                        )}
                        {session.is_squad && (
                          <View
                            style={[
                              styles.squadBadge,
                              { backgroundColor: colors.blue + "15" },
                            ]}
                          >
                            <Ionicons name="people" size={12} color={colors.blue} />
                            <Text
                              style={[styles.squadBadgeText, { color: colors.blue }]}
                            >
                              Squad Training
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderBottomWidth: 3,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  programsView: {
    gap: 12,
    paddingBottom: 40,
  },
  sessionsView: {
    gap: 10,
    paddingBottom: 40,
  },
  loading: {
    paddingVertical: 60,
    alignItems: "center",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 80,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
  },
  programCard: {
    marginBottom: 12,
  },
  programHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 14,
  },
  programIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  programInfo: {
    flex: 1,
    gap: 6,
  },
  programName: {
    fontSize: 17,
    fontWeight: "700",
  },
  programDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  programMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  sessionCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  sessionCountText: {
    fontSize: 12,
    fontWeight: "700",
  },
  sessionsList: {
    marginTop: 8,
    gap: 8,
    paddingLeft: 16,
  },
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  sessionInfo: {
    flex: 1,
    gap: 4,
  },
  sessionName: {
    fontSize: 14,
    fontWeight: "600",
  },
  sessionDate: {
    fontSize: 12,
  },
  sessionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  sessionCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sessionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sessionCardInfo: {
    flex: 1,
    gap: 6,
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessionCardName: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  sessionCardDate: {
    fontSize: 13,
  },
  trainingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  trainingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  squadBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  squadBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
});