import type { StatusConfig, TrainingStatus } from './types';

const STATUS_CONFIGS: Record<TrainingStatus, StatusConfig> = {
  planned: { color: '#3B82F6', bg: '#3B82F615', icon: 'calendar', label: 'Planned' },
  ongoing: { color: '#22C55E', bg: '#22C55E15', icon: 'play-circle', label: 'In Progress' },
  finished: { color: '#6B7280', bg: '#6B728015', icon: 'checkmark-circle', label: 'Finished' },
  cancelled: { color: '#EF4444', bg: '#EF444415', icon: 'close-circle', label: 'Cancelled' },
};

export function getStatusConfig(status: TrainingStatus): StatusConfig {
  return STATUS_CONFIGS[status] || STATUS_CONFIGS.planned;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}
