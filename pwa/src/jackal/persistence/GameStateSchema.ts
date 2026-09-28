// Exact-current development saves only; older and newer records are load misses.
// Schema 21 persists ordered runtime indexes and stable debris image IDs.
// Root discovery also preserves detached entities referenced by GameMode.
export const GAME_STATE_VERSION = 21 as const;
export type SupportedGameStateVersion = typeof GAME_STATE_VERSION;
export const GAME_STATE_STORAGE_KEY = "jackal.game-state";
export const MAX_GAME_STATE_TEXT_LENGTH = 2_000_000;
export const MAX_GAME_STATE_ENTITIES = 4096;

export function isSupportedGameStateVersion(value: unknown): value is SupportedGameStateVersion {
    return value === GAME_STATE_VERSION;
}
