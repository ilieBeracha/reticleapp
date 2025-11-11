// hooks/organizations/useOrgCreationGuide.ts
// Centralizes copy and rules for organization creation guidance
import { useMemo } from "react";

export type OrgLevel = "Unit" | "Team" | "Squad";

export interface OrgGuideCard {
  level: OrgLevel;
  title: string;
  tagline: string;
  bullets: string[];
  disabled?: boolean;
  disabledReason?: string;
  recommended?: boolean;
}

export interface OrgCreationGuideOptions {
  parentType?: OrgLevel | null; // null means root creation
}

const HIERARCHY: OrgLevel[] = ["Unit", "Team", "Squad"];
export const MAX_DEPTH = 2; // 0=root, 1=child, 2=grandchild

function nextLevelFor(parentType?: OrgLevel | null): OrgLevel | null {
  if (!parentType) return null;
  const idx = HIERARCHY.indexOf(parentType);
  if (idx < 0 || idx >= HIERARCHY.length - 1) return null;
  return HIERARCHY[idx + 1];
}

export function useOrgCreationGuide(options: OrgCreationGuideOptions) {
  const { parentType = null } = options;
  const next = useMemo(() => nextLevelFor(parentType), [parentType]);

  const cards: OrgGuideCard[] = useMemo(() => {
    const base: Record<OrgLevel, OrgGuideCard> = {
      Unit: {
        level: "Unit",
        title: "Unit",
        tagline: "Top-level command",
        bullets: [
          "Scope: All teams and squads underneath",
          "Who sees: Commanders and members within this unit",
          "Can create sub‑orgs: Teams and Squads",
          "Best for: Battalions, departments, or primary orgs",
        ],
      },
      Team: {
        level: "Team",
        title: "Team",
        tagline: "Middle layer",
        bullets: [
          "Scope: All squads underneath",
          "Who sees: Team commanders and members",
          "Can create sub‑orgs: Squads only",
          "Best for: Groups within a Unit (Alpha Team, Bravo Team)",
        ],
      },
      Squad: {
        level: "Squad",
        title: "Squad",
        tagline: "Execution layer",
        bullets: [
          "Scope: Squad only",
          "Who sees: Squad commander and members",
          "Can create sub‑orgs: None (maximum depth)",
          "Best for: Small tactical groups or fixed crews",
        ],
      },
    };

    // Apply parent constraints
    if (!parentType) {
      // Root creation: allow all, but set recommended based on typical hierarchy
      base.Unit.recommended = true;
      base.Team.bullets = [
        ...base.Team.bullets,
        "Note: Root Team means no Unit above it",
      ];
      base.Squad.bullets = [
        ...base.Squad.bullets,
        "Note: Root Squad cannot have sub‑orgs",
      ];
    } else if (parentType === "Unit") {
      // From Unit: Team is recommended; Squad is allowed (skips Team)
      base.Unit.disabled = true;
      base.Unit.disabledReason = "Already at Unit level";
      base.Team.recommended = true;
    } else if (parentType === "Team") {
      // From Team: Only Squad allowed
      base.Unit.disabled = true;
      base.Unit.disabledReason = "Too high for this position";
      base.Team.disabled = true;
      base.Team.disabledReason = "Already at Team level";
      base.Squad.recommended = true;
    } else if (parentType === "Squad") {
      // From Squad: No further depth allowed
      base.Unit.disabled = true;
      base.Unit.disabledReason = "Maximum depth reached";
      base.Team.disabled = true;
      base.Team.disabledReason = "Maximum depth reached";
      base.Squad.disabled = true;
      base.Squad.disabledReason = "Maximum depth reached";
    }

    return [base.Unit, base.Team, base.Squad];
  }, [parentType]);

  return {
    cards,
    nextRecommended: next,
    isAtMaxDepth: parentType === "Squad",
  };
}


