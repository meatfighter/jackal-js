export const GAME_STATE_VERSION = 9 as const;
export const FIRST_PUBLIC_GAME_STATE_VERSION = 9 as const;
export type SupportedGameStateVersion = typeof GAME_STATE_VERSION;
export const GAME_STATE_STORAGE_KEY = "jackal.game-state";

export function isSupportedGameStateVersion(value: unknown): value is SupportedGameStateVersion {
    return value === GAME_STATE_VERSION;
}

/** Public save data the current build cannot consume must survive rollback/upgrade. */
export function shouldPreserveUnsupportedGameStateSnapshot(value: unknown): boolean {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const version = Reflect.get(value, "version");
    return typeof version === "number" && Number.isInteger(version) && version >= FIRST_PUBLIC_GAME_STATE_VERSION && version !== GAME_STATE_VERSION;
}
