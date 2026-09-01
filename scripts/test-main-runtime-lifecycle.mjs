import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

async function loadRuntimeState() {
    const source = readFileSync(new URL("../pwa/src/jackal/MainRuntimeState.ts", import.meta.url), "utf8");
    const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
}

test("Main runtime state is explicitly owned and stale sessions cannot clear newer games", async () => {
    const runtime = await loadRuntimeState();
    const firstMain = { id: "first" };
    const firstMode = { id: "first-mode" };
    const secondMain = { id: "second" };
    const secondMode = { id: "second-mode" };

    assert.throws(() => runtime.requireMainRuntime(), /unavailable/);
    runtime.installMainRuntime(firstMain);
    runtime.setMainRuntimeGameMode(firstMode);
    assert.equal(runtime.requireMainRuntime(), firstMain);
    assert.equal(runtime.requireMainRuntimeGameMode(), firstMode);
    assert.equal(runtime.isMainRuntimeActive(firstMain), true);

    runtime.installMainRuntime(secondMain);
    runtime.setMainRuntimeGameMode(secondMode);
    assert.equal(runtime.clearMainRuntime(firstMain), false, "A stale async continuation must not clear the current session.");
    assert.equal(runtime.requireMainRuntime(), secondMain);
    assert.equal(runtime.requireMainRuntimeGameMode(), secondMode);

    assert.equal(runtime.clearMainRuntime(secondMain), true);
    assert.equal(runtime.isMainRuntimeActive(secondMain), false);
    assert.throws(() => runtime.requireMainRuntime(), /unavailable/);
    assert.throws(() => runtime.requireMainRuntimeGameMode(), /unavailable/);
});
