export const STACK_EVENT = {
  SESSION_LOCKED: "stack.session.locked",
} as const;

export interface StackSessionLockedEvent {
  sessionId: string;
  domain: string;
}
