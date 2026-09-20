import { ArrayList } from "../../java/JavaRuntime.js";
import { Enemy } from "../Enemy.js";
import type { GameElement } from "../GameElement.js";
import { GAME_ELEMENT_TYPE_IDS, type GameElementTypeId } from "./GameElementTypeIds.js";
import { GAME_ELEMENT_TYPES } from "./GameElementTypeRegistry.js";
import { SKIPPED_INSTANCE_FIELDS } from "./GameStateFields.js";
import type { EncodedRecord, EncodedValue } from "./GameStateSnapshot.js";
import { GAME_ELEMENT_JAVA_FLOAT_FIELDS, PLAYER_JAVA_FLOAT_FIELDS } from "./JavaFloatState.js";

export type DurableFieldPolicy =
    | { readonly kind: "boolean" }
    | { readonly kind: "number"; readonly integer: boolean }
    | { readonly kind: "reference"; readonly targets: readonly GameElementTypeId[]; readonly nullable: boolean }
    | { readonly kind: "referenceList"; readonly targets: readonly GameElementTypeId[]; readonly minLength: number; readonly maxLength: number }
    | { readonly kind: "numberArray"; readonly integer: boolean; readonly length: number }
    | { readonly kind: "numberMatrix"; readonly integer: boolean; readonly rows: number; readonly columns: number }
    | { readonly kind: "booleanArray"; readonly length: number };

export type DurableFieldDescriptor = Readonly<Record<string, DurableFieldPolicy>>;

const JAVA_INT_MIN = -2_147_483_648;
const JAVA_INT_MAX = 2_147_483_647;
const MAX_GENERAL_NUMBER_MAGNITUDE = 1_000_000_000_000;
const MAX_POSITION_MAGNITUDE = 1_000_000;
const MAX_VELOCITY_MAGNITUDE = 10_000;

const GAME_ELEMENT_BASE_DEFAULTS = {
    removeFlag: false,
    enemy: false,
    enemyBullet: false,
    x: 0,
    y: 0,
    layer: 0,
    changeLayerValue: -1
} as const;

const PLAYER_NUMBER_FIELDS = [
    "x",
    "y",
    "angle",
    "nextAngle",
    "displayAngle",
    "angleVelocity",
    "angleSteps",
    "diagonalDelay",
    "targetAngle",
    "lastTargetAngle",
    "fireAngle",
    "rumble",
    "invincible",
    "invincibleColor",
    "gunArmed",
    "respawning",
    "pows",
    "releaseablePows"
] as const;

const PLAYER_BOOLEAN_FIELDS = ["weaponArmed", "longRange", "inSwamp"] as const;

const PLAYER_FLOAT_FIELDS = new Set(PLAYER_JAVA_FLOAT_FIELDS.filter(([, depth]) => depth === 0).map(([name]) => name));

export const PLAYER_DURABLE_FIELD_DESCRIPTOR: DurableFieldDescriptor = Object.freeze({
    ...Object.fromEntries(PLAYER_NUMBER_FIELDS.map((name) => [name, Object.freeze({ kind: "number", integer: !PLAYER_FLOAT_FIELDS.has(name) })])),
    ...Object.fromEntries(PLAYER_BOOLEAN_FIELDS.map((name) => [name, Object.freeze({ kind: "boolean" })]))
});

const ENEMY_ENTITY_TYPES = Object.freeze(
    GAME_ELEMENT_TYPE_IDS.filter((type) => GAME_ELEMENT_TYPES[type].prototype instanceof Enemy)
);
const ITANK_TRACKER_ENTITY_TYPES = Object.freeze(["BossGarageManager", "BossHeadquartersManager", "BossShipManager", "BossStatuesManager"] as const);

const REFERENCE_TARGETS: Partial<Record<GameElementTypeId, Readonly<Record<string, readonly GameElementTypeId[]>>>> = {
    BossBlueTank: { bossBlueTanksManager: ["BossBlueTanksManager"] },
    BossGarage: {
        bossGarageManager: ["BossGarageManager"],
        brownTank: ["BrownTank"],
        grayTank: ["GrayTank"]
    },
    BossHeadquarters: { bossHeadquartersManager: ["BossHeadquartersManager"] },
    BossShipGun: { bossShipManager: ["BossShipManager"] },
    BossStatue: { bossStatuesManager: ["BossStatuesManager"] },
    BossSuperTank: { superFire: ["SuperFire"] },
    BossSuperTankGun: { bossSuperTank: ["BossSuperTank"] },
    BrownTank: { tankTracker: ITANK_TRACKER_ENTITY_TYPES },
    Chinook: { introPlayer: ["IntroPlayer"] },
    EnemySoldier: { bossHelicopter: ["BossHelicopter"] },
    Explosion: { sourceEnemy: ENEMY_ENTITY_TYPES },
    Fire: { sourceEnemy: ENEMY_ENTITY_TYPES },
    FriendlySoldier: {
        brother: ["FriendlySoldier"],
        helicopter: ["FriendlyHelicopter"]
    },
    Gate: { bossGarageManager: ["BossGarageManager"] },
    GrayTank: { bossGarageManager: ["BossGarageManager"] },
    IntroPlayer: { chinook: ["Chinook"] },
    LasersManager: { laser: ["Laser"] },
    Parachute: { bossHelicopter: ["BossHelicopter"] },
    RotatingGun: { bossGarageManager: ["BossGarageManager"] },
    SuperFire: { bossSuperTank: ["BossSuperTank"] }
};

