import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypeScript } from "./persistence-test-loader.mjs";
const events = [];
globalThis.__resetEvents = events;
const actions = await loadTypeScript("pwa/src/app/PersistenceActions.ts", {
    "pwa/src/app/AppPreferences.ts": `export function clearPreferences(a){globalThis.__resetEvents.push(["preferences",a()]);return false;}`,
    "pwa/src/jackal/persistence/GameStateStorage.ts": `export function clearStoredGameState(a){globalThis.__resetEvents.push(["game",a()]);return false;}`
});
test("Reset aggregates partial failures without skipping later authorized slots", () => {
    events.length = 0;
    const mappings = {
        clear(a) {
            events.push(["mapping", a()]);
            return false;
        }
    };
    assert.equal(
        actions.clearPersistedPwaState(mappings, () => true),
        false
    );
    assert.deepEqual(events, [
        ["preferences", true],
        ["game", true],
        ["mapping", true]
    ]);
});
test("Reset stops invoking further mutation boundaries once ownership is lost", () => {
    events.length = 0;
    const mappings = {
        clear() {
            throw new Error("must not reach mapping after revocation");
        }
    };
    let allowed = true;
    const authorized = () => allowed;
    // The first mutation revokes authority, rather than relying on a brittle number of predicate calls.
    const originalPush = events.push;
    events.push = function (...items) {
        const result = originalPush.apply(this, items);
        allowed = false;
        return result;
    };
    try {
        assert.equal(actions.clearPersistedPwaState(mappings, authorized), false);
    } finally {
        delete events.push;
    }
    assert.deepEqual(events, [["preferences", true]]);
});
