import type { GameElementTypeId } from "./GameElementTypeIds.js";
import type { SupportedGameStateVersion } from "./GameStateSchema.js";

export const ENEMY_BULLET_SPRITE_FIELD = "enemyBulletSprite";
export const FLOOR_GUN_PLAIN_FIELD = "floorGunPlain";
export const TILE_DEBRIS_SPRITE_TILE_FIELD = "tileDebrisSpriteTile";

export const ENEMY_BULLET_SPRITE_IDS = ["cannonball", "white", "yellow"] as const;
export type EnemyBulletSpriteId = (typeof ENEMY_BULLET_SPRITE_IDS)[number];

const ENEMY_BULLET_SPRITE_ID_SET: ReadonlySet<string> = new Set(ENEMY_BULLET_SPRITE_IDS);

export function isEnemyBulletSpriteId(value: unknown): value is EnemyBulletSpriteId {
    return typeof value === "string" && ENEMY_BULLET_SPRITE_ID_SET.has(value);
}

/** Validates the browser-only entity descriptors introduced by save schema v5. */
export function isEntityRuntimeFields(type: GameElementTypeId, value: unknown, version: SupportedGameStateVersion): boolean {
    if (version < 5) {
        return typeof value === "undefined";
    }

    switch (type) {
        case "EnemyBullet":
            return isExactRecord(value, ENEMY_BULLET_SPRITE_FIELD, isEnemyBulletSpriteId);
        case "FloorGun":
            return isExactRecord(value, FLOOR_GUN_PLAIN_FIELD, (entry) => typeof entry === "boolean");
        case "TileDebris":
            return isExactRecord(value, TILE_DEBRIS_SPRITE_TILE_FIELD, (entry) => typeof entry === "number" && Number.isInteger(entry) && entry >= 0);
        default:
            return typeof value === "undefined";
    }
}

function isExactRecord(value: unknown, field: string, validate: (entry: unknown) => boolean): boolean {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
        return false;
    }
    const keys = Object.keys(value);
    return keys.length === 1 && keys[0] === field && validate(Reflect.get(value, field));
}
