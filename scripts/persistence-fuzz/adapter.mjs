/* global document, location */
import { JackalRuntimeLoader } from "/src/app/JackalRuntimeLoader.ts";
import { beginGameAudio, commitGameAudio, releaseGameAudio } from "/src/app/PlaybackSession.ts";
import { JackalGameStateSerializer } from "/src/jackal/persistence/JackalGameStateSerializer.ts";
import { GAME_STATE_STORAGE_KEY } from "/src/jackal/persistence/GameStateSchema.ts";
import { getDeploymentStorageKey } from "/src/app/DeploymentStorageKeys.ts";
import { Modes } from "/src/jackal/Modes.ts";
import { GameMode } from "/src/jackal/GameMode.ts";
import { random } from "./prng.mjs";

export const gameId = "jackal-js";
export const key = getDeploymentStorageKey(GAME_STATE_STORAGE_KEY);
export const debugKey = getDeploymentStorageKey("jackal.debug-invalid-save");
export const serializer = new JackalGameStateSerializer();
export { beginGameAudio, commitGameAudio, releaseGameAudio };
export async function mount(restore, version) {
    const runtime = await new JackalRuntimeLoader(() => {}).ensurePrepared();
    const store = new runtime.JackalGameStateStore(version);
    const host = document.querySelector("#game-host");
    runtime.slick.Display.setParent(host);
    const main = new runtime.Main();
    main.reserveBrowserRuntime();
    const game = new runtime.slick.BufferedScalableGame(main, runtime.Main.DISPLAY_WIDTH, runtime.Main.DISPLAY_HEIGHT, {
        maintainAspect: true,
        scalingMode: runtime.slick.BufferedScalingMode.Nearest
    });
    const container = new runtime.slick.AppGameContainer(game, 800, 750, false);
    container.setPreserveAudioCacheOnDestroy(true);
    container.setLoopSuspended(true);
    if (restore)
        main.loadingCompleteHandler = (gc) => {
            if (!store.restore(main, gc)) throw new Error("RESTORE_REJECTED");
            return true;
        };
    await container.start();
    await runtime.slick.ResourceLoader.waitForAll();
    return { main, container, game, store, runtime };
}
export function seed(mounted, spec, step) {
    const { main, container } = mounted;
    main.startPlayer();
    main.hardMode = spec.hard;
    main.stageIndex = spec.stage;
    main.random.setSeed(spec.gameSeed);
    main.requestMode(Modes.GAME, container);
    const world = main.mode;
    if (!(world instanceof GameMode)) throw new Error("SETUP: GameMode not established");

    // Do not bypass Chinook/PLAYER creation or reassign camera/trigger counters.
    let callbacks = 0;
    while (!world.playing && callbacks++ < 2000) step({ mask: 0, deltaMs: 10, renderCount: 1 }, "setup-producer");
    if (!world.playing || main.mode !== world) throw new Error("SETUP: normal player introduction did not complete");
    if (spec.lane === "natural")
        return { strategy: "natural-entry", introductionCallbacks: callbacks, stage: world.stageIndex, x: world.player.x, y: world.player.y };
    const rng = random(spec.setupSeed);
    let requested = null;
    const fits = (x, y) => {
        if (!world.isDriveableBounds(x - 32, y - 32, x + 32, y + 32)) return false;
        for (let dx = -32; dx <= 32; dx += 16) for (let dy = -32; dy <= 32; dy += 16) if (!world.isDriveable(x + dx, y + dy)) return false;
        return true;
    };
    for (let attempt = 0; attempt < 8192; attempt++) {
        const x = 32 + rng.int(world.mapWidth * 32 - 64),
            y = 32 + rng.int(world.mapHeight * 32 - 64);
        if (fits(x, y)) {
            requested = { x, y };
            break;
        }
    }
    if (!requested) throw new Error("SETUP: no driveable jeep footprint found");
    // Walk the camera prefix through production tracking/trigger methods before
    // a near-top destination can produce the negative-row early return.
    const prefix = [];
    for (let y = world.player.y; y > requested.y; y -= 32) {
        let x = world.player.x;
        if (!fits(x, y)) {
            x = null;
            for (let candidate = 32; candidate <= world.mapWidth * 32 - 32; candidate += 16)
                if (fits(candidate, y)) {
                    x = candidate;
                    break;
                }
        }
        if (x === null) continue;
        world.player.x = Math.fround(x);
        world.player.y = Math.fround(y);
        world.cameraTrackPlayer();
        world.processTriggers();
        prefix.push({ cameraY: world.cameraY, triggerY: world.triggerY });
    }
    world.player.x = Math.fround(requested.x);
    world.player.y = Math.fround(requested.y);
    // Production methods own camera progress and all skipped trigger creation.
    world.cameraTrackPlayer();
    world.processTriggers();
    return {
        strategy: "forward-trigger-catch-up",
        requested,
        prefix,
        x: world.player.x,
        y: world.player.y,
        cameraX: world.cameraX,
        cameraY: world.cameraY,
        triggerY: world.triggerY,
        stage: world.stageIndex,
        introductionCallbacks: callbacks,
        origin: location.origin
    };
}
export function retire(mounted) {
    mounted.main.stopAllSounds();
    mounted.main.disposeBrowserRuntime();
    mounted.container.destroy();
    mounted.runtime.slick.Display.setParent(null);
}
import { isSupportedGameStateSnapshot } from "/src/jackal/persistence/GameStateSnapshotValidator.ts";
import { isSupportedSnapshotForLoadedResources } from "/src/jackal/persistence/GameStateResourcePreflight.ts";
export function validate(main, snapshot) {
    if (!isSupportedGameStateSnapshot(snapshot)) return "structure-and-graph";
    return isSupportedSnapshotForLoadedResources(main, snapshot) ? null : "loaded-resources";
}

