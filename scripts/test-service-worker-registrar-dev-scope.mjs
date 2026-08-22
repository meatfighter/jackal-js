import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const registrarSource = readFileSync(new URL("../pwa/src/app/ServiceWorkerRegistrar.ts", import.meta.url), "utf8");

test("development service-worker cleanup only unregisters the current app scope", () => {
    assert.match(registrarSource, /const appScope = new URL\("\.\/", window\.location\.href\)\.href;/);
    assert.match(
        registrarSource,
        /registrations\s*\.filter\(\(registration\) => registration\.scope === appScope\)\s*\.map\(\(registration\) => registration\.unregister\(\)\)/
    );
    assert.doesNotMatch(registrarSource, /registrations\.map\(\(registration\) => registration\.unregister\(\)\)/);
});

test("development service-worker cleanup failures are logged without blocking startup", () => {
    assert.match(registrarSource, /clearDevelopmentServiceWorkers\(\)\.catch\(\(error: unknown\) => \{/);
    assert.match(registrarSource, /console\.warn\("Unable to clear Jackal development service workers\.", error\);/);
});
