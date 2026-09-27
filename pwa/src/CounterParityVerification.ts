import type { PreparedRuntime } from "./app/JackalRuntimeLoader.js";
import { createEndingVerification } from "./EndingPersistenceVerification.js";
import { MapMode } from "./jackal/MapMode.js";
import { GameMode } from "./jackal/GameMode.js";
import { Modes } from "./jackal/Modes.js";
import { BossSuperTank } from "./jackal/BossSuperTank.js";
import { PlayerMissile } from "./jackal/PlayerMissile.js";
import { FlashingSkull } from "./jackal/FlashingSkull.js";
import { SunsetMode } from "./jackal/SunsetMode.js";
import { HardEndingMode } from "./jackal/HardEndingMode.js";
import { CutsceneSequence } from "./jackal/CutsceneSequence.js";
import { isSupportedGameStateSnapshot } from "./jackal/persistence/GameStateSnapshotValidator.js";

function check(value: unknown, message: string): asserts value {
    if (!value) throw new Error(message);
}

export async function verifyMapCounterPersistence(runtime: PreparedRuntime): Promise<void> {
    const f = await createEndingVerification(runtime),
        evidence: unknown[] = [];
    try {
        for (const stage of [0, 4]) {
            await f.mount(false);
            const { main, container } = f.current();
            main.stageIndex = stage;
            main.score = 19999;
            main.extraLives = 2;
            main.friendlySoldiersPickedUp = 10;
            main.hardMode = false;
            main.reconcileStateAfterRestore();
            CutsceneSequence.restoreState(["WE_MADE_IT", "HERE"]);
            main.requestSong(main.cutsceneSong);
            f.tick();
            // Keep the legitimate playing transport; deliver its backend end event at the shared wait boundary.
            main.requestMode(Modes.MAP, container);
            const phases = new Set<number>(),
                labels = new Set<string>();
            let ticks = 0;
            while (f.current().main.mode instanceof MapMode) {
                const m = f.current().main,
                    mode = m.mode;
                check(mode instanceof MapMode, "MAP owner");
                check(isSupportedGameStateSnapshot(f.capture()), "live MAP accepted: " + JSON.stringify(f.capture()));
                phases.add(mode.state);
                const candidates = [
                    mode.state === 0 ? "entrance" : "",
                    mode.state === 2 && m.friendlySoldiersPickedUp === 10 && mode.soldierDelay === 1 ? "before-award" : "",
                    m.score === 21999 && m.friendlySoldiersPickedUp === 9 ? "after-award" : "",
                    mode.jeepY === mode.targetJeepY && m.friendlySoldiersPickedUp > 0 ? "target-with-pows" : "",
                    mode.state === 3 && mode.delay === 1 ? "song-wait" : "",
                    mode.state === 4 && m.fadeIndex === 0 ? "exit-fade-start" : "",
                    mode.state === 4 && m.fadeIndex === 21 ? "exit-fade-end" : ""
                ];
                for (const label of candidates)
                    if (label && !labels.has(label)) {
                        labels.add(label);
                        evidence.push(await f.roundtrip(`MAP:${stage}:${label}`));
                        f.render();
                        check(
                            f.textCalls.some((c) => c.x === 704 && c.y === 256 && c.text === String(f.current().main.score).padStart(6, "0")),
                            "MAP actual score row"
                        );
                    }
                const active = f.current().main;
                if (labels.has("song-wait") && active.currentSong === active.cutsceneSong && active.cutsceneSong.playing) {
                    const music = active.cutsceneSong.intro;
                    check(music, "real MAP song");
                    music.restorePlaybackState({ ...music.capturePlaybackState(), transport: "ended-pending" });
                    runtime.slick.Music.poll(0); // Container dispatches backend completion before Main.update.
                }
                f.tick();
                check(++ticks < 3000, "finite loaded MAP transition");
            }
            const next = f.current().main;
            check(next.mode instanceof GameMode && next.stageIndex === stage + 1, "actual next-stage GameMode initialized");
            check(next.score === 39999 && next.extraLives === 3 && next.friendlySoldiersPickedUp === 0, "POW total and exactly one 20k award");
            check(JSON.stringify([...phases].sort()) === "[0,1,2,3,4]", "all MAP phases observed");
            for (const label of ["entrance", "before-award", "after-award", "song-wait", "exit-fade-start", "exit-fade-end"])
                check(labels.has(label), "MAP expected boundary " + label);
            if (stage === 0) check(labels.has("target-with-pows"), "MAP target reached with POWs remaining");
            check(JSON.stringify(CutsceneSequence.captureState()) === '["WE_MADE_IT","HERE"]', "MAP does not consume cutscene bag");
            evidence.push({ stage, ticks, nextStage: next.stageIndex, score: next.score, lives: next.extraLives, labels: [...labels] });
        }
        Reflect.set(window, "mapCounterEvidence", evidence);
    } finally {
        f.dispose();
    }
}

