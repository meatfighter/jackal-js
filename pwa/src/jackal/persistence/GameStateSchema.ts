// Exact-current development saves only; older and newer records are load misses.
// Schema 23 requires matching paused Song ownership and at most one ordinary pause cue.
// Ordered runtime indexes and stable debris image IDs remain required.
// Root discovery also preserves detached entities referenced by GameMode.
// Exact collision-role membership is required; prior schemas are non-destructive misses.
export const GAME_STATE_VERSION = 23 as const;
export type SupportedGameStateVersion = typeof GAME_STATE_VERSION;
export const GAME_STATE_STORAGE_KEY = "jackal.game-state";
export const MAX_GAME_STATE_TEXT_LENGTH = 2_000_000;
export const MAX_GAME_STATE_ENTITIES = 4096;

export function isSupportedGameStateVersion(value: unknown): value is SupportedGameStateVersion {
    return value === GAME_STATE_VERSION;
}
