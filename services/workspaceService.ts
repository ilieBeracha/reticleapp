// services/workspaceService.ts
import { supabase } from "@/lib/supabase";
import { Workspace } from "@/types/workspace";

/**
 * Get all workspaces user is a member of
 */
export async function getUserWorkspacesService(userId: string): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id, workspaces(*)")
    .eq("user_id", userId);

  if (error) {
    console.error("Fetch workspaces error:", error.message);
    return [];
  }

  if (!data) return [];

  // Transform the joined data
  return data.map((row: any) => row.workspaces as Workspace);
}

/**
 * Get a single workspace by ID
 */
export async function getWorkspaceService(workspaceId: string): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (error) {
    console.error("Fetch workspace error:", error.message);
    return null;
  }

  return data as Workspace;
}

/**
 * Create a new organization workspace
 */
export async function createWorkspaceService(
  name: string,
  description: string,
  userId: string
): Promise<Workspace | null> {
  const { data, error } = await supabase
    .from("workspaces")
    .insert({
      name,
      description,
      workspace_type: "organization",
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    console.error("Create workspace error:", error.message);
    return null;
  }

  // Auto-add creator as owner
  await supabase
    .from("workspace_members")
    .insert({
      user_id: userId,
      workspace_id: data.id,
      workspace_role: "owner",
    });

  return data as Workspace;
}

