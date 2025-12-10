export interface ThemeColors {
  background: string;
  text: string;
  textMuted: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  [key: string]: string;
}

export interface SessionStats {
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
}

export interface TotalTime {
  hours: number;
  mins: number;
  display: string;
}

export interface DailyCount {
  day: Date;
  count: number;
  label: string;
}

export interface StreakDay {
  day: Date;
  hasSession: boolean;
  label: string;
}
