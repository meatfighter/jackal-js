import type { GameContainer } from "slick2d-ts";
import { ArrayList, Random } from "../../java/JavaRuntime.js";
import { BossGarage } from "../BossGarage.js";
import { EnemyBullet } from "../EnemyBullet.js";
import { FloorGun } from "../FloorGun.js";
import { FriendlySoldier } from "../FriendlySoldier.js";
import { GameMode } from "../GameMode.js";
import { KonamiCode } from "../KonamiCode.js";
import { Main } from "../Main.js";
import { Modes } from "../Modes.js";
import { Player } from "../Player.js";
import { RotatingGun } from "../RotatingGun.js";
import { StatueMissile } from "../StatueMissile.js";
import { StatueSeekerMissile } from "../StatueSeekerMissile.js";
import { TileDebris } from "../TileDebris.js";
import {
    GAME_STATE_VERSION,
    type EncodedRecord,
    type EncodedValue,
    type EntitySnapshot,
    type JackalGameStateSnapshot,
    type RandomSnapshot
} from "./GameStateSnapshot.js";
import { GAME_ELEMENT_TYPES, type GameElementConstructor } from "./GameElementTypeRegistry.js";

type EntityContext = {
    main: Main;
    gameMode: GameMode;
    player: Player;
    ids: Map<object, number>;
    entities: object[];
};

type RestoreContext = {
    main: Main;
    gameMode: GameMode;
    gc: GameContainer;
    player: Player;
    entitiesById: Map<number, object>;
};

const MAIN_FIELD_NAMES = [
    "nextFrameTime",
    "loadIndex",
    "fading",
    "fadeIndex",
    "fadeOut",
    "extraLives",
    "extraLivesStr",
    "score",
    "scoreStr",
    "stageIndex",
    "hasMissiles",
    "missilePower",
    "friendlySoldiersPickedUp",
    "hardMode",
    "continued",
    "closeRequestedFlag",
    "controllerGrenadePressed",
    "controllerGunPressed",
    "unitVector"
];

const GAME_MODE_FIELD_NAMES = [
    "tileMap",
    "typesMap",
    "triggedGroups",
    "waterAlphaIndex",
    "conveyorOffset",
    "conveyorLastIndex",
    "conveyorDelta",
    "cameraX",
    "cameraY",
    "maxCameraX",
    "maxCameraY",
    "paused",
    "triggerY",
    "bossCameraPan",
    "endingCameraPan",
    "playing",
    "cameraPanListener",
    "stageIndex",
    "stageCompletedFlag",
    "stageCompletedDelay"
];

const SKIPPED_INSTANCE_FIELDS = new Set([
    "main",
    "gameMode",
    "gc",
    "input",
    "g",
    "stage",
    "tiles",
    "groups",
    "triggerMap",
    "groupsMap",
    "directions",
    "elements",
    "enemies",
    "solids",
    "mines",
    "player",
    "mask",
    "panel",
    "sprite",
    "sprites",
    "vehicle"
]);

const RUNTIME_ENEMY_BULLET_SPRITE_FIELD = "__jackalEnemyBulletSprite";
const RUNTIME_FLOOR_GUN_PLAIN_FIELD = "__jackalFloorGunPlain";
const RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD = "__jackalTileDebrisSpriteTile";
const ENEMY_BULLET_SPRITE_CANNONBALL = "cannonball";
const ENEMY_BULLET_SPRITE_WHITE = "white";
const ENEMY_BULLET_SPRITE_YELLOW = "yellow";

const SONG_IDS = [
    "bossSong",
    "continueSong",
    "cutsceneSong",
    "endingSong",
    "introSong",
    "stageSong0",
    "stageSong1",
    "stageSong2",
    "superTankSong",
    "titleSong"
];

