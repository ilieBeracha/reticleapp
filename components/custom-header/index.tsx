import { Badge } from "@/components/ui/badge";
import { Box } from "@/components/ui/box";
import { HStack } from "@/components/ui/hstack";
import { Icon } from "@/components/ui/icon";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useOrganization } from "@clerk/clerk-expo";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Bell, Building2, Menu, Mic, Search, User } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { OrganizationSwitcherModal } from "../OrganizationSwitcherModal";
import ProfileDropdown from "../ProfileDropdown";

interface CustomHeaderProps {
  variant?: "general" | "search";
  title?: string;
  label?: string;
  onNotificationPress?: () => void;
  notificationCount?: number;
}

const CustomHeader = ({
  variant = "general",
  title,
  label,
  onNotificationPress,
  notificationCount = 0,
}: CustomHeaderProps) => {
  const { organization } = useOrganization();
  const [profileOpen, setProfileOpen] = useState(false);
  const [orgSwitcherOpen, setOrgSwitcherOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const handleOrgSwitcherPress = () => {
    if (orgSwitcherOpen) return;
    setOrgSwitcherOpen(true);
  };

  const handleMenuAction = (action: string) => {
    if (action === "settings") {
      router.push("/(home)/settings");
    } else if (action === "loadout") {
      router.push("/(home)/loadout");
    }
  };

  return (
    <Box className="overflow-hidden ">
      <LinearGradient
        colors={["#111827", "#111118", "#111827"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: variant === "search" ? 24 : 20,
          paddingHorizontal: 20,
        }}
      >
        {/* Top Bar with Organization Badge and Actions */}
        <HStack className="items-center justify-between mb-6 flex gap-2">
          {/* Organization Badge */}
          <Pressable
            className="border-0 rounded-full p-2 flex items-center gap-2 flex-row glassmorphism bg-white/20"
            onPress={handleOrgSwitcherPress}
          >
            <Badge
              action="info"
              variant="solid"
              size="md"
              className="border-0 p-0 bg-transparent"
            >
              <Icon
                as={organization ? Building2 : User}
                size="lg"
                className="text-white"
              />
            </Badge>
            <Text className="text-white font-semibold">
              {organization?.name || "Personal"}
            </Text>
          </Pressable>

          {/* Actions */}
          <HStack space="md" className="items-center">
            <Pressable onPress={onNotificationPress}>
              <Box className="relative">
                <Icon as={Bell} size="md" className="text-white" />
                {notificationCount > 0 && (
                  <Box className="absolute -top-1 -right-1 bg-error-500 w-4 h-4 rounded-full border-2 border-white" />
                )}
              </Box>
            </Pressable>
            <Pressable onPress={() => setProfileOpen(true)}>
              <Icon as={Menu} size="md" className="text-white" />
            </Pressable>
          </HStack>
        </HStack>

        {/* Main Content */}
        <VStack space="md">
          {title && (
            <Text className="text-white font-bold text-3xl">{title}</Text>
          )}
          {label && !title && (
            <Text className="text-white/90 font-medium text-lg">{label}</Text>
          )}
        </VStack>

        {/* Search Input */}
        {variant === "search" && (
          <Box className="mt-4">
            <Input
              variant="outline"
              className="border-0 bg-white/20 rounded-xl"
              size="lg"
            >
              <InputSlot>
                <InputIcon as={Search} className="text-white/70" />
              </InputSlot>
              <InputField
                placeholder={label || "Search..."}
                placeholderTextColor="rgba(255,255,255,0.7)"
                className="text-white"
              />
              <InputSlot>
                <InputIcon as={Mic} className="text-white/70" />
              </InputSlot>
            </Input>
          </Box>
        )}
      </LinearGradient>

      {/* Modals */}
      <ProfileDropdown
        onClose={() => setProfileOpen(false)}
        visible={profileOpen}
        menuItems={[
          {
            icon: "telescope-outline",
            label: "loadout",
            action: "loadout",
          },
          {
            icon: "settings-outline",
            label: "settings",
            action: "settings",
          },
        ]}
        onMenuAction={handleMenuAction}
      />

      <OrganizationSwitcherModal
        visible={orgSwitcherOpen}
        onClose={() => setOrgSwitcherOpen(false)}
      />
    </Box>
  );
};

export default CustomHeader;
