import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { createServer } from "vite";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
    root: resolve(rootDir, "pwa"),
    appType: "custom",
    logLevel: "silent",
    server: { middlewareMode: true }
});
const { IntroMode } = await server.ssrLoadModule("/src/jackal/IntroMode.ts");
const { SOUND_FIELD_NAMES } = await server.ssrLoadModule("/src/jackal/AudioRegistry.ts");

after(async () => {
    await server.close();
});

function idleInput(overrides = {}) {
    return {
        isEnter: () => false,
        isUp: () => false,
        isDown: () => false,
        isRight: () => false,
        isLeft: () => false,
        isShoot: () => false,
        isFire: () => false,
        ...overrides
    };
}

function mainFixture(events) {
    const explodeSound = { id: "start-explosion" };
    const explodeSound3 = { id: "options-explosion" };
    return {
        explodeSound,
        explodeSound3,
        stopAllSoundEffects() {
            events.push("purge-sfx");
        },
        stopAllSongs() {
            events.push("stop-songs");
        },
        playSound(sound) {
            events.push(sound === explodeSound ? "start-explosion" : sound === explodeSound3 ? "options-explosion" : "other-sfx");
        },
        startFade() {
            events.push("start-fade");
        }
    };
}

function menuFixture(events) {
    return {
        buttonReleased: true,
        update() {},
        setInputEnabled(enabled) {
            events.push(`menu:${enabled}`);
        }
    };
}

test("interrupting Jackal's autonomous story retires story SFX before title ownership resumes", () => {
    const events = [];
    const mode = new IntroMode();
    mode.main = mainFixture(events);
    mode.menu = menuFixture(events);
    mode.input = idleInput({ isEnter: () => true });
    mode.state = IntroMode.STATE_STORY_SCROLL;
    mode.delay = 100;
    mode.scrollOffsetX = 0;

    mode.update({});

    assert.equal(mode.state, IntroMode.STATE_TITLE);
    assert.equal(mode.menu.buttonReleased, false);
    assert.deepEqual(events, ["purge-sfx", "stop-songs", "menu:true"]);
});

test("title Start keeps its destination-owned explosion cue", () => {
    const events = [];
    const mode = new IntroMode();
    mode.main = mainFixture(events);
    mode.menu = menuFixture(events);
    mode.input = idleInput();
    mode.state = IntroMode.STATE_TITLE;
    mode.delay = 100;
    mode.selectionMade = true;
    mode.selectedIndex = 0;

    mode.update({});

    assert.equal(mode.state, IntroMode.STATE_EXPLOSION);
    assert.deepEqual(events, ["start-explosion"]);
});

test("title Options keeps its destination-owned explosion cue", () => {
    const events = [];
    const mode = new IntroMode();
    mode.main = mainFixture(events);
    mode.menu = menuFixture(events);
    mode.input = idleInput();
    mode.state = IntroMode.STATE_TITLE;
    mode.delay = 100;
    mode.selectionMade = true;
    mode.selectedIndex = 1;

    mode.update({});

    assert.equal(mode.state, IntroMode.STATE_OPTIONS);
    assert.deepEqual(events, ["start-fade", "options-explosion"]);
});

test("Jackal cleanup is all-voice, title-scoped, and mirrored in Java", () => {
    const tsMain = readFileSync(resolve(rootDir, "pwa/src/jackal/Main.ts"), "utf8");
    const tsIntro = readFileSync(resolve(rootDir, "pwa/src/jackal/IntroMode.ts"), "utf8");
    const javaMain = readFileSync(resolve(rootDir, "desktop/src/jackal/Main.java"), "utf8");
    const javaIntro = readFileSync(resolve(rootDir, "desktop/src/jackal/IntroMode.java"), "utf8");

    const tsEffects = sourceBetween(tsMain, "    public stopAllSoundEffects()", "    public stopAllSound()");
    assert.match(tsEffects, /SoundStore\.get\(\)\.stopSoundEffects\(\)/);

    const tsAll = sourceBetween(tsMain, "    public stopAllSound()", "    public requestSong(");
    assert.match(tsAll, /this\.stopAllSoundEffects\(\)/);

    const tsStartTitle = sourceBetween(tsIntro, "    private startTitle()", "    private updateTitleScreen()");
    assertInOrder(tsStartTitle, ["this.main.stopAllSoundEffects();", "this.main.stopAllSongs();", "this.menu.setInputEnabled(true);"]);

    const tsSetMode = sourceBetween(tsMain, "    public setMode(", "    public addPoints(");
    assert.doesNotMatch(tsSetMode, /stopAllSoundEffects|stopSoundEffects/, "generic Jackal mode changes must remain non-destructive");

    const javaAll = sourceBetween(javaMain, "  public void stopAllSound()", "  public void requestSong(");
    for (const id of SOUND_FIELD_NAMES) {
        assert.match(javaAll, new RegExp(`stopSound\\(${escapeRegExp(id)}\\);`), `desktop cleanup missing ${id}`);
    }

    const javaStartTitle = sourceBetween(javaIntro, "  private void startTitle()", "  private void updateTitleScreen()");
    assertInOrder(javaStartTitle, ["main.stopAllSound();", "menu.setInputEnabled(true);"]);
});

function sourceBetween(source, startMarker, endMarker) {
    const start = source.indexOf(startMarker);
    const end = source.indexOf(endMarker, start + startMarker.length);
    assert.ok(start >= 0 && end > start, `Unable to isolate source between ${startMarker} and ${endMarker}.`);
    return source.slice(start, end);
}

function assertInOrder(source, snippets) {
    let previous = -1;
    for (const snippet of snippets) {
        const index = source.indexOf(snippet);
        assert.ok(index > previous, `Expected ordered source snippet: ${snippet}`);
        previous = index;
    }
}

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
