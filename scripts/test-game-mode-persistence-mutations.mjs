import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { mutants } from "./game-mode-persistence-mutants.mjs";
for (const name of Object.keys(mutants))
    test("behavioral persistence mutant is killed: " + name, () => {
        const env = { ...process.env, JACKAL_PERSISTENCE_MUTANT: name };
        delete env.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, ["--test", "scripts/test-game-mode-root-graph.mjs"], { encoding: "utf8", timeout: 60000, env });
        const output = result.stdout + result.stderr;
        assert.equal(result.error, undefined, output);
        assert.notEqual(result.status, 0, "Mutant survived: " + name);
        assert.match(output, /AssertionError|Unable to identify TileDebris/);
        assert.doesNotMatch(output, /Missing mutation anchor|Cannot find module|module runner has been closed|SyntaxError/);
    });
