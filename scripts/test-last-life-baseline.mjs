import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import ts from "typescript";
import { loadLastLifeModules, makeLastLifeWorld } from "./last-life-test-utils.mjs";
const original = JSON.parse(readFileSync(new URL("./fixtures/last-life-original-methods.json", import.meta.url), "utf8"));
function compileMethod(text, method, mod) {
    const code = ts.transpileModule(`class Subject {${text}}; Subject.prototype.${method};`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
    }).outputText;
    return vm.runInNewContext(code, { ...mod, javaFloat: Math.fround, javaInt: Math.trunc }, { timeout: 1000 });
}
test("healthy and early-resolved ordinary completion retains immutable baseline timer and side-effect traces", async () => {
    const mod = await loadLastLifeModules();
    try {
        const reference = compileMethod(original.methods.GameMode.update, "update", mod);
        for (const death of [0, 1, 20, 182])
            for (const reserves of death ? [1, 2] : [0, 1, 2]) {
                const traces = [];
                for (const baseline of [true, false]) {
                    const f = makeLastLifeWorld(mod);
                    f.main.extraLives = reserves;
                    f.player.respawning = death;
                    f.world.stageCompleted();
                    const trace = [];
                    for (let tick = 1; tick <= 228; tick++) {
                        (baseline ? reference : mod.GameMode.prototype.update).call(f.world, f.world.gc);
                        trace.push([
                            tick,
                            f.world.stageCompletedDelay,
                            f.player.respawning,
                            f.main.extraLives,
                            f.main.score,
                            f.main.fading,
                            f.main.fadeIndex,
                            f.events.map((e) => e[0])
                        ]);
                    }
                    assert.equal(f.main.fadeListener, f.world);
                    assert.equal(f.main.mode, f.world);
                    traces.push(trace);
                }
                assert.deepEqual(traces[1], traces[0]);
            }
    } finally {
        await mod.server.close();
    }
});
test("healthy final-entry timer and transition fields retain original schedule", async () => {
    const mod = await loadLastLifeModules();
    try {
        const reference = compileMethod(original.methods.BossSuperTank.update, "update", mod);
        for (const delay of [1, 2, 91]) {
            const traces = [];
            for (const baseline of [true, false]) {
                const f = makeLastLifeWorld(mod);
                if (baseline)
                    f.world.startEndingCameraPan = function (listener) {
                        this.playing = false;
                        this.endingCameraPan = true;
                        this.cameraPanListener = listener;
                    };
                const tank = new mod.BossSuperTank(100, 100);
                tank.state = mod.BossSuperTank.STATE_EXPLODED;
                tank.delay = delay;
                const trace = [];
                for (let tick = 0; tick < delay + 2; tick++) {
                    (baseline ? reference : mod.BossSuperTank.prototype.update).call(tank);
                    trace.push([tank.state, tank.delay, f.world.playing, f.world.endingCameraPan, f.world.cameraPanListener === tank]);
                }
                traces.push(trace);
            }
            assert.deepEqual(traces[1], traces[0]);
        }
    } finally {
        await mod.server.close();
    }
});
test("diagnostic warmed healthy/race update samples keep tracing outside timed loops", async () => {
    const mod = await loadLastLifeModules();
    try {
        const reference = compileMethod(original.methods.GameMode.update, "update", mod),
            rows = [];
        for (const scenario of ["healthy", "pending-death"])
            for (const version of ["baseline", "candidate"]) {
                const samples = [];
                for (let run = 0; run < 6; run++) {
                    const f = makeLastLifeWorld(mod);
                    f.main.playSound = f.main.playSoundAlways = () => {};
                    f.main.extraLives = 1;
                    if (scenario === "pending-death") {
                        f.player.respawning = 182;
                        f.world.stageCompleted();
                    }
                    const update = version === "baseline" ? reference : mod.GameMode.prototype.update;
                    const begin = performance.now();
                    for (let i = 0; i < 180; i++) update.call(f.world, f.world.gc);
                    const elapsed = performance.now() - begin;
                    if (run > 0) samples.push(elapsed);
                }
                rows.push({ scenario, version, updatesPerSample: 180, ms: samples });
            }
        const out = process.env.QUALIFICATION_EVIDENCE_DIR;
        if (out) {
            mkdirSync(out, { recursive: true });
            writeFileSync(
                join(out, "last-life-update-performance.json"),
                JSON.stringify(
                    { backend: "Node Vite SSR CPU update; source-backed baseline method uses vm realm", warmupBatches: 1, samples: 5, rows },
                    null,
                    2
                ) + "\n"
            );
        }
        assert.equal(rows.length, 4);
    } finally {
        await mod.server.close();
    }
});

