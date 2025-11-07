// components/organizations/OrganizationModal.tsx
// Main entry point: Shows org info first, can switch to org list

import BaseBottomSheet from "@/components/BaseBottomSheet";
import { InviteMemberModal } from "@/components/InviteMemberModal";
import { OrgInfoView } from "@/components/organizations/OrgInfoView";
import { OrgListView } from "@/components/organizations/OrgListView";
import { useAuth } from "@/contexts/AuthContext";
import { CreateChildOrgModal } from "@/modules/manage/CreateChildOrgModal";
import { CreateRootOrgModal } from "@/modules/manage/CreateRootOrgModal";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useEffect, useState } from "react";

interface OrganizationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationModal({ visible, onClose }: OrganizationModalProps) {
  const { user } = useAuth();
  const { selectedOrgId, accessibleOrgs, fetchAccessibleOrgs } = useOrganizationsStore();
  
  const [viewMode, setViewMode] = useState<"info" | "list">("info");
  const [showCreateRoot, setShowCreateRoot] = useState(false);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  // Load orgs when modal opens
  useEffect(() => {
    if (visible && user) {
      fetchAccessibleOrgs(user.id);
    }
  }, [visible, user]);

  // Reset to info view when modal opens
  useEffect(() => {
    if (visible) {
      setViewMode("info");
    }
  }, [visible]);

  const currentOrg = accessibleOrgs.find(o => o.id === selectedOrgId) || null;
  const isPersonalMode = !selectedOrgId;

  const handleRefresh = async () => {
    if (user) {
      await fetchAccessibleOrgs(user.id);
    }
  };

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        scrollable={true}
        enableDynamicSizing={true}
        enableKeyboardAutoSnap={true}
      >
        {viewMode === "info" ? (
          /* Show Info/Actions View */
          <OrgInfoView
            org={currentOrg}
            isPersonalMode={isPersonalMode}
            onCreateChild={() => {
              onClose();
              setShowCreateChild(true);
            }}
            onInviteMembers={() => {
              onClose();
              setShowInviteMember(true);
            }}
            onViewMembers={() => {
              // TODO: Navigate to members screen
            }}
            onEditSettings={() => {
              // TODO: Navigate to settings screen
            }}
            onSwitchOrg={() => setViewMode("list")}
          />
        ) : (
          /* Show List View */
          <OrgListView
            onBack={() => setViewMode("info")}
            onClose={onClose}
            onCreateRoot={() => {
              onClose();
              setShowCreateRoot(true);
            }}
            onCreateChild={() => {
              onClose();
              setShowCreateChild(true);
            }}
            onInviteMembers={() => {
              onClose();
              setShowInviteMember(true);
            }}
          />
        )}
      </BaseBottomSheet>

      {/* Modals */}
      <CreateRootOrgModal
        visible={showCreateRoot}
        onClose={() => setShowCreateRoot(false)}
        onSuccess={() => {
          setShowCreateRoot(false);
          handleRefresh();
        }}
      />

      {currentOrg && (
        <CreateChildOrgModal
          visible={showCreateChild}
          onClose={() => setShowCreateChild(false)}
          parentId={selectedOrgId!}
          parentName={currentOrg.name}
          onSuccess={() => {
            setShowCreateChild(false);
            handleRefresh();
          }}
        />
      )}

      <InviteMemberModal
        visible={showInviteMember}
        onClose={() => setShowInviteMember(false)}
      />
    </>
  );
}

