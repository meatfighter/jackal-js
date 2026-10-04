import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { endingModules, endingFixture } from "./ending-test-utils.mjs";
function replace(source, from, to) {
    assert.ok(source.includes(from), "mutation anchor");
    return source.replace(from, to);
}
async function probe(transform = {}) {
    const mod = await endingModules(transform);
    try {
        const f = endingFixture(mod, { stage: 0 });
        f.enter("INTRO_MAP");
        const base = f.validate();
        for (const name of ["extraLives", "friendlySoldiersPickedUp"]) {
            const s = structuredClone(base);
            s.mainFields[name] = 1000001;
            assert.equal(mod.validator.isSupportedGameStateSnapshot(s), true, name + " technical domain");
        }
        for (const [hasMissiles, missilePower] of [
            [true, 3],
            [false, 1]
        ]) {
            const s = structuredClone(base);
            Object.assign(s.mainFields, { hasMissiles, missilePower });
            assert.equal(mod.validator.isSupportedGameStateSnapshot(s), false, "missile implication");
        }
    } finally {
        await mod.server.close();
    }
}
test("counter-domain mutants fail their intended value assertions with green controls", async () => {
    await probe();
    for (const [from, to] of [
        ["isIntegerInRange(fields.extraLives, 0, Number.MAX_SAFE_INTEGER)", "isIntegerInRange(fields.extraLives, 0, 1_000_000)"],
        ["isIntegerInRange(fields.friendlySoldiersPickedUp, 0, Number.MAX_SAFE_INTEGER)", "isIntegerInRange(fields.friendlySoldiersPickedUp, 0, 1_000_000)"],
        ["isIntegerInRange(fields.missilePower, 0, 2)", "isIntegerInRange(fields.missilePower, 0, 3)"],
        ["(fields.hasMissiles === true || fields.missilePower === 0)", "true"]
    ])
        await assert.rejects(
            probe({ "persistence/GameStateSnapshotValidator": (s) => replace(s, from, to) }),
            (e) => e.code === "ERR_ASSERTION" && /technical domain|missile implication/.test(e.message)
        );
    await probe();
});
test("omitted MAP, Input or final-text coverage is detected independently", () => {
    const input = readFileSync("scripts/test-input-live-save-oracle.mjs", "utf8"),
        map = readFileSync("scripts/test-map-counter-continuation.mjs", "utf8"),
        browser = readFileSync("pwa/src/browser-verify.ts", "utf8");
    // Whitespace-insensitive source contracts keep this meta-coverage distinct from behavioral mutants.
    const compact = (s) => s.replace(/\s+/g, "");
    const contracts = [
        [input, "assert.deepEqual([...states].sort(),[0,1,2,3,4,6]);"],
        [map, "assert.deepEqual([...seen].sort(),[0,1,2,3,4]);"],
        [browser, '"actual final completion preserves ending text"']
    ];
    for (const [source, anchor] of contracts) {
        const text = compact(source),
            needle = compact(anchor);
        assert.ok(text.includes(needle), "required executed assertion present");
        assert.throws(() => assert.ok(text.replace(needle, "").includes(needle), "required executed assertion present"), { code: "ERR_ASSERTION" });
    }
    assert.ok(compact(input).includes('for(constprofileof["keyboard","gamepad","mixed"])'), "Input profiles wired");
});
