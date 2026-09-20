import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const slickModuleUrl = import.meta.resolve("slick2d-ts");

function compileModule(source) {
    const output = ts.transpileModule(source, {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
    }).outputText;
    return `data:text/javascript;base64,${Buffer.from(output).toString("base64")}`;
}

function source(name) {
    return readFileSync(new URL(`../pwa/src/jackal/persistence/${name}`, import.meta.url), "utf8");
}

async function loadPersistenceValidation() {
    const schemaUrl = compileModule(source("GameStateSchema.ts"));
    const idsUrl = compileModule(source("GameElementTypeIds.ts"));
    const fieldsUrl = compileModule(source("GameStateFields.ts"));
    const audioRegistryUrl = compileModule(readFileSync(new URL("../pwa/src/jackal/AudioRegistry.ts", import.meta.url), "utf8"));
    const mainConstantsUrl = compileModule("export class MainConstants { static MINIMUM_SOUND_TIME = 125; }");
    const buttonMappingUrl = compileModule("export class ButtonMapping { static NO_BINDING = -1; }");
    const inputModeUrl = compileModule(`
        export class InputMode {
            static STATE_FADE_IN = 0;
            static STATE_MENU = 1;
            static STATE_READING = 2;
            static STATE_READ_FADE = 3;
            static STATE_FADE_OUT = 4;
            static STATE_DONE = 5;
            static STATE_SAVED = 6;
            static OPTION_CHANGE = 0;
            static OPTION_RESET = 1;
            static OPTION_DONE = 2;
            static FADE_TIME = 11;
            static DONE_DELAY = 30;
            static ARM_DELAY = 8;
            static GAMEPAD_BUTTON_INDEX_LIMIT = 64;
            static ACTIONS = [0, 1, 2, 3, 4, 5, 6];
        }
    `);
    const runtimeFieldsUrl = compileModule(source("EntityRuntimeFields.ts").replace(`from "./GameElementTypeIds.js"`, `from "${idsUrl}"`));
    const validatorUrl = compileModule(
        source("GameStateSnapshotValidator.ts")
            .replace(`from "slick2d-ts"`, `from "${slickModuleUrl}"`)
            .replace(`from "../../java/MainConstants.js"`, `from "${mainConstantsUrl}"`)
            .replace(`from "../AudioRegistry.js"`, `from "${audioRegistryUrl}"`)
            .replace(`from "../ButtonMapping.js"`, `from "${buttonMappingUrl}"`)
            .replace(`from "../InputMode.js"`, `from "${inputModeUrl}"`)
            .replace(`from "./GameStateSchema.js"`, `from "${schemaUrl}"`)
            .replace(`from "./GameElementTypeIds.js"`, `from "${idsUrl}"`)
            .replace(`from "./EntityRuntimeFields.js"`, `from "${runtimeFieldsUrl}"`)
            .replace(`from "./GameStateFields.js"`, `from "${fieldsUrl}"`)
    );
    const [schema, fields, runtimeFields, validator] = await Promise.all([
        import(schemaUrl),
        import(fieldsUrl),
        import(runtimeFieldsUrl),
        import(validatorUrl)
    ]);
    return { schema, fields, runtimeFields, validator };
}

function encodedFields(names, overrides = {}) {
    return Object.assign(Object.fromEntries(names.map((name) => [name, 0])), overrides);
}

function playback(overrides = {}) {
    return {
        transport: "playing",
        looped: true,
        playbackRate: 1,
        positionSeconds: 0,
        volume: 1,
        fade: null,
        ...overrides
    };
}

function soundVoice(overrides = {}) {
    return {
        looped: false,
        playbackRate: 1,
        positionSeconds: 0.05,
        gain: 1,
        spatialPosition: null,
        ...overrides
    };
}

function soundPlayback(overrides = {}) {
    return {
        voices: [soundVoice()],
        activeVoiceIndex: 0,
        ...overrides
    };
}

function baseSnapshot(fields, version) {
    return {
        version,
        appVersion: "test",
        savedAt: "2026-08-31T00:00:00.000Z",
        kind: "mode",
        mainFields: encodedFields(fields.MAIN_FIELD_NAMES, {
            stageIndex: 0,
            score: 0,
            extraLives: 0,
            missilePower: 0,
            friendlySoldiersPickedUp: 0,
            hardMode: false
        }),
        konamiCodeFields: null,
        random: { seed0: 1, seed1: 2, seed2: 3 },
        friendlySoldierCount: 0,
        requestedSongId: null,
        currentSongState: null,
        audioState: { sounds: [], cooldowns: [] }
    };
}

