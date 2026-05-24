export const EMAIL_EVENT = {
  SESSION_RECAP_READY: "email.session.recap_ready",
} as const;

export interface SessionRecapReadyEvent {
  sessionId: string;
  domain: string;
}
