import test from "node:test";
import assert from "node:assert/strict";
import { assertCooldownSamples } from "./departure-audio-cooldowns.mjs";
const row = (remainingMs, id = "death") => ({ id, remainingMs });
test("cooldowns preserve identity while aging or expiring within the measured interval", () => {
    assertCooldownSamples([row(65)], [row(64)], [row(63)], 2, "aging");
    assertCooldownSamples([row(1)], [row(0)], [], 1, "expiry after write");
    assertCooldownSamples([row(1)], [], [], 1, "expiry before write");
    assertCooldownSamples([], [], [], 0, "empty");
});
for (const [name, before, stored, after] of [
    ["early expiry", [row(65)], [row(65)], []],
    ["early omission", [row(65)], [], []],
    ["new cooldown", [], [row(1)], []],
    ["extended cooldown", [row(1)], [row(2)], [row(1)]],
    ["excess total aging", [row(10)], [row(8)], [row(6)]],
    ["duplicate identity", [row(1)], [row(1), row(1)], []],
    ["identity replacement", [row(1)], [row(1, "other")], []]
])
    test(`cooldown oracle rejects ${name}`, () => assert.throws(() => assertCooldownSamples(before, stored, after, 1, name)));