const NULLABLE_NUMERIC_FIELDS: Partial<Record<GameElementTypeId, ReadonlySet<string>>> = {
    BossSuperTankGun: new Set(["state"]),
    EnemySoldier: new Set(["type"]),
    FriendlySoldier: new Set(["type"]),
    RotatingGun: new Set(["state"])
};

const entityDescriptors = new Map<GameElementTypeId, DurableFieldDescriptor>();

export function getEntityDurableFieldDescriptor(type: GameElementTypeId): DurableFieldDescriptor {
    const cached = entityDescriptors.get(type);
    if (cached !== undefined) {
        return cached;
    }

    const prototype = GAME_ELEMENT_TYPES[type].prototype as object;
    const zeroState = Object.assign(Object.create(prototype) as Record<string, unknown>, GAME_ELEMENT_BASE_DEFAULTS);
    const initialize = Reflect.get(prototype, "__initializeJavaSubclassDefaults");
    if (typeof initialize === "function") {
        Reflect.apply(initialize, zeroState, []);
    }

    const floatFields = new Set(
        GAME_ELEMENT_JAVA_FLOAT_FIELDS[type].filter(([, depth]) => depth === 0).map(([name]) => name)
    );
    const descriptor: Record<string, DurableFieldPolicy> = {};
    for (const name of Object.keys(zeroState)) {
        if (SKIPPED_INSTANCE_FIELDS.has(name)) {
            continue;
        }
        descriptor[name] = policyForZeroState(type, name, zeroState[name], floatFields);
    }

    const frozen = Object.freeze(descriptor);
    entityDescriptors.set(type, frozen);
    return frozen;
}

export function getEntityDurableFieldNames(type: GameElementTypeId): readonly string[] {
    return Object.keys(getEntityDurableFieldDescriptor(type));
}

export function getDurableEntityReferences(type: GameElementTypeId, entity: GameElement): readonly GameElement[] {
    const descriptor = getEntityDurableFieldDescriptor(type);
    const references: GameElement[] = [];
    for (const [name, policy] of Object.entries(descriptor)) {
        if (policy.kind === "reference") {
            const value = Reflect.get(entity, name);
            if (value !== null) {
                if (typeof value !== "object") {
                    throw new Error(`Durable Jackal reference ${type}.${name} is not an object or null.`);
                }
                references.push(value as GameElement);
            }
        } else if (policy.kind === "referenceList") {
            const value = Reflect.get(entity, name);
            if (!(value instanceof ArrayList)) {
                throw new Error(`Durable Jackal reference list ${type}.${name} is not an ArrayList.`);
            }
            for (let i = 0; i < value.size(); i++) {
                const item = value.get(i);
                if (item === null || typeof item !== "object") {
                    throw new Error(`Durable Jackal reference list ${type}.${name} contains a non-entity value.`);
                }
                references.push(item as GameElement);
            }
        }
    }
    return references;
}

export function getPlayerDurableFieldNames(): readonly string[] {
    return Object.keys(PLAYER_DURABLE_FIELD_DESCRIPTOR);
}

export function isPlayerDurableFields(value: unknown): value is EncodedRecord {
    return isFieldsValid(value, PLAYER_DURABLE_FIELD_DESCRIPTOR, new Map<number, GameElementTypeId>());
}

export function isEntityDurableFields(
    type: GameElementTypeId,
    value: unknown,
    entityTypes: ReadonlyMap<number, GameElementTypeId>
): value is EncodedRecord {
    return isFieldsValid(value, getEntityDurableFieldDescriptor(type), entityTypes);
}

