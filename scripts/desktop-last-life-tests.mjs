import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const testSource = fileURLToPath(new URL("../desktop/test/jackal/LastLifeResolutionTest.java", import.meta.url));

const musicTestSource = fileURLToPath(new URL("../desktop/test/jackal/LastLifeMusicTest.java", import.meta.url));

export function runDesktopLastLifeTests({ classesDir, classpath, releaseArgs }) {
    const testClasses = mkdtempSync(join(tmpdir(), "jackal-last-life-tests-"));
    const resources = fileURLToPath(new URL("../pwa/public/resources/", import.meta.url));
    const productionClasspath = `${classesDir}${delimiter}${classpath}${delimiter}${resources}`;
    function run(command, args) {
        const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
        if (result.error || result.status !== 0) {
            throw result.error ?? new Error(`${command} failed during desktop last-life tests.`);
        }
    }
    try {
        run("javac", ["-encoding", "UTF-8", "-Xlint:-options", ...releaseArgs, "-cp", productionClasspath, "-d", testClasses, testSource, musicTestSource]);

        const platformDirectory = { win32: "windows", linux: "linux", darwin: "macosx" }[process.platform];
        if (platformDirectory === undefined) throw new Error("Unsupported native last-life-test platform");
        const nativeDirectory = fileURLToPath(new URL(`../desktop/natives/${platformDirectory}/`, import.meta.url));
        for (const testName of ["jackal.LastLifeResolutionTest", "jackal.LastLifeMusicTest"])
            run("java", [
                "-Djava.awt.headless=true",
                `-Dorg.lwjgl.librarypath=${nativeDirectory}`,
                `-Dnet.java.games.input.librarypath=${nativeDirectory}`,
                "-cp",
                `${testClasses}${delimiter}${productionClasspath}`,
                testName
            ]);
    } finally {
        rmSync(testClasses, { recursive: true, force: true });
    }
}
