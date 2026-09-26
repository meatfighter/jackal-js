// Current save schema: only this exact format is supported; earlier internal schemas are not migrated.
export const GAME_STATE_VERSION = 18 as const;
export type SupportedGameStateVersion = typeof GAME_STATE_VERSION;
export const GAME_STATE_STORAGE_KEY = "jackal.game-state";
export const MAX_GAME_STATE_TEXT_LENGTH = 2_000_000;

export function isSupportedGameStateVersion(value: unknown): value is SupportedGameStateVersion {
    return value === GAME_STATE_VERSION;
}
