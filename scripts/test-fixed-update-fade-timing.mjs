import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import ts from "typescript";
import { rootDir } from "./build-utils.mjs";

const mainPath = join(rootDir, "pwa", "src", "jackal", "Main.ts");
const mainSource = readFileSync(mainPath, "utf8");
const mainFile = ts.createSourceFile(mainPath, mainSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const mainClass = mainFile.statements.find((statement) => ts.isClassDeclaration(statement) && statement.name?.text === "Main");
assert.ok(mainClass, "Missing Main class.");

function method(name) {
    const result = mainClass.members.find((member) => ts.isMethodDeclaration(member) && ts.isIdentifier(member.name) && member.name.text === name);
    assert.ok(result?.body, `Missing Main.${name}().`);
    return result;
}

function descendants(node) {
    const result = [];
    function visit(child) {
        result.push(child);
        ts.forEachChild(child, visit);
    }
    ts.forEachChild(node, visit);
    return result;
}

function callsNamed(node, name) {
    return descendants(node).filter(
        (child) =>
            ts.isCallExpression(child) &&
            ts.isPropertyAccessExpression(child.expression) &&
            child.expression.expression.kind === ts.SyntaxKind.ThisKeyword &&
            child.expression.name.text === name
    );
}

function whileStatementInUpdate() {
    const update = method("update");
    const loops = descendants(update.body).filter(ts.isWhileStatement);
    assert.equal(loops.length, 1, "Main.update() should retain one fixed-step catch-up loop.");
    return loops[0];
}

async function loadTimingHarness(transform = (text) => text) {
    const methodNames = ["setMode", "update", "advanceFade", "updateMusic", "applyRequestedSongChange", "startFade", "requestSong", "resetNextFrameTime"];
    const methods = methodNames.map((name) => method(name).getText(mainFile)).join("\n\n");
    const source = `
let now = 0;
const Sys = {
    getTime: () => now
};
const javaInt = (value) => Math.trunc(value);
const javaFloat = (value) => Math.fround(value);

class Main {
    static FADES = new Array(23);
    static GAME_TICK_MS = 10;

    constructor() {
        this.browserSuspended = false;
        this.nextFrameTime = 0;
        this.fading = false;
        this.fadeIndex = 0;
        this.fadeOut = false;
        this.fadeListener = null;
        this.currentSong = null;
        this.requestedSong = null;
        this.closeRequestedFlag = false;
        this.input = { snap() {}, clearKeyPressedRecord() {} };
        this.mode = { update() {} };
    }

    fullScreenToggleCheck() {}

    ${methods}
}

export function setNow(value) {
    now = value;
}

export { Main };
`;
    const output = ts.transpileModule(transform(source), {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            useDefineForClassFields: false,
            removeComments: true
        },
        fileName: "fade-timing-harness.ts"
    }).outputText;
    return import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}#${Date.now()}-${Math.random()}`);
}

function makeMain(Main) {
    const main = new Main();
    main.input = { snap() {}, clearKeyPressedRecord() {} };
    main.mode = { update() {} };
    main.fullScreenToggleCheck = () => {};
    return main;
}

test("the intentional Java-to-browser timing difference is documented", () => {
    const exceptions = JSON.parse(readFileSync(join(rootDir, "scripts", "java-ts-parity-exceptions.json"), "utf8"));
    assert.match(exceptions.behaviorExceptions["Main.update.fadeTiming"], /fixed-update loop/i);
    assert.match(exceptions.behaviorExceptions["Main.update.fadeTiming"], /refresh/i);
});

