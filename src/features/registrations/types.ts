import type { EventRead } from "@/features/events/types";

export type RegistrationStatus = "confirmed" | "cancelled";

export interface RegistrationRead {
  id: number;
  user_id: number;
  event_id: number;
  status: RegistrationStatus;
  registered_at: string;
}

export interface RegistrationWithEventRead {
  id: number;
  status: RegistrationStatus;
  registered_at: string;
  event: EventRead;
}
