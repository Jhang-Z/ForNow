export interface Mission {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  weekNumber: number;
  year: number;
  status: 'active' | 'completed' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMissionParams {
  userId: string;
  title: string;
  description?: string;
  weekNumber: number;
  year: number;
}

export interface UpdateMissionParams {
  title?: string;
  description?: string;
  status?: 'active' | 'completed' | 'archived';
}
