// components/organizations/OrganizationModal.tsx
// Simplified: Shows current org with permissions

import BaseBottomSheet from "@/components/BaseBottomSheet";
import { InviteMemberModal } from "@/components/InviteMemberModal";
import { OrgInfoView } from "@/components/organizations/OrgInfoView";
import { OrgListView } from "@/components/organizations/OrgListView";
import { useAuth } from "@/contexts/AuthContext";
import { CreateChildOrgModal } from "@/modules/manage/CreateChildOrgModal";
import { CreateRootOrgModal } from "@/modules/manage/CreateRootOrgModal";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useEffect, useState } from "react";
import { OrgMembersSheet } from "./OrgMembersSheet";

interface OrganizationModalProps {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationModal({ visible, onClose }: OrganizationModalProps) {
  const { user } = useAuth();
  const { 
    userOrgContext, 
    selectedOrgId, 
    switchOrganization, 
    fetchUserContext, 
    orgChildren, 
    fetchOrgChildren,
    userOrgs,
    fetchUserOrgs
  } = useOrganizationsStore();
  
  const [viewMode, setViewMode] = useState<"info" | "list">("info");
  const [showCreateRoot, setShowCreateRoot] = useState(false);
  const [showCreateChild, setShowCreateChild] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showMembers, setShowMembers] = useState(false);

  // Load user context when modal opens
  useEffect(() => {
    if (visible && user) {
      fetchUserContext(user.id);
      fetchUserOrgs(user.id);
      if (selectedOrgId) {
        fetchOrgChildren(selectedOrgId);
      }
    }
  }, [visible, user, selectedOrgId]);

  // Reset to info view when modal opens
  useEffect(() => {
    if (visible) {
      setViewMode("info");
    }
  }, [visible]);

  const isPersonalMode = !selectedOrgId;

  const handleRefresh = async () => {
    if (user) {
      await fetchUserContext(user.id);
      await fetchUserOrgs(user.id);
      if (selectedOrgId) {
        await fetchOrgChildren(selectedOrgId);
      }
    }
  };

  // Check if user has any organizations
  const hasOrganizations = userOrgs.length > 0;

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
          <OrgInfoView
            orgContext={userOrgContext}
            isPersonalMode={isPersonalMode}
            childOrgs={orgChildren}
            hasOrganizations={hasOrganizations}
            onCreateChild={() => {
              onClose();
              setShowCreateChild(true);
            }}
            onInviteMembers={() => {
              onClose();
              setShowInviteMember(true);
            }}
            onViewMembers={() => {
              onClose();
              setShowMembers(true);
            }}
            onEditSettings={() => {
              // TODO: Navigate to settings screen
            }}
            onSwitchOrg={() => setViewMode("list")}
          />
        ) : (
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

      {userOrgContext && (
        <>
          <CreateChildOrgModal
            visible={showCreateChild}
            onClose={() => setShowCreateChild(false)}
            parentId={selectedOrgId!}
            parentName={userOrgContext.orgName}
            onSuccess={() => {
              setShowCreateChild(false);
              handleRefresh();
            }}
          />

          <OrgMembersSheet
            visible={showMembers}
            onClose={() => setShowMembers(false)}
            orgId={userOrgContext.orgId}
            orgName={userOrgContext.orgName}
            userRole={userOrgContext.role}
            onInvite={() => setShowInviteMember(true)}
            onCreateChild={(orgId, orgName) => {
              // Handle create child for specific org
              setShowCreateChild(true);
            }}
            onInviteToOrg={(orgId, orgName) => {
              // Handle invite to specific org
              setShowInviteMember(true);
            }}
          />
        </>
      )}

      <InviteMemberModal
        visible={showInviteMember}
        onClose={() => setShowInviteMember(false)}
      />
    </>
  );
}
