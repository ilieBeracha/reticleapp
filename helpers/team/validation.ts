export function normalizeTeamName(name: string): string {
  return name.trim();
}

export function normalizeTeamDescription(description: string): string {
  return description.trim();
}

export function isTeamNamePresent(name: string): boolean {
  return normalizeTeamName(name).length > 0;
}

export function normalizeSquadName(name: string): string {
  return name.trim();
}

export function isDuplicateSquadName(existingSquads: string[], squadName: string): boolean {
  const normalized = normalizeSquadName(squadName);
  if (!normalized) return false;
  return existingSquads.includes(normalized);
}

export function addSquad(existingSquads: string[], squadName: string): string[] {
  const normalized = normalizeSquadName(squadName);
  if (!normalized) return existingSquads;
  if (existingSquads.includes(normalized)) return existingSquads;
  return [...existingSquads, normalized];
}

export function removeSquad(existingSquads: string[], squadName: string): string[] {
  return existingSquads.filter((s) => s !== squadName);
}






