import type { Image } from "slick2d-ts";
import type { ArrayList } from "../../java/JavaRuntime.js";
import { BossGarage } from "../BossGarage.js";
import { EnemyBullet } from "../EnemyBullet.js";
import type { Enemy } from "../Enemy.js";
import { FloorGun } from "../FloorGun.js";
import type { GameElement } from "../GameElement.js";
import type { GameMode } from "../GameMode.js";
import type { Main } from "../Main.js";
import { RotatingGun } from "../RotatingGun.js";
import { StatueMissile } from "../StatueMissile.js";
import { StatueSeekerMissile } from "../StatueSeekerMissile.js";
import { TileDebris } from "../TileDebris.js";
import type { EncodedRecord, EncodedValue } from "./GameStateSnapshot.js";
import type { GameElementTypeId } from "./GameElementTypeIds.js";
import { ENEMY_BULLET_SPRITE_FIELD, FLOOR_GUN_PLAIN_FIELD, TILE_DEBRIS_SPRITE_TILE_FIELD, type EnemyBulletSpriteId } from "./EntityRuntimeFields.js";

const LEGACY_ENEMY_BULLET_SPRITE_FIELD = "__jackalEnemyBulletSprite";
const LEGACY_FLOOR_GUN_PLAIN_FIELD = "__jackalFloorGunPlain";
const LEGACY_TILE_DEBRIS_SPRITE_TILE_FIELD = "__jackalTileDebrisSpriteTile";

const ENEMY_BULLET_SPRITE_CANNONBALL: EnemyBulletSpriteId = "cannonball";
const ENEMY_BULLET_SPRITE_WHITE: EnemyBulletSpriteId = "white";
const ENEMY_BULLET_SPRITE_YELLOW: EnemyBulletSpriteId = "yellow";

type RuntimePointer = "solids" | "enemies" | "mines" | "player";

const ENTITY_RUNTIME_POINTERS: Partial<Record<GameElementTypeId, readonly RuntimePointer[]>> = {
    BossBlueTank: ["solids", "player"],
    BossHeadquarters: ["player"],
    BossHelicopter: ["player"],
    BossShipGun: ["player"],
    BossSuperTank: ["player"],
    BrownTank: ["solids", "player"],
    CliffGun: ["player"],
    Column: ["mines", "player"],
    ElephantGun: ["player"],
    ElephantMissile: ["player"],
    EnemyBullet: ["player"],
    EnemyHelicopter: ["player"],
    EnemySoldier: ["solids", "player"],
    Explosion: ["enemies"],
    Fire: ["player"],
    FireTank: ["solids", "player"],
    FloorGun: ["player"],
    FriendlyHelicopter: ["player"],
    FriendlySoldier: ["solids", "player"],
    GrayBoat: ["player"],
    GrayJeep: ["solids", "player"],
    GrayTank: ["solids", "player"],
    GreenBoat: ["player"],
    Grenade: ["enemies"],
    Mine: ["player"],
    PlayerBullet: ["enemies"],
    PlayerMissile: ["enemies"],
    Rock: ["mines", "player"],
    StatueSeekerMissile: ["player"],
    Submarine: ["player"],
    SuperFire: ["player"],
    SwampMissile: ["player"],
    Train: ["mines", "player"],
    TravelingExplosion: ["enemies"],
    TroopsTruck: ["player"]
};

export function captureEntityRuntimeFields(entity: GameElement, main: Main, gameMode: GameMode): EncodedRecord | undefined {
    const fields: EncodedRecord = {};

    if (entity instanceof EnemyBullet) {
        fields[ENEMY_BULLET_SPRITE_FIELD] = enemyBulletSpriteId(entity.sprite, main);
    } else if (entity instanceof FloorGun) {
        fields[FLOOR_GUN_PLAIN_FIELD] = floorGunUsesPlainSprites(entity, main);
    } else if (entity instanceof TileDebris) {
        fields[TILE_DEBRIS_SPRITE_TILE_FIELD] = indexOfReference(gameMode.tiles, entity.sprite, "TileDebris sprite");
    }

    return Object.keys(fields).length === 0 ? undefined : fields;
}

export function restoreEntityRuntimeState(
    entity: GameElement,
    type: GameElementTypeId,
    main: Main,
    gameMode: GameMode,
    runtimeFields: EncodedRecord | undefined
): void {
    attachEntityRuntimeReferences(entity, type, main, gameMode);
    restoreEntityRuntimeImages(entity, main, gameMode, runtimeFields);
    clearLegacyRuntimeFields(entity);
}

export function attachEntityRuntimeReferences(entity: GameElement, type: GameElementTypeId, main: Main, gameMode: GameMode): void {
    entity.main = main;
    entity.gameMode = gameMode;

    const pointers = ENTITY_RUNTIME_POINTERS[type];
    if (pointers === undefined) {
        return;
    }
    for (const pointer of pointers) {
        Reflect.set(entity, pointer, runtimePointerValue(pointer, gameMode));
    }
}

