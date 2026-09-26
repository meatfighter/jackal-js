import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { renderInventory, javaRenderInventory, renderTargets } from "./render-pause-inventory.mjs";
const baseline = JSON.parse(readFileSync(new URL("./fixtures/render-pause-inventory.json", import.meta.url), "utf8"));
test("complete render/helper inventory has no unreviewed mutation or moved phase logic", () => {
    assert.deepEqual(renderInventory(), baseline);
    assert.equal(baseline.length, 100);
    assert.equal(renderTargets.length, 17);
    for (const name of renderTargets) {
        const source = readFileSync(new URL(`../pwa/src/jackal/${name}.ts`, import.meta.url), "utf8");
        const file = ts.createSourceFile(name, source, ts.ScriptTarget.Latest, true);
        const Class = file.statements.find(ts.isClassDeclaration);
        const render = Class.members.find((m) => ts.isMethodDeclaration(m) && m.name.getText(file) === "render");
        assert.doesNotMatch(render.body.getText(file), /return|\.poll\(|\.snap\(|\.random\b|Sys\.|Date\.|performance\.|\.update\(/);
        const original = JSON.parse(readFileSync(new URL("./fixtures/render-pause-original.json", import.meta.url), "utf8"))[name];
        const java = readFileSync(new URL(`../desktop/src/jackal/${name}.java`, import.meta.url), "utf8");
        assert.match(java.slice(java.indexOf("public void render()")), /!gameMode\.paused/);
        const drawCalls = (text) => [...text.matchAll(/(?:main\.(?:draw\w*)|g\.(?:setWorldClip|clearWorldClip))\s*\(/g)].map((m) => m[0].replace(/\s/g, ""));
        assert.deepEqual(drawCalls(render.getText(file)), drawCalls(original.ts), `${name} draw/clip call order changed`);
        assert.deepEqual(drawCalls(java.slice(java.indexOf("public void render()"))), drawCalls(original.java), `${name} native draw/clip call order changed`);
    }
});

test("complete native render inventory preserves non-render logic and deliberate exceptions", () => {
    const rows = javaRenderInventory();
    assert.equal(rows.length, 101);
    assert.deepEqual(rows, JSON.parse(readFileSync(new URL("./fixtures/render-pause-java-inventory.json", import.meta.url), "utf8")));
});
