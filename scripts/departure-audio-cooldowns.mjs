import assert from "node:assert/strict";

/** Active-clock cooldowns may expire, but cannot be added or extended while frozen. */
export function assertCooldownSamples(before, stored, after, elapsedMs, label) {
    const limit = elapsedMs + 1; // Durable values round up to integer milliseconds.
    for (const sample of [before, stored, after]) {
        assert(Array.isArray(sample), `${label}: cooldown array`);
        assert.equal(new Set(sample.map((row) => row.id)).size, sample.length, `${label}: unique cooldown identities`);
        for (const row of sample) {
            assert.deepEqual(Object.keys(row).sort(), ["id", "remainingMs"], `${label}: cooldown fields`);
            assert(Number.isInteger(row.remainingMs) && row.remainingMs >= 0, `${label}: nonnegative integer cooldown`);
        }
    }
    for (const [earlier, later] of [
        [before, stored],
        [stored, after]
    ]) {
        const next = new Map(later.map((row) => [row.id, row]));
        assert.deepEqual(
            later.map((row) => row.id),
            earlier.filter((row) => next.has(row.id)).map((row) => row.id),
            `${label}: no new or reordered cooldown`
        );
        for (const row of earlier) {
            const remaining = next.get(row.id)?.remainingMs;
            if (remaining === undefined) {
                assert(row.remainingMs <= limit, `${label}/${row.id}: expiry only inside measured interval`);
            } else {
                assert(remaining <= row.remainingMs, `${label}/${row.id}: cooldown cannot grow`);
                assert(row.remainingMs - remaining <= limit, `${label}/${row.id}: cooldown ages only inside measured interval`);
            }
        }
    }
    const last = new Map(after.map((row) => [row.id, row.remainingMs]));
    for (const row of before) {
        assert(row.remainingMs - (last.get(row.id) ?? 0) <= limit, `${label}/${row.id}: total cooldown age stays bounded`);
    }
}
