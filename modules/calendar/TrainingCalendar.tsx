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
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useStore } from "zustand";

const SCREEN_WIDTH = Dimensions.get("window").width;

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  hasEvents: boolean;
  sessions: SessionStats[];
}

export function TrainingCalendar() {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId } = useOrganizationsStore();
  const { sessions, loading: sessionsLoading, fetchSessions } = useStore(sessionStatsStore);
  const { trainings, fetchTrainings } = useStore(trainingsStore);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [view, setView] = useState<"month" | "list">("month");

  useEffect(() => {
    if (user?.id) {
      fetchSessions(user.id, selectedOrgId);
      fetchTrainings(user.id, selectedOrgId);
    }
  }, [user?.id, selectedOrgId]);

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const dayDate = new Date(year, month - 1, day);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: false,
        hasEvents: false,
        sessions: [],
      });
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      const daySessions = sessions.filter((session) => {
        const sessionDate = new Date(session.created_at);
        return (
          sessionDate.getFullYear() === year &&
          sessionDate.getMonth() === month &&
          sessionDate.getDate() === day
        );
      });

      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isToday: dayDate.getTime() === today.getTime(),
        hasEvents: daySessions.length > 0,
        sessions: daySessions,
      });
    }

    // Next month days
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const dayDate = new Date(year, month + 1, day);
      days.push({
        date: dayDate,
        isCurrentMonth: false,
        isToday: false,
        hasEvents: false,
        sessions: [],
      });
    }

    return days;
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const calendarDays = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const upcomingSessions = sessions
    .filter((session) => new Date(session.created_at) >= new Date())
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, 5);

  const recentSessions = sessions
    .filter((session) => new Date(session.created_at) < new Date())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const selectedDaySessions = selectedDate
    ? sessions.filter((session) => {
        const sessionDate = new Date(session.created_at);
        return (
          sessionDate.getFullYear() === selectedDate.getFullYear() &&
          sessionDate.getMonth() === selectedDate.getMonth() &&
          sessionDate.getDate() === selectedDate.getDate()
        );
      })
    : [];

  const getTrainingName = (trainingId: string | null) => {
    if (!trainingId) return "General Training";
    const training = trainings.find((t) => t.id === trainingId);
    return training?.name || "Unknown Training";
  };

  const formatSessionTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatSessionDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="calendar" size={20} color={colors.indigo} />
          <Text style={[styles.statValue, { color: colors.text }]}>{sessions.length}</Text>
          <Text style={[styles.statLabel, { color: colors.description }]}>
            Total Sessions
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="time" size={20} color={colors.green} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {upcomingSessions.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.description }]}>Upcoming</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="trophy" size={20} color={colors.orange} />
          <Text style={[styles.statValue, { color: colors.text }]}>
            {trainings.length}
          </Text>
          <Text style={[styles.statLabel, { color: colors.description }]}>Programs</Text>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            {
              backgroundColor:
                view === "month" ? colors.tint + "15" : colors.cardBackground,
              borderColor: view === "month" ? colors.tint : colors.border,
            },
          ]}
          onPress={() => setView("month")}
        >
          <Ionicons
            name="calendar"
            size={18}
            color={view === "month" ? colors.tint : colors.textMuted}
          />
          <Text
            style={[
              styles.toggleText,
              { color: view === "month" ? colors.tint : colors.text },
            ]}
          >
            Month
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleButton,
            {
              backgroundColor: view === "list" ? colors.tint + "15" : colors.cardBackground,
              borderColor: view === "list" ? colors.tint : colors.border,
            },
          ]}
          onPress={() => setView("list")}
        >
          <Ionicons
            name="list"
            size={18}
            color={view === "list" ? colors.tint : colors.textMuted}
          />
          <Text
            style={[
              styles.toggleText,
              { color: view === "list" ? colors.tint : colors.text },
            ]}
          >
            List
          </Text>
        </TouchableOpacity>
      </View>

      {view === "month" ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Calendar Header */}
          <View style={styles.calendarHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Ionicons name="chevron-back" size={24} color={colors.tint} />
            </TouchableOpacity>
            <Text style={[styles.monthTitle, { color: colors.text }]}>{monthName}</Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Ionicons name="chevron-forward" size={24} color={colors.tint} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={goToToday} style={styles.todayButton}>
            <Text style={[styles.todayText, { color: colors.tint }]}>Today</Text>
          </TouchableOpacity>

          {/* Day Names */}
          <View style={styles.dayNamesRow}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <View key={day} style={styles.dayNameCell}>
                <Text style={[styles.dayName, { color: colors.textMuted }]}>{day}</Text>
              </View>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.calendarGrid}>
            {calendarDays.map((day, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.dayCell,
                  day.isToday && {
                    backgroundColor: colors.tint + "15",
                    borderRadius: 8,
                  },
                  selectedDate?.getTime() === day.date.getTime() && {
                    backgroundColor: colors.tint,
                    borderRadius: 8,
                  },
                ]}
                onPress={() => setSelectedDate(day.date)}
              >
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: day.isCurrentMonth ? colors.text : colors.textMuted,
                      opacity: day.isCurrentMonth ? 1 : 0.4,
                    },
                    selectedDate?.getTime() === day.date.getTime() && {
                      color: "#fff",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {day.date.getDate()}
                </Text>
                {day.hasEvents && (
                  <View
                    style={[
                      styles.eventDot,
                      {
                        backgroundColor:
                          selectedDate?.getTime() === day.date.getTime()
                            ? "#fff"
                            : colors.indigo,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected Day Sessions */}
          {selectedDate && (
            <View style={styles.selectedDaySection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {selectedDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
                </Text>
                {selectedDaySessions.length > 0 ? (
                selectedDaySessions.map((session) => (
                  <View
                    key={session.id}
                    style={[
                      styles.sessionCard,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    ]}
                  >
                    <View style={styles.sessionHeader}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.indigo} />
                      <Text style={[styles.sessionName, { color: colors.text }]}>
                        {session.name || "Training Session"}
                      </Text>
                    </View>
                    <Text style={[styles.sessionTime, { color: colors.description }]}>
                      {formatSessionTime(session.created_at)}
                    </Text>
                    {session.training_id && (
                      <Text style={[styles.trainingName, { color: colors.textMuted }]}>
                        {getTrainingName(session.training_id)}
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.noSessions}>
                  <Text style={[styles.noSessionsText, { color: colors.textMuted }]}>
                    No training sessions on this day
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Upcoming Section */}
          {upcomingSessions.length > 0 && (
            <View style={styles.listSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Upcoming Sessions
              </Text>
              {upcomingSessions.map((session) => (
                <View
                  key={session.id}
                  style={[
                    styles.sessionCard,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <Ionicons name="calendar-outline" size={20} color={colors.green} />
                    <Text style={[styles.sessionName, { color: colors.text }]}>
                      {session.name || "Training Session"}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDate, { color: colors.description }]}>
                    {formatSessionDate(session.created_at)} at{" "}
                    {formatSessionTime(session.created_at)}
                  </Text>
                  {session.training_id && (
                    <Text style={[styles.trainingName, { color: colors.textMuted }]}>
                      {getTrainingName(session.training_id)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* Recent Sessions */}
          <View style={styles.listSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Sessions</Text>
            {sessionsLoading ? (
              <ActivityIndicator size="large" color={colors.tint} style={{ marginTop: 20 }} />
            ) : recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <View
                  key={session.id}
                  style={[
                    styles.sessionCard,
                    { backgroundColor: colors.cardBackground, borderColor: colors.border },
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.indigo} />
                    <Text style={[styles.sessionName, { color: colors.text }]}>
                      {session.name || "Training Session"}
                    </Text>
                  </View>
                  <Text style={[styles.sessionDate, { color: colors.description }]}>
                    {formatSessionDate(session.created_at)} at{" "}
                    {formatSessionTime(session.created_at)}
                  </Text>
                  {session.training_id && (
                    <Text style={[styles.trainingName, { color: colors.textMuted }]}>
                      {getTrainingName(session.training_id)}
                    </Text>
                  )}
                </View>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No training sessions yet
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    gap: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  viewToggle: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  navButton: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  todayButton: {
    alignSelf: "center",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  todayText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dayNamesRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayNameCell: {
    width: (SCREEN_WIDTH - 32) / 7,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayName: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  dayCell: {
    width: (SCREEN_WIDTH - 32) / 7,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 4,
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: "absolute",
    bottom: 6,
  },
  selectedDaySection: {
    marginBottom: 20,
  },
  listSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",        
    marginBottom: 12,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  sessionCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
    gap: 6,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  sessionTime: {
    fontSize: 13,
    marginLeft: 30,
  },
  sessionDate: {
    fontSize: 13,
    marginLeft: 30,
  },
  trainingName: {
    fontSize: 12,
    marginLeft: 30,
  },
  noSessions: {
    padding: 20,
    alignItems: "center",
  },
  noSessionsText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
  },
});

