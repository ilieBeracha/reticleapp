/**
 * Engagement Mode Types
 *
 * HOW the session is executed.
 *
 * Engagement is the atomic execution unit.
 * Squad logic MUST live here.
 * Training and Session must remain passive context.
 *
 * CANONICAL RULES:
 * - Grouping drills are ALWAYS solo (non-negotiable)
 * - Engagement drills can be solo, squad, or group
 * - Squad mode is async-only (no live presence required)
 * - Group mode is simple totals (participants enter shots/hits manually)
 * - Participants acknowledge/consent, shooter executes alone
 */

/**
 * Engagement mode:
 * - solo: individual execution
 * - squad: async team with detailed target tracking
 * - group: async team with simple shot/hit entry per person
 */
export type EngagementMode = 'solo' | 'squad' | 'group';
