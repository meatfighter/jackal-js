import { ContinueMode } from "./jackal/ContinueMode.js";
import { DifficultyMode } from "./jackal/DifficultyMode.js";
import { OptionsMode } from "./jackal/OptionsMode.js";
import { ResourceLoader, Sys } from "slick2d-ts";
import { JackalRuntimeLoader, type PreparedRuntime } from "./app/JackalRuntimeLoader.js";
import { getDeploymentStorageKey } from "./app/DeploymentStorageKeys.js";
import { JackalGameStateSerializer } from "./jackal/persistence/JackalGameStateSerializer.js";
import { GAME_STATE_STORAGE_KEY } from "./jackal/persistence/GameStateSchema.js";
import { isSupportedGameStateSnapshot } from "./jackal/persistence/GameStateSnapshotValidator.js";
import type { JackalGameStateSnapshot } from "./jackal/persistence/GameStateSnapshot.js";
import { CutsceneSequence } from "./jackal/CutsceneSequence.js";
import { SunsetMode } from "./jackal/SunsetMode.js";
import { HardEndingMode } from "./jackal/HardEndingMode.js";
import { IntroMode } from "./jackal/IntroMode.js";
import { GameMode } from "./jackal/GameMode.js";
import { Modes } from "./jackal/Modes.js";
import { finalScoreText } from "./jackal/ScorePresentation.js";