function modeSnapshot(fields, version) {
    return {
        ...baseSnapshot(fields, version),
        modeId: "INTRO_MAP",
        modeFields: encodedFields(fields.INTRO_MAP_MODE_FIELD_NAMES),
        modeExtra: null
    };
}

function inputModeSnapshot(fields, version) {
    return {
        ...baseSnapshot(fields, version),
        modeId: "INPUT",
        modeFields: encodedFields(fields.INPUT_MODE_FIELD_NAMES, {
            state: 2,
            nameIndex: 0,
            delay: 0,
            selectedIndex: 0,
            message: "",
            armDelay: 8
        }),
        modeExtra: {
            input: {
                menu: null,
                draftButtonMapping: {
                    fields: encodedFields(fields.BUTTON_MAPPING_FIELD_NAMES, {
                        keyUp: 200,
                        keyDown: 208,
                        keyLeft: 203,
                        keyRight: 205,
                        keyGrenade: 45,
                        keyGun: 44,
                        keyStart: 28,
                        controllerUp: 12,
                        controllerDown: 13,
                        controllerLeft: 14,
                        controllerRight: 15,
                        controllerGrenade: 0,
                        controllerGun: 2,
                        controllerStart: 9
                    })
                },
                assignedKeys: [],
                assignedControllerButtons: []
            }
        }
    };
}

function gameSnapshot(fields, version, entity) {
    return {
        ...baseSnapshot(fields, version),
        kind: "game",
        gameMode: {
            fields: encodedFields(fields.GAME_MODE_FIELD_NAMES, {
                paused: false,
                bossCameraPan: false,
                endingCameraPan: false,
                cameraPanListener: { kind: "nullRef" }
            }),
            elements: [[entity.id], [], [], [], [], [], [], []],
            entities: [entity]
        },
        playerFields: {}
    };
}

test("save-state validator accepts only the current schema", async () => {
    const { schema, fields, validator } = await loadPersistenceValidation();
    const currentVersion = schema.GAME_STATE_VERSION;
    assert.equal(currentVersion, 15);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, currentVersion)), true);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 12)), false);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, currentVersion + 1)), false);

    const invalidSeed = modeSnapshot(fields, currentVersion);
    invalidSeed.random.seed2 = 65536;
    assert.equal(validator.isSupportedGameStateSnapshot(invalidSeed), false);

    const validKonamiProgress = modeSnapshot(fields, currentVersion);
    validKonamiProgress.konamiCodeFields = { enabled: false, sequenceIndex: 7 };
    assert.equal(validator.isSupportedGameStateSnapshot(validKonamiProgress), true);

    const completedKonami = modeSnapshot(fields, currentVersion);
    completedKonami.konamiCodeFields = { enabled: true, sequenceIndex: 10 };
    assert.equal(validator.isSupportedGameStateSnapshot(completedKonami), true);

    const obsoleteKonamiLatch = modeSnapshot(fields, currentVersion);
    obsoleteKonamiLatch.konamiCodeFields = { enabled: false, sequenceIndex: 0, keyReleased: true };
    assert.equal(validator.isSupportedGameStateSnapshot(obsoleteKonamiLatch), false);

    const impossibleEnabledKonami = modeSnapshot(fields, currentVersion);
    impossibleEnabledKonami.konamiCodeFields = { enabled: true, sequenceIndex: 9 };
    assert.equal(validator.isSupportedGameStateSnapshot(impossibleEnabledKonami), false);

});