test("screen fades are advanced by the existing fixed-step loop, not the browser callback", () => {
    const update = method("update");
    const loop = whileStatementInUpdate();
    const loopText = loop.getText(mainFile);
    const updateText = update.getText(mainFile);

    assert.equal(callsNamed(update.body, "advanceFade").length, 1);
    assert.equal(callsNamed(loop.statement, "advanceFade").length, 1, "advanceFade() must be inside the fixed-step loop.");
    assert.match(mainSource, /private static readonly GAME_TICK_MS: number = 10/);
    assert.match(loopText, /this\.nextFrameTime \+= Main\.GAME_TICK_MS/);
    assert.doesNotMatch(updateText, /getTimerResolution/);
    assert.ok(loopText.indexOf("this.advanceFade()") < loopText.indexOf("this.updateMusic()"));
    const modeUpdateIndex = loopText.indexOf("mode.update(gc)");
    assert.ok(modeUpdateIndex >= 0, "The fixed-step loop must update the active mode.");
    assert.ok(loopText.indexOf("this.updateMusic()") < modeUpdateIndex);

    const beforeLoop = updateText.slice(0, updateText.indexOf(loopText));
    assert.doesNotMatch(beforeLoop, /\+\+this\.fadeIndex|--this\.fadeIndex/);
    assert.doesNotMatch(beforeLoop, /this\.advanceFade\(\)/);

    const fadeText = method("advanceFade").getText(mainFile);
    assert.doesNotMatch(fadeText, /Sys\.|performance\.|Date\.|requestAnimationFrame|setTimeout|setInterval/);
    assert.match(fadeText, /\+\+this\.fadeIndex/);
    assert.match(fadeText, /--this\.fadeIndex/);
});

test("the existing 23-level fade completes on the 23rd fixed update in both directions", async () => {
    const { Main } = await loadTimingHarness();

    const out = makeMain(Main);
    let outCallbacks = 0;
    out.startFade(true, { fadeCompleted: () => outCallbacks++ });
    for (let tick = 1; tick <= 22; tick++) {
        assert.equal(out.advanceFade(), false);
        assert.equal(out.fadeIndex, tick);
        assert.equal(out.fading, true);
    }
    assert.equal(out.advanceFade(), true);
    assert.equal(out.fadeIndex, 23);
    assert.equal(out.fading, false);
    assert.equal(outCallbacks, 1);

    const incoming = makeMain(Main);
    let inCallbacks = 0;
    incoming.startFade(false, { fadeCompleted: () => inCallbacks++ });
    for (let tick = 1; tick <= 22; tick++) {
        assert.equal(incoming.advanceFade(), false);
        assert.equal(incoming.fadeIndex, 22 - tick);
        assert.equal(incoming.fading, true);
    }
    assert.equal(incoming.advanceFade(), true);
    assert.equal(incoming.fadeIndex, -1);
    assert.equal(incoming.fading, false);
    assert.equal(inCallbacks, 1);
});

test("a fade started by fadeCompleted() begins at its initial level and waits for the next fixed update", async () => {
    const { Main } = await loadTimingHarness();
    const main = makeMain(Main);
    let firstCallbacks = 0;
    let secondCallbacks = 0;

    main.startFade(true, {
        fadeCompleted() {
            firstCallbacks++;
            main.startFade(false, { fadeCompleted: () => secondCallbacks++ });
        }
    });

    for (let tick = 1; tick <= 23; tick++) {
        main.advanceFade();
    }

    assert.equal(firstCallbacks, 1);
    assert.equal(secondCallbacks, 0);
    assert.equal(main.fading, true);
    assert.equal(main.fadeOut, false);
    assert.equal(main.fadeIndex, 22, "The replacement fade must not consume a step in the completion callback.");

    assert.equal(main.advanceFade(), false);
    assert.equal(main.fadeIndex, 21);
});

test("a fade started by a mode update waits until the next fixed update and is refresh-rate independent", async () => {
    const { Main, setNow } = await loadTimingHarness();

    async function simulate(refreshRate) {
        const main = makeMain(Main);
        let modeUpdates = 0;
        let callbackCount = 0;
        let modeUpdatesAtCompletion = null;
        let completionTime = null;

        main.mode = {
            update() {
                modeUpdates++;
                if (modeUpdates === 1) {
                    main.startFade(true, {
                        fadeCompleted() {
                            callbackCount++;
                            modeUpdatesAtCompletion = modeUpdates;
                            completionTime = currentTime;
                        }
                    });
                }
            }
        };

        let currentTime = 0;
        for (let frame = 0; frame < refreshRate * 2 && callbackCount === 0; frame++) {
            currentTime = Math.floor((frame * 1000) / refreshRate);
            setNow(currentTime);
            main.update({}, 0);
        }

        return { main, modeUpdates, callbackCount, modeUpdatesAtCompletion, completionTime };
    }

    for (const refreshRate of [30, 60, 120, 144, 165, 240]) {
        const result = await simulate(refreshRate);
        assert.equal(result.callbackCount, 1, `${refreshRate} Hz fade did not complete exactly once.`);
        assert.equal(result.modeUpdatesAtCompletion, 23, `${refreshRate} Hz changed the logical fade duration.`);
        assert.ok(result.completionTime >= 230, `${refreshRate} Hz completed before the 23rd 10 ms interval.`);
        assert.ok(result.completionTime < 230 + 1000 / refreshRate + 1, `${refreshRate} Hz completion was delayed by more than one presentation interval.`);
        assert.equal(result.modeUpdates, 24, `${refreshRate} Hz should continue the mode update on the completion tick.`);
    }
});

