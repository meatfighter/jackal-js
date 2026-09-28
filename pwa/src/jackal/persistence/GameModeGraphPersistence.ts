import { ArrayList } from "../../java/JavaRuntime.js";
import { Enemy } from "../Enemy.js";
import type { GameElement } from "../GameElement.js";
import type { GameMode } from "../GameMode.js";
import type { GameStateEncodeContext } from "./GameStateCodec.js";
import { GAME_ELEMENT_TYPES, getGameElementTypeId } from "./GameElementTypeRegistry.js";
import { isGameElementTypeId, type GameElementTypeId } from "./GameElementTypeIds.js";
import { GAME_MODE_FIELD_NAMES, GAME_MODE_LAYER_COUNT } from "./GameStateFields.js";
import { MAX_GAME_STATE_ENTITIES } from "./GameStateSchema.js";
import type { EncodedRecord, GameModeIndexesSnapshot } from "./GameStateSnapshot.js";

/** Exhaustive over the root fields actually encoded by the serializer. */
export const GAME_MODE_ROOT_FIELD_POLICY = {
    tileMap: "value",
    typesMap: "value",
    triggedGroups: "value",
    waterAlphaIndex: "value",
    conveyorOffset: "value",
    conveyorLastIndex: "value",
    conveyorDelta: "value",
    cameraX: "value",
    cameraY: "value",
    maxCameraX: "value",
    maxCameraY: "value",
    paused: "value",
    triggerY: "value",
    bossCameraPan: "value",
    endingCameraPan: "value",
    playing: "value",
    cameraPanListener: "entityReference",
    stageIndex: "value",
    stageCompletedFlag: "value",
    stageCompletedDelay: "value"
} as const satisfies Record<(typeof GAME_MODE_FIELD_NAMES)[number], "value" | "entityReference">;

export const GAME_MODE_INDEX_NAMES = ["enemies", "solids", "mines"] as const;
export const CAMERA_PAN_LISTENER_TYPES: ReadonlySet<GameElementTypeId> = new Set([
    "BossBlueTanksManager",
    "BossGarageManager",
    "BossHeadquartersManager",
    "BossHelicopterManager",
    "BossShipManager",
    "BossStatuesManager",
    "BossSuperTank"
]);

export function getGameModeDurableEntityReferences(gameMode: GameMode): readonly GameElement[] {
    const result: GameElement[] = [];
    for (const name of GAME_MODE_FIELD_NAMES) {
        if (GAME_MODE_ROOT_FIELD_POLICY[name] !== "entityReference") continue;
        const value: unknown = Reflect.get(gameMode, name);
        if (value === null) continue;
        if (typeof value !== "object") throw new Error(`Invalid durable Jackal root GameMode.${name}.`);
        const entity = value as GameElement;
        getGameElementTypeId(entity); // Exact registered prototype; no structural duck-typing.
        result.push(entity);
    }
    return result;
}

export function captureGameModeIndexes(gameMode: GameMode, context: GameStateEncodeContext): GameModeIndexesSnapshot {
    const capture = (name: (typeof GAME_MODE_INDEX_NAMES)[number]): number[] => {
        const source = gameMode[name];
        if (source.size() > MAX_GAME_STATE_ENTITIES) throw new Error(`Jackal ${name} index exceeds the save budget.`);
        const result: number[] = [];
        const seen = new Set<number>();
        for (let i = 0; i < source.size(); i++) {
            const entity = source.get(i);
            const id = context.ids.get(entity);
            if (!(entity instanceof Enemy) || id === undefined || seen.has(id)) {
                throw new Error(`Invalid or unregistered Jackal ${name}[${i}].`);
            }
            seen.add(id);
            result.push(id);
        }
        return result;
    };
    return { enemies: capture("enemies"), solids: capture("solids"), mines: capture("mines") };
}

