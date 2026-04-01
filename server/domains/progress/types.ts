export interface DailyStats {
  date: string; // YYYY-MM-DD
  tasksTotal: number;
  tasksCompleted: number;
  ritualCompleted: number;
  focusMinutes: number;
  completionRate: number; // 0–100
}

export interface WeeklyReport {
  weekNumber: number;
  year: number;
  stats: DailyStats[];
  totalFocusMinutes: number;
  avgCompletionRate: number; // 0–100
  streakDays: number;
}