import { getEntityDurableFieldDescriptor, isEntityDurableFields, PLAYER_DURABLE_FIELD_DESCRIPTOR } from "/src/jackal/persistence/GameStateFieldPolicies.ts";
/** Failure-only description of the real policy, never an acceptance oracle. */
export function diagnose(_main, snapshot, stage) {
    function numbers(ownerType, fields, descriptor, path) {
        for (const [field, policy] of Object.entries(descriptor)) {
            if (policy.kind !== "number") continue;
            const value = fields?.[field];
            let ruleCode = null;
            if (typeof value !== "number" || !Number.isFinite(value)) ruleCode = "finite-number";
            else if (policy.integer && !Number.isSafeInteger(value)) ruleCode = "safe-integer";
            else if (policy.allowedValues && !policy.allowedValues.includes(value)) ruleCode = "explicit-enum";
            else if ((policy.min !== undefined && value < policy.min) || (policy.max !== undefined && value > policy.max)) ruleCode = "explicit-range";
            if (ruleCode) return { ownerType, path: `${path}.${field}`, ruleCode, observed: value, expected: policy };
        }
        return null;
    }
    if (snapshot.gameMode) {
        const player = numbers("Player", snapshot.playerFields, PLAYER_DURABLE_FIELD_DESCRIPTOR, "playerFields");
        if (player) return player;
        const types = new Map(snapshot.gameMode.entities.map((entity) => [entity.id, entity.type]));
        for (let index = 0; index < snapshot.gameMode.entities.length; index++) {
            const entity = snapshot.gameMode.entities[index],
                path = `gameMode.entities[${index}].fields`;
            const detail = numbers(entity.type, entity.fields, getEntityDurableFieldDescriptor(entity.type), path);
            if (detail) return detail;
            if (!isEntityDurableFields(entity.type, entity.fields, types)) return { ownerType: entity.type, path, ruleCode: "entity-fields" };
        }
    }
    return { ownerType: String(snapshot.modeId ?? snapshot.kind), ruleCode: stage };
}

// Benchmark substitution of only the extra resource preflight in the CURRENT stack.
export function validateBaseline(main, snapshot) {
    if (!isSupportedGameStateSnapshot(snapshot)) return "structure-and-graph";
    return null;
}

export function observedStratum({ main }) {
    return { stage: main.stageIndex, world: 0, hard: main.hardMode };
}

export { captureContext, transitionProjection } from "./transitions.mjs";
export function instrument({ main }, observer) {
    const world = main.mode;
    if (!(world instanceof GameMode)) return;
    observer.actor(world.player, true);
    observer.input(main.input);
    for (const list of world.elements ?? [])
        for (let i = 0; i < list.size(); i++) {
            const actor = list.get(i);
            if (!actor.removeFlag) observer.actor(actor);
        }
}

export function prepareTransitionControls({ main }) {
    main.requestSong(main.stageSong0);
    main.updateMusic();
}
export function transitionControls({ main, container }) {
    const pause = () => {
        const input = main.mode.input,
            original = input.isPause;
        input.isPause = () => true;
        try {
            main.mode.update(container);
        } finally {
            input.isPause = original;
        }
    };
    return [
        ["music-pause", pause],
        ["music-resume", pause],
        ["voice-start", () => main.fireSound.play()],
        ["voice-stop", () => main.fireSound.stop()],
        ["stage-completion", () => main.mode.stageCompleted()],
        ["mode-handoff", () => main.mode.fadeCompleted()]
    ];
}
