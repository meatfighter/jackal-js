import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createServer } from "./vite-test-server.mjs";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pwaRoot = resolve(rootDir, "pwa");
const server = await createServer({
    root: pwaRoot,
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
});

try {
    const { Menu } = await server.ssrLoadModule("/src/jackal/Menu.ts");
    const { KonamiCode } = await server.ssrLoadModule("/src/jackal/KonamiCode.ts");

    test("Jackal Menu requires release after browser resume before accepting a held action", () => {
        const controls = createControls();
        let selections = 0;
        const main = {
            input: controls.input,
            konamiCode: null
        };
        const menu = new Menu(0, 0, main, 0, 0, { optionSelected: () => selections++, selectionChanged() {} }, "ONE", "TWO");

        menu.buttonReleased = true;
        controls.fire = true;
        menu.resyncInputAfterBrowserResume();
        menu.update();

        assert.equal(selections, 0);
        assert.equal(menu.buttonReleased, false);

        controls.fire = false;
        menu.update();
        assert.equal(menu.buttonReleased, true);

        controls.fire = true;
        menu.update();
        assert.equal(selections, 1);
    });

    test("Jackal Konami progress survives but its physical release latch is rebuilt", () => {
        const controls = createControls();
        const main = {
            input: controls.input,
            weaponUpgradeSound: {},
            playSoundAlways() {}
        };
        const konami = new KonamiCode(main);
        konami.sequenceIndex = 0;
        konami.keyReleased = true;

        controls.up = true;
        konami.resyncInputAfterBrowserResume();
        konami.update();

        assert.equal(konami.sequenceIndex, 0, "a direction already held during browser resume must not advance the sequence");
        assert.equal(konami.keyReleased, false);

        controls.up = false;
        konami.update();
        assert.equal(konami.keyReleased, true);

        controls.up = true;
        konami.update();
        assert.equal(konami.sequenceIndex, 1, "a fresh post-release direction must advance the sequence");
    });
} finally {
    await server.close();
}

test("Jackal save fields exclude physical Menu and Konami release latches", () => {
    const fields = readFileSync(resolve(rootDir, "pwa/src/jackal/persistence/GameStateFields.ts"), "utf8");
    assert.doesNotMatch(fields.match(/export const MENU_FIELD_NAMES[\s\S]*?\);/)?.[0] ?? "", /buttonReleased/);
    assert.match(fields, /KONAMI_CODE_FIELD_NAMES = fieldsOf<KonamiCode>\(\)\("enabled", "sequenceIndex"\)/);
    assert.doesNotMatch(fields.match(/KONAMI_CODE_FIELD_NAMES[^\n]*/)?.[0] ?? "", /keyReleased/);
});

test("Jackal durable restore also rebuilds Menu and Konami release baselines", () => {
    const serializer = readFileSync(resolve(rootDir, "pwa/src/jackal/persistence/JackalGameStateSerializer.ts"), "utf8");

    const restoreMenu = serializer.slice(serializer.indexOf("private restoreMenuRuntimePointers"), serializer.indexOf("private isModeWithMenu"));
    assert.match(restoreMenu, /menu\.resyncInputAfterBrowserResume\(\)/);

    const restoreKonami = serializer.slice(serializer.indexOf("private restoreKonamiCode"), serializer.indexOf("private restoreFadeListener"));
    assert.match(restoreKonami, /konamiCode\.resyncInputAfterBrowserResume\(\)/);
});

test("Jackal browser resume rebaselines InputMode, Menu, and Konami input boundaries", () => {
    const source = readFileSync(resolve(rootDir, "pwa/src/jackal/Main.ts"), "utf8");
    const start = source.indexOf("public setBrowserSuspended");
    const end = source.indexOf("public stopAllSounds", start);
    const method = source.slice(start, end);

    assert.match(method, /this\.mode\.resyncInputAfterBrowserResume\(\)/);
    assert.match(method, /menu\.resyncInputAfterBrowserResume\(\)/);
    assert.match(method, /this\.konamiCode\?\.resyncInputAfterBrowserResume\(\)/);
});

function createControls() {
    const controls = {
        up: false,
        down: false,
        left: false,
        right: false,
        fire: false,
        shoot: false,
        enter: false
    };
    controls.input = {
        clearKeyPressedRecord() {},
        isUp: () => controls.up,
        isDown: () => controls.down,
        isLeft: () => controls.left,
        isRight: () => controls.right,
        isFire: () => controls.fire,
        isShoot: () => controls.shoot,
        isEnter: () => controls.enter
    };
    return controls;
}
