import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { join } from "node:path";
import { rootDir } from "./build-utils.mjs";

const metadataPath = join(rootDir, "scripts", "java-float-parity", "java-float-metadata.jsonl");

function readMetadata() {
    return readFileSync(metadataPath, "utf8")
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
}

test("Java float metadata uses a canonical cross-platform order", () => {
    const metadata = readMetadata();
    const firstAppearance = [];
    const seen = new Set();

    for (const entry of metadata) {
        assert.equal(entry.file.includes("\\"), false, `Metadata path is not normalized: ${entry.file}`);
        if (!seen.has(entry.file)) {
            seen.add(entry.file);
            firstAppearance.push(entry.file);
        }
    }

    const sorted = [...firstAppearance].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
    assert.deepEqual(firstAppearance, sorted);
});

test("Java float metadata omits unused source offsets and overload ordinals", () => {
    const metadata = readMetadata();
    function assertNoRetiredKeys(value) {
        if (Array.isArray(value)) {
            value.forEach(assertNoRetiredKeys);
            return;
        }
        if (value === null || typeof value !== "object") {
            return;
        }
        assert.equal(Object.hasOwn(value, "start"), false);
        assert.equal(Object.hasOwn(value, "overloadIndex"), false);
        Object.values(value).forEach(assertNoRetiredKeys);
    }

    assertNoRetiredKeys(metadata);

    for (const entry of metadata) {
        const staticBlocks = entry.methods.filter((method) => method.name === "<static>");
        staticBlocks.forEach((method, index) => {
            assert.equal(method.staticBlockIndex, index);
        });
        for (const method of entry.methods) {
            if (method.name !== "<static>") {
                assert.equal(Object.hasOwn(method, "staticBlockIndex"), false);
            }
        }
    }
});