test("save-state validator rejects corrupt but superficially shaped state", async () => {
    const { schema, fields, validator } = await loadPersistenceValidation();
    const currentVersion = schema.GAME_STATE_VERSION;

    const extraTopLevelField = modeSnapshot(fields, currentVersion);
    extraTopLevelField.unexpected = true;
    assert.equal(validator.isSupportedGameStateSnapshot(extraTopLevelField), false);

    const obsoletePlayerLatch = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null });
    obsoletePlayerLatch.playerFields.fireReleased = true;
    assert.equal(validator.isSupportedGameStateSnapshot(obsoletePlayerLatch), false);

    const badTimestamp = modeSnapshot(fields, currentVersion);
    badTimestamp.savedAt = "not-a-date";
    assert.equal(validator.isSupportedGameStateSnapshot(badTimestamp), false);

    const badAudioShape = modeSnapshot(fields, currentVersion);
    badAudioShape.audioState.extra = true;
    assert.equal(validator.isSupportedGameStateSnapshot(badAudioShape), false);

    const obsoleteAudioPolicy = modeSnapshot(fields, currentVersion);
    obsoleteAudioPolicy.audioState.musicOn = false;
    obsoleteAudioPolicy.audioState.soundOn = true;
    assert.equal(validator.isSupportedGameStateSnapshot(obsoleteAudioPolicy), false);

    const missingSoundArray = modeSnapshot(fields, currentVersion);
    delete missingSoundArray.audioState.sounds;
    assert.equal(validator.isSupportedGameStateSnapshot(missingSoundArray), false);

    const oversizedBigint = modeSnapshot(fields, currentVersion);
    oversizedBigint.konamiCodeFields = { value: { kind: "bigint", value: "1".repeat(200) } };
    assert.equal(validator.isSupportedGameStateSnapshot(oversizedBigint), false);

    const oversizedArray = modeSnapshot(fields, currentVersion);
    oversizedArray.konamiCodeFields = { value: { kind: "array", items: new Array(8193).fill(0) } };
    assert.equal(validator.isSupportedGameStateSnapshot(oversizedArray), false);

    const invalidVolume = modeSnapshot(fields, currentVersion);
    invalidVolume.currentSongState = {
        id: "stageSong0",
        playing: true,
        playedIntro2: true,
        activeMusic: { id: "stageSong0.loop", playback: playback({ volume: 2 }) }
    };
    assert.equal(validator.isSupportedGameStateSnapshot(invalidVolume), false);

    const mismatchedMusic = modeSnapshot(fields, currentVersion);
    mismatchedMusic.currentSongState = {
        id: "stageSong0",
        playing: true,
        playedIntro2: true,
        activeMusic: { id: "bossSong.loop", playback: playback() }
    };
    assert.equal(validator.isSupportedGameStateSnapshot(mismatchedMusic), false);

    const validInput = inputModeSnapshot(fields, currentVersion);
    assert.equal(validator.isSupportedGameStateSnapshot(validInput), true);

    const missingInputDraft = structuredClone(validInput);
    missingInputDraft.modeExtra.input.draftButtonMapping = null;
    assert.equal(validator.isSupportedGameStateSnapshot(missingInputDraft), false);

    const inputMenuWhileReading = structuredClone(validInput);
    inputMenuWhileReading.modeExtra.input.menu = { fields: encodedFields(fields.MENU_FIELD_NAMES) };
    assert.equal(validator.isSupportedGameStateSnapshot(inputMenuWhileReading), false);

    const duplicateInputAssignments = structuredClone(validInput);
    duplicateInputAssignments.modeFields.nameIndex = 2;
    duplicateInputAssignments.modeFields.armDelay = 0;
    duplicateInputAssignments.modeExtra.input.assignedKeys = [45, 45];
    assert.equal(validator.isSupportedGameStateSnapshot(duplicateInputAssignments), false);

    const mismatchedInputAssignmentCount = structuredClone(validInput);
    mismatchedInputAssignmentCount.modeFields.nameIndex = 1;
    assert.equal(validator.isSupportedGameStateSnapshot(mismatchedInputAssignmentCount), false);

    const hiddenStaleInputAssignment = structuredClone(validInput);
    hiddenStaleInputAssignment.modeFields.nameIndex = 1;
    hiddenStaleInputAssignment.modeFields.armDelay = 0;
    hiddenStaleInputAssignment.modeExtra.input.assignedKeys = [999];
    assert.equal(validator.isSupportedGameStateSnapshot(hiddenStaleInputAssignment), false);

    const validCompletedInputAssignment = structuredClone(validInput);
    validCompletedInputAssignment.modeFields.nameIndex = 1;
    validCompletedInputAssignment.modeFields.armDelay = 0;
    validCompletedInputAssignment.modeExtra.input.assignedKeys = [200];
    assert.equal(validator.isSupportedGameStateSnapshot(validCompletedInputAssignment), true);

    const unreachableControllerAssignment = structuredClone(validInput);
    unreachableControllerAssignment.modeFields.nameIndex = 1;
    unreachableControllerAssignment.modeExtra.input.assignedControllerButtons = [64];
    assert.equal(validator.isSupportedGameStateSnapshot(unreachableControllerAssignment), false);

    const unreachableDraftController = structuredClone(validInput);
    unreachableDraftController.modeExtra.input.draftButtonMapping.fields.controllerGun = 64;
    assert.equal(validator.isSupportedGameStateSnapshot(unreachableDraftController), false);

    const impossibleReadFade = structuredClone(validInput);
    impossibleReadFade.modeFields.state = 3;
    impossibleReadFade.modeFields.delay = 0;
    impossibleReadFade.modeFields.armDelay = 0;
    impossibleReadFade.modeExtra.input.assignedKeys = [45];
    assert.equal(validator.isSupportedGameStateSnapshot(impossibleReadFade), false);

    const unsafeVelocity = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: { vx: 10001 }, runtimeFields: null });
    assert.equal(validator.isSupportedGameStateSnapshot(unsafeVelocity), false);

    const mismatchedStage = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null });
    mismatchedStage.gameMode.fields.stageIndex = 1;
    assert.equal(validator.isSupportedGameStateSnapshot(mismatchedStage), false);

    const activePanWithoutListener = gameSnapshot(fields, currentVersion, { id: 0, type: "BossSuperTank", fields: {}, runtimeFields: null });
    activePanWithoutListener.gameMode.fields.endingCameraPan = true;
    assert.equal(validator.isSupportedGameStateSnapshot(activePanWithoutListener), false);

    const activePanWithWrongListenerType = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null });
    activePanWithWrongListenerType.gameMode.fields.bossCameraPan = true;
    activePanWithWrongListenerType.gameMode.fields.cameraPanListener = { kind: "entityRef", id: 0 };
    assert.equal(validator.isSupportedGameStateSnapshot(activePanWithWrongListenerType), false);

    const activePanWithListener = gameSnapshot(fields, currentVersion, { id: 0, type: "BossSuperTank", fields: {}, runtimeFields: null });
    activePanWithListener.gameMode.fields.endingCameraPan = true;
    activePanWithListener.gameMode.fields.cameraPanListener = { kind: "entityRef", id: 0 };
    assert.equal(validator.isSupportedGameStateSnapshot(activePanWithListener), true);

    const conflictingPans = structuredClone(activePanWithListener);
    conflictingPans.gameMode.fields.bossCameraPan = true;
    assert.equal(validator.isSupportedGameStateSnapshot(conflictingPans), false);
});

