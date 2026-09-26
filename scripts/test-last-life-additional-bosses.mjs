import assert from "node:assert/strict";
import { test } from "node:test";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";
import { installSongs } from "./boss-entry-test-utils.mjs";
async function extra(mod, name) {
    return (await mod.server.ssrLoadModule(`/src/jackal/${name}.ts`))[name];
}
function hit(enemy, source) {
    return enemy.attack(enemy.x + enemy.hitX1, enemy.y + enemy.hitY1, enemy.x + enemy.hitX2, enemy.y + enemy.hitY2, source);
}
function trace(f) {
    const order = [];
    for (const [owner, key, label] of [
        [f.main, "addPoints", "points"],
        [f.main, "stopAllSongs", "stop"],
        [f.world, "stageCompleted", "complete"],
        [f.world, "destroyAll", "cleanup"]
    ]) {
        const original = owner[key].bind(owner);
        owner[key] = (...args) => {
            order.push([label, ...args]);
            return original(...args);
        };
    }
    return order;
}
test("real final statue points follow completion and rescue on the final death tick", async () => {
    const mod = await loadLastLifeModules();
    try {
        const Manager = await extra(mod, "BossStatuesManager"),
            Statue = await extra(mod, "BossStatue");
        for (const rescue of [false, true]) {
            const f = makeLastLifeWorld(mod),
                song = installSongs(f, mod);
            f.world.groups = Array.from({ length: 137 }, () => []);
            f.world.triggedGroups = Array(137).fill(false);
            const manager = new Manager();
            manager.panComplete();
            const statues = [...f.world.enemies].filter((e) => e instanceof Statue);
            assert.equal(statues.length, 4);
            for (let i = 0; i < 4; i++) statues[i].groupIndex = [136, 45, 91, 0][i];
            for (const statue of statues.slice(1))
                for (let hitIndex = 0; hitIndex < Statue.HITS; hitIndex++) assert.equal(hit(statue, mod.AttackSource.PLAYER_WEAPON), true);
            const last = statues[0];
            last.hits = Statue.HITS - 1;
            f.main.extraLives = 0;
            f.main.score = rescue ? 19200 : 0;
            f.player.explode();
            f.player.respawning = 1;
            const order = trace(f);
            assert.equal(hit(last, mod.AttackSource.PLAYER_WEAPON), true);
            assert.ok(order.findIndex((e) => e[0] === "complete") < order.findIndex((e) => e[0] === "points" && e[1] === 800));
            assert.equal(f.main.extraLives, rescue ? 1 : 0);
            assert.equal(f.main.currentSong, null);
            assert.equal(song.old.lastLifeSuspended, false);
            f.player.update();
            assert.equal(f.main.extraLives, 0);
            assert.equal(f.main.mode === f.world, rescue);
            if (!rescue) assert.equal(f.main.mode.destination, mod.Modes.CONTINUE);
            for (const group of [136, 45, 91, 0]) assert.equal(f.world.triggedGroups[group], true);
        }
    } finally {
        await mod.server.close();
    }
});
test("helicopter real fatal hit preserves effect/score/cleanup/completion ordering", async () => {
    const mod = await loadLastLifeModules();
    try {
        const Helicopter = await extra(mod, "BossHelicopter");
        for (const rescue of [false, true]) {
            const f = makeLastLifeWorld(mod);
            installSongs(f, mod);
            const boss = new Helicopter();
            boss.hits = Helicopter.HITS - 1;
            boss.tinyExplosions = 0;
            f.main.score = rescue ? 15000 : 0;
            f.player.explode();
            f.player.respawning = 1;
            const order = trace(f);
            assert.equal(hit(boss, mod.AttackSource.PLAYER_WEAPON), true);
            assert.ok(boss.removeFlag);
            assert.deepEqual(
                order.filter((e) => ["points", "cleanup", "complete"].includes(e[0])).map((e) => e[0]),
                ["points", "cleanup", "complete"]
            );
            assert.equal(f.main.currentSong, null);
            assert.equal(f.main.extraLives, rescue ? 1 : 0);
            f.player.update();
            assert.equal(f.main.mode === f.world, rescue);
            assert.equal(f.main.extraLives, 0);
        }
    } finally {
        await mod.server.close();
    }
});
test("real contact points precede death registration, avoiding a spurious last-life hold", async () => {
    const mod = await loadLastLifeModules();
    try {
        const Jeep = await extra(mod, "GrayJeep"),
            f = makeLastLifeWorld(mod),
            s = installSongs(f, mod);
        f.main.score = 19200;
        new Jeep(f.player.x, f.player.y);
        f.player.update();
        assert.equal(f.main.extraLives, 1);
        assert.equal(f.player.respawning, 182);
        assert.equal(s.old.lastLifeSuspended, false);
        assert.equal(s.part.state, "playing");
        for (let n = 0; n < 182; n++) f.player.update();
        assert.equal(f.main.extraLives, 0);
        assert.equal(f.player.respawning, 0);
        assert.equal(f.main.mode, f.world);
    } finally {
        await mod.server.close();
    }
});
