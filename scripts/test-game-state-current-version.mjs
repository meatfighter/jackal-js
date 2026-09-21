import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";

const slickModuleUrl = import.meta.resolve("slick2d-ts");

const PLAYER_DURABLE_FIELDS = [
    "x", "y", "angle", "nextAngle", "displayAngle", "angleVelocity", "angleSteps", "diagonalDelay",
    "targetAngle", "lastTargetAngle", "fireAngle", "rumble", "invincible", "invincibleColor",
    "weaponArmed", "gunArmed", "longRange", "respawning", "pows", "releaseablePows", "inSwamp"
];
const GAME_ELEMENT_DURABLE_FIELDS = ["removeFlag", "enemy", "enemyBullet", "x", "y", "layer", "changeLayerValue"];
const HIT_ELEMENT_DURABLE_FIELDS = ["hitField", "hitX1", "hitY1", "hitX2", "hitY2", "trail", "trailIndex"];
const ENEMY_DURABLE_FIELDS = [
    "solid", "mine", "solidX1", "solidY1", "solidX2", "solidY2", "mineX1", "mineY1", "mineX2", "mineY2",
    "bulletHits", "points", "explosionX", "explosionY", "playSoundOnRemove"
];
const TEST_ENTITY_DURABLE_FIELDS = {
    Bomb: [...GAME_ELEMENT_DURABLE_FIELDS, ...HIT_ELEMENT_DURABLE_FIELDS, ...ENEMY_DURABLE_FIELDS, "vx", "vy", "scale", "angle", "t", "airplane"],
    BossSuperTank: [
        ...GAME_ELEMENT_DURABLE_FIELDS,
        ...HIT_ELEMENT_DURABLE_FIELDS,
        ...ENEMY_DURABLE_FIELDS,
        "colorIndex", "wheelAngle", "treadOffset", "vx", "targetX", "ax", "hits", "smashed", "exploding",
        "superFire", "state", "appearingDelay", "delay"
    ],
    EnemyBullet: [...GAME_ELEMENT_DURABLE_FIELDS, "travelTime", "vx", "vy"]
};
const BOOLEAN_DURABLE_FIELDS = new Set([
    "removeFlag", "enemy", "enemyBullet", "hitField", "solid", "mine", "playSoundOnRemove", "airplane",
    "weaponArmed", "longRange", "inSwamp"
]);

function validPlayerFields(overrides = {}) {
    const result = {};
    for (const name of PLAYER_DURABLE_FIELDS) {
        result[name] = BOOLEAN_DURABLE_FIELDS.has(name) ? false : 0;
    }
    return Object.assign(result, overrides);
}