function check(value: unknown, message: string): asserts value {
    if (!value) throw new Error(message);
}
type Main = InstanceType<PreparedRuntime["Main"]>;
export async function createEndingVerification(runtime?: PreparedRuntime) {
    check(import.meta.env.DEV, "Ending verification is development-only");
    const prepared = runtime ?? (await new JackalRuntimeLoader(() => {}).ensurePrepared(false));
    const element = document.querySelector<HTMLElement>("#game-host");
    check(element, "Ending fixture host");
    const host: HTMLElement = element;
    const serializer = new JackalGameStateSerializer();
    const store = new prepared.JackalGameStateStore("ending-verification");
    const key = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
    const initialBag = CutsceneSequence.captureState();
    const previousBytes = localStorage.getItem(key);
    const previousClock = Sys.getTime;
    const previousDateNow = Date.now;
    const wallOrigin = previousDateNow() - previousClock();
    let now = previousClock();
    Sys.getTime = () => now;
    Date.now = () => wallOrigin + now;
    type Mounted = {
        main: Main;
        container: InstanceType<PreparedRuntime["slick"]["AppGameContainer"]>;
        buffered: InstanceType<PreparedRuntime["slick"]["BufferedScalableGame"]>;
    };
    let mounted: Mounted | null = null;
    const textCalls: Array<{ text: string; length: number; x: number; y: number }> = [];
    function current(): Mounted {
        check(mounted, "Mounted ending runtime");
        return mounted;
    }
    function retire(): void {
        if (!mounted) return;
        mounted.main.stopAllSounds();
        mounted.main.disposeBrowserRuntime();
        mounted.container.destroy();
        mounted = null;
        prepared.slick.Display.setParent(null);
    }
    async function mount(restore: boolean): Promise<void> {
        retire();
        host.replaceChildren();
        prepared.slick.Display.setParent(host);
        const main = new prepared.Main();
        main.getSoundCooldownTime = () => now;
        main.reserveBrowserRuntime();
        const buffered = new prepared.slick.BufferedScalableGame(main, 1024, 960, {
            maintainAspect: true,
            scalingMode: prepared.slick.BufferedScalingMode.Nearest
        });
        const container = new prepared.slick.AppGameContainer(buffered, 1024, 960, false);
        container.setPreserveAudioCacheOnDestroy(true);
        container.setLoopSuspended(true);
        if (restore)
            main.loadingCompleteHandler = (gc) => {
                check(store.restore(main, gc), "Ending actual reader restore");
                return true;
            };
        mounted = { main, container, buffered };
        await container.start();
        await ResourceLoader.waitForAll();
        check(main.isStateSaveReady(), "Ending resources ready");
        const draw = main.drawString.bind(main),
            partial = main.drawStringWithLength.bind(main);
        main.drawString = (text, x, y, color) => {
            check(typeof text === "string", "Full render text");
            textCalls.push({ text, length: text.length, x, y });
            draw(text, x, y, color);
        };
        main.drawStringWithLength = (text, length, x, y, color) => {
            check(typeof text === "string" && length >= 0 && length <= text.length, "First-render glyph bounds");
            textCalls.push({ text, length, x, y });
            partial(text, length, x, y, color);
        };
    }
    function capture(): JackalGameStateSnapshot {
        return serializer.createSnapshot(current().main, "ending-verification");
    }
    function normalized(s: JackalGameStateSnapshot): string {
        const copy = structuredClone(s);
        copy.savedAt = "";
        return JSON.stringify(copy);
    }
    function tick(): void {
        const { main, container } = current();
        now += 10;
        main.nextFrameTime = now;
        container.getInput().poll(1024, 960);
        main.update(container, 10);
    }
    function render(): void {
        textCalls.length = 0;
        const m = current();
        m.buffered.render(m.container, m.container.getGraphics());
    }
    function score(): void {
        const main = current().main,
            mode = main.mode;
        const expected = finalScoreText(main.score);
        check(main.scoreStr === expected.slice(13), "Main derived score agrees");
        if (mode instanceof SunsetMode) check(mode.credits.at(-1)?.[0] === expected, "Sunset text derives from numeric score");
        if (mode instanceof HardEndingMode)
            check(mode.finalScore === expected && mode.finalScoreX === (1024 - expected.length * 32) >> 1, "HardEnding text and centering");
    }
    function pressStart(): void {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
        tick();
        window.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true }));
        tick();
    }
    async function roundtrip(label: string): Promise<unknown> {
        const saved = capture();
        check(isSupportedGameStateSnapshot(saved), label + " positive");
        score();
        check(store.save(current().main, () => true).saved, label + " store save");
        const bytes = localStorage.getItem(key);
        check(bytes, label + " bytes");
        const expected = JSON.parse(bytes) as JackalGameStateSnapshot;
        const savedNow = now;
        render();
        const controlText = JSON.stringify(textCalls);
        const control: string[] = [];
        for (let i = 0; i < 5; i++) {
            tick();
            control.push(normalized(capture()));
        }
        now = savedNow;
        await mount(true);
        check(localStorage.getItem(key) === bytes, label + " unchanged restore bytes");
        check(
            normalized(capture()) === normalized(expected),
            label +
                " exact fresh graph: " +
                JSON.stringify(
                    Object.keys(expected)
                        .filter((k) => JSON.stringify(Reflect.get(capture(), k)) !== JSON.stringify(Reflect.get(expected, k)) && k !== "savedAt")
                        .map((k) => [k, Reflect.get(expected, k), Reflect.get(capture(), k)])
                )
        );
        score();
        render();
        check(JSON.stringify(textCalls) === controlText, label + " same first-render text schedule");
        const restoredText = [...textCalls];
        for (let i = 0; i < 5; i++) {
            tick();
            check(normalized(capture()) === control[i], label + " exact deterministic next tick " + i);
        }
        now = savedNow;
        check(store.restore(current().main, current().container), label + " restore checkpoint after continuation control");
        check(localStorage.getItem(key) === bytes, label + " control leaves save untouched");
        return {
            label,
            mode: expected.kind === "mode" ? expected.modeId : "GAME",
            fields: expected.kind === "mode" ? expected.modeFields : null,
            score: current().main.score,
            bag: CutsceneSequence.captureState(),
            rng: current().main.random.getState(),
            text: restoredText,
            continuationTicks: 5
        };
    }
    function selectionTrace(count = 8): unknown[] {
        const main = current().main,
            result: unknown[] = [];
        // Actual requestCutscene and mode construction; stage0 is a local selection boundary.
        main.stageIndex = 0;
        for (let i = 0; i < count; i++) {
            CutsceneSequence.requestCutscene(current().container);
            result.push({
                mode: main.mode?.constructor.name,
                yeah: Reflect.get(main.mode ?? {}, "yeah"),
                bag: CutsceneSequence.captureState(),
                rng: main.random.getState()
            });
        }
        return result;
    }
    async function prepareReload(remaining: number, scoreValue: number, partial: boolean): Promise<unknown> {
        await mount(false);
        const { main, container } = current();
        main.stageIndex = 0;
        check(CutsceneSequence.captureState().length === 0, "New module bag starts empty");
        for (let i = 0; i < 3 - remaining; i++) CutsceneSequence.requestCutscene(container);
        main.score = scoreValue;
        main.reconcileStateAfterRestore();
        main.stageIndex = 5;
        main.hardMode = false;
        main.requestMode(Modes.SUNSET, container);
        let n = 0;
        while (true) {
            const m = main.mode;
            check(m instanceof SunsetMode, "Normal Sunset ownership");
            if (m.creditsIndex === m.credits.length - 1 && (partial ? m.lineLength === 18 : m.state === SunsetMode.STATE_WAITING)) break;
            tick();
            check(++n < 15000, "Reload score-card finite bound");
        }
        score();
        render();
        check(store.save(main, () => true).saved, "reload actual store save");
        const bytes = localStorage.getItem(key);
        check(bytes, "reload save bytes");
        const snapshot = JSON.parse(bytes) as JackalGameStateSnapshot;
        const evidence = { bytes, bag: CutsceneSequence.captureState(), rng: main.random.getState(), text: [...textCalls], snapshot, trace: selectionTrace() };
        retire();
        return evidence;
    }
    async function restoreReload(bytes: string): Promise<unknown> {
        check(initialBag.length === 0, "New document/module static bag fresh before load");
        localStorage.setItem(key, bytes);
        await mount(true);
        score();
        render();
        const snapshot = capture();
        const text = [...textCalls];
        check(localStorage.getItem(key) === bytes, "Reload preserves bytes");
        const bag = CutsceneSequence.captureState(),
            rng = current().main.random.getState();
        return { bag, rng, text, snapshot, trace: selectionTrace() };
    }
    async function matrix(): Promise<unknown[]> {
        const records: unknown[] = [];
        for (const scoreValue of [123450, 1000000])
            for (const hard of [false, true]) {
                await mount(false);
                const main = current().main;
                main.score = scoreValue;
                main.reconcileStateAfterRestore();
                main.stageIndex = 5;
                main.hardMode = hard;
                main.requestMode(Modes.SUNSET, current().container);
                const seen = new Set<string>();
                let n = 0;
                while (true) {
                    const mode = current().main.mode;
                    if (mode instanceof GameMode || mode instanceof IntroMode) break;
                    check(mode instanceof SunsetMode || mode instanceof HardEndingMode, "Ending phase owner");
                    const snapshot = capture();
                    check(isSupportedGameStateSnapshot(snapshot), "Live ending state validates");
                    const card = mode instanceof SunsetMode ? mode.creditsIndex : mode.cardIndex;
                    let boundary = `${mode.constructor.name}:${mode.state}:${card}`;
                    if (mode instanceof SunsetMode && mode.helicopterDelay === (hard ? SunsetMode.HELICOPTER_HARD_TIME : SunsetMode.HELICOPTER_TIME) - 1)
                        boundary += ":last-helicopter-tick";
                    if (mode instanceof HardEndingMode) {
                        if (mode.state === HardEndingMode.STATE_CREDITS && mode.creditsY < -HardEndingMode.CREDITS_HEIGHT - 28) boundary += ":late-scroll";
                        if (
                            mode.state === HardEndingMode.STATE_TYPING &&
                            (mode.lineIndex === HardEndingMode.CARDS[card]?.length || mode.lineLength === HardEndingMode.CARDS[card]?.[mode.lineIndex]?.length)
                        )
                            boundary += `:typed:${mode.lineIndex}:${mode.lineLength}`;
                    }
                    if (mode instanceof SunsetMode && mode.state === SunsetMode.STATE_CREDITS) {
                        const line = mode.credits[card]?.[mode.lineIndex];
                        if (mode.lineLength === 0 || mode.lineLength === line?.length || mode.lineLength === 18 || mode.lineLength === 13)
                            boundary += `:${mode.lineIndex}:${mode.lineLength}`;
                    }
                    if (mode instanceof HardEndingMode && mode.state === HardEndingMode.STATE_FINAL_SCORE_JEEP) {
                        if (Math.abs(mode.jeepX - mode.finalScoreX) < 4) boundary += `:edge:${mode.jeepX}`;
                    }
                    if (!seen.has(boundary)) {
                        seen.add(boundary);
                        records.push(await roundtrip(`${scoreValue}:${hard}:${boundary}`));
                    }
                    const live = current().main.mode;
                    if (
                        (live instanceof SunsetMode && live.state === SunsetMode.STATE_WAITING) ||
                        (live instanceof HardEndingMode && live.state === HardEndingMode.STATE_FINAL_SCORE)
                    )
                        pressStart();
                    else tick();
                    check(++n < 60000, "Full ending progression bounded");
                }
                check(current().main.score === scoreValue, "Ending transition preserves score");
                retire();
            }
        for (const id of [Modes.CONTINUE, Modes.DIFFICULTY, Modes.OPTIONS])
            for (let choice = 0; choice < (id === Modes.OPTIONS ? 3 : 2); choice++) {
                await mount(false);
                let main = current().main;
                main.requestMode(id, current().container);
                const edge = (code: string, key: string, keyCode: number) => {
                    window.dispatchEvent(new KeyboardEvent("keydown", { code, key, keyCode, which: keyCode, bubbles: true }));
                    tick();
                    window.dispatchEvent(new KeyboardEvent("keyup", { code, key, keyCode, which: keyCode, bubbles: true }));
                    tick();
                };
                for (let i = 0; i < choice; i++) edge("ArrowDown", "ArrowDown", 40);
                edge("Enter", "Enter", 13);
                const mode = main.mode;
                check(mode instanceof ContinueMode || mode instanceof DifficultyMode || mode instanceof OptionsMode, "Real early menu owner");
                check(mode.state === 0 && mode.optionSelectedFlag && mode.selectedIndex === choice, "Actual fresh menu input committed during fade");
                const saved = capture();
                check(isSupportedGameStateSnapshot(saved), "Early menu valid");
                check(store.save(main, () => true).saved, "Early menu store save");
                await mount(true);
                main = current().main;
                check(normalized(capture()) === normalized(saved), "Early menu restore exact without replay");
                const owner = main.mode;
                let ticks = 0;
                while (main.mode === owner) {
                    tick();
                    check(++ticks < 100, "Early menu committed action progresses once");
                }
                records.push({ earlyMenu: id, choice, ticks, destination: main.mode?.constructor.name });
                retire();
            }
        return records;
    }
    return {
        initialBag,
        mount,
        current,
        tick,
        capture,
        roundtrip,
        textCalls,
        prepareReload,
        restoreReload,
        matrix,
        retire,
        render,
        dispose() {
            retire();
            Sys.getTime = previousClock;
            Date.now = previousDateNow;
            CutsceneSequence.restoreState(initialBag);
            if (previousBytes === null) localStorage.removeItem(key);
            else localStorage.setItem(key, previousBytes);
        }
    };
}

export async function verifyEndingPersistence(runtime: PreparedRuntime): Promise<void> {
    const fixture = await createEndingVerification(runtime);
    try {
        const evidence = await fixture.matrix();
        console.log("Ending persistence first-render evidence", JSON.stringify(evidence));
        Reflect.set(window, "endingPersistenceEvidence", evidence);
    } finally {
        fixture.dispose();
    }
}
