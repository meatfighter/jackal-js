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
    const runtimeFieldsUrl = compileModule(source("EntityRuntimeFields.ts").replace(`from "./GameElementTypeIds.js"`, `from "${idsUrl}"`));
    const validatorUrl = compileModule(
        source("GameStateSnapshotValidator.ts")
            .replace(`from "slick2d-ts"`, `from "${slickModuleUrl}"`)
            .replace(`from "../../java/MainConstants.js"`, `from "${mainConstantsUrl}"`)
            .replace(`from "../AudioRegistry.js"`, `from "${audioRegistryUrl}"`)
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
            loadIndex: 42,
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
        audioState: { musicOn: true, soundOn: true, sounds: [], cooldowns: [] }
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
        modeFields: encodedFields(fields.INPUT_MODE_FIELD_NAMES),
        modeExtra: {
            input: {
                menu: null,
                draftButtonMapping: null,
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
            fields: encodedFields(fields.GAME_MODE_FIELD_NAMES),
            elements: [[entity.id], [], [], [], [], [], [], []],
            entities: [entity]
        },
        playerFields: {}
    };
}

test("save-state validator accepts only the current schema", async () => {
    const { schema, fields, validator } = await loadPersistenceValidation();
    const currentVersion = schema.GAME_STATE_VERSION;
    assert.equal(currentVersion, 13);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, currentVersion)), true);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, 12)), false);
    assert.equal(validator.isSupportedGameStateSnapshot(modeSnapshot(fields, currentVersion + 1)), false);

    const invalidSeed = modeSnapshot(fields, currentVersion);
    invalidSeed.random.seed2 = 65536;
    assert.equal(validator.isSupportedGameStateSnapshot(invalidSeed), false);
});

test("save-state validator rejects corrupt but superficially shaped state", async () => {
    const { schema, fields, validator } = await loadPersistenceValidation();
    const currentVersion = schema.GAME_STATE_VERSION;

    const extraTopLevelField = modeSnapshot(fields, currentVersion);
    extraTopLevelField.unexpected = true;
    assert.equal(validator.isSupportedGameStateSnapshot(extraTopLevelField), false);

    const badTimestamp = modeSnapshot(fields, currentVersion);
    badTimestamp.savedAt = "not-a-date";
    assert.equal(validator.isSupportedGameStateSnapshot(badTimestamp), false);

    const badAudioShape = modeSnapshot(fields, currentVersion);
    badAudioShape.audioState.extra = true;
    assert.equal(validator.isSupportedGameStateSnapshot(badAudioShape), false);

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

    const impossibleInput = inputModeSnapshot(fields, currentVersion);
    impossibleInput.modeExtra.input.assignedKeys = new Array(65).fill(1);
    assert.equal(validator.isSupportedGameStateSnapshot(impossibleInput), false);

    const unsafeVelocity = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: { vx: 10001 }, runtimeFields: null });
    assert.equal(validator.isSupportedGameStateSnapshot(unsafeVelocity), false);

    const mismatchedStage = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null });
    mismatchedStage.gameMode.fields.stageIndex = 1;
    assert.equal(validator.isSupportedGameStateSnapshot(mismatchedStage), false);
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
    tooManyVoices.audioState.sounds = [{
        id: "explodeSound",
        playback: { voices: new Array(63).fill(null).map(() => soundVoice()), activeVoiceIndex: 62 }
    }];
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
    const { schema, fields, runtimeFields, validator } = await loadPersistenceValidation();
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
