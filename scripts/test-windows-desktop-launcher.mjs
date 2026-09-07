import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

test("Windows desktop launcher tolerates paths containing parentheses", () => {
    const launcherPath = join("desktop", "run-windows.cmd");
    const launcher = readFileSync(launcherPath, "utf8");

    assert.doesNotMatch(launcher, /^\s*if\b[^\r\n]*\(\s*$/im, "Windows launcher path checks must not use parenthesized CMD blocks");
    assert.match(launcher, /if not exist "%JAR%" set "JAR=%SCRIPT_DIR%jackal-desktop\.jar"/);
    assert.match(launcher, /if not exist "%NATIVES%" set "NATIVES=%SCRIPT_DIR%natives\\windows"/);

    if (process.platform !== "win32") {
        return;
    }

    const instrumentedLauncher = launcher
        .replace("java --enable-native-access=ALL-UNNAMED -version >nul 2>nul", "ver >nul")
        .replace("java --sun-misc-unsafe-memory-access=allow -version >nul 2>nul", "ver >nul")
        .replace(/^java %MODERN_FLAGS% .* -jar "%JAR%"$/m, '> "%JACKAL_TEST_JAVA_LOG%" echo JAR=%JAR%\n>> "%JACKAL_TEST_JAVA_LOG%" echo NATIVES=%NATIVES%');
    assert.notEqual(instrumentedLauncher, launcher);
    assert.doesNotMatch(instrumentedLauncher, /^java\b/im, "Launcher regression test must replace Java invocations with deterministic local commands");

    const tempRoot = mkdtempSync(join(tmpdir(), "jackal-desktop (1) "));
    const installDir = join(tempRoot, "jackal-desktop");
    const logPath = join(tempRoot, "java-args.txt");
    try {
        mkdirSync(join(installDir, "natives", "windows"), { recursive: true });
        writeFileSync(join(installDir, "run-windows.cmd"), instrumentedLauncher);
        writeFileSync(join(installDir, "jackal-desktop.jar"), "");

        const result = spawnSync("cmd.exe", ["/d", "/c", "run-windows.cmd"], {
            cwd: installDir,
            encoding: "utf8",
            env: { ...process.env, JACKAL_TEST_JAVA_LOG: logPath }
        });
        assert.equal(
            result.status,
            0,
            `Windows launcher failed from a path containing parentheses.\nstdout:\n${result.stdout ?? ""}\nstderr:\n${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`
        );

        const javaLog = readFileSync(logPath, "utf8");
        assert.ok(javaLog.includes(`JAR=${join(installDir, "jackal-desktop.jar")}`));
        assert.ok(javaLog.includes(`NATIVES=${join(installDir, "natives", "windows")}`));
    } finally {
        rmSync(tempRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
    }
});
