export type EventStatus = "draft" | "published" | "cancelled" | "finished";

export interface EventRead {
  id: number;
  organizer_id: number;
  status: EventStatus;
  name: string;
  description: string | null;
  location: string;
  start_date: string;
  end_date: string;
  capacity: number;
  created_at: string;
  updated_at: string;
}
