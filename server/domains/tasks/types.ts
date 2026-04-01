export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  userId: string;
  title: string;
  missionId: string | null;
  date: string; // YYYY-MM-DD
  completed: boolean;
  priority: TaskPriority;
  estimatedMinutes: number | null;
  order: number;
  completedAt: Date | null;
  createdAt: Date;
}

export interface TodayTasksResponse {
  tasks: Task[];
  date: string;
  completedCount: number;
  totalCount: number;
}
