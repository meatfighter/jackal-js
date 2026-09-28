import assert from "node:assert/strict";
import { test } from "node:test";
import { createSavedGraph, createGraphFixture } from "./game-mode-persistence-test-utils.mjs";
const fixture = await createGraphFixture();
const { graph } = fixture;
const valid = () => ({
    entities: [
        { id: 0, type: "Rock", fields: { enemy: true, solid: true, mine: true, removeFlag: true } },
        { id: 1, type: "Bomb", fields: { enemy: true, solid: false, mine: true } },
        { id: 2, type: "BossSuperTank", fields: { enemy: true, solid: false, mine: false } },
        { id: 3, type: "Rock", fields: { enemy: true, solid: true, mine: true } },
        { id: 4, type: "Rock", fields: { enemy: true, solid: true, mine: true } }
    ],
    elements: [[0, 1], [2, 3], [], [], [], [], [], []],
    indexes: { enemies: [3, 1, 0, 2], solids: [0, 3], mines: [3, 0, 1] }
});
for (const role of ["solids", "mines"]) {
    test(role + " requires exact role membership without changing independent order", () => {
        const good = valid(),
            before = JSON.stringify(good);
        assert.equal(graph.isGameModeIndexGraph(good), true);
        assert.equal(JSON.stringify(good), before);
        for (const mutate of [
            (s) => s.indexes[role].pop(),
            (s) => s.indexes[role].push(2),
            (s) => s.indexes[role].push(s.indexes[role][0]),
            (s) => s.indexes[role].push(4),
            (s) => s.indexes[role].push(-1),
            (s) => s.indexes[role].push(0.5),
            (s) => s.indexes[role].push(4096),
            (s) => {
                [s.indexes.solids, s.indexes.mines] = [s.indexes.mines, s.indexes.solids];
            }
        ]) {
            const bad = valid();
            mutate(bad);
            const unchanged = JSON.stringify(bad);
            assert.equal(graph.isGameModeIndexGraph(bad), false, role + " " + mutate);
            assert.equal(JSON.stringify(bad), unchanged);
        }
    });
}
test("empty active sets allow detached graph nodes without activation", () => {
    const s = valid();
    s.elements = Array.from({ length: 8 }, () => []);
    s.indexes = { enemies: [], solids: [], mines: [] };
    assert.equal(graph.isGameModeIndexGraph(s), true);
});

test("real full snapshots reject each missing/spurious role and preserve independent lists", async () => {
    const { source, serializer, world, main } = await createSavedGraph(fixture);
    const { Rock } = await fixture.server.ssrLoadModule("/src/jackal/Rock.ts");
    const a = new Rock(300, 300),
        b = new Rock(400, 300);
    a.removeFlag = true; // Pending removal remains a member until normal cleanup.
    world.solids.removeValue(a);
    world.solids.add(a);
    const snapshot = serializer.createSnapshot(source, "test");
    assert.equal(serializer.isSupportedSnapshot(snapshot), true);
    assert.notDeepEqual(snapshot.gameMode.indexes.solids, snapshot.gameMode.indexes.mines);
    const detached = snapshot.gameMode.entities.find((e) => e.type === "Rock" && !snapshot.gameMode.indexes.enemies.includes(e.id)).id;
    for (const role of ["solids", "mines"]) {
        for (const mutate of [
            (s) => s.gameMode.indexes[role].pop(),
            (s) => s.gameMode.indexes[role].push(detached),
            (s) => s.gameMode.indexes[role].push(s.gameMode.indexes[role][0]),
            (s) => s.gameMode.indexes[role].push(snapshot.gameMode.entities.find((e) => e.type === "BossSuperTank").id),
            (s) => (s.gameMode.entities.find((e) => e.id === s.gameMode.indexes[role][0]).fields[role === "solids" ? "solid" : "mine"] = false)
        ]) {
            const bad = structuredClone(snapshot);
            mutate(bad);
            const bytes = JSON.stringify(bad);
            assert.equal(serializer.isSupportedSnapshot(bad), false, role + " " + mutate);
            assert.equal(JSON.stringify(bad), bytes);
        }
    }
    const fresh = main();
    serializer.restoreSnapshot(fresh, {}, snapshot);
    const restored = serializer.createSnapshot(fresh, "test");
    assert.deepEqual(restored.gameMode.indexes, snapshot.gameMode.indexes);
    assert.equal(b.removeFlag, false);
});