test("paused GameMode requires a paused current Music transport", async () => {
    const { schema, fields, validator } = await loadPersistenceValidation();
    const currentVersion = schema.GAME_STATE_VERSION;

    const paused = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null });
    paused.gameMode.fields.paused = true;
    paused.requestedSongId = "stageSong0";
    paused.currentSongState = {
        id: "stageSong0",
        playing: true,
        playedIntro2: true,
        activeMusic: { id: "stageSong0.loop", playback: playback({ transport: "paused" }) }
    };
    assert.equal(validator.isSupportedGameStateSnapshot(paused), true);

    const pausedWithPlayingMusic = structuredClone(paused);
    pausedWithPlayingMusic.currentSongState.activeMusic.playback.transport = "playing";
    assert.equal(validator.isSupportedGameStateSnapshot(pausedWithPlayingMusic), false);

    const unpausedWithPausedMusic = structuredClone(paused);
    unpausedWithPausedMusic.gameMode.fields.paused = false;
    assert.equal(validator.isSupportedGameStateSnapshot(unpausedWithPausedMusic), false);

    const pausedWithoutPlayingSong = structuredClone(paused);
    pausedWithoutPlayingSong.currentSongState.playing = false;
    assert.equal(validator.isSupportedGameStateSnapshot(pausedWithoutPlayingSong), false);

    const standalonePausedMusic = modeSnapshot(fields, currentVersion);
    standalonePausedMusic.requestedSongId = "stageSong0";
    standalonePausedMusic.currentSongState = {
        id: "stageSong0",
        playing: true,
        playedIntro2: true,
        activeMusic: { id: "stageSong0.loop", playback: playback({ transport: "paused" }) }
    };
    assert.equal(validator.isSupportedGameStateSnapshot(standalonePausedMusic), false);
});

