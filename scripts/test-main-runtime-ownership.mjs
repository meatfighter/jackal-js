import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

function loadRuntimeState() {
    const context = { exports: {}, require: () => ({}) };
    const source = readFileSync(new URL("../pwa/src/jackal/MainRuntimeState.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
    }).outputText;
    vm.runInNewContext(compiled, context);
    return context.exports;
}

test("stale Jackal runtime cleanup cannot clear a replacement Main", () => {
    const runtime = loadRuntimeState();
    const first = { id: "first" };
    const second = { id: "second" };
    const secondMode = { id: "second-mode" };

    runtime.installMainRuntime(first);
    assert.equal(runtime.requireMainRuntime(), first);

    runtime.installMainRuntime(second);
    runtime.setMainRuntimeGameMode(secondMode);
    assert.equal(runtime.requireMainRuntime(), second);
    assert.equal(runtime.requireMainRuntimeGameMode(), secondMode);

    assert.equal(runtime.clearMainRuntime(first), false);
    assert.equal(runtime.requireMainRuntime(), second);
    assert.equal(runtime.requireMainRuntimeGameMode(), secondMode);

    assert.equal(runtime.clearMainRuntime(second), true);
    assert.throws(() => runtime.requireMainRuntime(), /unavailable/);
    assert.throws(() => runtime.requireMainRuntimeGameMode(), /unavailable/);
});
