export interface SessionRead {
  id: number;
  speaker_id: number;
  event_id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  capacity: number;
}