export function restoreGameModeIndexes(gameMode: GameMode, snapshot: GameModeIndexesSnapshot, entitiesById: ReadonlyMap<number, GameElement>): void {
    const restore = (ids: readonly number[], name: string): ArrayList<Enemy> => {
        const list = new ArrayList<Enemy>(Math.max(256, ids.length));
        for (const id of ids) {
            const entity = entitiesById.get(id);
            if (!(entity instanceof Enemy)) throw new Error(`Invalid restored Jackal ${name} reference ${id}.`);
            list.add(entity);
        }
        return list;
    };
    // Publish the three completed lists only after construction succeeds.
    const enemies = restore(snapshot.enemies, "enemies");
    const solids = restore(snapshot.solids, "solids");
    const mines = restore(snapshot.mines, "mines");
    gameMode.enemies = enemies;
    gameMode.solids = solids;
    gameMode.mines = mines;
    gameMode.player.mines = mines;
}

/** Called after the main validator has checked complete entity field bags. Pure, bounded, no constructors. */
export function isGameModeIndexGraph(value: unknown): boolean {
    if (
        !isRecord(value) ||
        !Array.isArray(value.entities) ||
        value.entities.length > MAX_GAME_STATE_ENTITIES ||
        !Array.isArray(value.elements) ||
        value.elements.length !== GAME_MODE_LAYER_COUNT ||
        !isRecord(value.indexes)
    )
        return false;
    const indexes = value.indexes;
    if (Object.keys(indexes).length !== GAME_MODE_INDEX_NAMES.length || !GAME_MODE_INDEX_NAMES.every((name) => Object.hasOwn(indexes, name))) return false;
    const entities = new Map<number, { type: GameElementTypeId; fields: Record<string, unknown> }>();
    for (const entry of value.entities) {
        if (!isRecord(entry) || !isEntityId(entry.id) || entities.has(entry.id) || !isGameElementTypeId(entry.type) || !isRecord(entry.fields)) return false;
        entities.set(entry.id, { type: entry.type, fields: entry.fields });
    }
    const active = new Set<number>();
    for (const layer of value.elements) {
        if (!Array.isArray(layer) || layer.length > MAX_GAME_STATE_ENTITIES) return false;
        for (const id of layer) {
            if (!isEntityId(id) || !entities.has(id) || active.has(id)) return false;
            active.add(id);
        }
    }
    const expectedEnemies = new Set<number>();
    for (const id of active) {
        const entity = entities.get(id);
        if (entity === undefined) return false;
        if (entity.fields.enemy === true) {
            if (!(GAME_ELEMENT_TYPES[entity.type].prototype instanceof Enemy)) return false;
            expectedEnemies.add(id);
        }
    }
    const checkIndex = (items: unknown, permitted: ReadonlySet<number>): items is number[] => {
        if (!Array.isArray(items) || items.length > MAX_GAME_STATE_ENTITIES) return false;
        const seen = new Set<number>();
        for (const id of items) {
            if (!isEntityId(id) || !permitted.has(id) || seen.has(id)) return false;
            seen.add(id);
        }
        return true;
    };
    if (!checkIndex(indexes.enemies, expectedEnemies) || indexes.enemies.length !== expectedEnemies.size) return false;
    const enemies = new Set(indexes.enemies);
    return checkIndex(indexes.solids, enemies) && checkIndex(indexes.mines, enemies);
}

export function isGameModeCameraPanState(fields: EncodedRecord, entityTypes: ReadonlyMap<number, GameElementTypeId>): boolean {
    if (typeof fields.bossCameraPan !== "boolean" || typeof fields.endingCameraPan !== "boolean" || (fields.bossCameraPan && fields.endingCameraPan))
        return false;
    const listener = fields.cameraPanListener;
    if (listener === null) return !fields.bossCameraPan && !fields.endingCameraPan;
    if (!isRecord(listener) || Object.keys(listener).length !== 2 || listener.kind !== "entityRef" || !isEntityId(listener.id)) return false;
    const type = entityTypes.get(listener.id);
    if (type === undefined || !CAMERA_PAN_LISTENER_TYPES.has(type)) return false;
    if (fields.bossCameraPan && type === "BossSuperTank") return false;
    if (fields.endingCameraPan && (type !== "BossSuperTank" || fields.playing !== false)) return false;
    // Inactive retained listeners and valid detached listeners remain representable.
    return true;
}

function isEntityId(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value < MAX_GAME_STATE_ENTITIES;
}
function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
