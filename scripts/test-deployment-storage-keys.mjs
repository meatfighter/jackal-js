import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

async function loadStorageKeys() {
    const source = readFileSync(new URL("../pwa/src/app/DeploymentStorageKeys.ts", import.meta.url), "utf8");
    const compiled = ts.transpileModule(source, {
        compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022
        }
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
}

test("deployment storage keys are scoped by encoded deployment path", async () => {
    const { getDeploymentPathId, getDeploymentStorageKey } = await loadStorageKeys();

    assert.equal(getDeploymentPathId("https://example.test/jackal/pwa/?v=old"), "%2Fjackal%2Fpwa%2F");
    assert.equal(getDeploymentPathId("https://example.test/jackal-staging/pwa/?v=new"), "%2Fjackal-staging%2Fpwa%2F");
    assert.equal(getDeploymentStorageKey("jackal.game-state", "https://example.test/jackal/pwa/?v=old"), "jackal.game-state:%2Fjackal%2Fpwa%2F");
});

test("deployment storage keys ignore query strings and preserve distinct paths", async () => {
    const { getDeploymentPathId, getDeploymentStorageKey } = await loadStorageKeys();

    assert.equal(getDeploymentPathId("https://example.test/jackal/pwa/?v=old"), getDeploymentPathId("https://example.test/jackal/pwa/?v=new"));
    assert.notEqual(getDeploymentPathId("https://example.test/jackal/pwa/"), getDeploymentPathId("https://example.test/jackal-staging/pwa/"));
    assert.notEqual(getDeploymentPathId("https://example.test/a/b/"), getDeploymentPathId("https://example.test/a_b/"));
    assert.notEqual(getDeploymentPathId("https://example.test/a+b/"), getDeploymentPathId("https://example.test/a_b/"));
    assert.equal(getDeploymentStorageKey("jackal-volume", "https://example.test/jackal/pwa/?v=old"), getDeploymentStorageKey("jackal-volume", "https://example.test/jackal/pwa/?v=new"));
});
