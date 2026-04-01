export type FocusSessionStatus = 'active' | 'completed' | 'interrupted';
export type FocusSessionType = 'pomodoro' | 'free';

export interface FocusSession {
  id: string;
  userId: string;
  taskId: string | null;
  taskTitle: string | null;
  startTime: Date;
  endTime: Date | null;
  duration: number | null; // seconds
  status: FocusSessionStatus;
  type: FocusSessionType;
}

export interface TodayFocusStats {
  totalMinutes: number;
  sessionCount: number;
  completedCount: number;
}
