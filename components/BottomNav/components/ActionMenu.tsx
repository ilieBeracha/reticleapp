import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useThemeColor } from "@/hooks/useThemeColor";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export interface Action {
  title: string;
  description: string;
  icon: string;
  action: string;
}

interface ActionMenuProps {
  visible: boolean;
  onClose: () => void;
}

const actions: Action[] = [
  {
    title: "Scan Target",
    description: "Scan and calculate hits",
    icon: "scan-outline",
    action: "scan",
  },

  {
    title: "Create Session",
    description: "Create a new session",
    icon: "create-outline",
    action: "create-session",
  },
];

export default function ActionMenu({ visible, onClose }: ActionMenuProps) {
  const cardForeground = useThemeColor({}, "text");
  const muted = useThemeColor({}, "cardBackground");
  const mutedForeground = useThemeColor({}, "description");
  const primary = useThemeColor({}, "buttonText");
  const primaryForeground = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "cardBackground");
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide down
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Close drawer
          closeDrawer();
        } else {
          // Snap back
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
          }).start();
        }
      },
    })
  ).current;

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleActionSelect = (action: string) => {
    closeDrawer();
    setTimeout(() => {
      console.log("Action selected:", action);

      switch (action) {
        case "scan":
          //   router.push("/(protected)/target-scan");
          break;
        case "edit":
          console.log("Navigate to edit session");
          break;
        case "create-session":
          //   router.push("/(protected)/create-session");
          break;
        case "add-member":
          console.log("Navigate to add team member");
          break;
        default:
          console.log("Unknown action:", action);
      }
    }, 100);
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      <View style={styles.modalContainer}>
        {/* Backdrop */}
        <Animated.View
          style={[
            styles.backdrop,
            {
              opacity: backdropOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={closeDrawer}
          />
        </Animated.View>

        {/* Drawer */}
        <Animated.View
          style={[styles.drawerContainer, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={[styles.drawer, { backgroundColor }]}>
            {/* Handle */}
            <View style={styles.handleContainer}>
              <View
                style={[styles.handle, { backgroundColor: mutedForeground }]}
              />
            </View>

            {/* Title */}
            <Text style={[styles.drawerTitle, { color: cardForeground }]}>
              Quick Actions
            </Text>

            {/* Actions */}
            <View style={styles.actionsContainer}>
              {actions.map((action, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.actionItem, { backgroundColor: muted }]}
                  onPress={() => handleActionSelect(action.action)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.actionIconContainer,
                      { backgroundColor: primary },
                    ]}
                  >
                    <Ionicons
                      name={action.icon as any}
                      size={24}
                      color={primaryForeground}
                    />
                  </View>
                  <View style={styles.actionText}>
                    <Text
                      style={[styles.actionTitle, { color: cardForeground }]}
                    >
                      {action.title}
                    </Text>
                    <Text
                      style={[
                        styles.actionDescription,
                        { color: mutedForeground },
                      ]}
                    >
                      {action.description}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={mutedForeground}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  drawerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  drawer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  handleContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: "700",
    paddingHorizontal: 24,
    marginBottom: 20,
    marginTop: 8,
  },
  actionsContainer: {
    gap: 10,
    paddingHorizontal: 16,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 14,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  actionText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 3,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