function runtimePointerValue(pointer: RuntimePointer, gameMode: GameMode): ArrayList<Enemy> | GameMode["player"] {
    switch (pointer) {
        case "solids":
            return gameMode.solids;
        case "enemies":
            return gameMode.enemies;
        case "mines":
            return gameMode.mines;
        case "player":
            return gameMode.player;
    }
}

function restoreEntityRuntimeImages(entity: GameElement, main: Main, gameMode: GameMode, runtimeFields: EncodedRecord | undefined): void {
    if (entity instanceof RotatingGun) {
        switch (entity.type) {
            case RotatingGun.TYPE_GREEN:
                entity.sprites = main.greenGuns;
                break;
            case RotatingGun.TYPE_BROWN:
                entity.sprites = main.brownGuns;
                break;
            default:
                entity.sprites = main.grayGuns;
                break;
        }
    } else if (entity instanceof EnemyBullet) {
        entity.sprite = enemyBulletSpriteById(main, runtimeValue(runtimeFields, ENEMY_BULLET_SPRITE_FIELD, entity, LEGACY_ENEMY_BULLET_SPRITE_FIELD));
    } else if (entity instanceof FloorGun) {
        const plain = runtimeValue(runtimeFields, FLOOR_GUN_PLAIN_FIELD, entity, LEGACY_FLOOR_GUN_PLAIN_FIELD) === true;
        entity.mask = plain ? main.plainFloorGuns[0] : main.floorGuns[6];
        entity.panel = plain ? main.plainFloorGuns[1] : main.floorGuns[7];
    } else if (entity instanceof StatueMissile) {
        entity.sprite = entity.right ? main.statueMissiles[0] : main.statueMissiles[1];
    } else if (entity instanceof StatueSeekerMissile) {
        entity.sprite = main.statueMissiles[0];
    } else if (entity instanceof TileDebris) {
        const tile = runtimeValue(runtimeFields, TILE_DEBRIS_SPRITE_TILE_FIELD, entity, LEGACY_TILE_DEBRIS_SPRITE_TILE_FIELD);
        if (typeof tile === "number" && Number.isInteger(tile) && tile >= 0 && tile < gameMode.tiles.length) {
            entity.sprite = gameMode.tiles[tile];
        } else {
            entity.sprite = gameMode.tiles[gameMode.tileMap[entity.Y][entity.X]];
        }
    } else if (entity instanceof BossGarage) {
        entity.vehicle = entity.state === BossGarage.STATE_CLOSED ? null : entity.isBrownTank ? main.brownTanks : main.grayTanks;
    }
}

function runtimeValue(runtimeFields: EncodedRecord | undefined, field: string, entity: GameElement, legacyField: string): EncodedValue | unknown {
    if (runtimeFields !== undefined && Object.hasOwn(runtimeFields, field)) {
        return runtimeFields[field];
    }
    return Reflect.get(entity, legacyField);
}

function clearLegacyRuntimeFields(entity: GameElement): void {
    Reflect.deleteProperty(entity, LEGACY_ENEMY_BULLET_SPRITE_FIELD);
    Reflect.deleteProperty(entity, LEGACY_FLOOR_GUN_PLAIN_FIELD);
    Reflect.deleteProperty(entity, LEGACY_TILE_DEBRIS_SPRITE_TILE_FIELD);
}

function enemyBulletSpriteId(sprite: Image | null, main: Main): EnemyBulletSpriteId {
    if (sprite === main.cannonball) {
        return ENEMY_BULLET_SPRITE_CANNONBALL;
    }
    if (sprite === main.whiteBullet) {
        return ENEMY_BULLET_SPRITE_WHITE;
    }
    if (sprite === main.yellowBullet) {
        return ENEMY_BULLET_SPRITE_YELLOW;
    }
    throw new Error("Unable to identify EnemyBullet sprite for game-state save.");
}

function enemyBulletSpriteById(main: Main, id: unknown): Main["cannonball"] {
    switch (id) {
        case ENEMY_BULLET_SPRITE_CANNONBALL:
            return main.cannonball;
        case ENEMY_BULLET_SPRITE_WHITE:
            return main.whiteBullet;
        case ENEMY_BULLET_SPRITE_YELLOW:
            return main.yellowBullet;
        default:
            throw new Error("Unsupported EnemyBullet sprite in saved game state.");
    }
}

function floorGunUsesPlainSprites(entity: FloorGun, main: Main): boolean {
    if (entity.mask === main.plainFloorGuns[0] && entity.panel === main.plainFloorGuns[1]) {
        return true;
    }
    if (entity.mask === main.floorGuns[6] && entity.panel === main.floorGuns[7]) {
        return false;
    }
    throw new Error("Unable to identify FloorGun sprite set for game-state save.");
}

function indexOfReference(values: readonly unknown[], value: unknown, label: string): number {
    for (let i = 0; i < values.length; i++) {
        if (values[i] === value) {
            return i;
        }
    }
    throw new Error(`Unable to identify ${label} for game-state save.`);
}

export const ENTITY_RUNTIME_POINTER_FIELDS = ENTITY_RUNTIME_POINTERS;
