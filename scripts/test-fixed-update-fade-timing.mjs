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

async function loadTimingHarness() {
    const methodNames = ["update", "advanceFade", "updateMusic", "applyRequestedSongChange", "startFade", "requestSong", "resetNextFrameTime"];
    const methods = methodNames.map((name) => method(name).getText(mainFile)).join("\n\n");
    const source = `
let now = 0;
const Sys = {
    getTime: () => now,
    getTimerResolution: () => 1000
};
const javaInt = (value) => Math.trunc(value);
const javaFloat = (value) => Math.fround(value);

class Main {
    static FADES = new Array(23);

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
        this.input = { snap() {} };
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
    const output = ts.transpileModule(source, {
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
    main.input = { snap() {} };
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