test("fixed-step catch-up advances fades with game time and retains the eight-update cap", async () => {
    const { Main, setNow } = await loadTimingHarness();
    const main = makeMain(Main);
    let callbackCount = 0;
    main.startFade(true, { fadeCompleted: () => callbackCount++ });

    setNow(100);
    main.update({}, 0);

    assert.equal(main.fadeIndex, 8);
    assert.equal(main.fading, true);
    assert.equal(callbackCount, 0);
    assert.equal(main.nextFrameTime, 100, "The existing catch-up reset policy must remain authoritative.");
});

test("fade-driven mode changes can start requested music before the completion tick updates the mode", async () => {
    const { Main, setNow } = await loadTimingHarness();
    const main = makeMain(Main);
    const events = [];

    const oldSong = {
        stop: () => events.push("old.stop"),
        play: () => events.push("old.play"),
        update: () => events.push("old.update")
    };
    const newSong = {
        stop: () => events.push("new.stop"),
        play: () => events.push("new.play"),
        update: () => events.push("new.update")
    };

    main.currentSong = oldSong;
    main.requestedSong = oldSong;
    main.input = { snap: () => events.push("input.snap") };
    main.fullScreenToggleCheck = () => events.push("fullscreen");
    main.mode = { update: () => events.push("mode.update") };
    main.fading = true;
    main.fadeOut = true;
    main.fadeIndex = 22;
    main.fadeListener = {
        fadeCompleted() {
            events.push("fade.completed");
            main.requestSong(newSong);
        }
    };

    setNow(0);
    main.update({}, 0);

    assert.equal(events.filter((event) => event === "fade.completed").length, 1);
    assert.ok(events.indexOf("fade.completed") < events.indexOf("old.stop"));
    assert.ok(events.indexOf("old.stop") < events.indexOf("new.play"));
    assert.ok(events.indexOf("new.play") < events.indexOf("new.update"));
    assert.ok(events.indexOf("new.update") < events.indexOf("mode.update"));
    assert.equal(events.includes("old.update"), false, "The replaced song must not be polled on the completion callback.");
    assert.equal(main.currentSong, newSong);
});

test("screen fading remains visually isolated from music and sound-effect volume", () => {
    const startFadeText = method("startFade").getText(mainFile);
    const advanceFadeText = method("advanceFade").getText(mainFile);
    const combined = `${startFadeText}\n${advanceFadeText}`;

    assert.doesNotMatch(combined, /setVolume|volume|Music|Sound|currentSong|requestedSong/);
    assert.match(startFadeText, /this\.fadeIndex\s*=\s*0/);
    assert.match(startFadeText, /this\.fadeIndex\s*=\s*Main\.FADES\.length\s*-\s*1/);
});

