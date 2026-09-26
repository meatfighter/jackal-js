// Exact-current development saves only; older and newer records are load misses.
// Schema 19 cuts off schema-18 boss-entry/death/audio intent emitted before the
// queued-entry fix. The JSON shape is unchanged; its compatibility contract is not.
export const GAME_STATE_VERSION = 19 as const;
export type SupportedGameStateVersion = typeof GAME_STATE_VERSION;
export const GAME_STATE_STORAGE_KEY = "jackal.game-state";
export const MAX_GAME_STATE_TEXT_LENGTH = 2_000_000;

export function isSupportedGameStateVersion(value: unknown): value is SupportedGameStateVersion {
    return value === GAME_STATE_VERSION;
}
