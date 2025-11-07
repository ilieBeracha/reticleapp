// types/organizations.ts
export interface Organization {
  id: string;
  name: string;
  org_type: string;
  parent_id: string | null;
  root_id: string;
  path: string[];
  depth: number;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrgMembership {
  id: string;
  user_id: string;
  org_id: string;
  role: "commander" | "member" | "viewer";
  created_at: string;
  users: {
    full_name: string;
    created_at: string;
    avatar_url: string;
    email: string;
    id: string;
  };
  }

export interface UserOrg {
  org_id: string;
  org_name: string;
  org_type: string;
  root_id: string;
  root_name: string;
  parent_id: string | null;
  parent_name: string | null;
  depth: number;
  role: "commander" | "member" | "viewer";
  full_path: string;
}

export interface OrgChild {
  id: string;
  name: string;
  org_type: string;
  depth: number;
  member_count: number;
  description: string | null;
  child_count: number;
  parent_id: string;
  created_at: string;
}

export interface OrgSubtree {
  id: string;
  name: string;
  org_type: string;
  depth: number;
  parent_id: string | null;
  full_path: string;
  member_count: number;
}

export interface OrgTreeNode {
  id: string;
  name: string;
  type: string;
  depth: number;
  parent_id: string | null;
  path: string;
  member_count: number;
}

export interface FlatOrganization {
  id: string;
  name: string;
  org_type: string;
  parent_id: string | null;
  depth: number;
  role: "commander" | "member" | "viewer";
  isRoot: boolean;
  breadcrumb: string[];
  childCount: number;
  created_at: string;
  // Permission flags
  hasFullPermission: boolean;  // Can edit, delete, create children
  isContextOnly: boolean;      // Visible for context but read-only
}
