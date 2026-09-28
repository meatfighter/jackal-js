import { ArrayList } from "../../java/JavaRuntime.js";
import type { GameElement } from "../GameElement.js";
import type { GameMode } from "../GameMode.js";
import type { Main } from "../Main.js";
import type { Player } from "../Player.js";
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
        try {
            record[name] = encodeValue(Reflect.get(source, name), context);
        } catch (error) {
            throw new Error(`Unable to encode durable Jackal field ${name}.`, { cause: error });
        }
    }
    return record;
}

export function encodeNullableNamedFields(source: object | null, names: readonly string[], context: GameStateEncodeContext): EncodedRecord | null {
    return source === null ? null : encodeNamedFields(source, names, context);
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
        if (id === undefined) {
            throw new Error("Unregistered object reference in durable Jackal game state.");
        }
        return { kind: "entityRef", id };
    }
    throw new Error(`Unsupported durable Jackal game-state value: ${typeof value}`);
}

export function decodeFieldsInto(target: object, fields: EncodedRecord, context: GameStateDecodeContext, javaFloatFields: JavaFloatStateSpec = []): void {
    decodeNamedFieldsInto(target, fields, Object.keys(fields), context, javaFloatFields);
}

export function decodeNamedFieldsInto(
    target: object,
    fields: EncodedRecord,
    names: readonly string[],
    context: GameStateDecodeContext,
    javaFloatFields: JavaFloatStateSpec = []
): void {
    for (const key of names) {
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
            throw new Error(`Unsafe saved field name: ${key}`);
        }
        if (!Object.hasOwn(fields, key)) {
            throw new Error(`Missing saved field: ${key}`);
        }
        const encoded = fields[key];
        if (encoded === undefined) {
            throw new Error(`Missing encoded game-state value for ${key}.`);
        }
        Reflect.set(target, key, decodeValue(encoded, context));
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
