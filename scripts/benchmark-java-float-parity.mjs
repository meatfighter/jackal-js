import { performance } from "node:perf_hooks";

function benchmark(label, fn, iterations) {
    for (let i = 0; i < 3; i++) fn(Math.max(10_000, Math.floor(iterations / 20)));
    const start = performance.now();
    const value = fn(iterations);
    const elapsed = performance.now() - start;
    console.log(`${label}: ${elapsed.toFixed(3)} ms (${(iterations / elapsed / 1000).toFixed(2)} million iterations/sec, checksum=${value})`);
    return elapsed;
}

const iterations = 5_000_000;
const binary64 = benchmark(
    "Persistent-state arithmetic without float storage",
    (count) => {
        let x = 0,
            vx = 0.10869565217391304,
            checksum = 0;
        for (let i = 0; i < count; i++) {
            vx += 0.00001;
            x += vx;
            checksum += x;
        }
        return Math.trunc(checksum) | 0;
    },
    iterations
);

const binary32 = benchmark(
    "Java-compatible float storage",
    (count) => {
        let x = 0,
            vx = Math.fround(0.10869565217391304),
            checksum = 0;
        const acceleration = Math.fround(0.00001);
        for (let i = 0; i < count; i++) {
            vx = Math.fround(vx + acceleration);
            x = Math.fround(x + vx);
            checksum += x;
        }
        return Math.trunc(checksum) | 0;
    },
    iterations
);

const missileIterations = 1_000_000;
const missile = benchmark(
    "Float-compatible missile steering step",
    (count) => {
        let x = 48,
            y = 86,
            angle = 90,
            checksum = 0;
        const rotationSpeed = Math.fround(0.9);
        const toRadians = Math.fround(Math.PI / 180);
        for (let i = 0; i < count; i++) {
            const targetAngle = Math.fround((Math.atan2(Math.fround(256 - y), Math.fround(128 - x)) * 180) / Math.PI);
            let delta = Math.fround(Math.fround(Math.fround(targetAngle - angle) + 180) % 360);
            delta = delta < 0 ? Math.fround(delta + 180) : Math.fround(delta - 180);
            angle = Math.abs(delta) < rotationSpeed ? targetAngle : Math.fround(angle + (delta < 0 ? -rotationSpeed : rotationSpeed));
            const radians = Math.fround(toRadians * angle);
            const vx = Math.fround(3.5 * Math.fround(Math.cos(radians)));
            const vy = Math.fround(3.5 * Math.fround(Math.sin(radians)));
            x = Math.fround(x + vx);
            y = Math.fround(y + vy);
            checksum += x + y;
        }
        return Math.trunc(checksum) | 0;
    },
    missileIterations
);

console.log(`Synthetic float-storage ratio: ${(binary32 / binary64).toFixed(2)}x`);
console.log(`Missile step average: ${((missile * 1_000_000) / missileIterations).toFixed(2)} ns`);
console.log("This is an informational microbenchmark; parity tests, not a fixed timing threshold, are the release gate.");