for (const later of [false, true])
    test(`real setMode primes once at ${later ? "later catch-up" : "first"} fade completion`, async () => {
        const { Main, setNow } = await loadTimingHarness();
        const main = makeMain(Main);
        const events = [];
        const song = { play: () => events.push("song.play"), update: () => events.push("song.update"), stop: () => events.push("song.stop") };
        const destination = {
            init() {
                events.push("init");
                main.requestSong(song);
            },
            update() {
                events.push("destination.update");
            }
        };
        main.input = { clearKeyPressedRecord: () => events.push("clear"), snap: () => events.push("snap") };
        main.mode = { update: () => events.push("outgoing.update") };
        main.fading = true;
        main.fadeOut = true;
        main.fadeIndex = later ? 21 : 22;
        main.fadeListener = {
            fadeCompleted() {
                events.push("fade");
                main.setMode(destination, {});
            }
        };
        setNow(later ? 10 : 0);
        main.update({}, 0);
        assert.deepEqual(
            events,
            later
                ? ["snap", "outgoing.update", "fade", "clear", "init", "destination.update", "song.play", "snap", "destination.update"]
                : ["fade", "clear", "init", "destination.update", "song.play", "song.update", "snap", "destination.update"]
        );
        assert.equal(main.mode, destination);
        assert.equal(main.nextFrameTime, later ? 20 : 10);
        events.length = 0;
        setNow(later ? 20 : 10);
        main.update({}, 0);
        assert.deepEqual(events, ["song.update", "snap", "destination.update"]);
    });

test("mode-driven real setMode primes the destination and resets catch-up without a second outgoing tick", async () => {
    const { Main, setNow } = await loadTimingHarness();
    const main = makeMain(Main);
    const events = [];
    main.input = { clearKeyPressedRecord: () => events.push("clear"), snap: () => events.push("snap") };
    const destination = {
        init() {
            events.push("init");
        },
        update() {
            events.push("prime");
        }
    };
    main.mode = {
        update() {
            events.push("outgoing");
            main.setMode(destination, {});
            return;
        }
    };
    setNow(100);
    main.update({}, 0);
    assert.deepEqual(events, ["snap", "outgoing", "clear", "init", "prime"]);
    assert.equal(main.mode, destination);
    assert.equal(main.nextFrameTime, 110);
});

async function makePauseFadeFixture(mainTransform, worldTransform = (text) => text) {
    const { Main, setNow } = await loadTimingHarness(mainTransform);
    const path = join(rootDir, "pwa", "src", "jackal", "GameMode.ts");
    const source = readFileSync(path, "utf8");
    const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const declaration = file.statements.find((s) => ts.isClassDeclaration(s) && s.name?.text === "GameMode");
    assert.ok(declaration, "Missing real GameMode class");
    const member = (name) => {
        const value = declaration.members.find((m) => m.name && ts.isIdentifier(m.name) && m.name.text === name);
        assert.ok(value, `Missing GameMode.${name}`);
        return value.getText(file);
    };
    const text = `
const javaFloat = Math.fround;
const javaInt = Math.trunc;
export class GameMode {
    ${member("WATER_ALPHAS_PERIOD")}
    ${member("REMOVE_BOUND")}
    ${member("update")}
}
`;
    const output = ts.transpileModule(worldTransform(text), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
        fileName: "pause-fade-game-mode-harness.ts"
    }).outputText;
    const { GameMode } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
    const main = new Main();
    let edge = false;
    const counts = { world: 0, reads: 0, snaps: 0, pause: 0, resume: 0, play: 0, stop: 0, poll: 0, sound: 0 };
    const song = {
        playing: true,
        transport: "playing",
        play() {
            counts.play++;
            this.transport = "playing";
        },
        stop() {
            counts.stop++;
            this.transport = "stopped";
        },
        pause() {
            counts.pause++;
            this.transport = "paused";
        },
        resume() {
            counts.resume++;
            this.transport = "playing";
        },
        update() {
            counts.poll++;
        }
    };
    main.currentSong = main.requestedSong = song;
    main.isSongPlaying = () => song.playing;
    main.playSound = () => {
        counts.sound++;
    };
    main.input = {
        snap() {
            counts.snaps++;
        },
        isPause() {
            counts.reads++;
            const result = edge;
            edge = false;
            return result;
        },
        clearKeyPressedRecord() {
            edge = false;
        }
    };
    const world = Object.assign(new GameMode(), {
        main,
        input: main.input,
        paused: false,
        playing: true,
        stageCompletedFlag: false,
        stageCompletedDelay: 228,
        stageIndex: 1,
        waterAlphaIndex: 0,
        maxCameraY: 0,
        bossCameraPan: false,
        endingCameraPan: false,
        elements: Array.from({ length: 8 }, () => ({ size: () => 0 })),
        player: {
            respawning: 0,
            update() {
                counts.world++;
            }
        },
        processTriggers() {
            counts.world++;
        },
        cameraTrackPlayer() {
            counts.world++;
        }
    });
    main.mode = world;
    return {
        main,
        world,
        song,
        counts,
        press() {
            edge = true;
        },
        tickAt(now) {
            setNow(now);
            main.update({}, 0);
        }
    };
}

