import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { rootDir } from "./build-utils.mjs";

test("translated Java float storage and operations remain explicitly preserved", () => {
    const result = spawnSync(process.execPath, ["scripts/check-java-float-parity.mjs"], {
        cwd: rootDir,
        encoding: "utf8"
    });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /parity checks passed/);
});
