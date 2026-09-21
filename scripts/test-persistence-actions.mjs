import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

function compileModule(source) {
    const compiled = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`;
}

test("Reset threads one authorization callback through every destructive persistence boundary", async () => {
    const events = [];
    const preferencesUrl = compileModule(`
        export function clearPreferences(isAuthorized) {
            globalThis.__persistenceEvents.push(["preferences", isAuthorized()]);
            return false;
        }
        export function writeDifficultyPreference() { return true; }
        export function writeFullscreenPreference() { return true; }
        export function writeScalingPreference() { return true; }
        export function writeVolume() { return true; }
    `);
    const gameStateUrl = compileModule(`
        export function clearStoredGameState(isAuthorized) {
            globalThis.__persistenceEvents.push(["game-state", isAuthorized()]);
            return false;
        }
    `);

    globalThis.__persistenceEvents = events;
    try {
        const source = readFileSync(new URL("../pwa/src/app/PersistenceActions.ts", import.meta.url), "utf8")
            .replace(`from "../jackal/persistence/GameStateStorage.js";`, `from "${gameStateUrl}";`)
            .replace(`from "./AppPreferences.js";`, `from "${preferencesUrl}";`);
        const actions = await import(compileModule(source));

        let authorizationChecks = 0;
        const isAuthorized = () => {
            authorizationChecks++;
            return authorizationChecks === 1;
        };
        const inputMappings = {
            clear(callback) {
                events.push(["mapping", callback()]);
                return false;
            }
        };
        const warnings = {
            messages: [],
            report(message) {
                this.messages.push(message);
            }
        };

        actions.clearPersistedPwaState(inputMappings, warnings, isAuthorized);

        assert.deepEqual(events, [
            ["preferences", true],
            ["game-state", false],
            ["mapping", false]
        ]);
        assert.deepEqual(warnings.messages, ["Some saved Jackal settings could not be cleared."]);
    } finally {
        delete globalThis.__persistenceEvents;
    }
});
