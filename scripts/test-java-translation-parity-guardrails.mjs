import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

const exceptions = JSON.parse(read("scripts/java-ts-parity-exceptions.json"));

function normalizeSignature(signature) {
    return signature.replace(/\s+/g, " ").trim();
}

function readJavaSource(name) {
    return read(`desktop/src/jackal/${name}.java`);
}

function readTypeScriptSource(name) {
    return read(`pwa/src/jackal/${name}.ts`);
}

function hasException(group, key) {
    return Object.hasOwn(exceptions[group] ?? {}, key);
}

function normalizedMethodSignature(source, methodName) {
    const match = source.match(new RegExp(`(?:public|protected|private)\\s+(?:static\\s+)?[^;{}]+\\b${methodName}\\s*\\([^)]*\\)`));
    return match === null ? null : normalizeSignature(match[0]);
}

function countOccurrences(source, pattern) {
    return [...source.matchAll(pattern)].length;
}

test("Java collection iteration and removal semantics remain explicit in TypeScript", () => {
    const java = readJavaSource("GameMode");
    const ts = readTypeScriptSource("GameMode");

    assert.match(java, /for\s*\(int i = list\.size\(\) - 1; i >= 0; i--\)/);
    assert.match(ts, /for \(let j = list\.size\(\) - 1; j >= 0; j--\)/);
    assert.match(ts, /if \(!element\.removeFlag\) \{\s*element\.render\(\);/);
    assert.match(ts, /if \(element\.removeFlag\) \{\s*list\.remove\(j\);/);
});

test("translated constructor factories are documented instead of disguised overloads", () => {
    const signatures = JSON.parse(read("scripts/java-ts-signature-map.json"));
    assert.equal(signatures.version, 1);
    assert.equal(signatures.constructorFactories["BossShipGun.constructor"], undefined);
    assert.deepEqual(signatures.constructorFactories["FloorGun.create"], { javaParameterTypes: ["float", "float"] });
    assert.deepEqual(signatures.constructorFactories["FloorGun.withPlainStyle"], { javaParameterTypes: ["float", "float", "boolean"] });
});

test("browser-specific constructor and field translations stay documented", () => {
    assert.equal(exceptions.fieldExceptions["Fire.enemy"].target, "sourceEnemy");
    assert.equal(exceptions.fieldExceptions["JeepYeahExplosion.remove"].target, "removeEffect");
    assert.equal(exceptions.fieldExceptions["JeepYeahBullet.remove"].target, "removeEffect");
    assert.equal(exceptions.fieldExceptions["JeepYeahPlane.remove"].target, "removeEffect");
    assert.equal(exceptions.fieldExceptions["JeepYeahFireLeft.remove"].target, "removeEffect");
    assert.equal(exceptions.fieldExceptions["JeepYeahFireRight.remove"].target, "removeEffect");
    assert.equal(exceptions.fieldExceptions["ButtonMapping.controller"].target, undefined);
});

test("direct Java translation retains field initialization parity guardrails", () => {
    const gameElement = readTypeScriptSource("GameElement");
    assert.match(gameElement, /this\.__initializeJavaSubclassDefaults\(\);\s*this\.init\(\);\s*this\.gameMode\.addGameElement\(this\);/);

    for (const className of ["Enemy", "BossBlueTank", "BossSuperTank", "EnemySoldier", "FriendlySoldier", "Player"]) {
        const source = readTypeScriptSource(className);
        if (className !== "Player") {
            assert.match(source, /__initializeJavaSubclassDefaults/);
        }
    }
});

test("Java field hiding remains represented by separate JavaScript properties", () => {
    const fire = readTypeScriptSource("Fire");
    assert.match(fire, /declare public sourceEnemy: Enemy \| null/);
    assert.match(fire, /this\.sourceEnemy = enemy/);
    assert.match(fire, /this\.sourceEnemy!\.removeFlag/);
    assert.doesNotMatch(fire, /this\.enemy = enemy/);
});

test("JeepYeah removal state follows the original Java field", () => {
    for (const name of ["JeepYeahExplosion", "JeepYeahBullet", "JeepYeahPlane", "JeepYeahFireLeft", "JeepYeahFireRight"]) {
        const source = readTypeScriptSource(name);
        assert.match(source, /removeEffect/);
    }
});

test("Java boolean XOR translations remain boolean negations", () => {
    const expected = [
        ["BossSuperTankGun", /this\.right = !this\.right/],
        ["BrownTank", /this\.turnCW = !this\.turnCW/],
        ["GrayJeep", /this\.turnCW = !this\.turnCW/],
        ["GrayTank", /this\.turnCW = !this\.turnCW/]
    ];
    for (const [className, pattern] of expected) {
        assert.match(readTypeScriptSource(className), pattern);
    }
});

test("Java overload cleanup uses fixed-arity methods and explicit constructor factories", () => {
    const signatureMap = JSON.parse(read("scripts/java-ts-signature-map.json"));
    for (const [key, mapping] of Object.entries(signatureMap.methodMappings)) {
        const [className, methodName] = key.split(".");
        const source = readTypeScriptSource(className);
        assert.match(source, new RegExp(`\\b${methodName}\\s*\\(`));
        assert.equal(typeof mapping.javaName, "string");
        assert.ok(Array.isArray(mapping.javaParameterTypes));
    }
    for (const [key, mapping] of Object.entries(signatureMap.constructorFactories)) {
        const [className, methodName] = key.split(".");
        const source = readTypeScriptSource(className);
        assert.match(source, new RegExp(`\\b${methodName}\\s*\\(`));
        assert.ok(Array.isArray(mapping.javaParameterTypes));
    }
});

test("Java-shaped shared representations avoid JavaScript coercion and duplicated state", () => {
    const runtime = read("pwa/src/java/JavaRuntime.ts");
    assert.match(runtime, /export function javaFloat\(value: number\): number \{\s*return Math\.fround\(value\);/);
    assert.match(runtime, /export function javaInt\(value: number\): number/);
    assert.match(runtime, /export function javaIntDiv\(numerator: number, denominator: number\): number/);
    assert.match(runtime, /export class ArrayList/);
    assert.match(runtime, /export class Random/);

    const gameMode = readTypeScriptSource("GameMode");
    assert.match(gameMode, /public directionsDecoded: Uint8Array/);
    assert.doesNotMatch(gameMode, /directionsLegacy|legacyDirections/);
});

test("Java float parameter boundaries survive overload cleanup", () => {
    const expected = [
        ["Enemy", "isMineAt", /x = javaFloat\(x\);\s*y = javaFloat\(y\);/],
        ["Enemy", "isMineBounds", /x1 = javaFloat\(x1\);\s*y1 = javaFloat\(y1\);\s*x2 = javaFloat\(x2\);\s*y2 = javaFloat\(y2\);/],
        ["Enemy", "isSolidAt", /x = javaFloat\(x\);\s*y = javaFloat\(y\);/],
        ["Enemy", "isSolidBounds", /x1 = javaFloat\(x1\);\s*y1 = javaFloat\(y1\);\s*x2 = javaFloat\(x2\);\s*y2 = javaFloat\(y2\);/],
        ["GameMode", "isDriveableBounds", /x1 = javaFloat\(x1\);\s*y1 = javaFloat\(y1\);\s*x2 = javaFloat\(x2\);\s*y2 = javaFloat\(y2\);/],
        ["GameMode", "isDriveable", /x = javaFloat\(x\);\s*y = javaFloat\(y\);/],
        ["GameMode", "isOutsideOfFrame", /x = javaFloat\(x\);\s*y = javaFloat\(y\);/],
        ["GameMode", "isOutsideOfFrameBounds", /x1 = javaFloat\(x1\);\s*y1 = javaFloat\(y1\);\s*x2 = javaFloat\(x2\);\s*y2 = javaFloat\(y2\);/],
        ["HitElement", "hitAt", /x = javaFloat\(x\);\s*y = javaFloat\(y\);/],
        ["HitElement", "hitBounds", /x1 = javaFloat\(x1\);\s*y1 = javaFloat\(y1\);\s*x2 = javaFloat\(x2\);\s*y2 = javaFloat\(y2\);/],
        ["Main", "playSoundAtVolume", /volume = javaFloat\(volume\);/],
        ["Main", "playSoundIfNotPlayingAtVolume", /volume = javaFloat\(volume\);/],
        ["Player", "attackBounds", /x1 = javaFloat\(x1\);\s*y1 = javaFloat\(y1\);\s*x2 = javaFloat\(x2\);\s*y2 = javaFloat\(y2\);/],
        ["Player", "attackAt", /x = javaFloat\(x\);\s*y = javaFloat\(y\);/]
    ];

    for (const [className, methodName, pattern] of expected) {
        const source = readTypeScriptSource(className);
        assert.match(source, new RegExp(`public(?: override)? ${methodName}[\\s\\S]*?${pattern.source}`));
    }
});

test("Main browser timing boundary remains explicit and isolated", () => {
    const main = readTypeScriptSource("Main");
    assert.match(main, /private advanceFadeOnFixedUpdate\(\): void/);
    assert.match(main, /this\.advanceFadeOnFixedUpdate\(\);/);
    assert.match(main, /while \(this\.nextFrameTime <= Sys\.getTime\(\)\)/);
    assert.match(main, /if \(\+\+count === 8\)/);
});

test("Java random state remains deterministic and restorable", () => {
    const runtime = read("pwa/src/java/JavaRuntime.ts");
    assert.match(runtime, /public getState\(\)/);
    assert.match(runtime, /public static fromState\(/);
    assert.match(runtime, /this\.seed = /);
});

test("browser Main constants remain Java-shaped aliases", () => {
    const main = readTypeScriptSource("Main");
    for (const constant of [
        "DISPLAY_WIDTH",
        "DISPLAY_HEIGHT",
        "FONT_WHITE",
        "FONT_GRAY",
        "FONT_ORANGE",
        "FONT_ORANGE_GRAY",
        "MINIMUM_SOUND_TIME",
        "CHARS",
        "TILES"
    ]) {
        assert.match(main, new RegExp(String.raw`public static readonly ${constant}:[^=]+=[\s\S]*?MainConstants\.${constant}`));
    }

    const math = read("pwa/src/jackal/JackalMath.ts");
    assert.match(math, /export function rotatePointLikeJava/);
    assert.match(math, /const cos = javaFloat\(Math\.cos\(angle\)\)/);
    assert.match(math, /const sin = javaFloat\(Math\.sin\(angle\)\)/);
    assert.match(main, /return rotatePointLikeJava\(x, y, angle\);/);
    assert.match(read("pwa/src/jackal/Player.ts"), /rotatePointLikeJava/);
});

test("TypeScript policy strengthens checking without changing Java field semantics", () => {
    const tsconfig = JSON.parse(read("pwa/tsconfig.json"));
    const options = tsconfig.compilerOptions;

    assert.equal(options.useDefineForClassFields, false);
    assert.equal(options.strict, true);
    assert.equal(options.strictPropertyInitialization, false);
    assert.equal(options.noImplicitAny, true);
    assert.equal(options.noImplicitOverride, true);
    assert.equal(options.verbatimModuleSyntax, true);
    assert.equal(options.noImplicitReturns, true);
    assert.equal(options.noFallthroughCasesInSwitch, true);

    const schema = read("pwa/src/jackal/persistence/GameStateSchema.ts");
    assert.match(schema, /GAME_STATE_VERSION\s*=\s*9/);
    assert.doesNotMatch(schema, /MIN_SUPPORTED_GAME_STATE_VERSION|SUPPORTED_GAME_STATE_VERSIONS/);
});
