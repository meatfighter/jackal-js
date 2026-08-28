import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { rootDir } from "./build-utils.mjs";

const metadataPath = join(rootDir, "scripts", "java-float-parity", "java-float-metadata.jsonl");
const checks = [
    ["Java float metadata", join(rootDir, "scripts", "java-float-parity", "generate-java-float-metadata.mjs"), ["--check", "--quiet"]],
    ["Java float save-state metadata", join(rootDir, "scripts", "java-float-parity", "generate-java-float-state.mjs"), ["--check", "--quiet"]],
    ["Java float storage", join(rootDir, "scripts", "java-float-parity", "check-float-storage.mjs")],
    ["Java float operations", join(rootDir, "scripts", "java-float-parity", "check-float-operations.mjs")]
];

let failed = false;
for (const [label, script, extraArgs = []] of checks) {
    const generatedMetadataCheck = label === "Java float metadata" || label === "Java float save-state metadata";
    const args = generatedMetadataCheck ? [script, ...extraArgs] : [script, rootDir, metadataPath, ...extraArgs];
    const result = spawnSync(process.execPath, args, {
        cwd: rootDir,
        encoding: "utf8"
    });
    if (result.error) {
        throw result.error;
    }
    const output = `${result.stdout}${result.stderr}`.trim();
    if (result.status !== 0 || output.length !== 0) {
        failed = true;
        console.error(`${label} parity check failed.`);
        if (output.length !== 0) {
            console.error(output);
        }
    }
}

if (failed) {
    process.exitCode = 1;
} else {
    console.log("Java float storage and operation parity checks passed.");
}
