import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { createServer } from "vite";

// Immutable render references captured from 9719c8e before adding pause guards.
const originals = JSON.parse(readFileSync(new URL("./fixtures/render-pause-original.json", import.meta.url), "utf8"));
const phases = {
    BossGarage: { lightIndex: [1, 2, 3] },
    BossHeadquarters: { flashDelay: [1, 2, 12, 68], flashing: [false, true], flashIndex: [-1, 0, 1] },
    BossHelicopter: { rotorAngle: [0, -30, -60], tailIndexCounter: [false, true], tailIndex: [3, 4] },
    BossShipGun: { colorIndex: [0, 1, 2, 3] },
    BossStatue: { eyesVisible: [0, 1, 2, 3] },
    EnemyHelicopter: { rotorAngle: [0, -30, -60] },
    EnemySoldier: { blink: [0, 1, 2, 3, 4] },
    Fire: { flickerCounter: [0, 1, 2, 3], flickerIndex: [0, 1] },
    Flame: { spriteCounter: [0, 1, 2, 3, 4, 5, 6, 7], spriteIndex: [0, 1] },
    FloorGun: { colorIndex: [0, 1, 2, 3] },
    FriendlySoldier: { colorIndex: [0, 1, 2, 3] },
    LasersManager: { flash: [false, true], colorIndex: [0, 1, 2, 3] },
    Mine: { spriteIndex: [0, 1, 2, 3] },
    Star: { flashingIndex: [0, 1, 2, 3] },
    Statue: { eyesVisible: [0, 1, 2, 3] },
    SuperFire: { flickerCounter: [0, 0.5, 1, 1.5, 2, 2.5, 3], flickerIndex: [0, 1] },
    SwampMissileLauncher: { splashIndex: [0, 1, 2, 3, 4, 5] }
};
function combinations(fields) {
    return Object.entries(fields).reduce((rows, [key, values]) => rows.flatMap((row) => values.map((value) => ({ ...row, [key]: value }))), [{}]);
}
function fixture(Class, seed) {
    const trace = [];
    const main = {};
    const names = [
        "garages",
        "headquartersLights",
        "bossHelicopters",
        "enemyHelicopters",
        "shipGuns",
        "floorGuns",
        "lasers",
        "mines",
        "stars",
        "elephantGuns",
        "swampMissiles"
    ];
    for (const name of names) main[name] = Array.from({ length: 32 }, (_, i) => `${name}:${i}`);
    for (const name of ["enemySoldiers", "swampSoldiers", "friendlySoldiers", "fires", "superFires"])
        main[name] = Array.from({ length: 4 }, (_, i) => Array.from({ length: 16 }, (_, j) => `${name}:${i}:${j}`));
    for (const name of ["statueWhiteEyes", "statueWhiteMouth", "statueBlueEyes", "statueBlueMouth"]) main[name] = name;
    for (const name of ["drawImage", "drawVehicleAlpha", "drawRotatedAtCenter", "drawRotatedScaledAlpha", "drawCenteredAlpha", "drawCenteredScaledAlpha"])
        main[name] = (...args) => {
            assert.notEqual(args[0], undefined, "Invalid sprite index");
            for (const arg of args) if (typeof arg === "number") assert.ok(Number.isFinite(arg), "Unseeded numeric draw argument");
            trace.push([name, ...args]);
        };
    const world = { paused: false, g: { setWorldClip: (...args) => trace.push(["clip", ...args]), clearWorldClip: () => trace.push(["unclip"]) } };
    const object = Object.assign(Object.create(Class.prototype), {
        main,
        gameMode: world,
        x: 160,
        y: 160,
        angle: 90,
        positionDriftTime: 0,
        positionDriftDx: 0,
        doorY: 16,
        vehicle: ["vehicle"],
        vehicleY: 176,
        isBrownTank: true,
        openY: 16,
        panel: "panel",
        mask: "mask",
        fire: false,
        inSwamp: false,
        orientation: 0,
        legIndex: 0,
        wobbleX: 0,
        wobbleY: 0,
        aiming: 12,
        shots: 2,
        length: 64,
        alpha: 0.5,
        delay: 12,
        colorChanging: true,
        beamIndex: 1,
        visible: true,
        asterDelay: 0,
        splashing: 0,
        ...seed
    });
    const render = (method) => {
        trace.length = 0;
        method.call(object);
        return structuredClone(trace);
    };
    return { object, world, render };
}
const projection = (object) => Object.fromEntries(Object.entries(object).filter(([key]) => !["main", "gameMode"].includes(key)));