export class JackalGameStateSerializer {
    public createSnapshot(main: Main, appVersion: string): JackalGameStateSnapshot {
        const gameMode = Main.gameMode as GameMode | null;
        if (!(gameMode instanceof GameMode) || !(gameMode.player instanceof Player)) {
            throw new Error("Jackal save requires an active GameMode.");
        }

        const context = this.createEntityContext(main, gameMode, gameMode.player);
        const entities = context.entities.map((entity) => this.createEntitySnapshot(entity, context));
        return {
            version: GAME_STATE_VERSION,
            appVersion,
            savedAt: new Date().toISOString(),
            mainFields: this.encodeNamedFields(main, MAIN_FIELD_NAMES, context),
            konamiCodeFields: main.konamiCode === null
                ? null
                : this.encodeObjectFields(main.konamiCode, context),
            random: this.snapshotRandom(main.random),
            friendlySoldierCount: FriendlySoldier.count,
            currentSongId: this.songIdFor(main, main.currentSong),
            requestedSongId: this.songIdFor(main, main.requestedSong),
            gameMode: {
                fields: this.encodeNamedFields(gameMode, GAME_MODE_FIELD_NAMES, context),
                elements: this.snapshotElementLayers(gameMode, context),
                entities
            },
            playerFields: this.encodeObjectFields(gameMode.player, context)
        };
    }

    public restoreSnapshot(main: Main, gc: GameContainer, snapshot: JackalGameStateSnapshot): void {
        if (!this.isSupportedSnapshot(snapshot)) {
            throw new Error("Unsupported Jackal game-state snapshot.");
        }

        const gameMode = new GameMode();
        Main.mainInstance = main;
        Main.gameMode = gameMode;
        gameMode.setStage(snapshot.mainFields.stageIndex as number, main.stages[snapshot.mainFields.stageIndex as number], snapshot.mainFields.hardMode as boolean);
        gameMode.init(main, gc);
        const player = gameMode.player as Player;

        const entitiesById = new Map<number, object>();
        for (const entitySnapshot of snapshot.gameMode.entities) {
            const constructor = this.constructorFor(entitySnapshot.type);
            entitiesById.set(entitySnapshot.id, Object.create(constructor.prototype) as object);
        }

        const context: RestoreContext = {
            main,
            gameMode,
            gc,
            player,
            entitiesById
        };

        this.decodeFieldsInto(main, snapshot.mainFields, context);
        main.random = this.restoreRandom(snapshot.random);
        if (snapshot.konamiCodeFields !== null) {
            main.konamiCode = Object.create(KonamiCode.prototype);
            this.decodeFieldsInto(main.konamiCode, snapshot.konamiCodeFields, context);
            main.konamiCode.main = main;
            main.konamiCode.input = main.input;
        }

        this.decodeFieldsInto(gameMode, snapshot.gameMode.fields, context);
        this.decodeFieldsInto(player, snapshot.playerFields, context);
        this.restoreBackPointers(main, gameMode, player, gc);

        for (const entitySnapshot of snapshot.gameMode.entities) {
            const entity = entitiesById.get(entitySnapshot.id);
            if (entity === undefined) {
                throw new Error(`Missing restored entity ${entitySnapshot.id}.`);
            }
            this.decodeFieldsInto(entity, entitySnapshot.fields, context);
            this.restoreEntityRuntimePointers(entity, main, gameMode);
        }

        this.restoreElementLayers(gameMode, snapshot.gameMode.elements, entitiesById);
        this.rebuildGameModeIndexes(gameMode);
        FriendlySoldier.count = snapshot.friendlySoldierCount;
        main.currentSong = null;
        main.requestedSong = this.songById(main, snapshot.requestedSongId ?? snapshot.currentSongId);
        main.mode = gameMode;
        main.resetNextFrameTime();
        main.clearInputPressedRecords();
    }

    public isSupportedSnapshot(snapshot: JackalGameStateSnapshot): boolean {
        return snapshot.version === GAME_STATE_VERSION
            && snapshot.gameMode !== undefined
            && Array.isArray(snapshot.gameMode.entities)
            && Array.isArray(snapshot.gameMode.elements)
            && snapshot.random !== undefined;
    }

