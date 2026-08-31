import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const BITS_PER_DIRECTION = 3n;
const DIRECTIONS_PER_LONG = 21;
const DIRECTION_MASK = 7n;

function readDirectionFile(stageIndex) {
    const path = join(rootDir, "desktop", "src", "maps", `dirs-${stageIndex}.dat`);
    const bytes = readFileSync(path);
    const size = bytes.readInt32BE(0);
    const width = bytes.readInt32BE(4);
    const height = bytes.readInt32BE(8);
    assert.equal(bytes.length, 12 + size * 8, `Unexpected size for dirs-${stageIndex}.dat.`);

    const packed = new Array(size);
    for (let i = 0; i < size; i++) {
        packed[i] = bytes.readBigInt64BE(12 + i * 8);
    }
    return { size, width, height, packed };
}

function decodeJavaStyle(packed, logicalIndex) {
    const packedIndex = Math.trunc(logicalIndex / DIRECTIONS_PER_LONG);
    const shift = BITS_PER_DIRECTION * BigInt(logicalIndex % DIRECTIONS_PER_LONG);
    return Number((packed[packedIndex] >> shift) & DIRECTION_MASK);
}

function buildOptimizedCache(packed) {
    const decoded = new Uint8Array(packed.length * DIRECTIONS_PER_LONG);
    for (let i = 0; i < packed.length; i++) {
        const value = packed[i];
        const offset = i * DIRECTIONS_PER_LONG;
        for (let j = 0; j < DIRECTIONS_PER_LONG; j++) {
            decoded[offset + j] = Number((value >> (BITS_PER_DIRECTION * BigInt(j))) & DIRECTION_MASK);
        }
    }
    return decoded;
}

function readMethod(path, className, methodName) {
    const source = readFileSync(path, "utf8");
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    let found;

    function visit(node) {
        if (
            ts.isMethodDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            node.name.text === methodName &&
            ts.isClassDeclaration(node.parent) &&
            node.parent.name?.text === className
        ) {
            found = node;
        }
        ts.forEachChild(node, visit);
    }

    visit(sourceFile);
    assert.ok(found?.body, `Missing ${className}.${methodName}.`);
    return { sourceFile, method: found };
}

function descendants(node) {
    const result = [];

    function visit(child) {
        result.push(child);
        ts.forEachChild(child, visit);
    }

    ts.forEachChild(node, visit);
    return result;
}

test("predecoded directions exactly match Java packed-long extraction for every shipped stage", () => {
    let checked = 0;
    for (let stageIndex = 0; stageIndex < 6; stageIndex++) {
        const data = readDirectionFile(stageIndex);
        assert.ok(data.width > 0 && data.height > 0, `Stage ${stageIndex} direction dimensions must be positive.`);

        const decoded = buildOptimizedCache(data.packed);
        for (let i = 0; i < decoded.length; i++) {
            const expected = decodeJavaStyle(data.packed, i);
            assert.equal(decoded[i], expected, `Stage ${stageIndex}, direction ${i} differs from Java extraction.`);
            assert.ok(decoded[i] <= 7);
            checked++;
        }
    }
    assert.ok(checked > 1_000, "Direction parity test should cover the shipped data, not a token sample.");
});

test("the PWA decodes directions once and uses allocation-free byte lookups in the hot path", () => {
    const mainPath = join(rootDir, "pwa", "src", "jackal", "Main.ts");
    const gameModePath = join(rootDir, "pwa", "src", "jackal", "GameMode.ts");
    const gameStateFields = readFileSync(join(rootDir, "pwa", "src", "jackal", "persistence", "GameStateFields.ts"), "utf8");

    const loadDirections = readMethod(mainPath, "Main", "loadDirections");
    const loadText = loadDirections.method.getText(loadDirections.sourceFile);
    assert.match(loadText, /new Uint8Array\(size \* 21\)/);
    assert.match(loadText, /JAVA_LONG_PACKED_3BIT_SHIFTS\[j\]/);
    assert.match(loadText, /JAVA_LONG_LOW_3_BITS/);

    for (const methodName of ["suggestDirectionWithCurrentAngle", "suggestDirection"]) {
        const parsed = readMethod(gameModePath, "GameMode", methodName);
        const text = parsed.method.getText(parsed.sourceFile);
        assert.match(text, /this\.directionsDecoded\[i\]/, `${methodName} must use the predecoded byte cache.`);

        const nodes = descendants(parsed.method.body);
        assert.equal(
            nodes.some((node) => ts.isNewExpression(node)),
            false,
            `${methodName} must not allocate objects in its hot path.`
        );
        assert.equal(
            nodes.some((node) => ts.isArrayLiteralExpression(node)),
            false,
            `${methodName} must not allocate arrays in its hot path.`
        );
        assert.equal(
            nodes.some((node) => ts.isObjectLiteralExpression(node)),
            false,
            `${methodName} must not allocate objects in its hot path.`
        );
        assert.equal(
            nodes.some((node) => ts.isBigIntLiteral(node)),
            false,
            `${methodName} must not perform per-call BigInt decoding.`
        );
        assert.doesNotMatch(text, /this\.directions\s*\[/, `${methodName} must not read packed direction longs in its hot path.`);
        assert.doesNotMatch(text, /JAVA_LONG_PACKED_3BIT_SHIFTS|JAVA_LONG_LOW_3_BITS/, `${methodName} must not decode packed directions per call.`);
    }

    for (const methodName of ["createUnitVector", "createUnitVector2"]) {
        const parsed = readMethod(mainPath, "Main", methodName);
        const text = parsed.method.getText(parsed.sourceFile);
        assert.match(text, /return this\.unitVector;/, `${methodName} must reuse Main.unitVector.`);
        assert.equal(
            descendants(parsed.method.body).some((node) => ts.isNewExpression(node)),
            false,
            `${methodName} must remain allocation-free.`
        );
    }

    assert.match(gameStateFields, /"directionsDecoded"/, "The derived cache must remain excluded from save-state persistence.");
});
