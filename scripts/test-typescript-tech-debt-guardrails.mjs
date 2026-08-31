import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { relative, join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const pwaSourceRoot = join(rootDir, "pwa", "src");

function collectTypeScriptFiles(directory) {
    const result = [];
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
            result.push(...collectTypeScriptFiles(path));
        } else if (entry.isFile() && entry.name.endsWith(".ts")) {
            result.push(path);
        }
    }
    return result;
}

function read(path) {
    return readFileSync(join(rootDir, path), "utf8");
}

function matchingFiles(pattern, paths = collectTypeScriptFiles(pwaSourceRoot)) {
    return paths.filter((path) => pattern.test(readFileSync(path, "utf8"))).map((path) => relative(rootDir, path).replaceAll("\\", "/"));
}

test("translated TypeScript cannot regain runtime Java overload or unsafe-cast scaffolding", () => {
    const forbidden = [
        [/\barguments\.length\b/, "runtime arity dispatch"],
        [/__overload\d+|__construct_/, "generated overload/constructor dispatch"],
        [/No Java (?:method|constructor) overload matched/, "impossible generated overload errors"],
        [/\bas unknown as\b/, "double assertions"],
        [/\bas Record<string, unknown>\b/, "ad-hoc object field views"]
    ];

    for (const [pattern, label] of forbidden) {
        assert.deepEqual(matchingFiles(pattern), [], `${label} must not return to pwa/src.`);
    }
});

test("browser code does not retain dead Java desktop compatibility theater", () => {
    const allSource = collectTypeScriptFiles(pwaSourceRoot)
        .map((path) => readFileSync(path, "utf8"))
        .join("\n");
    for (const pattern of [
        /\bClass\.forName\b/,
        /\bCollections\.synchronizedMap\b/,
        /\bnew HashMap\b/,
        /\bArrays\.sort\b/,
        /\bBufferedInputStream\b/,
        /\bDataInputStream\b/,
        /\bclassLoader\b/,
        /\bjavaMain\s*\(/,
        /\bstateSaveInvalidated\b/,
        /\bisStateSaveInvalidatingMenuActive\b/,
        /\bappGameContainer\b/,
        /\bscalableGame\b/
    ]) {
        assert.doesNotMatch(allSource, pattern);
    }

    const runtime = read("pwa/src/java/JavaRuntime.ts");
    assert.doesNotMatch(runtime, /export class (HashMap|Collections|Arrays|BufferedInputStream|DataInputStream|Class|Integer|Character|JavaString)\b/);

    const main = read("pwa/src/jackal/Main.ts");
    assert.match(main, /lastPlayTime:\s*Map<Sound, number>/);
    assert.match(main, /mapLocal\.sort\(\(cell1: number\[\], cell2: number\[\]\) => cell1\[0\] - cell2\[0\]\)/);
    assert.match(main, /openDataResource\(/);

    const resources = read("pwa/src/jackal/JackalResources.ts");
    assert.match(resources, /new BinaryReader\(stream\)/);
    assert.match(resources, /ResourceLoader\.getResourceAsStream\(ref\)/);
});

test("save-state persistence stays modular, shared, backward-compatible, and cast-safe", () => {
    const serializer = read("pwa/src/jackal/persistence/JackalGameStateSerializer.ts");
    const serializerLineCount = serializer.split(/\r?\n/).length;
    assert.ok(serializerLineCount < 800, `Serializer has regrown into a monolith (${serializerLineCount} lines).`);

    for (const moduleName of ["EntityRuntimePersistence.js", "GameStateAudio.js", "GameStateCodec.js", "GameStateFields.js", "GameStateSnapshotValidator.js"]) {
        assert.match(serializer, new RegExp(moduleName.replace(".", "\\.")), `Serializer must delegate to ${moduleName}.`);
    }
    assert.doesNotMatch(serializer, /\bas unknown as\b|\bas Record<string, unknown>\b/);

    const webApp = read("pwa/src/app/JackalWebApp.ts");
    const store = read("pwa/src/jackal/persistence/JackalGameStateStore.ts");
    assert.match(webApp, /isSupportedGameStateSnapshot/);
    assert.match(store, /this\.serializer\.isSupportedSnapshot\(snapshot\)/);
    assert.doesNotMatch(webApp, /function isPotentialGameStateSnapshot/);

    const schema = read("pwa/src/jackal/persistence/GameStateSchema.ts");
    assert.match(schema, /GAME_STATE_VERSION\s*=\s*5/);
    assert.match(schema, /MIN_SUPPORTED_GAME_STATE_VERSION\s*=\s*4/);

    const snapshot = read("pwa/src/jackal/persistence/GameStateSnapshot.ts");
    const runtime = read("pwa/src/jackal/persistence/EntityRuntimePersistence.ts");
    assert.match(snapshot, /runtimeFields\?: EncodedRecord/);
    assert.match(runtime, /LEGACY_ENEMY_BULLET_SPRITE_FIELD/);
    assert.match(runtime, /clearLegacyRuntimeFields\(entity\)/);
});

test("TypeScript-native modules keep truthful nullability and stricter lint policy", () => {
    const nativeRoots = [join(pwaSourceRoot, "app"), join(pwaSourceRoot, "java"), join(pwaSourceRoot, "jackal", "persistence")];
    const nativeFiles = nativeRoots.flatMap(collectTypeScriptFiles);
    assert.deepEqual(matchingFiles(/null!/, nativeFiles), [], "TypeScript-native modules must not suppress nullable state with null!.");

    const main = read("pwa/src/jackal/Main.ts");
    assert.match(main, /public mode:\s*IMode \| null = null/);
    assert.match(main, /currentSong:\s*Song \| null = null/);
    assert.match(main, /requestedSong:\s*Song \| null = null/);
    assert.match(main, /fadeListener:\s*IFadeListener \| null = null/);
    assert.match(main, /konamiCode:\s*KonamiCode \| null = null/);
    assert.match(main, /if \(mode === null\) \{\s*throw new Error\("Jackal mode is unavailable during update\."\)/);
    assert.match(main, /if \(mode === null\) \{\s*throw new Error\("Jackal mode is unavailable during render\."\)/);

    const player = read("pwa/src/jackal/Player.ts");
    const serializer = read("pwa/src/jackal/persistence/JackalGameStateSerializer.ts");
    assert.match(player, /restoreRuntimeReferences\(main: Main, gameMode: GameMode\): void/);
    assert.match(serializer, /player\.restoreRuntimeReferences\(main, gameMode\)/);

    const eslintConfig = read("eslint.config.js");
    assert.match(eslintConfig, /const typescriptNativeFiles =/);
    assert.match(eslintConfig, /const javascriptNativeFiles =/);
    assert.match(eslintConfig, /files:\s*\["pwa\/src\/jackal\/\*\.ts"\]/);
    assert.match(eslintConfig, /files:\s*typescriptNativeFiles/);
    assert.match(eslintConfig, /"@typescript-eslint\/no-unused-vars": \[/);
    assert.match(eslintConfig, /"prefer-const": "error"/);
    assert.match(eslintConfig, /"no-useless-assignment": "error"/);
});
