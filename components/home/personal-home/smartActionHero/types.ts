export interface UpcomingTraining {
  id: string;
  title: string;
  status: string;
  team?: { name: string } | null;
  drill_count?: number;
  drills?: { id: string }[];
  scheduled_at?: string | null;
}




