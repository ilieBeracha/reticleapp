// store/organizationPreferencesStore.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

interface OrgAccess {
  orgId: string;
  orgName: string;
  lastAccessedAt: string;
  accessCount: number;
}

interface OrganizationPreferencesStore {
  recentOrgs: OrgAccess[];
  favoriteOrgIds: string[];

  trackOrgSwitch: (orgId: string, orgName: string) => void;
  toggleFavorite: (orgId: string) => void;
  getTopRecent: (limit?: number) => OrgAccess[];
  clearRecent: () => void;
}

export const useOrganizationPreferencesStore = create<OrganizationPreferencesStore>()(
  persist(
    (set, get) => ({
      recentOrgs: [],
      favoriteOrgIds: [],

      trackOrgSwitch: (orgId: string, orgName: string) => {
        set((state) => {
          const existing = state.recentOrgs.find((o) => o.orgId === orgId);

          if (existing) {
            // Update existing entry
            return {
              recentOrgs: state.recentOrgs
                .map((o) =>
                  o.orgId === orgId
                    ? {
                        ...o,
                        accessCount: o.accessCount + 1,
                        lastAccessedAt: new Date().toISOString(),
                      }
                    : o
                )
                .sort((a, b) => {
                  // Sort by access count first, then recency
                  if (a.accessCount !== b.accessCount) {
                    return b.accessCount - a.accessCount;
                  }
                  return (
                    new Date(b.lastAccessedAt).getTime() -
                    new Date(a.lastAccessedAt).getTime()
                  );
                }),
            };
          } else {
            // Add new entry
            const newOrg: OrgAccess = {
              orgId,
              orgName,
              lastAccessedAt: new Date().toISOString(),
              accessCount: 1,
            };

            return {
              recentOrgs: [newOrg, ...state.recentOrgs].slice(0, 10), // Keep top 10
            };
          }
        });
      },

      toggleFavorite: (orgId: string) => {
        set((state) => ({
          favoriteOrgIds: state.favoriteOrgIds.includes(orgId)
            ? state.favoriteOrgIds.filter((id) => id !== orgId)
            : [...state.favoriteOrgIds, orgId],
        }));
      },

      getTopRecent: (limit = 5) => {
        return get().recentOrgs.slice(0, limit);
      },

      clearRecent: () => {
        set({ recentOrgs: [] });
      },
    }),
    {
      name: "org-preferences",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
