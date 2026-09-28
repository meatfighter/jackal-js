import assert from "node:assert/strict";
import { test } from "node:test";
import { createGraphFixture } from "./game-mode-persistence-test-utils.mjs";
const { graph, encodeNamedFields, JackalGameStateSerializer, items, layers, make } = await createGraphFixture();

test("detached GameMode listener is discovered and encoded without becoming active", () => {
    const tank = make("BossSuperTank");
    const manager = make("BossHeadquartersManager");
    manager.removeFlag = true;
    const world = { elements: layers(), cameraPanListener: manager };
    world.elements[2].add(tank);
    const serializer = new JackalGameStateSerializer();
    const context = serializer.createGameStateEncodeContext({}, world, {});
    assert.equal(context.entities.length, 2);
    assert.equal(context.ids.get(tank), 0);
    assert.equal(context.ids.get(manager), 1);
    assert.deepEqual(encodeNamedFields(world, ["cameraPanListener"], context), {
        cameraPanListener: { kind: "entityRef", id: 1 }
    });
    assert.deepEqual(world.elements.flatMap(items), [tank]);
    assert.equal(manager.removeFlag, true);
});

test("root alias plus detached Tank-Fire cycle is registered exactly once", () => {
    const tank = make("BossSuperTank"),
        fire = make("SuperFire");
    tank.superFire = fire;
    fire.bossSuperTank = tank;
    fire.removeFlag = true;
    const world = { elements: layers(), cameraPanListener: tank };
    world.elements[2].add(tank);
    const context = new JackalGameStateSerializer().createGameStateEncodeContext({}, world, {});
    assert.deepEqual(context.entities, [tank, fire]);
    assert.deepEqual(world.elements.flatMap(items), [tank]);
});

test("unknown or undefined root is not silently converted to null", () => {
    for (const cameraPanListener of [undefined, {}, 1, []]) {
        assert.throws(() => graph.getGameModeDurableEntityReferences({ cameraPanListener }));
    }
    assert.deepEqual(graph.getGameModeDurableEntityReferences({ cameraPanListener: null }), []);
});
