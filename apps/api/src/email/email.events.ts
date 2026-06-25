export const EMAIL_EVENT = {
  SESSION_RECAP_READY: "email.session.recap_ready",
  SEASON_RECAP_READY: "email.season.recap_ready",
} as const;

export interface SessionRecapReadyEvent {
  sessionId: string;
  domain: string;
}

export interface SeasonRecapReadyEvent {
  domain: string;
  seasonKey: string;
}
