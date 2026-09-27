import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "./vite-test-server.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pwaRoot = resolve(rootDir, "pwa");
const server = await createServer({
    root: pwaRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
});

try {
    const { Player } = await server.ssrLoadModule("/src/jackal/Player.ts");

    test("Jackal Player baselines grenade/gun gates from held browser input", () => {
        const controls = { fire: true, shoot: true };
        const player = Object.create(Player.prototype);
        player.input = {
            isFire: () => controls.fire,
            isShoot: () => controls.shoot
        };
        player.fireReleased = true;
        player.shootReleased = true;
        player.gunArmed = 0;

        player.resyncInputAfterBrowserResume();

        assert.equal(player.fireReleased, false, "held grenade must require release before another throw");
        assert.equal(player.shootReleased, false, "held gun must not become a fresh press");
        assert.equal(player.gunArmed, Player.GUN_ARMED_DELAY, "held gun with no cooldown restarts the repeat delay");
    });

    test("Jackal Player preserves active gun repeat cooldown while held and resets it when released", () => {
        const controls = { fire: false, shoot: true };
        const player = Object.create(Player.prototype);
        player.input = {
            isFire: () => controls.fire,
            isShoot: () => controls.shoot
        };
        player.fireReleased = false;
        player.shootReleased = false;
        player.gunArmed = 17;

        player.resyncInputAfterBrowserResume();
        assert.equal(player.fireReleased, true);
        assert.equal(player.shootReleased, false);
        assert.equal(player.gunArmed, 17);

        controls.shoot = false;
        player.resyncInputAfterBrowserResume();
        assert.equal(player.shootReleased, true);
        assert.equal(player.gunArmed, 0);
    });
} finally {
    await server.close();
}
