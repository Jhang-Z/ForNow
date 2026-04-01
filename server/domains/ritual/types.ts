export interface RitualTemplate {
  id: string;
  key: string;
  title: string;
  description: string | null;
  isOptional: boolean;
  order: number;
}

export interface RitualEntry {
  id: string;
  userId: string;
  templateId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  content: string | null;
  completedAt: Date | null;
}

export interface TodayRitualResponse {
  templates: RitualTemplate[];
  entries: RitualEntry[];
  date: string;
}
