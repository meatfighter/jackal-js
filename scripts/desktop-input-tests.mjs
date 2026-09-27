import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const preferencesSource = fileURLToPath(new URL("../desktop/test/jackal/MappingPreferenceVersionTest.java", import.meta.url));
const labelsSource = fileURLToPath(new URL("../desktop/test/jackal/CompactKeyLabelsTest.java", import.meta.url));
const policySource = fileURLToPath(new URL("../desktop/test/jackal/NativeDpadPolicyTest.java", import.meta.url));
const profileSource = fileURLToPath(new URL("../desktop/test/jackal/NesControllerMappingTest.java", import.meta.url));
const testSource = fileURLToPath(new URL("../desktop/test/jackal/ControllerSupportTest.java", import.meta.url));

export function runDesktopInputTests({ classesDir, classpath, releaseArgs }) {
    const testClasses = mkdtempSync(join(tmpdir(), "jackal-input-tests-"));
    const productionClasspath = `${classesDir}${delimiter}${classpath}`;
    function run(command, args) {
        const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
        if (result.error || result.status !== 0) {
            throw result.error ?? new Error(`${command} failed during desktop input tests.`);
        }
    }
    try {
        run("javac", [
            "-encoding",
            "UTF-8",
            "-Xlint:-options",
            ...releaseArgs,
            "-cp",
            productionClasspath,
            "-d",
            testClasses,
            testSource,
            profileSource,
            policySource,
            labelsSource,
            preferencesSource,
            fileURLToPath(new URL("../desktop/test/jackal/CounterParityTest.java", import.meta.url))
        ]);
        run("java", [
            "-Djava.awt.headless=true",
            "-Djava.util.prefs.PreferencesFactory=jackal.MappingPreferenceVersionTest$MemoryFactory",
            "-cp",
            `${testClasses}${delimiter}${productionClasspath}`,
            "jackal.MappingPreferenceVersionTest",
            "4",
            "3"
        ]);
        // JInput discovery is process-wide, so each scenario needs a fresh JVM.
        for (const scenario of [
            "empty",
            "connected",
            "poll-failure",
            "reported-failure",
            "initialization-failure",
            "legacy-buttons",
            "named-ordinary-buttons",
            "named-direction-buttons",
            "pov-only"
        ]) {
            run("java", ["-Djava.awt.headless=true", "-cp", `${testClasses}${delimiter}${productionClasspath}`, "jackal.ControllerSupportTest", scenario]);
        }
        run("java", ["-Djava.awt.headless=true", "-cp", `${testClasses}${delimiter}${productionClasspath}`, "jackal.NesControllerMappingTest"]);
        run("java", ["-Djava.awt.headless=true", "-cp", `${testClasses}${delimiter}${productionClasspath}`, "jackal.NativeDpadPolicyTest"]);
        run("java", ["-Djava.awt.headless=true", "-cp", `${testClasses}${delimiter}${productionClasspath}`, "jackal.CounterParityTest"]);
        const golden = JSON.parse(readFileSync(new URL("./fixtures/compact-key-labels.json", import.meta.url), "utf8"));
        const goldenPath = join(testClasses, "labels.txt");
        writeFileSync(goldenPath, golden.map((r) => `${r.code}|${r.constant}|${r.label}`).join("\n"));
        run("java", ["-Djava.awt.headless=true", "-cp", `${testClasses}${delimiter}${productionClasspath}`, "jackal.CompactKeyLabelsTest", goldenPath]);
        const dump = spawnSync("java", ["-cp", `${testClasses}${delimiter}${productionClasspath}`, "jackal.CompactKeyLabelsTest", "--dump"], {
            encoding: "utf8",
            windowsHide: true
        });
        if (dump.status !== 0) throw new Error("Java label dump failed");
        const dumpPath = join(testClasses, "dump.txt");
        writeFileSync(dumpPath, dump.stdout);
        run(process.execPath, [fileURLToPath(new URL("./test-compact-key-labels.mjs", import.meta.url)), "--java-dump", dumpPath]);
    } finally {
        rmSync(testClasses, { recursive: true, force: true });
    }
}
