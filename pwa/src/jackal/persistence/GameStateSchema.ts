export const GAME_STATE_VERSION = 5 as const;
export const MIN_SUPPORTED_GAME_STATE_VERSION = 4 as const;
export const SUPPORTED_GAME_STATE_VERSIONS = [MIN_SUPPORTED_GAME_STATE_VERSION, GAME_STATE_VERSION] as const;
export type SupportedGameStateVersion = (typeof SUPPORTED_GAME_STATE_VERSIONS)[number];
export const GAME_STATE_STORAGE_KEY = "jackal.game-state";

const SUPPORTED_GAME_STATE_VERSION_SET: ReadonlySet<number> = new Set(SUPPORTED_GAME_STATE_VERSIONS);

export function isSupportedGameStateVersion(value: unknown): value is SupportedGameStateVersion {
    return typeof value === "number" && Number.isInteger(value) && SUPPORTED_GAME_STATE_VERSION_SET.has(value);
}

export function isFutureGameStateSnapshot(value: unknown): boolean {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const version = Reflect.get(value, "version");
    return typeof version === "number" && Number.isInteger(version) && version > GAME_STATE_VERSION;
}