for (const initialIndex of [0, 1, 12, 22]) {
    test(`entrance fade continues through gameplay Pause from index ${initialIndex}`, async () => {
        const f = await makePauseFadeFixture();
        f.main.startFade(false, null);
        f.main.fadeIndex = initialIndex;
        // Deliberately overdue at entry. The fake clock stays fixed within this call.
        f.press();
        f.tickAt(1000);
        assert.equal(f.world.paused, true);
        assert.equal(f.main.mode, f.world);
        assert.equal(f.main.fadeIndex, initialIndex - 1);
        assert.equal(f.main.fading, initialIndex !== 0);
        assert.equal(f.main.fadeListener, null);
        assert.equal(f.main.nextFrameTime, 1010);
        assert.equal(f.counts.snaps, 1, "Pause reset failed to discard old fixed-step debt");
        assert.equal(f.counts.world, 0);
        assert.equal(f.world.waterAlphaIndex, 0);
        assert.equal(f.song.transport, "paused");
        assert.equal(f.counts.pause, 1);
        const index = f.main.fadeIndex;
        f.tickAt(1001); // Outer callback with no fixed tick due.
        assert.equal(f.main.fadeIndex, index);
        assert.equal(f.counts.world, 0);
        for (let i = 0; i < 40; i++) f.tickAt(1010 + i * 10);
        assert.equal(f.main.fading, false);
        assert.equal(f.main.fadeIndex, -1);
        assert.equal(f.main.fadeListener, null);
        assert.equal(f.main.mode, f.world);
        assert.equal(f.world.paused, true);
        assert.equal(f.counts.world, 0);
        assert.equal(f.world.waterAlphaIndex, 0);
        assert.equal(f.song.transport, "paused");
        assert.equal(f.counts.resume, 0);
        assert.equal(f.counts.play, 0);
        assert.equal(f.counts.stop, 0);
        assert.ok(f.counts.poll > 0, "Do not accidentally gate existing music polling");
        f.press();
        f.tickAt(2000);
        assert.equal(f.world.paused, false);
        assert.equal(f.counts.world, 0, "Unpause toggle advanced the world");
        assert.equal(f.main.nextFrameTime, 2010);
        assert.equal(f.counts.resume, 1);
        f.tickAt(2001);
        assert.equal(f.counts.world, 0);
        f.tickAt(2010);
        assert.equal(f.counts.world, 3, "Normal world work did not resume once");
        assert.equal(f.main.fading, false, "Unpause restarted the completed fade");
    });
}

test("browser suspension freezes a paused entrance fade and discards elapsed scheduling debt", async () => {
    const f = await makePauseFadeFixture();
    f.main.startFade(false, null);
    f.press();
    f.tickAt(0);
    assert.equal(f.world.paused, true);
    const index = f.main.fadeIndex;
    const polls = f.counts.poll;
    const reads = f.counts.reads;
    f.main.browserSuspended = true; // Main boundary only; real setter/shell tested in browser.
    for (const now of [1000, 10000, 100000]) {
        f.tickAt(now);
        assert.equal(f.main.fadeIndex, index);
        assert.equal(f.main.nextFrameTime, now);
        assert.equal(f.counts.world, 0);
        assert.equal(f.counts.poll, polls);
        assert.equal(f.counts.reads, reads);
    }
    f.main.browserSuspended = false;
    const snaps = f.counts.snaps;
    f.tickAt(100000);
    assert.equal(f.main.fadeIndex, index - 1);
    assert.equal(f.counts.snaps, snaps + 1);
    assert.equal(f.main.nextFrameTime, 100010);
    assert.equal(f.world.paused, true, "Browser resume must not unpause gameplay");
    assert.equal(f.song.transport, "paused");
    f.tickAt(100001);
    assert.equal(f.main.fadeIndex, index - 1);
});

