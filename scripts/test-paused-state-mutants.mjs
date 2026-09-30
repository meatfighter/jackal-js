import assert from "node:assert/strict";
import { test } from "node:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
const evidence = process.env.QUALIFICATION_EVIDENCE_DIR ?? join(tmpdir(), "jackal-paused-evidence");
mkdirSync(evidence, { recursive: true });
for (const [name, expected] of Object.entries({
    boundary: "Paused pending witness rejected before restore",
    "pending-song": "Paused pending witness rejected before restore",
    "extra-effect": "Paused full reader rejects extra-effect",
    "looped-cue": "Paused full reader rejects looped-cue"
}))
    test("paused contract behavioral mutant: " + name, () => {
        const env = { ...process.env, JACKAL_PAUSED_MUTANT: name };
        delete env.NODE_TEST_CONTEXT;
        const result = spawnSync(process.execPath, ["scripts/run-paused-state-verification.mjs"], { encoding: "utf8", timeout: 120000, env });
        const log = (result.stdout ?? "") + (result.stderr ?? "");
        writeFileSync(join(evidence, "paused-mutant-" + name + ".log"), log);
        assert(!result.error, String(result.error));
        assert.notEqual(result.status, 0, "Surviving paused mutant " + name);
        assert(log.includes(expected), "Wrong behavioral failure " + name + "\n" + log);
        assert(!/SyntaxError|ReferenceError|Missing paused mutation anchor|Cannot find module/.test(log), "Setup failure is not a killed mutant");
    });