test("score calls and fatal-hit cleanup retain immutable original source ordering", () => {
    const normalize = (text) => text.replace(/\s+/g, "");
    for (const [name, methods] of Object.entries({ Main: ["addPoints", "gainExtraLife"], BossSuperTank: ["kaboom", "attack"] })) {
        const source = readFileSync(new URL(`../pwa/src/jackal/${name}.ts`, import.meta.url), "utf8"),
            file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true),
            cls = file.statements.find(ts.isClassDeclaration);
        for (const method of methods) {
            const node = cls.members.find((m) => ts.isMethodDeclaration(m) && m.name.getText(file) === method);
            assert.equal(normalize(node.getText(file)), normalize(original.methods[name][method]), `${name}.${method}: point/effect ordering changed`);
        }
    }
});

test("healthy fatal-hit scoring, cleanup and music ownership match immutable baseline execution", async () => {
    const mod = await loadLastLifeModules();
    try {
        const { EnemySoldier } = await mod.server.ssrLoadModule("/src/jackal/EnemySoldier.ts");
        const { EnemySoldierType } = await mod.server.ssrLoadModule("/src/jackal/EnemySoldierType.ts");
        const traces = [];
        for (const baseline of [true, false]) {
            const f = makeLastLifeWorld(mod),
                order = [];
            f.main.score = 19999;
            f.main.friendlySoldiersPickedUp = 2;
            for (let i = 0; i < 2; i++) {
                const enemy = new EnemySoldier(500 + i * 100, 500, EnemySoldierType.STATIONARY);
                const remove = enemy.remove.bind(enemy);
                enemy.remove = () => {
                    order.push(["remove", i]);
                    remove();
                };
            }
            const add = f.main.addPoints.bind(f.main);
            f.main.addPoints = (value) => {
                order.push(["points", value]);
                add(value);
            };
            const stop = f.main.stopAllSongs.bind(f.main);
            f.main.stopAllSongs = () => {
                order.push(["stop"]);
                stop();
            };
            const destroy = f.world.destroyAllExcept.bind(f.world);
            f.world.destroyAllExcept = (enemy) => {
                order.push(["cleanup"]);
                destroy(enemy);
            };
            const tank = new mod.BossSuperTank(100, 100);
            tank.state = mod.BossSuperTank.STATE_STOPPED;
            tank.hits = mod.BossSuperTank.HITS_EXPLODE - 1;
            if (baseline) tank.kaboom = compileMethod(original.methods.BossSuperTank.kaboom, "kaboom", mod);
            const attack = baseline ? compileMethod(original.methods.BossSuperTank.attack, "attack", mod) : mod.BossSuperTank.prototype.attack;
            assert.equal(
                attack.call(tank, tank.x + tank.hitX1, tank.y + tank.hitY1, tank.x + tank.hitX2, tank.y + tank.hitY2, mod.AttackSource.PLAYER_WEAPON),
                true
            );
            assert.deepEqual(
                order.filter((e) => e[0] === "points").map((e) => e[1]),
                [tank.points + 4000, 0, 100, 100],
                "Boss, gun and soldier cleanup awards remain separate ordered calls"
            );
            traces.push([
                order,
                f.main.score,
                f.main.extraLives,
                tank.state,
                tank.hits,
                tank.delay,
                f.main.currentSong,
                f.main.requestedSong,
                f.events,
                [...f.world.enemies].map((e) => [e.constructor.name, e.removeFlag]),
                f.world.elements.map((layer) => [...layer].map((e) => [e.constructor.name, e.removeFlag]))
            ]);
        }
        assert.deepEqual(traces[1], traces[0]);
    } finally {
        await mod.server.close();
    }
});