    private createEntityContext(main: Main, gameMode: GameMode, player: Player): EntityContext {
        const ids = new Map<object, number>();
        const entities: object[] = [];
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i);
                if (entity !== null && !ids.has(entity)) {
                    ids.set(entity, entities.length);
                    entities.push(entity);
                }
            }
        }
        return { main, gameMode, player, ids, entities };
    }

    private createEntitySnapshot(entity: object, context: EntityContext): EntitySnapshot {
        const type = entity.constructor?.name;
        if (!type || GAME_ELEMENT_TYPES[type] === undefined) {
            throw new Error(`Unsupported Jackal entity type: ${type}`);
        }
        const id = context.ids.get(entity);
        if (id === undefined) {
            throw new Error(`Unregistered Jackal entity type: ${type}`);
        }
        const fields = this.encodeObjectFields(entity, context);
        this.encodeEntityRuntimeFields(entity, fields, context);
        return {
            id,
            type,
            fields
        };
    }

    private snapshotElementLayers(gameMode: GameMode, context: EntityContext): number[][] {
        const layers: number[][] = [];
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            const ids: number[] = [];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i);
                const id = context.ids.get(entity);
                if (id === undefined) {
                    throw new Error(`Unregistered entity in layer ${layer}.`);
                }
                ids.push(id);
            }
            layers.push(ids);
        }
        return layers;
    }

    private restoreElementLayers(gameMode: GameMode, layers: number[][], entitiesById: Map<number, object>): void {
        gameMode.elements = new Array(8);
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = new ArrayList<object>(256);
            const ids = layers[layer] ?? [];
            for (const id of ids) {
                const entity = entitiesById.get(id);
                if (entity === undefined) {
                    throw new Error(`Missing layer entity ${id}.`);
                }
                list.add(entity);
            }
            gameMode.elements[layer] = list;
        }
    }

    private rebuildGameModeIndexes(gameMode: GameMode): void {
        gameMode.enemies = new ArrayList<object>(256);
        gameMode.solids = new ArrayList<object>(256);
        gameMode.mines = new ArrayList<object>(256);
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i) as any;
                if (entity.enemy) {
                    gameMode.enemies.add(entity);
                    if (entity.solid) {
                        gameMode.solids.add(entity);
                    }
                    if (entity.mine) {
                        gameMode.mines.add(entity);
                    }
                }
            }
        }
        gameMode.player.mines = gameMode.mines;
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i) as any;
                entity.solids = gameMode.solids;
                entity.enemies = gameMode.enemies;
                entity.mines = gameMode.mines;
                entity.player = gameMode.player;
            }
        }
    }

    private restoreBackPointers(main: Main, gameMode: GameMode, player: Player, gc: GameContainer): void {
        main.gc = gc;
        gameMode.main = main;
        gameMode.gc = gc;
        gameMode.input = main.input;
        gameMode.player = player;
        const mutablePlayer = player as any;
        mutablePlayer.main = main;
        mutablePlayer.gameMode = gameMode;
        mutablePlayer.input = main.input;
        mutablePlayer.mines = gameMode.mines;
    }

    private restoreEntityRuntimePointers(entity: object, main: Main, gameMode: GameMode): void {
        const mutableEntity = entity as any;
        mutableEntity.main = main;
        mutableEntity.gameMode = gameMode;
        mutableEntity.solids = gameMode.solids;
        mutableEntity.enemies = gameMode.enemies;
        mutableEntity.mines = gameMode.mines;
        mutableEntity.player = gameMode.player;
        this.restoreEntityRuntimeImages(mutableEntity, main, gameMode);
        this.clearEntityRuntimeFields(mutableEntity);
    }

    private encodeEntityRuntimeFields(entity: object, fields: EncodedRecord, context: EntityContext): void {
        const mutableEntity = entity as any;
        if (entity instanceof EnemyBullet) {
            fields[RUNTIME_ENEMY_BULLET_SPRITE_FIELD] = this.enemyBulletSpriteId(mutableEntity.sprite, context.main);
        } else if (entity instanceof FloorGun) {
            fields[RUNTIME_FLOOR_GUN_PLAIN_FIELD] = this.floorGunUsesPlainSprites(mutableEntity, context.main);
        } else if (entity instanceof TileDebris) {
            fields[RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD] = this.indexOfReference(context.gameMode.tiles, mutableEntity.sprite, "TileDebris sprite");
        }
    }

    private restoreEntityRuntimeImages(entity: any, main: Main, gameMode: GameMode): void {
        const mutableEntity = entity as any;
        if (entity instanceof RotatingGun) {
            switch (mutableEntity.type) {
                case RotatingGun.TYPE_GREEN:
                    mutableEntity.sprites = main.greenGuns;
                    break;
                case RotatingGun.TYPE_BROWN:
                    mutableEntity.sprites = main.brownGuns;
                    break;
                default:
                    mutableEntity.sprites = main.grayGuns;
                    break;
            }
        } else if (entity instanceof EnemyBullet) {
            mutableEntity.sprite = this.enemyBulletSpriteById(main, mutableEntity[RUNTIME_ENEMY_BULLET_SPRITE_FIELD]);
        } else if (entity instanceof FloorGun) {
            const plain = mutableEntity[RUNTIME_FLOOR_GUN_PLAIN_FIELD] === true;
            mutableEntity.mask = plain ? main.plainFloorGuns[0] : main.floorGuns[6];
            mutableEntity.panel = plain ? main.plainFloorGuns[1] : main.floorGuns[7];
        } else if (entity instanceof StatueMissile) {
            mutableEntity.sprite = mutableEntity.right ? main.statueMissiles[0] : main.statueMissiles[1];
        } else if (entity instanceof StatueSeekerMissile) {
            mutableEntity.sprite = main.statueMissiles[0];
        } else if (entity instanceof TileDebris) {
            const tile = mutableEntity[RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD];
            if (Number.isInteger(tile) && tile >= 0 && tile < gameMode.tiles.length) {
                mutableEntity.sprite = gameMode.tiles[tile];
            } else {
                mutableEntity.sprite = gameMode.tiles[gameMode.tileMap[mutableEntity.Y][mutableEntity.X]];
            }
        } else if (entity instanceof BossGarage) {
            if (mutableEntity.state === BossGarage.STATE_CLOSED) {
                mutableEntity.vehicle = null;
            } else {
                mutableEntity.vehicle = mutableEntity.isBrownTank ? main.brownTanks : main.grayTanks;
            }
        }
    }

    private clearEntityRuntimeFields(entity: any): void {
        delete entity[RUNTIME_ENEMY_BULLET_SPRITE_FIELD];
        delete entity[RUNTIME_FLOOR_GUN_PLAIN_FIELD];
        delete entity[RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD];
    }

    private enemyBulletSpriteId(sprite: unknown, main: Main): string {
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

    private enemyBulletSpriteById(main: Main, id: unknown): unknown {
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

    private floorGunUsesPlainSprites(entity: any, main: Main): boolean {
        if (entity.mask === main.plainFloorGuns[0] && entity.panel === main.plainFloorGuns[1]) {
            return true;
        }
        if (entity.mask === main.floorGuns[6] && entity.panel === main.floorGuns[7]) {
            return false;
        }
        throw new Error("Unable to identify FloorGun sprite set for game-state save.");
    }

    private indexOfReference(values: unknown[], value: unknown, label: string): number {
        for (let i = 0; i < values.length; i++) {
            if (values[i] === value) {
                return i;
            }
        }
        throw new Error(`Unable to identify ${label} for game-state save.`);
    }

    private encodeNamedFields(source: object, names: string[], context: EntityContext): EncodedRecord {
        const record: EncodedRecord = {};
        for (const name of names) {
            record[name] = this.encodeValue(source[name], context);
        }
        return record;
    }

    private encodeObjectFields(source: object, context: EntityContext): EncodedRecord {
        const record: EncodedRecord = {};
        for (const key of Object.keys(source)) {
            if (SKIPPED_INSTANCE_FIELDS.has(key)) {
                continue;
            }
            const value = source[key];
            if (typeof value === "function" || typeof value === "undefined") {
                continue;
            }
            record[key] = this.encodeValue(value, context);
        }
        return record;
    }

    private encodeValue(value: unknown, context: EntityContext): EncodedValue {
        if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return value as EncodedValue;
        }
        if (typeof value === "bigint") {
            return { kind: "bigint", value: value.toString() };
        }
        if (value === context.main) {
            return { kind: "mainRef" };
        }
        if (value === context.gameMode) {
            return { kind: "gameModeRef" };
        }
        if (value === context.player) {
            return { kind: "playerRef" };
        }
        if (value instanceof ArrayList) {
            const items: EncodedValue[] = [];
            for (let i = 0; i < value.size(); i++) {
                items.push(this.encodeValue(value.get(i), context));
            }
            return { kind: "arrayList", items };
        }
        if (Array.isArray(value)) {
            return {
                kind: "array",
                items: value.map((item) => this.encodeValue(item, context))
            };
        }
        if (typeof value === "object") {
            const id = context.ids.get(value as object);
            if (id !== undefined) {
                return { kind: "entityRef", id };
            }
            return { kind: "nullRef" };
        }
        return null;
    }

    private decodeFieldsInto(target: object, fields: EncodedRecord, context: RestoreContext): void {
        for (const [key, value] of Object.entries(fields)) {
            target[key] = this.decodeValue(value, context);
        }
    }

    private decodeValue(value: EncodedValue, context: RestoreContext): unknown {
        if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return value;
        }
        switch (value.kind) {
            case "bigint":
                return BigInt(value.value);
            case "array":
                return value.items.map((item) => this.decodeValue(item, context));
            case "arrayList": {
                const list = new ArrayList<unknown>(value.items.length);
                for (const item of value.items) {
                    list.add(this.decodeValue(item, context));
                }
                return list;
            }
            case "entityRef": {
                const entity = context.entitiesById.get(value.id);
                if (entity === undefined) {
                    throw new Error(`Missing entity reference ${value.id}.`);
                }
                return entity;
            }
            case "playerRef":
                return context.player;
            case "mainRef":
                return context.main;
            case "gameModeRef":
                return context.gameMode;
            case "nullRef":
                return null;
            default:
                return null;
        }
    }

    private snapshotRandom(random: Random): RandomSnapshot {
        return {
            seed0: (random as any).seed0,
            seed1: (random as any).seed1,
            seed2: (random as any).seed2
        };
    }

    private restoreRandom(snapshot: RandomSnapshot): Random {
        const random = Object.create(Random.prototype) as Random;
        const mutableRandom = random as any;
        mutableRandom.seed0 = snapshot.seed0;
        mutableRandom.seed1 = snapshot.seed1;
        mutableRandom.seed2 = snapshot.seed2;
        return random;
    }

    private constructorFor(type: string): GameElementConstructor {
        const constructor = GAME_ELEMENT_TYPES[type];
        if (constructor === undefined) {
            throw new Error(`Unsupported Jackal entity type: ${type}`);
        }
        return constructor;
    }

    private songIdFor(main: Main, song: unknown): string | null {
        if (song === null) {
            return null;
        }
        for (const id of SONG_IDS) {
            if (main[id] === song) {
                return id;
            }
        }
        return null;
    }

    private songById(main: Main, id: string | null): unknown {
        if (id === null) {
            return null;
        }
        return main[id] ?? null;
    }
}
