export interface WorkSession {
  id: string;
  userId: string;
  clockInTime: string;
  clockOutTime: string | null;
  totalHours: number | null;
  createdAt: string;
}