test("completion fade refuses fresh gameplay Pause and calls its transition once", async () => {
    const f = await makePauseFadeFixture();
    // Isolated post-completion boundary fixture. Browser coverage generates it via stageCompleted().
    f.world.stageCompletedFlag = true;
    f.world.stageCompletedDelay = 0;
    f.main.currentSong = f.main.requestedSong = null;
    let callbacks = 0;
    let destinationUpdates = 0;
    const destination = {
        init() {},
        update() {
            destinationUpdates++;
        }
    };
    f.main.startFade(true, {
        fadeCompleted() {
            callbacks++;
            f.main.setMode(destination, {});
        }
    });
    f.main.fadeIndex = 21;
    f.press();
    f.tickAt(0);
    assert.equal(f.world.paused, false);
    assert.equal(f.main.fadeIndex, 22);
    assert.equal(callbacks, 0);
    assert.equal(f.world.stageCompletedDelay, 0);
    assert.equal(f.counts.pause, 0);
    const worldWork = f.counts.world;
    f.tickAt(10);
    assert.equal(callbacks, 1);
    assert.equal(f.main.mode, destination);
    assert.equal(f.main.fading, false);
    assert.equal(f.counts.world, worldWork, "Old world updated after the fade callback replaced it");
    // Current setMode primes once; the outer tick also updates the current destination.
    assert.equal(destinationUpdates, 2);
    f.tickAt(20);
    assert.equal(callbacks, 1);
    assert.equal(destinationUpdates, 3);
});

test("fresh unpause during an active entrance advances only fade on the toggle tick", async () => {
    const f = await makePauseFadeFixture();
    f.main.startFade(false, null);
    f.press();
    f.tickAt(0);
    f.tickAt(10);
    assert.equal(f.world.paused, true);
    f.press();
    f.tickAt(20);
    assert.equal(f.world.paused, false);
    assert.equal(f.main.fadeIndex, 19);
    assert.equal(f.main.fading, true);
    assert.equal(f.counts.world, 0);
    assert.equal(f.counts.resume, 1);
    assert.equal(f.main.nextFrameTime, 30);
    f.tickAt(30);
    assert.equal(f.counts.world, 3);
    assert.equal(f.main.fadeIndex, 18);
});

test("a paused property on a different current mode cannot freeze the global fade", async () => {
    const f = await makePauseFadeFixture();
    f.world.paused = true;
    let updates = 0;
    f.main.mode = {
        paused: true,
        update() {
            updates++;
        }
    };
    f.main.startFade(false, null);
    f.tickAt(0);
    assert.equal(f.main.fadeIndex, 21);
    assert.equal(updates, 1);
});

