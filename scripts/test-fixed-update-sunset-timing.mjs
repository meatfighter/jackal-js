import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

function methodBody(source, signature, nextSignature) {
    const start = source.indexOf(signature);
    assert.ok(start >= 0, `Missing ${signature}.`);
    const end = nextSignature === null ? source.length : source.indexOf(nextSignature, start + signature.length);
    assert.ok(end > start, `Missing boundary after ${signature}.`);
    return source.slice(start, end);
}

test("sunset phase keeps the original spatial wave while sampling ten times more densely", () => {
    const java = read("desktop/src/jackal/SunsetMode.java");
    const ts = read("pwa/src/jackal/SunsetMode.ts");
    assert.match(java, /SUN_PHASE_SUBDIVISIONS = 10/);
    assert.match(java, /SUN_PHASE_STEPS = SUN_HEIGHT \* SUN_PHASE_SUBDIVISIONS/);
    assert.match(java, /SUN_ROW_PHASE_STRIDE = SUN_PHASE_SUBDIVISIONS/);
    assert.match(java, /SUN_PHASE_ADVANCE = 3/);
    assert.match(java, /new float\[SUN_PHASE_STEPS\]/);
    assert.match(java, /SUN_WAVES \* 2 \* Math\.PI \/ SUN_PHASE_STEPS/);
    assert.match(ts, /SUN_PHASE_SUBDIVISIONS: number = 10/);
    assert.match(ts, /SUN_PHASE_STEPS: number = SunsetMode\.SUN_HEIGHT \* SunsetMode\.SUN_PHASE_SUBDIVISIONS/);
    assert.match(ts, /SUN_ROW_PHASE_STRIDE: number = SunsetMode\.SUN_PHASE_SUBDIVISIONS/);
    assert.match(ts, /SUN_PHASE_ADVANCE: number = 3/);
    assert.match(ts, /javaArray\(SunsetMode\.SUN_PHASE_STEPS, 0\)/);
    assert.equal(10 * ((3 * 2 * Math.PI) / 920), (3 * 2 * Math.PI) / 92);
});

test("sunset phase advances at the original intended speed on the 100 TPS clock", () => {
    const subdivisions = 10;
    const phaseAdvance = 3;
    const fixedUpdatesPerSecond = 100;
    assert.equal((phaseAdvance * fixedUpdatesPerSecond) / subdivisions, 60 / 2);
    const phaseSteps = 92 * subdivisions;
    assert.equal((phaseSteps * phaseAdvance) % phaseSteps, 0);
    assert.equal(phaseSteps / fixedUpdatesPerSecond, 9.2);
    assert.equal((phaseSteps * phaseAdvance) / phaseSteps, 3);
});

test("Java and TypeScript advance sunset phase in update and render only samples it", () => {
    const java = read("desktop/src/jackal/SunsetMode.java");
    const ts = read("pwa/src/jackal/SunsetMode.ts");
    const javaUpdate = methodBody(java, "public void update(GameContainer gc)", "public void fadeCompleted()");
    const javaRender = methodBody(java, "public void render(GameContainer gc, Graphics g)", null);
    assert.match(javaUpdate, /sunPhase \+= SUN_PHASE_ADVANCE/);
    assert.doesNotMatch(javaRender, /sunPhase\s*(?:\+\+|--|\+=|-=|=)/);
    assert.match(javaRender, /j = sunPhase/);
    assert.match(javaRender, /j \+= SUN_ROW_PHASE_STRIDE/);
    const tsUpdate = methodBody(ts, "public update(gc: GameContainer): void", "public fadeCompleted(): void");
    const tsRender = methodBody(ts, "public render(gc: GameContainer, g: Graphics): void", null);
    assert.match(tsUpdate, /this\.sunPhase \+= SunsetMode\.SUN_PHASE_ADVANCE/);
    assert.doesNotMatch(tsRender, /this\.sunPhase\s*(?:\+\+|--|\+=|-=|=)/);
    assert.match(tsRender, /j = this\.sunPhase/);
    assert.match(tsRender, /j \+= SunsetMode\.SUN_ROW_PHASE_STRIDE/);
});
