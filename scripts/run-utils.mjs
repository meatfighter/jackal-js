import { spawnSync } from "node:child_process";
import { relative } from "node:path";
import { rootDir } from "./build-utils.mjs";

export function displayPath(path) {
    const ref = relative(rootDir, path).replaceAll("\\", "/");
    return ref.length > 0 ? ref : ".";
}

export function run(command, args = [], { cwd = rootDir, env = {} } = {}) {
    const result = spawnSync(command, args, {
        cwd,
        env: {
            ...process.env,
            ...env
        },
        stdio: "inherit"
    });
    if (result.error !== undefined) {
        throw result.error;
    }
    if (result.status !== 0) {
        throw new Error(`Command failed with exit code ${result.status ?? "unknown"}: ${command} ${args.join(" ")}`);
    }
}

export function npmCommand() {
    return process.platform === "win32" ? "npm.cmd" : "npm";
}

export function runNpmScript(scriptName, options = {}) {
    if (process.platform === "win32") {
        run("cmd.exe", ["/d", "/s", "/c", npmCommand(), "run", scriptName], options);
        return;
    }
    run(npmCommand(), ["run", scriptName], options);
}

export function runNodeScript(scriptPath, args = [], options = {}) {
    run(process.execPath, [scriptPath, ...args], options);
}
