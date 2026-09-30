import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadTypeScript, memoryStorage } from "./persistence-test-loader.mjs";
const root = "pwa/src/jackal/persistence/",
    schema = root + "GameStateSchema.ts",
    storage = root + "GameStateStorage.ts",
    validator = root + "GameStateSnapshotValidator.ts",
    boundary = "pwa/src/app/BrowserPersistence.ts";
function change(source, from, to) {
    assert.ok(source.includes(from), "Missing mutation target");
    return source.replace(from, to);
}
async function exercise(transforms = {}) {
    const mocks = {
        [validator]: `import {isSupportedGameStateVersion} from "./GameStateSchema.js"; export function isSupportedGameStateSnapshot(s){return s?.supported===true&&isSupportedGameStateVersion(s.version);}`
    };
    for (const [path, transform] of Object.entries(transforms)) mocks[path] = transform(readFileSync(path, "utf8"));
    const version = await loadTypeScript(schema, mocks);
    assert.equal(version.GAME_STATE_VERSION, 23, "Current writer deliberately emits23");
    const api = await loadTypeScript(storage, mocks),
        s = memoryStorage(),
        old = Object.getOwnPropertyDescriptor(globalThis, "localStorage"),
        warn = console.warn;
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: s });
    console.warn = () => {};
    try {
        const current = { version: 23, supported: true, appVersion: "any-current-build" };
        assert.equal(api.writeStoredGameState(current, () => true).saved, true, "Current positive control");
        const key = s.calls.set[0];
        assert.match(key, /jackal\.game-state(?::|$)/);
        for (const rejected of [...Array.from({ length: 23 }, (_, i) => i), 24]) {
            const bytes = JSON.stringify({ ...current, version: rejected });
            s.values.set(key, bytes);
            s.clearCalls();
            assert.equal(api.inspectStoredGameState().status, "invalid", "Unsupported read is a miss");
            assert.equal(s.values.get(key), bytes, "Read miss preserves exact bytes");
            assert.deepEqual(s.calls.remove, []);
            assert.deepEqual(s.calls.set, []);
            s.clearCalls();
            let authorized = true;
            const retiring = {
                ...current,
                toJSON() {
                    authorized = false;
                    return current;
                }
            };
            assert.deepEqual(
                api.writeStoredGameState(retiring, () => authorized),
                { saved: false, reason: "not-authorized" },
                "Retired writer cannot write after encoding"
            );
            assert.equal(s.values.get(key), bytes);
            assert.deepEqual(s.calls.set, []);
            assert.deepEqual(
                api.writeStoredGameState(current, () => false),
                { saved: false, reason: "not-authorized" }
            );
            assert.equal(s.values.get(key), bytes);
            s.clearCalls();
            s.faults.get = true;
            assert.equal(api.writeStoredGameState(current, () => true).saved, true, "Authorized write must not read old slot");
            assert.deepEqual(s.calls.get, []);
            assert.deepEqual(s.calls.remove, [], "No pre-delete before replacement");
            assert.deepEqual(s.calls.set, [key]);
            assert.equal(JSON.parse(s.values.get(key)).version, 23);
            s.faults.get = false;
        }
    } finally {
        console.warn = warn;
        if (old) Object.defineProperty(globalThis, "localStorage", old);
        else delete globalThis.localStorage;
    }
}
test("current-schema storage counterexamples fail intended assertions without altering candidate files", async (t) => {
    await exercise();
    const mutants = [
        ["revert current version to18", schema, (s) => change(s, "GAME_STATE_VERSION = 23", "GAME_STATE_VERSION = 18")],
        ["revert current version to19", schema, (s) => change(s, "GAME_STATE_VERSION = 23", "GAME_STATE_VERSION = 19")],
        ["accept19 in exact predicate", schema, (s) => change(s, "value === GAME_STATE_VERSION", "value === GAME_STATE_VERSION || value === 19")],
        [
            "relabel19",
            storage,
            (s) =>
                change(
                    s,
                    "const snapshot: unknown = JSON.parse(stored.value);",
                    "const snapshot = JSON.parse(stored.value); if(snapshot.version===19)snapshot.version=23;"
                )
        ],
        ["accept18 in exact predicate", schema, (s) => change(s, "value === GAME_STATE_VERSION", "value === GAME_STATE_VERSION || value === 18")],
        [
            "relabel old records before validation",
            storage,
            (s) =>
                change(
                    s,
                    "const snapshot: unknown = JSON.parse(stored.value);",
                    "const snapshot = JSON.parse(stored.value); if(snapshot.version===18)snapshot.version=23;"
                )
        ],
        [
            "delete unsupported record on inspection",
            storage,
            (s) =>
                change(
                    s,
                    'if (stored.value === null) return { status: "missing" };',
                    'if (stored.value === null) return { status: "missing" }; globalThis.localStorage.removeItem(getDeploymentStorageKey(GAME_STATE_STORAGE_KEY));'
                )
        ],
        [
            "read old slot during save",
            boundary,
            (s) => change(s, "const storage = globalThis.localStorage;", "const storage = globalThis.localStorage; storage.getItem(key);")
        ],
        [
            "pre-delete old slot during save",
            boundary,
            (s) => change(s, "const storage = globalThis.localStorage;", "const storage = globalThis.localStorage; storage.removeItem(key);")
        ],
        [
            "retired writer bypasses authorization",
            boundary,
            (s) => change(s, 'if (!isAuthorized()) return { saved: false, reason: "not-authorized" };', "// mutation: authorize retired writer")
        ]
    ];
    for (const [name, path, transform] of mutants)
        await t.test(name, () =>
            assert.rejects(
                exercise({ [path]: transform }),
                (error) => error instanceof assert.AssertionError && !error.message.includes("Missing mutation target")
            )
        );
    await exercise();
});
