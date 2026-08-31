import { ArrayList } from "../../java/JavaRuntime.js";
import type { GameElement } from "../GameElement.js";
import type { GameMode } from "../GameMode.js";
import type { Main } from "../Main.js";
import type { Player } from "../Player.js";
import { SKIPPED_INSTANCE_FIELDS } from "./GameStateFields.js";
import type { EncodedRecord, EncodedValue } from "./GameStateSnapshot.js";
import { normalizeJavaFloatFields, type JavaFloatStateSpec } from "./JavaFloatState.js";

export type GameStateEncodeContext = {
    main: Main;
    gameMode: GameMode | null;
    player: Player | null;
    ids: Map<object, number>;
    entities: GameElement[];
};

export type GameStateDecodeContext = {
    main: Main;
    gameMode: GameMode | null;
    player: Player | null;
    entitiesById: Map<number, GameElement>;
};

export function createUninitialized<T extends object>(prototype: T): T {
    return Object.create(prototype) as T;
}

export function readEncodedNumberField(fields: EncodedRecord, name: string): number {
    const value = fields[name];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Expected numeric game-state field ${name}.`);
    }
    return value;
}

export function readEncodedBooleanField(fields: EncodedRecord, name: string): boolean {
    const value = fields[name];
    if (typeof value !== "boolean") {
        throw new Error(`Expected boolean game-state field ${name}.`);
    }
    return value;
}

export function encodeNamedFields(source: object, names: readonly string[], context: GameStateEncodeContext): EncodedRecord {
    const record: EncodedRecord = {};
    for (const name of names) {
        record[name] = encodeValue(Reflect.get(source, name), context);
    }
    return record;
}

export function encodeNullableNamedFields(source: object | null, names: readonly string[], context: GameStateEncodeContext): EncodedRecord | null {
    return source === null ? null : encodeNamedFields(source, names, context);
}

export function encodeObjectFields(source: object, context: GameStateEncodeContext): EncodedRecord {
    const record: EncodedRecord = {};
    for (const key of Object.keys(source)) {
        if (SKIPPED_INSTANCE_FIELDS.has(key)) {
            continue;
        }
        const value = Reflect.get(source, key);
        if (typeof value === "function" || typeof value === "undefined") {
            continue;
        }
        record[key] = encodeValue(value, context);
    }
    return record;
}

export function encodeValue(value: unknown, context: GameStateEncodeContext): EncodedValue {
    if (typeof value === "number") {
        if (Number.isFinite(value)) {
            return value;
        }
        if (Number.isNaN(value)) {
            return { kind: "nonFiniteNumber", value: "NaN" };
        }
        return { kind: "nonFiniteNumber", value: value < 0 ? "-Infinity" : "Infinity" };
    }
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return value;
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
            items.push(encodeValue(value.get(i), context));
        }
        return { kind: "arrayList", items };
    }
    if (Array.isArray(value)) {
        const items = new Array<EncodedValue>(value.length);
        for (let i = 0; i < value.length; i++) {
            items[i] = encodeValue(value[i], context);
        }
        return { kind: "array", items };
    }
    if (typeof value === "object") {
        const id = context.ids.get(value);
        return id === undefined ? { kind: "nullRef" } : { kind: "entityRef", id };
    }
    return null;
}

export function decodeFieldsInto(target: object, fields: EncodedRecord, context: GameStateDecodeContext, javaFloatFields: JavaFloatStateSpec = []): void {
    for (const [key, value] of Object.entries(fields)) {
        Reflect.set(target, key, decodeValue(value, context));
    }
    normalizeJavaFloatFields(target, javaFloatFields);
}

export function decodeValue(value: EncodedValue, context: GameStateDecodeContext): unknown {
    if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return value;
    }
    switch (value.kind) {
        case "nonFiniteNumber":
            switch (value.value) {
                case "NaN":
                    return Number.NaN;
                case "Infinity":
                    return Number.POSITIVE_INFINITY;
                case "-Infinity":
                    return Number.NEGATIVE_INFINITY;
            }
            throw new Error("Unsupported non-finite number value.");
        case "bigint":
            return BigInt(value.value);
        case "array": {
            const decoded = new Array<unknown>(value.items.length);
            for (let i = 0; i < value.items.length; i++) {
                decoded[i] = decodeValue(value.items[i], context);
            }
            return decoded;
        }
        case "arrayList": {
            const list = new ArrayList<unknown>(value.items.length);
            for (const item of value.items) {
                list.add(decodeValue(item, context));
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
    }
}
