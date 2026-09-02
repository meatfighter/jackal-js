export const GAME_STATE_VERSION = 8 as const;
export type SupportedGameStateVersion = typeof GAME_STATE_VERSION;
export const GAME_STATE_STORAGE_KEY = "jackal.game-state";

export function isSupportedGameStateVersion(value: unknown): value is SupportedGameStateVersion {
    return value === GAME_STATE_VERSION;
}

export function isFutureGameStateSnapshot(value: unknown): boolean {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const version = Reflect.get(value, "version");
    return typeof version === "number" && Number.isInteger(version) && version > GAME_STATE_VERSION;
}