function policyForZeroState(
    type: GameElementTypeId,
    name: string,
    value: unknown,
    floatFields: ReadonlySet<string>
): DurableFieldPolicy {
    if (name === "trail") {
        return Object.freeze({ kind: "numberArray", integer: true, length: 8 });
    }
    if (type === "ElephantGun" && name === "asters") {
        return Object.freeze({ kind: "numberMatrix", integer: false, rows: 5, columns: 2 });
    }
    if (type === "LasersManager" && name === "visibles") {
        return Object.freeze({ kind: "booleanArray", length: 3 });
    }
    if (type === "BossGarageManager" && name === "garages") {
        return Object.freeze({ kind: "referenceList", targets: ["BossGarage"], minLength: 4, maxLength: 4 });
    }
    if (type === "BossShipManager" && name === "shipGuns") {
        return Object.freeze({ kind: "referenceList", targets: ["BossShipGun"], minLength: 0, maxLength: 6 });
    }

    const targets = REFERENCE_TARGETS[type]?.[name];
    if (targets !== undefined) {
        return Object.freeze({ kind: "reference", targets, nullable: true });
    }
    if (NULLABLE_NUMERIC_FIELDS[type]?.has(name) === true) {
        return Object.freeze({ kind: "number", integer: true });
    }

    switch (typeof value) {
        case "boolean":
            return Object.freeze({ kind: "boolean" });
        case "number":
            return Object.freeze({ kind: "number", integer: !floatFields.has(name) });
        default:
            throw new Error(`Unclassified durable Jackal field ${type}.${name}; update the persistence policy before saving this class.`);
    }
}

function isFieldsValid(
    value: unknown,
    descriptor: DurableFieldDescriptor,
    entityTypes: ReadonlyMap<number, GameElementTypeId>
): value is EncodedRecord {
    if (!isRecord(value)) {
        return false;
    }
    const names = Object.keys(descriptor);
    const keys = Object.keys(value);
    if (keys.length !== names.length || !names.every((name) => Object.hasOwn(value, name))) {
        return false;
    }
    return names.every((name) => isEncodedValueForPolicy(value[name], descriptor[name]!, name, entityTypes));
}

function isEncodedValueForPolicy(
    value: unknown,
    policy: DurableFieldPolicy,
    fieldName: string,
    entityTypes: ReadonlyMap<number, GameElementTypeId>
): boolean {
    switch (policy.kind) {
        case "boolean":
            return typeof value === "boolean";
        case "number":
            return isReasonableNumber(value, fieldName, policy.integer);
        case "reference":
            return value === null
                ? policy.nullable
                : isTypedEntityReference(value, policy.targets, entityTypes);
        case "referenceList":
            if (
                !isTaggedItems(value, "arrayList") ||
                value.items.length < policy.minLength ||
                value.items.length > policy.maxLength ||
                !value.items.every((item) => isTypedEntityReference(item, policy.targets, entityTypes))
            ) {
                return false;
            }
            return new Set(value.items.map((item) => (item as { id: number }).id)).size === value.items.length;
        case "numberArray":
            return (
                isTaggedItems(value, "array") &&
                value.items.length === policy.length &&
                value.items.every((item) => isReasonableNumber(item, fieldName, policy.integer))
            );
        case "numberMatrix":
            return (
                isTaggedItems(value, "array") &&
                value.items.length === policy.rows &&
                value.items.every(
                    (row) =>
                        isTaggedItems(row, "array") &&
                        row.items.length === policy.columns &&
                        row.items.every((item) => isReasonableNumber(item, fieldName, policy.integer))
                )
            );
        case "booleanArray":
            return isTaggedItems(value, "array") && value.items.length === policy.length && value.items.every((item) => typeof item === "boolean");
    }
}

function isTypedEntityReference(
    value: unknown,
    targets: readonly GameElementTypeId[],
    entityTypes: ReadonlyMap<number, GameElementTypeId>
): boolean {
    if (!isRecord(value) || Object.keys(value).length !== 2 || value.kind !== "entityRef" || !Number.isInteger(value.id)) {
        return false;
    }
    const targetType = entityTypes.get(value.id as number);
    return targetType !== undefined && targets.includes(targetType);
}

function isTaggedItems(value: unknown, kind: "array" | "arrayList"): value is { readonly kind: typeof kind; readonly items: EncodedValue[] } {
    return isRecord(value) && Object.keys(value).length === 2 && value.kind === kind && Array.isArray(value.items);
}

function isReasonableNumber(value: unknown, fieldName: string, integer: boolean): value is number {
    if (typeof value !== "number" || !Number.isFinite(value) || (integer && !Number.isInteger(value))) {
        return false;
    }
    if (integer && (value < JAVA_INT_MIN || value > JAVA_INT_MAX)) {
        return false;
    }
    if (fieldName === "vx" || fieldName === "vy") {
        return Math.abs(value) <= MAX_VELOCITY_MAGNITUDE;
    }
    if (fieldName === "x" || fieldName === "y" || fieldName.endsWith("X") || fieldName.endsWith("Y")) {
        return Math.abs(value) <= MAX_POSITION_MAGNITUDE;
    }
    return Math.abs(value) <= MAX_GENERAL_NUMBER_MAGNITUDE;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
