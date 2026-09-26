import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const testSource = fileURLToPath(new URL("../desktop/test/jackal/RenderPauseTest.java", import.meta.url));

const fadeTestSource = fileURLToPath(new URL("../desktop/test/jackal/FadePauseTest.java", import.meta.url));

export function runDesktopRenderTests({ classesDir, classpath, releaseArgs }) {
    const testClasses = mkdtempSync(join(tmpdir(), "jackal-render-tests-"));
    const productionClasspath = `${classesDir}${delimiter}${classpath}`;
    function run(command, args) {
        const result = spawnSync(command, args, { stdio: "inherit", windowsHide: true });
        if (result.error || result.status !== 0) {
            throw result.error ?? new Error(`${command} failed during desktop render-pause tests.`);
        }
    }
    try {
        run("javac", ["-encoding", "UTF-8", "-Xlint:-options", ...releaseArgs, "-cp", productionClasspath, "-d", testClasses, testSource, fadeTestSource]);
        run("java", ["-Djava.awt.headless=true", "-cp", `${testClasses}${delimiter}${productionClasspath}`, "jackal.RenderPauseTest"]);
        const platformDirectory = { win32: "windows", linux: "linux", darwin: "macosx" }[process.platform];
        if (platformDirectory === undefined) throw new Error("Unsupported native fade-test platform");
        const nativeDirectory = fileURLToPath(new URL(`../desktop/natives/${platformDirectory}/`, import.meta.url));
        run("java", [
            "-Djava.awt.headless=true",
            `-Dorg.lwjgl.librarypath=${nativeDirectory}`,
            `-Dnet.java.games.input.librarypath=${nativeDirectory}`,
            "-cp",
            `${testClasses}${delimiter}${productionClasspath}`,
            "jackal.FadePauseTest"
        ]);
    } finally {
        rmSync(testClasses, { recursive: true, force: true });
    }
}
