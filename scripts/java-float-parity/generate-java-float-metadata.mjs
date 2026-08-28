import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(scriptDir, "..", "..");
const javaSource = join(scriptDir, "JavaFloatMetadata.java");
const javaRoot = join(rootDir, "desktop", "src", "jackal");
const metadataPath = join(scriptDir, "java-float-metadata.jsonl");
const checkOnly = process.argv.includes("--check");
const quiet = process.argv.includes("--quiet");
const workDir = mkdtempSync(join(tmpdir(), "jackal-java-float-metadata-"));

try {
    const compile = spawnSync("javac", ["-encoding", "UTF-8", "-d", workDir, javaSource], {
        cwd: rootDir,
        encoding: "utf8"
    });
    assert.equal(compile.status, 0, `Unable to compile Java float metadata generator:\n${compile.stdout}\n${compile.stderr}`);

    const run = spawnSync("java", ["-cp", workDir, "JavaFloatMetadata", javaRoot], {
        cwd: rootDir,
        encoding: "utf8",
        maxBuffer: 16 * 1024 * 1024
    });
    assert.equal(run.status, 0, `Unable to generate Java float metadata:\n${run.stdout}\n${run.stderr}`);

    const generated = `${run.stdout.replace(/\r\n/g, "\n").trimEnd()}\n`;
    if (checkOnly) {
        const committed = readFileSync(metadataPath, "utf8").replace(/\r\n/g, "\n");
        assert.equal(
            committed,
            generated,
            "Java float metadata is stale. Run `npm run generate:java-float-metadata`, review the generated metadata, and update the TypeScript float-parity translation."
        );
        if (!quiet) {
            console.log("Java float metadata matches the current desktop source.");
        }
    } else {
        writeFileSync(metadataPath, generated, "utf8");
        console.log(`Wrote ${metadataPath}.`);
    }
} finally {
    rmSync(workDir, { recursive: true, force: true });
}