test("all 17 real renderers freeze phase, preserve drawings and retain original unpaused cycles", async (t) => {
    const server = await createServer({
        root: fileURLToPath(new URL("../pwa/", import.meta.url)),
        appType: "custom",
        logLevel: "silent",
        server: { middlewareMode: true }
    });
    try {
        const modules = {};
        for (const name of Object.keys(phases)) modules[name] = (await server.ssrLoadModule(`/src/jackal/${name}.ts`))[name];
        for (const [name, fields] of Object.entries(phases))
            await t.test(name, () => {
                const Class = modules[name];
                const text = `class Original { ${originals[name].ts} }; return Original.prototype.render;`;
                const js = ts.transpileModule(text, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
                const original = new Function(...Object.keys(modules), "javaInt", js)(...Object.values(modules), Math.trunc);
                const states = Object.entries(Class)
                    .filter(([key]) => key.startsWith("STATE_"))
                    .map(([, value]) => value);
                const branches = { ...(states.length ? { state: [...new Set(states)] } : {}) };
                if (name === "EnemySoldier") Object.assign(branches, { fire: [false, true], inSwamp: [false, true], aiming: [12, 23, 24] });
                if (name === "Fire") branches.length = [64, 96, 128];
                if (name === "FriendlySoldier") branches.colorChanging = [false, true];
                if (name === "Mine") branches.visible = [false, true];
                if (name === "Star") branches.type = [Class.TYPE_BROWN, Class.TYPE_GREEN, Class.TYPE_FLASHING];
                if (name === "SwampMissileLauncher") branches.splashing = [0, 1, 8, 9];
                let positive = 0;
                for (const seed of combinations({ ...fields, ...branches })) {
                    const f = fixture(Class, seed),
                        reference = fixture(Class, seed);
                    // Compare complete phase and operation traces over multiple original cycles.
                    for (let i = 0; i < 160; i++) {
                        assert.deepEqual(
                            f.render(Class.prototype.render),
                            reference.render(original),
                            `${name} unpaused trace ${JSON.stringify(seed)} at ${i}`
                        );
                        assert.deepEqual(projection(f.object), projection(reference.object));
                    }
                    Object.assign(f.object, seed);
                    f.world.paused = true;
                    const before = projection(f.object);
                    const paused = f.render(Class.prototype.render);
                    assert.deepEqual(projection(f.object), before, `${name} paused mutation ${JSON.stringify(seed)}`);
                    if (paused.length) positive++;
                    for (let i = 0; i < 200; i++) {
                        assert.deepEqual(f.render(Class.prototype.render), paused, `${name} paused trace`);
                        assert.deepEqual(projection(f.object), before, `${name} repeated paused mutation`);
                    }
                    Object.assign(reference.object, seed);
                    f.world.paused = false;
                    assert.deepEqual(f.render(Class.prototype.render), reference.render(original), `${name} one resumed step`);
                    assert.deepEqual(projection(f.object), projection(reference.object));
                    if (["Star", "Statue", "BossStatue"].includes(name)) {
                        // The stored next phase may differ from the last presented phase.
                        const last = f.render(Class.prototype.render);
                        f.world.paused = true;
                        const first = f.render(Class.prototype.render);
                        assert.deepEqual(f.render(Class.prototype.render), first);
                        assert.ok(Array.isArray(last));
                    }
                }
                assert.ok(positive > 0, `${name} must keep drawing visible phases`);
            });
    } finally {
        await server.close();
    }
});

test("soldier production aiming duration is independent of render frequency", async () => {
    const server = await createServer({
        root: fileURLToPath(new URL("../pwa/", import.meta.url)),
        appType: "custom",
        logLevel: "silent",
        server: { middlewareMode: true }
    });
    try {
        const { EnemySoldier } = await server.ssrLoadModule("/src/jackal/EnemySoldier.ts");
        const { EnemySoldierType } = await server.ssrLoadModule("/src/jackal/EnemySoldierType.ts");
        for (const renders of [0, 1, 7]) {
            const f = fixture(EnemySoldier, {
                blink: 3,
                aiming: 12,
                shots: 0,
                totalShots: 3,
                state: EnemySoldier.STATE_AIMING,
                type: EnemySoldierType.STATIONARY,
                player: { x: 480, y: 160 }
            });
            let shots = 0;
            f.object.shoot = () => {
                shots++;
            };
            f.world.isSwamp = () => false;
            for (let tick = 0; tick < 12; tick++) {
                for (let i = 0; i < renders; i++) f.render(EnemySoldier.prototype.render);
                assert.equal(shots, 0);
                f.object.update();
            }
            assert.equal(shots, 1);
            assert.equal(f.object.aiming, EnemySoldier.AIM_RESHOOT);
            f.world.paused = true;
            for (let i = 0; i < 201; i++) f.render(EnemySoldier.prototype.render);
            assert.equal(shots, 1);
            assert.equal(f.object.aiming, EnemySoldier.AIM_RESHOOT);
        }
    } finally {
        await server.close();
    }
});
