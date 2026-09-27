import { join } from "node:path";
import { componentReleaseDir } from "./build-utils.mjs";
import { runNpmScript, runNodeScript } from "./run-utils.mjs";

const qualificationScripts = [
    "verify:fullscreen",
    "verify:fullscreen-timeout",
    "verify:fullscreen-reentry",
    "verify:fullscreen-settings",
    "verify:production-browser",
    "verify:activation-races",
    "verify:audio-interruption",
    "verify:lifecycle-events",
    "verify:ownership-transfer",
    "verify:persistence-failure",
    "verify:lifecycle-stress"
];

const pwaRoot = join(componentReleaseDir, "pwa");

// Browser qualification must consume the PWA produced by this exact source tree.
// Rebuild first so an older dist/ or component output cannot be tested accidentally.
runNpmScript("build:pwa");

for (const script of qualificationScripts) {
    runNpmScript(script, {
        env: {
            PWA_ROOT: pwaRoot
        }
    });
}

runNodeScript("scripts/run-ending-reload-qualification.mjs", [], { env: { PWA_ROOT: pwaRoot } });
