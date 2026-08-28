import { readFileSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { rootDir } from "./build-utils.mjs";

const DIRECTIONS_PER_LONG = 21;
const DIRECTION_MASK = 7n;

const packed = [];
for (let stageIndex = 0; stageIndex < 6; stageIndex++) {
    const bytes = readFileSync(join(rootDir, "desktop", "src", "maps", `dirs-${stageIndex}.dat`));
    const size = bytes.readInt32BE(0);
    for (let i = 0; i < size; i++) {
        packed.push(bytes.readBigInt64BE(12 + i * 8));
    }
}

const decoded = new Uint8Array(packed.length * DIRECTIONS_PER_LONG);
for (let i = 0; i < packed.length; i++) {
    const value = packed[i];
    const offset = i * DIRECTIONS_PER_LONG;
    for (let j = 0; j < DIRECTIONS_PER_LONG; j++) {
        decoded[offset + j] = Number((value >> BigInt(j * 3)) & DIRECTION_MASK);
    }
}

const iterations = 3_000_000;
let seed = 0x12345678;
const indexes = new Uint32Array(iterations);
for (let i = 0; i < iterations; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    indexes[i] = seed % decoded.length;
}

function measure(label, lookup) {
    let checksum = 0;
    const start = performance.now();
    for (let i = 0; i < indexes.length; i++) {
        checksum += lookup(indexes[i]);
    }
    return { label, elapsed: performance.now() - start, checksum };
}

measure("cache warmup", (index) => decoded[index]);
measure("packed warmup", (index) => Number((packed[Math.trunc(index / DIRECTIONS_PER_LONG)] >> BigInt((index % DIRECTIONS_PER_LONG) * 3)) & DIRECTION_MASK));

const cache = measure("Uint8Array cache", (index) => decoded[index]);
const packedLookup = measure("BigInt extraction", (index) =>
    Number((packed[Math.trunc(index / DIRECTIONS_PER_LONG)] >> BigInt((index % DIRECTIONS_PER_LONG) * 3)) & DIRECTION_MASK)
);

if (cache.checksum !== packedLookup.checksum) {
    throw new Error("Direction benchmark implementations produced different results.");
}

console.log(`${cache.label}: ${cache.elapsed.toFixed(2)} ms`);
console.log(`${packedLookup.label}: ${packedLookup.elapsed.toFixed(2)} ms`);
console.log(`BigInt/cache ratio: ${(packedLookup.elapsed / cache.elapsed).toFixed(2)}x`);
console.log(`Checksum: ${cache.checksum}`);
