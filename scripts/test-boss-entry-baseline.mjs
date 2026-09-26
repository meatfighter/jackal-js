import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";
import { installSongs, positionForTrigger } from "./boss-entry-test-utils.mjs";
const original = JSON.parse(readFileSync(new URL("./fixtures/boss-entry-original.json", import.meta.url), "utf8"));
const names = ["BOSS_BLUE_TANKS", "BOSS_STATUES", "BOSS_SHIP", "BOSS_HELICOPTER", "BOSS_GARAGE", "BOSS_HEADQUARTERS"];
function primitives(object) {
    return Object.entries(object).filter(([, v]) => ["number", "boolean", "string"].includes(typeof v));
}
test("all six healthy and reserve-backed positive-distance entry traces equal immutable 355f89e source", async () => {
    const results = [];
    for (const baseline of [true, false]) {
        const mod = await loadLastLifeModules(baseline ? { GameMode: () => original.GameMode } : {});
        try {
            const { Triggers } = await mod.server.ssrLoadModule("/src/jackal/Triggers.ts");
            const cases = [];
            for (const name of names)
                for (const death of [0, 20]) {
                    const f = makeLastLifeWorld(mod),
                        s = installSongs(f, mod);
                    positionForTrigger(f);
                    f.main.playSoundIfNotPlaying = () => {};
                    f.world.triggerMap[7] = [[Triggers[name], 0, 0]];
                    f.player.respawning = death;
                    f.main.extraLives = death ? 1 : 0;
                    let updates = 0,
                        callbacks = 0;
                    const update = f.player.update.bind(f.player);
                    f.player.update = () => {
                        updates++;
                        update();
                    };
                    const rows = [];
                    for (let n = 0; n < 66; n++) {
                        f.tick();
                        f.main.applyRequestedSongChange();
                        if (n === 0) {
                            const manager = f.world.cameraPanListener,
                                pan = manager.panComplete.bind(manager);
                            manager.panComplete = () => {
                                callbacks++;
                                pan();
                            };
                        }
                        rows.push([
                            f.world.triggerY,
                            f.world.cameraY,
                            f.world.bossCameraPan,
                            f.world.cameraPanListener.ready,
                            callbacks,
                            updates,
                            f.player.respawning,
                            f.main.extraLives,
                            f.main.score,
                            f.main.random.getState(),
                            f.main.requestedSong === s.boss,
                            f.world.elements.map((l) => [...l].map((e) => [e.constructor.name, primitives(e)]))
                        ]);
                    }
                    assert.equal(callbacks, 1);
                    cases.push(rows);
                }
            results.push(cases);
        } finally {
            await mod.server.close();
        }
    }
    assert.deepEqual(results[1], results[0]);
});
test("entry CPU samples use the same SSR backend with warmup and no trace allocation", async () => {
    const rows = [];
    for (const baseline of [true, false]) {
        const mod = await loadLastLifeModules(baseline ? { GameMode: () => original.GameMode } : {});
        try {
            for (const scenario of ["healthy-pan", "deferred-death"]) {
                const samples = [];
                for (let run = 0; run < 6; run++) {
                    const f = makeLastLifeWorld(mod);
                    installSongs(f, mod);
                    positionForTrigger(f);
                    f.world.triggerY = -1;
                    f.world.startBossCameraPan({ panComplete() {} });
                    if (scenario === "deferred-death") {
                        f.player.respawning = 182;
                        f.main.suspendMusicForLastLife();
                    }
                    const begin = performance.now();
                    for (let tick = 0; tick < 60; tick++) f.tick();
                    const ms = performance.now() - begin;
                    if (run) samples.push(ms);
                }
                rows.push({ implementation: baseline ? "baseline" : "candidate", scenario, updatesPerSample: 60, ms: samples });
            }
        } finally {
            await mod.server.close();
        }
    }
    if (process.env.QUALIFICATION_EVIDENCE_DIR) {
        mkdirSync(process.env.QUALIFICATION_EVIDENCE_DIR, { recursive: true });
        writeFileSync(
            join(process.env.QUALIFICATION_EVIDENCE_DIR, "boss-entry-update-performance.json"),
            JSON.stringify(
                {
                    backend:
                        "Both immutable baseline and candidate use Vite SSR; deferred candidate intentionally advances simulation while baseline pan freezes it",
                    warmup: 1,
                    samples: 5,
                    rows
                },
                null,
                2
            ) + "\n"
        );
    }
    assert.equal(rows.length, 4);
});
