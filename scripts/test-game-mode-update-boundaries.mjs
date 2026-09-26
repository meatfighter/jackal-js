import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const root = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n");

// Execute the current repository method, not a hand-written copy of its branches.
// Dependencies are controlled fixtures; full-class/browser integration is separate.
function loadTsUpdate() {
    const source = ts.createSourceFile("GameMode.ts", read("pwa/src/jackal/GameMode.ts"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const cls = source.statements.find((node) => ts.isClassDeclaration(node) && node.name?.text === "GameMode");
    assert.ok(cls, "GameMode class missing");
    const methods = cls.members.filter((node) => ts.isMethodDeclaration(node) && node.name.getText(source) === "update");
    assert.equal(methods.length, 1, "Expected one GameMode.update");
    const code = ts.transpileModule(`class Subject { ${methods[0].getText(source)} }\nSubject.prototype.update;`, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
        reportDiagnostics: true
    });
    assert.equal((code.diagnostics ?? []).filter((d) => d.category === ts.DiagnosticCategory.Error).length, 0);
    return vm.runInNewContext(
        code.outputText,
        {
            javaFloat: Math.fround,
            javaInt: Math.trunc,
            GameMode: { WATER_ALPHAS_PERIOD: 136, CONVEYOR_SPEED: Math.fround(2 / 3), BOSS_PAN_CAMERA_SPEED: 4, ENDING_PAN_CAMERA_SPEED: 2, REMOVE_BOUND: 1536 }
        },
        { timeout: 1000 }
    );
}

const updateTs = loadTsUpdate();
function tsFixture() {
    const calls = { pause: 0, resume: 0, sound: 0, reset: 0, triggers: 0, entity: 0, bounds: 0, player: 0, camera: 0, fade: 0 };
    const flags = { pause: false, song: true, transfer: false };
    const element = {
        removeFlag: false,
        changeLayerValue: -1,
        layer: 0,
        checkBounds() {
            calls.bounds++;
        },
        update() {
            calls.entity++;
        }
    };
    const main = {
        mode: null,
        currentSong: {
            pause() {
                calls.pause++;
            },
            resume() {
                calls.resume++;
            }
        },
        isSongPlaying() {
            return flags.song;
        },
        playSound() {
            calls.sound++;
        },
        resetNextFrameTime() {
            calls.reset++;
        },
        startFade() {
            calls.fade++;
        }
    };
    const world = {
        main,
        paused: false,
        playing: true,
        stageCompletedFlag: false,
        stageCompletedDelay: 1,
        stageIndex: 0,
        waterAlphaIndex: 0,
        bossCameraPan: false,
        endingCameraPan: false,
        maxCameraY: 1000,
        input: {
            isPause() {
                return flags.pause;
            }
        },
        elements: Array.from({ length: 8 }, (_, i) => ({
            size() {
                return i === 0 ? 1 : 0;
            },
            get() {
                return element;
            }
        })),
        processTriggers() {
            calls.triggers++;
        },
        cameraTrackPlayer() {
            calls.camera++;
        },
        player: {
            respawning: 0,
            update() {
                calls.player++;
                if (flags.transfer) main.mode = {};
            }
        }
    };
    main.mode = world;
    return {
        world,
        flags,
        calls,
        tick() {
            updateTs.call(world, {});
        }
    };
}
function assertNoWorldWork(f) {
    for (const key of ["triggers", "bounds", "entity", "player", "camera", "fade"]) assert.equal(f.calls[key], 0, `Unexpected ${key}`);
    assert.equal(f.world.waterAlphaIndex, 0, "Paused tick advanced water animation");
    assert.equal(f.world.stageCompletedDelay, 1);
}

test("TS pause entry, waiting, and unpause all terminate before simulation", () => {
    const f = tsFixture();
    f.flags.pause = true;
    f.tick();
    assert.equal(f.world.paused, true);
    assertNoWorldWork(f);
    assert.deepEqual([f.calls.pause, f.calls.sound, f.calls.reset], [1, 1, 1]);
    f.flags.pause = false;
    f.tick();
    assertNoWorldWork(f);
    assert.equal(f.calls.reset, 2);
    f.flags.pause = true;
    f.tick();
    assert.equal(f.world.paused, false);
    assert.equal(f.calls.resume, 1);
    assert.equal(f.calls.reset, 3);
    assertNoWorldWork(f);
    f.flags.pause = false;
    f.tick();
    for (const key of ["triggers", "bounds", "entity", "player", "camera"]) assert.equal(f.calls[key], 1);
    assert.equal(f.world.waterAlphaIndex, 1);
});

test("TS ignores pause when music, playing, or stage-completion policy disallows it", () => {
    for (const reason of ["silent", "not-playing", "completed"]) {
        const f = tsFixture();
        f.flags.pause = true;
        if (reason === "silent") f.flags.song = false;
        if (reason === "not-playing") f.world.playing = false;
        if (reason === "completed") f.world.stageCompletedFlag = true;
        f.tick();
        assert.equal(f.world.paused, false, reason);
        assert.equal(f.calls.pause + f.calls.sound + f.calls.reset, 0, reason);
        assert.equal(f.calls.triggers, 1, reason);
        assert.equal(f.calls.entity, 1, reason);
        assert.equal(f.calls.player, reason === "not-playing" ? 0 : 1, reason);
    }
});

test("TS player ownership transfer stops camera and fade tail", () => {
    const f = tsFixture();
    f.flags.transfer = true;
    // Deliberate caller-invariant fixture, not a claim that natural final death
    // and stage completion currently occur together.
    f.world.stageCompletedFlag = true;
    f.tick();
    assert.notEqual(f.world.main.mode, f.world);
    assert.equal(f.calls.triggers, 1); // Legal work preceding the transfer.
    assert.equal(f.calls.entity, 1);
    assert.equal(f.calls.player, 1);
    assert.equal(f.calls.camera, 0);
    assert.equal(f.calls.fade, 0);
    assert.equal(f.world.stageCompletedDelay, 1);
    const control = tsFixture();
    control.world.stageCompletedFlag = true;
    control.tick();
    assert.equal(control.calls.camera, 1);
    assert.equal(control.calls.fade, 1);
    assert.equal(control.world.stageCompletedDelay, 0);
});

function javaUpdate() {
    const source = read("desktop/src/jackal/GameMode.java");
    const starts = [...source.matchAll(/public\s+void\s+update\(GameContainer gc\)\s+throws\s+SlickException\s*\{/g)];
    assert.equal(starts.length, 1, "Expected one Java GameMode.update anchor");
    const start = starts[0].index;
    const end = source.indexOf("  private void drawBackground()", start);
    assert.ok(end > start, "Java update end anchor moved; review extraction rather than skipping it");
    return source.slice(start, end).trim();
}

test("Java executes the repository GameMode.update pause and ownership boundaries", (t) => {
    for (const command of ["javac", "java"]) {
        const probe = spawnSync(command, ["-version"], { encoding: "utf8", timeout: 15000 });
        if (probe.error?.code === "ENOENT") {
            t.skip("JDK unavailable; this skip is NOT final qualification acceptance");
            return;
        }
        assert.equal(probe.status, 0, `${command}: ${probe.error ?? probe.stderr}`);
    }
    const directory = mkdtempSync(join(tmpdir(), "jackal-update-boundary-"));
    try {
        const source = `
import java.util.ArrayList;
class SlickException extends Exception { private static final long serialVersionUID = 1L; }
class GameContainer { int off, on; void setMusicOn(boolean value) { if (value) on++; else off++; } }
class GameElement {
  boolean remove, enemy; int changeLayer = -1, layer; GameMode owner;
  void checkBounds(float y) { owner.bounds++; }
  void update() { owner.entities++; }
}
class Enemy extends GameElement { boolean solid, mine; }
class Song { boolean lastLifeSuspended; }
class Main {
  Song currentSong;
  Object mode, pauseSound = new Object(); Object[] conveyors = new Object[16];
  boolean song = true; int resets, sounds, fades, extraLives;
  boolean isSongPlaying() { return song; }
  void playSound(Object sound) { sounds++; }
  void resetNextFrameTime() { resets++; }
  void startFade(boolean out, GameMode mode) { fades++; }
}
class Input { boolean pause; boolean isPause() { return pause; } }
class Player {
  GameMode owner; boolean transfer; int respawning;
  void update() { owner.players++; if (transfer) owner.main.mode = new Object(); }
}
class PanListener { void panComplete() {} }
class GameMode {
  static final int WATER_ALPHAS_PERIOD = 136, BOSS_PAN_CAMERA_SPEED = 4, ENDING_PAN_CAMERA_SPEED = 2, REMOVE_BOUND = 1536;
  static final float CONVEYOR_SPEED = 2f / 3f;
  Main main = new Main(); Input input = new Input(); Player player = new Player(); PanListener cameraPanListener = new PanListener();
  boolean paused, stageCompleted, bossCameraPan, endingCameraPan, playing = true;
  int waterAlphaIndex, stageIndex, conveyorLastIndex, stageCompletedDelay = 1;
  float conveyorOffset, conveyorDelta, cameraX, cameraY, maxCameraY = 1000;
  Object[] tiles = new Object[16];
  ArrayList<Enemy> enemies = new ArrayList<>(), solids = new ArrayList<>(), mines = new ArrayList<>();
  @SuppressWarnings("unchecked") ArrayList<GameElement>[] elements = new ArrayList[8];
  int triggers, bounds, entities, players, cameras;
  GameMode() {
    main.mode = this; player.owner = this;
    for (int i = 0; i < elements.length; i++) elements[i] = new ArrayList<>();
    GameElement element = new GameElement(); element.owner = this; elements[0].add(element);
  }
  void processTriggers() { triggers++; }
  void cameraTrackPlayer() { cameras++; }
  ${read("desktop/src/jackal/GameMode.java").match(/private boolean isBossEntryBlockedByDeath\(\) \{[\s\S]*?\n {2}\}/)[0]}
  ${javaUpdate()}
}
public final class GameModeBoundaryHarness {
  static void require(boolean ok, String message) { if (!ok) throw new AssertionError(message); }
  static void frozen(GameMode w) {
    require(w.triggers + w.bounds + w.entities + w.players + w.cameras + w.main.fades == 0, "World work after pause");
    require(w.waterAlphaIndex == 0 && w.stageCompletedDelay == 1, "World timer after pause");
  }
  public static void main(String[] args) throws SlickException {
    GameContainer gc = new GameContainer(); GameMode w = new GameMode();
    w.input.pause = true; w.update(gc);
    require(w.paused && gc.off == 1 && w.main.sounds == 1, "Pause entry policy"); frozen(w);
    require(w.main.resets == 1, "Pause entry clock");
    w.input.pause = false; w.update(gc); frozen(w);
    require(w.main.resets == 2, "Pause wait clock");
    w.input.pause = true; w.update(gc); frozen(w);
    require(!w.paused && gc.on == 1 && w.main.resets == 3, "Unpause boundary");
    w.input.pause = false; w.update(gc);
    require(w.triggers == 1 && w.bounds == 1 && w.entities == 1 && w.players == 1 && w.cameras == 1 && w.waterAlphaIndex == 1, "Normal gameplay after unpause");
    for (int reason = 0; reason < 3; reason++) {
      w = new GameMode(); w.input.pause = true;
      if (reason == 0) w.main.song = false;
      if (reason == 1) w.playing = false;
      if (reason == 2) w.stageCompleted = true;
      w.update(gc);
      require(!w.paused && w.main.resets == 0 && w.main.sounds == 0 && w.triggers == 1 && w.entities == 1, "Disallowed pause changed policy");
      require(w.players == (reason == 1 ? 0 : 1), "Disallowed pause changed player path");
    }
    w = new GameMode(); w.player.transfer = true; w.stageCompleted = true; w.update(gc);
    require(w.main.mode != w && w.triggers == 1 && w.entities == 1 && w.players == 1, "Missing transfer/pre-transfer work");
    require(w.cameras == 0 && w.main.fades == 0 && w.stageCompletedDelay == 1, "Stale GameMode tail");
    w = new GameMode(); w.stageCompleted = true; w.update(gc);
    require(w.cameras == 1 && w.main.fades == 1 && w.stageCompletedDelay == 0, "Normal stage-completion tail changed");
    for(int playingCase=0;playingCase<2;playingCase++){
      w=new GameMode();w.playing=playingCase==1;w.stageCompleted=true;w.stageCompletedDelay=3;
      w.update(gc);require(w.stageCompletedDelay==2&&w.main.fades==0,"Early fade");
      w.update(gc);require(w.stageCompletedDelay==1&&w.main.fades==0,"Early fade");
      for(int i=0;i<40;i++){w.update(gc);require(w.stageCompletedDelay==0&&w.main.fades==1,"Completion counter underflow/restart");}
    }
    w=new GameMode();w.stageCompletedDelay=3;for(int i=0;i<40;i++)w.update(gc);require(w.stageCompletedDelay==3&&w.main.fades==0,"Nonterminal countdown");
    System.out.println("PASS Java pause and mode ownership boundaries");
  }
}
`;
        const file = join(directory, "GameModeBoundaryHarness.java");
        writeFileSync(file, source, "utf8");
        const compile = spawnSync("javac", ["-encoding", "UTF-8", "-d", directory, file], { encoding: "utf8", timeout: 60000 });
        assert.equal(compile.status, 0, `${compile.error ?? ""}\n${compile.stdout}\n${compile.stderr}`);
        const run = spawnSync("java", ["-cp", directory, "GameModeBoundaryHarness"], { encoding: "utf8", timeout: 30000 });
        assert.equal(run.status, 0, `${run.error ?? ""}\n${run.stdout}\n${run.stderr}`);
        assert.equal(run.stdout.trim(), "PASS Java pause and mode ownership boundaries");
    } finally {
        rmSync(directory, { recursive: true, force: true });
    }
});

test("TS stage completion saturates and starts only one fade", () => {
    for (const playing of [false, true]) {
        const f = tsFixture();
        f.world.playing = playing;
        f.world.stageCompletedFlag = true;
        f.world.stageCompletedDelay = 3;
        f.tick();
        assert.equal(f.world.stageCompletedDelay, 2);
        assert.equal(f.calls.fade, 0);
        f.tick();
        assert.equal(f.world.stageCompletedDelay, 1);
        assert.equal(f.calls.fade, 0);
        for (let i = 0; i < 40; i++) {
            f.tick();
            assert.equal(f.world.stageCompletedDelay, 0);
            assert.equal(f.calls.fade, 1);
        }
    }
    const f = tsFixture();
    f.world.stageCompletedDelay = 3;
    for (let i = 0; i < 40; i++) f.tick();
    assert.equal(f.world.stageCompletedDelay, 3);
    assert.equal(f.calls.fade, 0);
});