export async function verifyHealthyFinalBossScorePresentation(runtime: PreparedRuntime): Promise<void> {
    const f = await createEndingVerification(runtime),
        evidence: unknown[] = [];
    try {
        for (const startScore of [123450, 1000000])
            for (const hard of [false, true]) {
                await f.mount(false);
                const { main, container } = f.current();
                main.startPlayer();
                main.stageIndex = 5;
                main.hardMode = hard;
                main.requestMode(Modes.GAME, container);
                for (let n = 0; n < 500 && (main.fading || !(main.mode instanceof GameMode) || !main.mode.playing); n++) f.tick();
                check(main.mode instanceof GameMode && main.mode.playing && !main.fading, "healthy loaded stage5");
                const world = main.mode;
                // Seed the final-hit boundary, retaining the actual boss, missile, cleanup and ending producers.
                for (const list of world.elements) list.clear();
                world.enemies.clear();
                world.solids.clear();
                world.mines.clear();
                world.cameraX = 512;
                world.cameraY = world.maxCameraY = 0;
                world.triggerY = 0;
                world.bossCameraPan = false;
                world.endingCameraPan = false;
                world.cameraPanListener = null!;
                world.player.x = 1450;
                world.player.y = 700;
                world.player.invincible = 0;
                main.score = startScore;
                main.friendlySoldiersPickedUp = 3;
                main.extraLives = 4;
                main.reconcileStateAfterRestore();
                const ledger: number[] = [],
                    add = main.addPoints.bind(main);
                main.addPoints = (points) => {
                    ledger.push(points);
                    add(points);
                };
                const tank = new BossSuperTank(800, 400);
                tank.state = BossSuperTank.STATE_STOPPED;
                tank.hits = BossSuperTank.HITS_EXPLODE - 1;
                const missile = new PlayerMissile(tank.x + (tank.hitX1 + tank.hitX2) / 2, tank.y + (tank.hitY1 + tank.hitY2) / 2 + 10, 270, 0);
                missile.update();
                check(missile.removeFlag && tank.state === BossSuperTank.STATE_EXPLODING, "actual healthy final missile hit");
                let ticks = 0;
                while (main.mode === world) {
                    check(world.player.respawning === 0, "healthy control never registers death");
                    if (
                        main.currentSong === main.cutsceneSong &&
                        [...world.elements[0]].some((e) => e instanceof FlashingSkull && e.state === FlashingSkull.STATE_PAUSED)
                    ) {
                        const music = main.cutsceneSong.intro;
                        check(music, "cutscene backend notification");
                        music.restorePlaybackState({ ...music.capturePlaybackState(), transport: "ended-pending" });
                        runtime.slick.Music.poll(0); // Container dispatches backend completion before Main.update.
                    }
                    f.tick();
                    check(++ticks < 5000, "healthy final completion bounded");
                }
                check(main.mode instanceof SunsetMode, "healthy final enters actual Sunset");
                const total = startScore + ledger.reduce((sum, p) => sum + p, 0),
                    text = "final score: " + String(total).padStart(6, "0");
                check(ledger.length > 0 && main.score === total && main.scoreStr === String(total).padStart(6, "0"), "independent actual award ledger");
                check(main.mode.credits.at(-1)?.[0] === text, "healthy boss completion ending text");
                f.render();
                if (hard) {
                    while (main.mode instanceof SunsetMode) {
                        f.tick();
                        check(++ticks < 20000, "hard ending natural transition");
                    }
                    const ending = f.current().main.mode;
                    check(ending instanceof HardEndingMode, "actual hard ending reached");
                    check(ending.finalScore === text && ending.finalScoreX === (1024 - text.length * 32) >> 1, "hard final text and full-width centering");
                    f.render();
                }
                check(world.player.respawning === 0 && main.score === total, "no death, restore or duplicated score in healthy control");
                evidence.push({ startScore, hard, pows: 3, ledger, total, text, ticks });
            }
        check(evidence.length === 4, "healthy final scenario manifest");
        Reflect.set(window, "healthyFinalEvidence", evidence);
    } finally {
        f.dispose();
    }
}
