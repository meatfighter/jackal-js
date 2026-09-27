import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer } from "./vite-test-server.mjs";
import { fileURLToPath } from "node:url";
test("recorded final-life death wins over stage completion through actual Player.update", async () => {
    const server = await createServer({
        root: fileURLToPath(new URL("../pwa/", import.meta.url)),
        appType: "custom",
        logLevel: "silent",
        server: { middlewareMode: true }
    });
    try {
        const { Player } = await server.ssrLoadModule("/src/jackal/Player.ts");
        const input = Object.fromEntries(["isDown", "isUp", "isLeft", "isRight", "isFire", "isShoot"].map((n) => [n, () => false]));
        const world = { stageCompletedFlag: true, playing: true, getTileType: () => 0, maxCameraY: 0 };
        const main = {
            extraLives: 0,
            konamiCode: { enabled: true },
            mode: world,
            requestMode() {
                this.mode = { continued: true };
            }
        };
        const player = Object.assign(Object.create(Player.prototype), {
            main,
            gameMode: world,
            input,
            respawning: 1,
            invincible: 0,
            x: 256,
            y: 256,
            angleSteps: 0,
            angle: 0,
            gunArmed: 0,
            mines: { size: () => 0 }
        });
        player.update();
        assert.notEqual(main.mode, world, "registered death must hand ownership to Continue despite completed objective");
        assert.equal(player.respawning, 0);
    } finally {
        await server.close();
    }
});
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";

test("actual death/completion matrix holds only the final positive step and resolves once", async () => {
    const mod = await loadLastLifeModules();
    try {
        for (const reserves of [0, 1, 2])
            for (const death of [1, 2, 20, 182])
                for (const delay of [1, 2, 20, 228]) {
                    const f = makeLastLifeWorld(mod);
                    f.main.extraLives = reserves;
                    f.player.respawning = death;
                    f.world.stageCompleted();
                    f.world.stageCompletedDelay = delay;
                    let count = 0;
                    while (f.main.mode === f.world && !f.main.fading && count < 500) {
                        f.tick();
                        count++;
                        assert.ok(f.world.stageCompletedDelay >= 0);
                        if (f.player.respawning > 0) assert.ok(f.world.stageCompletedDelay >= 1 && !f.main.fading);
                    }
                    assert.ok(count < 500, "finite arbitration");
                    if (reserves === 0) {
                        assert.equal(f.main.mode.destination, mod.Modes.CONTINUE);
                        assert.equal(count, death);
                        assert.equal(f.events.filter((e) => e[0] === "consume").length, 0);
                        const before = f.events.length;
                        f.world.fadeCompleted();
                        assert.equal(f.events.length, before, "stale callback inert");
                    } else {
                        assert.equal(f.main.mode, f.world);
                        assert.equal(f.events.filter((e) => e[0] === "consume").length, 1);
                        assert.equal(f.main.extraLives, reserves - 1);
                        assert.equal(count, Math.max(death, delay));
                        assert.equal(f.world.stageCompletedDelay, 0);
                    }
                }
    } finally {
        await mod.server.close();
    }
});

test("real death registration is idempotent, accepts callback-owned contact, and rejects new cinematic deaths", async () => {
    const mod = await loadLastLifeModules();
    try {
        let f = makeLastLifeWorld(mod);
        f.player.explode();
        const count = f.world.elements[5].size(),
            sound = f.events.length;
        f.player.update();
        f.player.explode();
        assert.equal(f.player.respawning, 181);
        assert.equal(f.world.elements[5].size(), count);
        assert.equal(f.events.length, sound);
        f = makeLastLifeWorld(mod);
        f.world.playing = false;
        f.player.explode();
        assert.equal(f.player.respawning, 0);
        assert.equal(f.events.length, 0);
        f = makeLastLifeWorld(mod);
        f.world.stageCompletedFlag = true;
        f.player.explode();
        assert.equal(f.player.respawning, 0);
        f = makeLastLifeWorld(mod);
        f.world.mines.add({
            bump() {
                f.events.push(["bump"]);
                f.world.stageCompleted();
                return true;
            }
        });
        f.player.update();
        assert.equal(f.player.respawning, 182, "preaccepted synchronous contact survives stage completion callback");
        assert.equal(f.events[0][0], "bump");
    } finally {
        await mod.server.close();
    }
});

test("final tank last step cannot strand a dying player; living zero reserves can win", async () => {
    const mod = await loadLastLifeModules();
    try {
        for (const reserve of [0, 1])
            for (const death of [0, 1, 12]) {
                const f = makeLastLifeWorld(mod);
                f.main.extraLives = reserve;
                f.player.respawning = death;
                const tank = new mod.BossSuperTank(100, 100);
                tank.state = mod.BossSuperTank.STATE_EXPLODED;
                tank.delay = 1;
                for (let i = 0; i < death; i++) {
                    tank.update();
                    assert.equal(tank.delay, 1);
                    assert.equal(tank.state, mod.BossSuperTank.STATE_EXPLODED);
                    assert.equal(f.world.playing, true);
                    f.player.update();
                }
                if (death && reserve === 0) {
                    assert.equal(f.main.mode.destination, mod.Modes.CONTINUE);
                    assert.equal(f.world.tryStartEndingCameraPan(tank), false);
                } else {
                    tank.update();
                    assert.equal(tank.state, mod.BossSuperTank.STATE_PANNING);
                    assert.equal(tank.delay, 0);
                    assert.equal(f.world.playing, false);
                    f.player.explode();
                    assert.equal(f.player.respawning, 0);
                }
            }
    } finally {
        await mod.server.close();
    }
});

test("real score award on final death tick counts before reserve consumption and no later stale score tick runs", async () => {
    const mod = await loadLastLifeModules();
    try {
        for (const bonus of [false, true]) {
            const f = makeLastLifeWorld(mod);
            f.player.respawning = 1;
            f.main.score = bonus ? 19900 : 1000;
            f.world.elements[7].add({
                removeFlag: false,
                enemy: false,
                changeLayerValue: -1,
                checkBounds() {},
                update() {
                    f.main.addPoints(100);
                }
            });
            f.tick();
            assert.equal(f.main.extraLives, 0);
            assert.equal(f.main.score, bonus ? 20000 : 1100);
            assert.equal(f.events.filter((e) => e[0] === "consume").length, bonus ? 1 : 0);
            assert.equal(f.main.mode === f.world, bonus);
        }
    } finally {
        await mod.server.close();
    }
});

test("synthetic ship-contact boundary honors real bump/remove/manager completion order without claiming on-map reachability", async () => {
    const mod = await loadLastLifeModules();
    try {
        const f = makeLastLifeWorld(mod),
            manager = new mod.BossShipManager();
        manager.ready = false;
        for (let i = manager.shipGuns.size() - 1; i > 0; i--) manager.shipGuns.get(i).remove();
        const gun = manager.shipGuns.get(0);
        gun.state = mod.BossShipGun.STATE_AIMING;
        gun.openY = 32;
        f.world.bossCameraPan = false;
        f.player.x = gun.x + 32;
        f.player.y = gun.y + 32;
        f.player.update();
        assert.ok(gun.removeFlag && f.world.stageCompletedFlag, "real remove callback completed manager");
        assert.equal(f.player.respawning, 182, "preaccepted contact cannot be revoked after callback");
        assert.ok(
            f.events.some((e) => e[0] === "sound" && e[1] === "explode"),
            "player death side effects follow enemy callback"
        );
    } finally {
        await mod.server.close();
    }
});