test("current audio state is exact, sparse and bounded", async () => {
    const { schema, fields, validator } = await loadPersistenceValidation();
    const currentVersion = schema.GAME_STATE_VERSION;

    const valid = modeSnapshot(fields, currentVersion);
    valid.audioState.sounds = [{ id: "helicopterSound", playback: soundPlayback({ voices: [soundVoice({ looped: true, positionSeconds: 1.25 })] }) }];
    valid.audioState.cooldowns = [{ id: "machineGunSound", remainingMs: 85 }];
    assert.equal(validator.isSupportedGameStateSnapshot(valid), true);

    const unknownSound = modeSnapshot(fields, currentVersion);
    unknownSound.audioState.sounds = [{ id: "unknownSound", playback: soundPlayback() }];
    assert.equal(validator.isSupportedGameStateSnapshot(unknownSound), false);

    const duplicateSound = modeSnapshot(fields, currentVersion);
    duplicateSound.audioState.sounds = [
        { id: "helicopterSound", playback: soundPlayback() },
        { id: "helicopterSound", playback: soundPlayback() }
    ];
    assert.equal(validator.isSupportedGameStateSnapshot(duplicateSound), false);

    const emptySparseSound = modeSnapshot(fields, currentVersion);
    emptySparseSound.audioState.sounds = [{ id: "helicopterSound", playback: { voices: [], activeVoiceIndex: null } }];
    assert.equal(validator.isSupportedGameStateSnapshot(emptySparseSound), false);

    const tooManyVoices = modeSnapshot(fields, currentVersion);
    tooManyVoices.audioState.sounds = [
        {
            id: "explodeSound",
            playback: { voices: new Array(63).fill(null).map(() => soundVoice()), activeVoiceIndex: 62 }
        }
    ];
    assert.equal(validator.isSupportedGameStateSnapshot(tooManyVoices), false);

    const badGain = modeSnapshot(fields, currentVersion);
    badGain.audioState.sounds = [{ id: "explodeSound", playback: soundPlayback({ voices: [soundVoice({ gain: -1 })] }) }];
    assert.equal(validator.isSupportedGameStateSnapshot(badGain), false);

    const hugePosition = modeSnapshot(fields, currentVersion);
    hugePosition.audioState.sounds = [{ id: "explodeSound", playback: soundPlayback({ voices: [soundVoice({ positionSeconds: 86_401 })] }) }];
    assert.equal(validator.isSupportedGameStateSnapshot(hugePosition), false);

    const duplicateCooldown = modeSnapshot(fields, currentVersion);
    duplicateCooldown.audioState.cooldowns = [
        { id: "machineGunSound", remainingMs: 10 },
        { id: "machineGunSound", remainingMs: 20 }
    ];
    assert.equal(validator.isSupportedGameStateSnapshot(duplicateCooldown), false);

    const unknownCooldown = modeSnapshot(fields, currentVersion);
    unknownCooldown.audioState.cooldowns = [{ id: "unknownSound", remainingMs: 10 }];
    assert.equal(validator.isSupportedGameStateSnapshot(unknownCooldown), false);

    const fractionalCooldown = modeSnapshot(fields, currentVersion);
    fractionalCooldown.audioState.cooldowns = [{ id: "machineGunSound", remainingMs: 10.5 }];
    assert.equal(validator.isSupportedGameStateSnapshot(fractionalCooldown), false);

    const excessiveCooldown = modeSnapshot(fields, currentVersion);
    excessiveCooldown.audioState.cooldowns = [{ id: "machineGunSound", remainingMs: 126 }];
    assert.equal(validator.isSupportedGameStateSnapshot(excessiveCooldown), false);
});

test("current entity runtime descriptors are required and exact", async () => {
    const { schema, fields, validator } = await loadPersistenceValidation();
    const currentVersion = schema.GAME_STATE_VERSION;
    const enemyBullet = { id: 0, type: "EnemyBullet", fields: {}, runtimeFields: { enemyBulletSprite: "yellow" } };
    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, currentVersion, enemyBullet)), true);
    assert.equal(
        validator.isSupportedGameStateSnapshot(gameSnapshot(fields, currentVersion, { id: 0, type: "EnemyBullet", fields: {}, runtimeFields: null })),
        false
    );
    assert.equal(
        validator.isSupportedGameStateSnapshot(
            gameSnapshot(fields, currentVersion, {
                id: 0,
                type: "EnemyBullet",
                fields: {},
                runtimeFields: { enemyBulletSprite: "yellow", extra: true }
            })
        ),
        false
    );
    assert.equal(validator.isSupportedGameStateSnapshot(gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null })), true);
});

test("runtime descriptor validators cover every browser-only entity asset choice", async () => {
    const { runtimeFields } = await loadPersistenceValidation();
    assert.equal(runtimeFields.isEntityRuntimeFields("EnemyBullet", { enemyBulletSprite: "cannonball" }), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("EnemyBullet", { enemyBulletSprite: "other" }), false);
    assert.equal(runtimeFields.isEntityRuntimeFields("FloorGun", { floorGunPlain: false }), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("FloorGun", { floorGunPlain: 0 }), false);
    assert.equal(runtimeFields.isEntityRuntimeFields("TileDebris", { tileDebrisSpriteTile: 17 }), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("TileDebris", { tileDebrisSpriteTile: -1 }), false);
    assert.equal(runtimeFields.isEntityRuntimeFields("Bomb", null), true);
    assert.equal(runtimeFields.isEntityRuntimeFields("Bomb", {}), false);
});
