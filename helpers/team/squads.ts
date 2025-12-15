export type SquadTemplate = {
  label: string;
  squads: string[];
};

/**
 * Default squad templates used when creating a team.
 * Keep this in helpers so screens don't embed constants.
 */
export const SQUAD_TEMPLATES: SquadTemplate[] = [
  { label: 'Alpha, Bravo, Charlie', squads: ['Alpha', 'Bravo', 'Charlie'] },
  { label: '1st, 2nd, 3rd', squads: ['1st Squad', '2nd Squad', '3rd Squad'] },
  { label: 'Red, Blue, Green', squads: ['Red', 'Blue', 'Green'] },
];