function validEntityFields(type, overrides = {}) {
    const names = TEST_ENTITY_DURABLE_FIELDS[type];
    assert.ok(names, `test helper has no durable descriptor for ${type}`);
    const result = {};
    for (const name of names) {
        if (name === "trail") {
            result[name] = { kind: "array", items: [0, -1, -2, -3, -4, -5, -6, -7] };
        } else if (name === "superFire") {
            result[name] = null;
        } else {
            result[name] = BOOLEAN_DURABLE_FIELDS.has(name) ? false : 0;
        }
    }
    return Object.assign(result, overrides);
}

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
    const buttonMappingUrl = compileModule(
        readFileSync(new URL("../pwa/src/jackal/ButtonMapping.ts", import.meta.url), "utf8").replace(
            `from "slick2d-ts"`,
            `from "${slickModuleUrl}"`
        )
    );
    const tileTypesUrl = compileModule(readFileSync(new URL("../pwa/src/jackal/GameTileTypes.ts", import.meta.url), "utf8"));
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
    const fieldPoliciesUrl = compileModule(`
        const PLAYER_FIELDS = ${JSON.stringify(PLAYER_DURABLE_FIELDS)};
        const ENTITY_FIELDS = ${JSON.stringify(TEST_ENTITY_DURABLE_FIELDS)};
        const BOOLEAN_FIELDS = new Set(${JSON.stringify([...new Set(["removeFlag","enemy","enemyBullet","hitField","solid","mine","playSoundOnRemove","airplane","weaponArmed","longRange","inSwamp"])])});
        const exact = (value, names) =>
            value !== null && typeof value === "object" && !Array.isArray(value) &&
            Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));
        const scalar = (name, value) => {
            if (BOOLEAN_FIELDS.has(name)) return typeof value === "boolean";
            if (typeof value !== "number" || !Number.isFinite(value)) return false;
            if (name === "vx" || name === "vy") return Math.abs(value) <= 10_000;
            return true;
        };
        export function isPlayerDurableFields(value) {
            return exact(value, PLAYER_FIELDS) && PLAYER_FIELDS.every((name) => scalar(name, value[name]));
        }
        export function isEntityDurableFields(type, value) {
            const names = ENTITY_FIELDS[type];
            if (!names || !exact(value, names)) return false;
            return names.every((name) => {
                const entry = value[name];
                if (name === "trail") {
                    return entry && entry.kind === "array" && Array.isArray(entry.items) && entry.items.length === 8 &&
                        entry.items.every((item) => Number.isInteger(item));
                }
                if (name === "superFire") return entry === null || (entry && entry.kind === "entityRef" && Number.isInteger(entry.id));
                return scalar(name, entry);
            });
        }
    `);
    const validatorUrl = compileModule(
        source("GameStateSnapshotValidator.ts")
            .replace(`from "slick2d-ts"`, `from "${slickModuleUrl}"`)
            .replace(`from "../../java/MainConstants.js"`, `from "${mainConstantsUrl}"`)
            .replace(`from "../AudioRegistry.js"`, `from "${audioRegistryUrl}"`)
            .replace(`from "../ButtonMapping.js"`, `from "${buttonMappingUrl}"`)
            .replace(`from "../InputMode.js"`, `from "${inputModeUrl}"`)
            .replace(`from "../GameTileTypes.js"`, `from "${tileTypesUrl}"`)
            .replace(`from "./GameStateSchema.js"`, `from "${schemaUrl}"`)
            .replace(`from "./GameElementTypeIds.js"`, `from "${idsUrl}"`)
            .replace(`from "./GameStateFieldPolicies.js"`, `from "${fieldPoliciesUrl}"`)
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
            fading: false,
            fadeIndex: 0,
            fadeOut: false,
            stageIndex: 0,
            score: 0,
            extraLives: 0,
            hasMissiles: false,
            missilePower: 0,
            friendlySoldiersPickedUp: 0,
            hardMode: false,
            continued: false
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

function introModeSnapshot(fields, version) {
    return {
        ...baseSnapshot(fields, version),
        modeId: "INTRO",
        modeFields: encodedFields(fields.INTRO_MODE_FIELD_NAMES, {
            state: 4,
            delay: 600,
            scrollOffsetX: 0,
            upperSolderX: 0,
            lowerSolderX: 0,
            namesIndex: 0,
            nameLength: 0,
            soldierSet: 0,
            selectionMade: false,
            selectedIndex: 0
        }),
        modeExtra: {
            menu: {
                fields: encodedFields(fields.MENU_FIELD_NAMES, {
                    x: 416,
                    y: 608,
                    iconY: 16,
                    selectedIndex: 0,
                    icon: 0,
                    selectState: 0,
                    iconVy: 0,
                    iconMidY: 16,
                    iconA: 0,
                    targetY: 16,
                    selectionMade: false,
                    inputEnabled: true,
                    konamiCodeTest: true
                })
            }
        }
    };
}

function optionsModeSnapshot(fields, version) {
    return {
        ...baseSnapshot(fields, version),
        modeId: "OPTIONS",
        modeFields: encodedFields(fields.SIMPLE_MENU_MODE_FIELD_NAMES, {
            state: 0,
            optionSelectedFlag: false,
            selectedIndex: 0
        }),
        modeExtra: {
            menu: {
                fields: encodedFields(fields.MENU_FIELD_NAMES, {
                    x: 0,
                    y: 0,
                    iconY: 16,
                    selectedIndex: 0,
                    icon: 0,
                    selectState: 0,
                    iconVy: 0,
                    iconMidY: 16,
                    iconA: 0,
                    targetY: 16,
                    selectionMade: false,
                    inputEnabled: true,
                    konamiCodeTest: false
                })
            }
        }
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

function jeepYeahModeSnapshot(fields, version) {
    return {
        ...baseSnapshot(fields, version),
        modeId: "YEAH",
        modeFields: encodedFields(fields.JEEP_YEAH_MODE_FIELD_NAMES, {
            smokeX: 0,
            smokeY: 0,
            bulletDelay: 11,
            yeahVisible: 136,
            yeah: true,
            state: 0
        }),
        modeExtra: {
            jeepYeah: {
                explosion: null,
                leftPlane: encodedFields(fields.JEEP_YEAH_PLANE_FIELD_NAMES, {
                    x: -650,
                    y: -300,
                    z: -8,
                    left: true,
                    angle: 0
                }),
                rightPlane: null,
                fireLeft: null,
                fireRight: null,
                bullets: [
                    encodedFields(fields.JEEP_YEAH_BULLET_FIELD_NAMES, {
                        x: 308,
                        y: 408,
                        vx: -2,
                        vy: -5,
                        angle: -50,
                        remove: false,
                        scale: 1
                    })
                ]
            }
        }
    };
}

function gameSnapshot(fields, version, entity) {
    const normalizedEntity = {
        ...entity,
        fields: validEntityFields(entity.type, entity.fields)
    };
    return {
        ...baseSnapshot(fields, version),
        kind: "game",
        gameMode: {
            fields: encodedFields(fields.GAME_MODE_FIELD_NAMES, {
                tileMap: { kind: "array", items: [{ kind: "array", items: [0] }] },
                typesMap: { kind: "array", items: [{ kind: "array", items: [1] }] },
                triggedGroups: { kind: "array", items: [] },
                waterAlphaIndex: 0,
                conveyorOffset: 0,
                conveyorLastIndex: 0,
                conveyorDelta: 0,
                cameraX: 0,
                cameraY: 0,
                maxCameraX: 0,
                maxCameraY: 0,
                paused: false,
                triggerY: 0,
                bossCameraPan: false,
                endingCameraPan: false,
                playing: true,
                cameraPanListener: null,
                stageIndex: 0,
                stageCompletedFlag: false,
                stageCompletedDelay: 228
            }),
            elements: [[normalizedEntity.id], [], [], [], [], [], [], []],
            entities: [normalizedEntity]
        },
        playerFields: validPlayerFields()
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

    const invalidMainBoolean = modeSnapshot(fields, currentVersion);
    invalidMainBoolean.mainFields.hasMissiles = 0;
    assert.equal(validator.isSupportedGameStateSnapshot(invalidMainBoolean), false);

    const invalidFadeIndex = modeSnapshot(fields, currentVersion);
    invalidFadeIndex.mainFields.fadeIndex = 24;
    assert.equal(validator.isSupportedGameStateSnapshot(invalidFadeIndex), false);

    const invalidActiveFadeBoundary = modeSnapshot(fields, currentVersion);
    invalidActiveFadeBoundary.mainFields.fading = true;
    invalidActiveFadeBoundary.mainFields.fadeIndex = 23;
    assert.equal(validator.isSupportedGameStateSnapshot(invalidActiveFadeBoundary), false);

    const badAudioShape = modeSnapshot(fields, currentVersion);
    badAudioShape.audioState.extra = true;
    assert.equal(validator.isSupportedGameStateSnapshot(badAudioShape), false);

    const validIntro = introModeSnapshot(fields, currentVersion);
    assert.equal(validator.isSupportedGameStateSnapshot(validIntro), true);

    const introSelectionMismatch = structuredClone(validIntro);
    introSelectionMismatch.modeFields.selectionMade = true;
    introSelectionMismatch.modeFields.selectedIndex = 1;
    introSelectionMismatch.modeExtra.menu.fields.selectionMade = true;
    introSelectionMismatch.modeExtra.menu.fields.selectedIndex = 0;
    assert.equal(
        validator.isSupportedGameStateSnapshot(introSelectionMismatch),
        false,
        "Intro mode and Menu must agree on the committed selection"
    );

    const introMenuSelectedWithoutMode = structuredClone(validIntro);
    introMenuSelectedWithoutMode.modeExtra.menu.fields.selectionMade = true;
    assert.equal(
        validator.isSupportedGameStateSnapshot(introMenuSelectedWithoutMode),
        false,
        "Intro Menu cannot claim a committed selection when IntroMode does not"
    );

    const validMenuMode = optionsModeSnapshot(fields, currentVersion);
    assert.equal(validator.isSupportedGameStateSnapshot(validMenuMode), true);

    const missingRequiredOptionsMenu = structuredClone(validMenuMode);
    missingRequiredOptionsMenu.modeExtra.menu = null;
    assert.equal(
        validator.isSupportedGameStateSnapshot(missingRequiredOptionsMenu),
        false,
        "OptionsMode dereferences its menu and must reject a null menu before restore"
    );

    const mismatchedCommittedMenuSelection = structuredClone(validMenuMode);
    mismatchedCommittedMenuSelection.modeFields.state = 2;
    mismatchedCommittedMenuSelection.modeFields.optionSelectedFlag = true;
    mismatchedCommittedMenuSelection.modeFields.selectedIndex = 2;
    mismatchedCommittedMenuSelection.modeExtra.menu.fields.selectedIndex = 1;
    mismatchedCommittedMenuSelection.modeExtra.menu.fields.selectionMade = true;
    assert.equal(validator.isSupportedGameStateSnapshot(mismatchedCommittedMenuSelection), false);

    const numericMenuBoolean = structuredClone(validMenuMode);
    numericMenuBoolean.modeExtra.menu.fields.selectionMade = 0;
    assert.equal(validator.isSupportedGameStateSnapshot(numericMenuBoolean), false);

    const outOfRangeMenuSelection = structuredClone(validMenuMode);
    outOfRangeMenuSelection.modeExtra.menu.fields.selectedIndex = 3;
    assert.equal(validator.isSupportedGameStateSnapshot(outOfRangeMenuSelection), false);

    const outOfRangeMenuState = structuredClone(validMenuMode);
    outOfRangeMenuState.modeExtra.menu.fields.selectState = 3;
    assert.equal(validator.isSupportedGameStateSnapshot(outOfRangeMenuState), false);

    const selectedMenuSameTick = structuredClone(validMenuMode);
    selectedMenuSameTick.modeFields.state = 1;
    selectedMenuSameTick.modeFields.optionSelectedFlag = true;
    selectedMenuSameTick.modeFields.selectedIndex = 2;
    selectedMenuSameTick.modeExtra.menu.fields.selectedIndex = 2;
    selectedMenuSameTick.modeExtra.menu.fields.selectionMade = true;
    assert.equal(validator.isSupportedGameStateSnapshot(selectedMenuSameTick), true);

    const impossibleUnselectedMenuIndex = structuredClone(validMenuMode);
    impossibleUnselectedMenuIndex.modeFields.state = 1;
    impossibleUnselectedMenuIndex.modeFields.optionSelectedFlag = false;
    impossibleUnselectedMenuIndex.modeFields.selectedIndex = 2;
    assert.equal(validator.isSupportedGameStateSnapshot(impossibleUnselectedMenuIndex), false);

    const validMenuFadeOut = structuredClone(validMenuMode);
    validMenuFadeOut.modeFields.state = 2;
    validMenuFadeOut.modeFields.optionSelectedFlag = true;
    validMenuFadeOut.modeFields.selectedIndex = 1;
    validMenuFadeOut.modeExtra.menu.fields.selectedIndex = 1;
    validMenuFadeOut.modeExtra.menu.fields.selectionMade = true;
    assert.equal(validator.isSupportedGameStateSnapshot(validMenuFadeOut), true);

    const impossibleMenuFadeOut = structuredClone(validMenuMode);
    impossibleMenuFadeOut.modeFields.state = 2;
    impossibleMenuFadeOut.modeFields.optionSelectedFlag = false;
    assert.equal(validator.isSupportedGameStateSnapshot(impossibleMenuFadeOut), false);

    const wrongStandalonePrimitive = modeSnapshot(fields, currentVersion);
    wrongStandalonePrimitive.modeFields.delay = "250";
    assert.equal(
        validator.isSupportedGameStateSnapshot(wrongStandalonePrimitive),
        false,
        "standalone numeric fields must reject string aliases before generic restore"
    );

    const wrongStandaloneState = modeSnapshot(fields, currentVersion);
    wrongStandaloneState.modeFields.state = 4;
    assert.equal(
        validator.isSupportedGameStateSnapshot(wrongStandaloneState),
        false,
        "IntroMap state must stay within the reachable 0..3 state domain"
    );

    const validJeepYeah = jeepYeahModeSnapshot(fields, currentVersion);
    assert.equal(validator.isSupportedGameStateSnapshot(validJeepYeah), true);

    const numericJeepPlaneBoolean = structuredClone(validJeepYeah);
    numericJeepPlaneBoolean.modeExtra.jeepYeah.leftPlane.left = 0;
    assert.equal(
        validator.isSupportedGameStateSnapshot(numericJeepPlaneBoolean),
        false,
        "Jeep-Yeah plane boolean fields must reject numeric aliases"
    );

    const shadowedJeepBulletMethod = structuredClone(validJeepYeah);
    shadowedJeepBulletMethod.modeExtra.jeepYeah.bullets[0].update = 0;
    assert.equal(
        validator.isSupportedGameStateSnapshot(shadowedJeepBulletMethod),
        false,
        "Jeep-Yeah auxiliary records must reject method-shadow/extra fields"
    );

    const wrongJeepModeBoolean = structuredClone(validJeepYeah);
    wrongJeepModeBoolean.modeFields.yeah = 1;
    assert.equal(
        validator.isSupportedGameStateSnapshot(wrongJeepModeBoolean),
        false,
        "Jeep-Yeah mode booleans must be true booleans"
    );

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

    const unreachableDraftKey = structuredClone(validInput);
    unreachableDraftKey.modeExtra.input.draftButtonMapping.fields.keyUp = 999;
    assert.equal(validator.isSupportedGameStateSnapshot(unreachableDraftKey), false);

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

    const dpadActionDraft = structuredClone(validInput);
    dpadActionDraft.modeExtra.input.draftButtonMapping.fields.controllerGun = 12;
    assert.equal(validator.isSupportedGameStateSnapshot(dpadActionDraft), false);

    const reservedKeyDraft = structuredClone(validInput);
    reservedKeyDraft.modeExtra.input.draftButtonMapping.fields.keyGun = 1;
    assert.equal(validator.isSupportedGameStateSnapshot(reservedKeyDraft), false);

    const duplicateDraftKey = structuredClone(validInput);
    duplicateDraftKey.modeExtra.input.draftButtonMapping.fields.keyGun =
        duplicateDraftKey.modeExtra.input.draftButtonMapping.fields.keyGrenade;
    assert.equal(validator.isSupportedGameStateSnapshot(duplicateDraftKey), false);

    const duplicateDraftController = structuredClone(validInput);
    duplicateDraftController.modeExtra.input.draftButtonMapping.fields.controllerGun =
        duplicateDraftController.modeExtra.input.draftButtonMapping.fields.controllerGrenade;
    assert.equal(validator.isSupportedGameStateSnapshot(duplicateDraftController), false);

    const impossibleReadFade = structuredClone(validInput);
    impossibleReadFade.modeFields.state = 3;
    impossibleReadFade.modeFields.delay = 0;
    impossibleReadFade.modeFields.armDelay = 0;
    impossibleReadFade.modeExtra.input.assignedKeys = [45];
    assert.equal(validator.isSupportedGameStateSnapshot(impossibleReadFade), false);

    const keyboardDuringArmDelay = structuredClone(validInput);
    keyboardDuringArmDelay.modeFields.state = 3;
    keyboardDuringArmDelay.modeFields.nameIndex = 0;
    keyboardDuringArmDelay.modeFields.delay = 11;
    keyboardDuringArmDelay.modeFields.armDelay = 8;
    keyboardDuringArmDelay.modeExtra.input.assignedKeys = [200];
    assert.equal(
        validator.isSupportedGameStateSnapshot(keyboardDuringArmDelay),
        true,
        "keyboard callbacks remain reachable while Jackal controller arm-delay is active"
    );

    const mismatchedCompletedMenu = structuredClone(validInput);
    mismatchedCompletedMenu.modeFields.state = 1;
    mismatchedCompletedMenu.modeFields.nameIndex = 0;
    mismatchedCompletedMenu.modeFields.armDelay = 0;
    mismatchedCompletedMenu.modeExtra.input.menu = { fields: encodedFields(fields.MENU_FIELD_NAMES) };
    mismatchedCompletedMenu.modeExtra.input.draftButtonMapping = null;
    mismatchedCompletedMenu.modeExtra.input.assignedKeys = [200, 208, 203, 205, 45, 44, 28];
    assert.equal(validator.isSupportedGameStateSnapshot(mismatchedCompletedMenu), false);

    const unsafeVelocity = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: { vx: 10001 }, runtimeFields: null });
    assert.equal(validator.isSupportedGameStateSnapshot(unsafeVelocity), false);

    const unsafePlayerFieldName = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null });
    unsafePlayerFieldName.playerFields = JSON.parse('{"__proto__":{"kind":"nullRef"}}');
    assert.equal(validator.isSupportedGameStateSnapshot(unsafePlayerFieldName), false);

    const unsafeEntityFieldName = gameSnapshot(fields, currentVersion, { id: 0, type: "Bomb", fields: {}, runtimeFields: null });
    unsafeEntityFieldName.gameMode.entities[0].fields = JSON.parse('{"constructor":{"kind":"nullRef"}}');
    assert.equal(validator.isSupportedGameStateSnapshot(unsafeEntityFieldName), false);

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
