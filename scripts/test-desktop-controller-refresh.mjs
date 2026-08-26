import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const desktopSourceUrl = new URL("../desktop/src/jackal/", import.meta.url);

function readDesktopSource(file) {
    return readFileSync(new URL(file, desktopSourceUrl), "utf8");
}

test("desktop controller rediscovery is gated to menus, remapping, and pause", () => {
    const controllerSupport = readDesktopSource("ControllerSupport.java");
    const main = readDesktopSource("Main.java");
    const modeInterface = readDesktopSource("IMode.java");

    assert.match(modeInterface, /default boolean shouldRefreshControllers\(\) \{\s+return false;\s+\}/);
    assert.match(main, /ControllerSupport\.setControllerRefreshEnabled\(\s+mode != null && mode\.shouldRefreshControllers\(\)\);/);
    assert.match(main, /updateControllerRefreshPolicy\(\);\s+input\.snap\(\);/);
    assert.match(main, /mode\.init\(this, gc\);\s+updateControllerRefreshPolicy\(\);\s+mode\.update\(gc\);/);

    assert.match(controllerSupport, /private static boolean controllerRefreshEnabled;/);
    assert.match(controllerSupport, /if \(!controllerRefreshEnabled\) \{\s+return false;\s+\}\s+boolean createAttemptedBefore/);
    assert.match(controllerSupport, /Loading: net\.java\.games\.input\.DirectAndRawInputEnvironmentPlugin/);
    assert.match(controllerSupport, /return pollFailure \|\| pluginLoadNotice;/);

    assert.match(readDesktopSource("IntroMode.java"), /return state == STATE_TITLE;/);
    assert.match(readDesktopSource("GameMode.java"), /return paused;/);
    assert.match(readDesktopSource("OptionsMode.java"), /return state == STATE_MENU;/);
    assert.match(readDesktopSource("ContinueMode.java"), /return state == STATE_MENU;/);
    assert.match(readDesktopSource("DifficultyMode.java"), /return state == STATE_MENU;/);
    assert.match(readDesktopSource("InputMode.java"), /return state == STATE_MENU \|\| state == STATE_READING;/);
});
