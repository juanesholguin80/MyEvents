export type Role = "admin" | "organizador" | "asistente";

export interface UserRead {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export interface AccessTokenResponse {
  access_token: string;
}
