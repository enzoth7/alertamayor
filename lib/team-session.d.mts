export const TEAM_SESSION_COOKIE: string;
export const TEAM_SESSION_TTL_MS: number;
export type TeamSession = { reviewer: string; expiresAt: number };
export function createTeamSession(username: string, now?: number): string;
export function readTeamSession(value: string | undefined, now?: number): TeamSession | null;
export function hasTeamSession(value: string | undefined, now?: number): boolean;
export function hasValidTeamCredentials(username: string, password: string): boolean;
export function hasSameOrigin(requestUrl: string, origin: string | null): boolean;