// Mutations affect only extracted in-memory harness text, never checkout source.
function replaceMutation(text, from, to) {
    assert.ok(text.includes(from), `Mutation target missing: ${from}`);
    return text.replace(from, to);
}
async function exercisePausePolicy(mainTransform, worldTransform) {
    const f = await makePauseFadeFixture(mainTransform, worldTransform);
    f.main.startFade(false, null);
    assert.equal(f.main.fadeListener, null, "entrance listener ownership");
    let observedIndex;
    const read = f.main.input.isPause;
    f.main.input.isPause = () => {
        observedIndex = f.main.fadeIndex;
        return read();
    };
    f.press();
    f.tickAt(1000);
    assert.equal(f.world.paused, true, "Pause input acceptance");
    assert.equal(observedIndex, 21, "fade before Pause read");
    assert.equal(f.main.nextFrameTime, 1010, "Pause deadline reset");
    f.tickAt(1010);
    assert.equal(f.main.fadeIndex, 20, "fade progresses while paused");
    f.main.browserSuspended = true;
    f.tickAt(100000);
    assert.equal(f.main.fadeIndex, 20, "browser suspension freezes fade");
    assert.equal(f.main.nextFrameTime, 100000, "suspension deadline reset");
    f.main.browserSuspended = false;
    for (let i = 0; i < 21; i++) f.tickAt(100000 + i * 10);
    assert.equal(f.main.fading, false, "paused fade completes");
    assert.equal(f.song.transport, "paused", "completion keeps paused transport");
    f.press();
    f.tickAt(101000);
    assert.equal(f.world.paused, false, "fresh input can unpause");
    const g = await makePauseFadeFixture(mainTransform, worldTransform);
    g.world.stageCompletedFlag = true;
    g.world.stageCompletedDelay = 0;
    g.main.startFade(true, null);
    g.press();
    g.tickAt(0);
    assert.equal(g.world.paused, false, "completion refuses Pause");
}
test("fade/Pause assertions reject behavioral counterexamples without mutating production", async (t) => {
    await exercisePausePolicy();
    const mutants = [
        [
            "gameplay gate freezes fade",
            (s) => replaceMutation(s, "this.fading && this.advanceFade()", "!this.mode.paused && this.fading && this.advanceFade()"),
            undefined
        ],
        [
            "early Main return loses unpause",
            (s) => replaceMutation(s, "let musicUpdated = false;", "if (this.mode.paused) return; let musicUpdated = false;"),
            undefined
        ],
        ["removed browser suspension return", (s) => replaceMutation(s, "if (this.browserSuspended)", "if (false)"), undefined],
        [
            "removed suspension deadline reset",
            (s) => replaceMutation(s, "if (this.browserSuspended) {\n            this.resetNextFrameTime();", "if (this.browserSuspended) {"),
            undefined
        ],
        [
            "fade after mode update",
            (s) =>
                replaceMutation(
                    replaceMutation(s, "const fadeCompleted = this.fading && this.advanceFade();", "const fadeCompleted = false;"),
                    "mode.update(gc);",
                    "mode.update(gc); if(this.fading) this.advanceFade();"
                ),
            undefined
        ],
        ["early Pause consumption", (s) => replaceMutation(s, "this.input.snap();", "this.input.snap(); this.input.isPause();"), undefined],
        ["removed toggle deadline resets", undefined, (s) => s.replaceAll("this.main.resetNextFrameTime();", "")],
        [
            "entrance listener introduced",
            (s) => replaceMutation(s, "this.fadeListener = fadeListener;", "this.fadeListener = fadeListener ?? {fadeCompleted() {}};"),
            undefined
        ],
        ["completion accepts Pause", undefined, (s) => replaceMutation(s, "!this.stageCompletedFlag &&", "")],
        [
            "fade completion resumes music",
            (s) =>
                replaceMutation(
                    s,
                    "this.fading = false;\n        if (this.fadeListener",
                    "this.fading = false; this.currentSong?.resume();\n        if (this.fadeListener"
                ),
            undefined
        ]
    ];
    for (const [name, mainTransform, worldTransform] of mutants)
        await t.test(name, async () => {
            await assert.rejects(
                () => exercisePausePolicy(mainTransform, worldTransform),
                (error) => error instanceof assert.AssertionError && !error.message.includes("Mutation target missing")
            );
        });
    await exercisePausePolicy();
});

test("actual restoreFadeListener preserves entrance/completion ownership and rejects listener mutants", async () => {
    const source = readFileSync(join(rootDir, "pwa/src/jackal/persistence/JackalGameStateSerializer.ts"), "utf8");
    const file = ts.createSourceFile("serializer.ts", source, ts.ScriptTarget.Latest, true);
    const Class = file.statements.find(ts.isClassDeclaration);
    const member = Class.members.find((m) => m.name?.getText(file) === "restoreFadeListener").getText(file);
    async function verify(transform = (text) => text) {
        const js = ts.transpileModule(`class GameMode {} export class Serializer { ${transform(member)} }; export {GameMode};`, {
            compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
        }).outputText;
        const { Serializer, GameMode } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
        const serializer = new Serializer(),
            world = Object.assign(new GameMode(), { stageCompletedFlag: true, stageCompletedDelay: 0 });
        const main = { fading: true, fadeOut: false, fadeListener: world };
        serializer.restoreFadeListener(main, world);
        assert.equal(main.fadeListener, null, "entrance owner");
        main.fadeOut = true;
        serializer.restoreFadeListener(main, world);
        assert.equal(main.fadeListener, world, "completion owner");
    }
    await verify();
    await assert.rejects(() => verify((s) => s.replace("? mode : null", "? null : null")), assert.AssertionError);
    await assert.rejects(() => verify((s) => s.replace("? mode : null", "? mode : mode")), assert.AssertionError);
    await verify();
});
