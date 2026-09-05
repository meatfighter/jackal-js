import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const read = (path) => readFileSync(join(rootDir, path), "utf8");

function compileConstantsModule() {
    const source = read("pwa/src/jackal/PlayerMotionConstants.ts").replace(/^import[^;]+;\s*$/m, "");
    const stubs = `
const javaFloat = Math.fround;
const javaArray = (length, initial) => Array.from({ length }, () => initial);
`;
    const output = ts.transpileModule(`${stubs}\n${source}`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

function methodBody(source, signature, nextSignature) {
    const start = source.indexOf(signature);
    assert.ok(start >= 0, `Missing ${signature}.`);
    const end = nextSignature === null ? source.length : source.indexOf(nextSignature, start + signature.length);
    assert.ok(end > start, `Missing boundary after ${signature}.`);
    return source.slice(start, end);
}

test("100 TPS rumble table preserves the original 60 Hz two-wave timing", async () => {
    const constants = await import(compileConstantsModule());
    assert.equal(constants.PLAYER_RUMBLE_STEPS, 85);
    assert.equal(constants.PLAYER_RUMBLE.length, 85);

    const originalCyclesPerSecond = 2 / (17 / 60);
    const resampledCyclesPerSecond = 6 / (85 / 100);
    assert.equal(resampledCyclesPerSecond, originalCyclesPerSecond);

    for (let i = 0; i < constants.PLAYER_RUMBLE_STEPS; i++) {
        const phase = Math.fround((12 * Math.PI * i) / constants.PLAYER_RUMBLE_STEPS);
        const expected = Math.fround(Math.fround(1.6) * Math.fround(Math.sin(phase)));
        assert.equal(constants.playerRumblePhase(i), phase);
        assert.equal(constants.PLAYER_RUMBLE[i], expected);
    }
});

test("Java and TypeScript use the same 85-step rumble and wake waveform", () => {
    const player = read("desktop/src/jackal/Player.java");
    assert.match(player, /public static final int RUMBLE_STEPS = 85;/);
    assert.match(player, /RUMBLE = new float\[RUMBLE_STEPS\]/);
    assert.match(player, /WAKE_ALPHAS = new float\[RUMBLE_STEPS\]/);
    assert.match(player, /float angle = \(float\)\(\(12 \* Math\.PI \* i\) \/ RUMBLE_STEPS\);/);
    assert.match(player, /WAKE_ALPHAS\[i\] = 0\.5f \+ 0\.5f \* \(float\)Math\.sin\(angle\);/);
    assert.match(player, /RUMBLE\[i\] = 1\.6f \* \(float\)Math\.sin\(angle\);/);
});

test("player rumble and wake share the fixed-update phase", () => {
    const player = read("pwa/src/jackal/Player.ts");
    assert.match(player, /WAKE_ALPHAS: number\[\] = javaArray\(PLAYER_RUMBLE_STEPS, 0\)/);
    assert.match(player, /angle = javaFloat\(playerRumblePhase\(i\)\)/);
    assert.match(player, /WAKE_ALPHAS\[i\] = javaFloat\(0\.5 \+ javaFloat\(0\.5 \* javaFloat\(Math\.sin\(angle\)\)\)\)/);

    const update = methodBody(player, "public update(): void", "public render(): void");
    const render = methodBody(player, "public render(): void", null);
    assert.match(update, /\+\+this\.rumble === PLAYER_RUMBLE_STEPS/);
    assert.doesNotMatch(render, /\+\+this\.rumble/);
    assert.match(render, /WAKE_ALPHAS\[this\.rumble\]/);
    assert.match(render, /RUMBLE\[this\.rumble\]/);

    const javaPlayer = read("desktop/src/jackal/Player.java");
    const javaUpdate = methodBody(javaPlayer, "public void update()", "public void render()");
    const javaRender = methodBody(javaPlayer, "public void render()", null);
    assert.match(javaUpdate, /\+\+rumble == RUMBLE_STEPS/);
    assert.doesNotMatch(javaRender, /\+\+rumble/);
    assert.match(javaRender, /WAKE_ALPHAS\[rumble\]/);
    assert.match(javaRender, /RUMBLE\[rumble\]/);
});

test("hard-ending jeep advances the shared rumble phase in update only", () => {
    const ending = read("pwa/src/jackal/HardEndingMode.ts");
    const update = methodBody(ending, "private updateFinalScoreJeep(): void", "private updateFinalScore(): void");
    const render = methodBody(ending, "public render(gc: GameContainer, g: Graphics): void", null);
    assert.match(update, /\+\+this\.rumble === PLAYER_RUMBLE_STEPS/);
    assert.doesNotMatch(render, /\+\+this\.rumble/);
    assert.match(render, /PLAYER_RUMBLE\[this\.rumble\]/);

    const javaEnding = read("desktop/src/jackal/HardEndingMode.java");
    const javaUpdate = methodBody(javaEnding, "private void updateFinalScoreJeep()", "private void updateFinalScore()");
    const javaRender = methodBody(javaEnding, "public void render(GameContainer gc, Graphics g) throws SlickException", null);
    assert.match(javaUpdate, /\+\+rumble == Player\.RUMBLE_STEPS/);
    assert.doesNotMatch(javaRender, /\+\+rumble/);
    assert.match(javaRender, /Player\.RUMBLE\[rumble\]/);
});
