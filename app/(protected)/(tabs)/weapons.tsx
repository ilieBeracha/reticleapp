import { ThemedView } from "@/components/ThemedView";
import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function AIInsightsPage() {
  const colors = useColors();

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            AI Insights
          </Text>
          <View style={[styles.betaBadge, { backgroundColor: colors.accent + '20' }]}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={[styles.betaText, { color: colors.accent }]}>BETA</Text>
          </View>
        </View>

        {/* Quick Recommendation Card */}
        <View style={[styles.recommendationCard, { backgroundColor: colors.card }]}>
          <View style={[styles.recommendationIcon, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="bulb" size={32} color={colors.accent} />
          </View>
          <Text style={[styles.recommendationTitle, { color: colors.text }]}>
            Recommended Next Drill
          </Text>
          <Text style={[styles.recommendationText, { color: colors.textMuted }]}>
            Based on your recent sessions, focus on long-range precision shots at 800m. 
            Your grouping improves significantly at shorter distances but needs work at extended ranges.
          </Text>
          <TouchableOpacity style={[styles.recommendationButton, { backgroundColor: colors.accent }]}>
            <Text style={styles.recommendationButtonText}>View Drill Details</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Insights Grid */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Insights</Text>

        <View style={styles.insightGrid}>
          <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
            <View style={[styles.insightIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="trending-up" size={24} color={colors.primary} />
            </View>
            <Text style={[styles.insightValue, { color: colors.text }]}>+12%</Text>
            <Text style={[styles.insightLabel, { color: colors.textMuted }]}>
              Accuracy improved this week
            </Text>
          </View>

          <View style={[styles.insightCard, { backgroundColor: colors.card }]}>
            <View style={[styles.insightIcon, { backgroundColor: colors.green + '15' }]}>
              <Ionicons name="fitness" size={24} color={colors.green} />
            </View>
            <Text style={[styles.insightValue, { color: colors.text }]}>3x</Text>
            <Text style={[styles.insightLabel, { color: colors.textMuted }]}>
              More prone position needed
            </Text>
          </View>
        </View>

        {/* Analysis Card */}
        <View style={[styles.analysisCard, { backgroundColor: colors.card }]}>
          <View style={styles.analysisHeader}>
            <Ionicons name="analytics" size={24} color={colors.primary} />
            <Text style={[styles.analysisTitle, { color: colors.text }]}>
              Performance Analysis
            </Text>
          </View>
          <Text style={[styles.analysisText, { color: colors.textMuted }]}>
            Your strongest position is standing (85% accuracy), while prone needs improvement (68%). 
            Wind estimation accuracy has improved by 15% over the last month.
          </Text>
        </View>

        {/* Coming Soon Features */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Coming Soon</Text>
        
        <View style={[styles.comingSoonCard, { backgroundColor: colors.card }]}>
          <Ionicons name="chatbubbles" size={28} color={colors.textMuted} />
          <Text style={[styles.comingSoonTitle, { color: colors.text }]}>
            AI Training Coach
          </Text>
          <Text style={[styles.comingSoonText, { color: colors.textMuted }]}>
            Chat with your personal AI training assistant for real-time guidance
          </Text>
        </View>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
    gap: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -1,
  },
  betaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  betaText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  recommendationCard: {
    padding: 24,
    borderRadius: 18,
    alignItems: "center",
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  recommendationIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendationTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  recommendationText: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  recommendationButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  recommendationButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    marginTop: 8,
  },
  insightGrid: {
    flexDirection: "row",
    gap: 12,
  },
  insightCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  insightIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  insightValue: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -1,
  },
  insightLabel: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 18,
  },
  analysisCard: {
    padding: 20,
    borderRadius: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  analysisHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  analysisText: {
    fontSize: 15,
    fontWeight: "500",
    lineHeight: 22,
  },
  comingSoonCard: {
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  comingSoonTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  comingSoonText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
});
