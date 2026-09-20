import { isMusicPlaybackSnapshot, isSoundPlaybackSnapshot } from "slick2d-ts";
import { MainConstants } from "../../java/MainConstants.js";
import { SOUND_FIELD_NAMES, isSoundId } from "../AudioRegistry.js";
import { ButtonMapping } from "../ButtonMapping.js";
import { InputMode } from "../InputMode.js";
import {
    type AudioStateSnapshot,
    type ButtonMappingSnapshot,
    type EncodedRecord,
    type EncodedValue,
    type InputModeExtraSnapshot,
    type JackalGameModeStateSnapshot,
    type JackalGameStateSnapshot,
    type JackalStandaloneModeStateSnapshot,
    type JeepYeahModeExtraSnapshot,
    type MenuSnapshot,
    type MusicSnapshot,
    type RandomSnapshot,
    type SongSnapshot
} from "./GameStateSnapshot.js";
import { isSupportedGameStateVersion } from "./GameStateSchema.js";
import { isGameElementTypeId } from "./GameElementTypeIds.js";
import { isEntityRuntimeFields } from "./EntityRuntimeFields.js";
import {
    BUTTON_MAPPING_FIELD_NAMES,
    GAME_MODE_FIELD_NAMES,
    GAME_MODE_LAYER_COUNT,
    KONAMI_CODE_FIELD_NAMES,
    MAIN_FIELD_NAMES,
    MENU_FIELD_NAMES,
    STAGE_COUNT,
    isMusicId,
    isSongId,
    isStandaloneModeId,
    modeFieldsForModeId,
    parseMusicId,
    type StandaloneModeId
} from "./GameStateFields.js";

type UnknownRecord = Record<string, unknown>;

const BASE_SNAPSHOT_FIELDS = [
    "version",
    "appVersion",
    "savedAt",
    "kind",
    "mainFields",
    "konamiCodeFields",
    "random",
    "friendlySoldierCount",
    "requestedSongId",
    "currentSongState",
    "audioState"
] as const;
const GAME_SNAPSHOT_FIELDS = [...BASE_SNAPSHOT_FIELDS, "gameMode", "playerFields"] as const;
const MODE_SNAPSHOT_FIELDS = [...BASE_SNAPSHOT_FIELDS, "modeId", "modeFields", "modeExtra"] as const;
const GAME_MODE_SNAPSHOT_FIELDS = ["fields", "elements", "entities"] as const;
const ENTITY_SNAPSHOT_FIELDS = ["id", "type", "fields", "runtimeFields"] as const;
const MENU_SNAPSHOT_FIELDS = ["fields"] as const;
const INPUT_MODE_EXTRA_FIELDS = ["menu", "draftButtonMapping", "assignedKeys", "assignedControllerButtons"] as const;
const JEEP_YEAH_EXTRA_FIELDS = ["explosion", "leftPlane", "rightPlane", "fireLeft", "fireRight", "bullets"] as const;
const RANDOM_FIELDS = ["seed0", "seed1", "seed2"] as const;
const AUDIO_STATE_FIELDS = ["sounds", "cooldowns"] as const;
const SOUND_FIELDS = ["id", "playback"] as const;
const SOUND_COOLDOWN_FIELDS = ["id", "remainingMs"] as const;
const SONG_FIELDS = ["id", "playing", "playedIntro2", "activeMusic"] as const;
const MUSIC_FIELDS = ["id", "playback"] as const;

const MAX_APP_VERSION_LENGTH = 128;
const MAX_SAVED_AT_LENGTH = 64;
const MAX_ENTITY_COUNT = 4096;
const MAX_ENCODED_DEPTH = 64;
const MAX_ENCODED_ARRAY_LENGTH = 8192;
const MAX_ENCODED_RECORD_FIELDS = 512;
const MAX_ENCODED_STRING_LENGTH = 4096;
const MAX_BIGINT_DIGITS = 128;
const MAX_INPUT_ASSIGNMENTS = InputMode.ACTIONS.length;
const MAX_INPUT_CODE = 65_535;
const MAX_CONTROLLER_BUTTON_INDEX = InputMode.GAMEPAD_BUTTON_INDEX_LIMIT - 1;
const MAX_JEEP_YEAH_BULLETS = 4096;
const MAX_FRIENDLY_SOLDIER_COUNT = 4096;
const MAX_GENERAL_NUMBER_MAGNITUDE = 1_000_000_000_000;
const MAX_POSITION_MAGNITUDE = 1_000_000;
const MAX_VELOCITY_MAGNITUDE = 10_000;
const MAX_MUSIC_POSITION_SECONDS = 86_400;
const MAX_SOUND_POSITION_SECONDS = 86_400;
const MAX_TOTAL_SOUND_VOICES = 62;
const JAVA_INT_MAX = 2_147_483_647;

export function isSupportedGameStateSnapshot(snapshot: unknown): snapshot is JackalGameStateSnapshot {
    if (!isRecord(snapshot) || !isSupportedGameStateVersion(snapshot.version) || (snapshot.kind !== "game" && snapshot.kind !== "mode")) {
        return false;
    }
    if (!hasExactFields(snapshot, snapshot.kind === "game" ? GAME_SNAPSHOT_FIELDS : MODE_SNAPSHOT_FIELDS) || !isBaseSnapshot(snapshot)) {
        return false;
    }
    return snapshot.kind === "game" ? isGameStateSnapshot(snapshot) : isStandaloneStateSnapshot(snapshot);
}

function isBaseSnapshot(snapshot: UnknownRecord): boolean {
    const mainFields = snapshot.mainFields;
    if (!isEncodedRecord(mainFields, new Set<number>()) || !hasExactFields(mainFields, MAIN_FIELD_NAMES)) {
        return false;
    }
    return (
        typeof snapshot.appVersion === "string" &&
        snapshot.appVersion.length > 0 &&
        snapshot.appVersion.length <= MAX_APP_VERSION_LENGTH &&
        typeof snapshot.savedAt === "string" &&
        snapshot.savedAt.length > 0 &&
        snapshot.savedAt.length <= MAX_SAVED_AT_LENGTH &&
        Number.isFinite(Date.parse(snapshot.savedAt)) &&
        isRestorableMainFields(mainFields) &&
        isKonamiCodeFields(snapshot.konamiCodeFields) &&
        isRandomSnapshot(snapshot.random) &&
        isIntegerInRange(snapshot.friendlySoldierCount, 0, MAX_FRIENDLY_SOLDIER_COUNT) &&
        isNullableSongId(snapshot.requestedSongId) &&
        isSongSnapshot(snapshot.currentSongState) &&
        isAudioStateSnapshot(snapshot.audioState)
    );
}

function isKonamiCodeFields(value: unknown): value is EncodedRecord | null {
    if (value === null) {
        return true;
    }
    if (!isRecord(value) || !isEncodedRecord(value, new Set<number>()) || !hasExactFields(value, KONAMI_CODE_FIELD_NAMES)) {
        return false;
    }
    const enabled = value.enabled;
    const sequenceIndex = value.sequenceIndex;
    if (typeof enabled !== "boolean" || !isIntegerInRange(sequenceIndex, 0, 10)) {
        return false;
    }
    return enabled ? sequenceIndex === 10 : sequenceIndex < 10;
}

function isGameStateSnapshot(snapshot: UnknownRecord): snapshot is JackalGameModeStateSnapshot {
    if (!isSupportedGameStateVersion(snapshot.version)) {
        return false;
    }
    const gameMode = snapshot.gameMode;
    if (
        !isRecord(gameMode) ||
        !hasExactFields(gameMode, GAME_MODE_SNAPSHOT_FIELDS) ||
        !isEncodedRecord(gameMode.fields) ||
        !hasExactFields(gameMode.fields, GAME_MODE_FIELD_NAMES)
    ) {
        return false;
    }
    if (
        !Array.isArray(gameMode.entities) ||
        gameMode.entities.length > MAX_ENTITY_COUNT ||
        !Array.isArray(gameMode.elements) ||
        !isEncodedRecord(snapshot.playerFields)
    ) {
        return false;
    }
    const entityIds = new Set<number>();
    for (const entitySnapshot of gameMode.entities) {
        if (
            !isRecord(entitySnapshot) ||
            !hasExactFields(entitySnapshot, ENTITY_SNAPSHOT_FIELDS) ||
            !isIntegerInRange(entitySnapshot.id, 0, MAX_ENTITY_COUNT - 1) ||
            entityIds.has(entitySnapshot.id) ||
            !isGameElementTypeId(entitySnapshot.type)
        ) {
            return false;
        }
        entityIds.add(entitySnapshot.id);
    }
    const mainFields = snapshot.mainFields;
    if (!isEncodedRecord(snapshot.playerFields, entityIds) || !isEncodedRecord(gameMode.fields, entityIds) || !isEncodedRecord(mainFields)) {
        return false;
    }
    if (gameMode.fields.stageIndex !== mainFields.stageIndex) {
        return false;
    }
    const paused = gameMode.fields.paused;
    const currentSongState = snapshot.currentSongState;
    if (typeof paused !== "boolean" || !isSongSnapshot(currentSongState)) {
        return false;
    }
    const activeMusicTransport = currentSongState?.activeMusic?.playback.transport ?? null;
    if (
        (paused && (currentSongState === null || !currentSongState.playing || activeMusicTransport !== "paused")) ||
        (!paused && activeMusicTransport === "paused")
    ) {
        return false;
    }
    for (const entitySnapshot of gameMode.entities) {
        if (
            !isRecord(entitySnapshot) ||
            !isGameElementTypeId(entitySnapshot.type) ||
            !isEncodedRecord(entitySnapshot.fields, entityIds) ||
            !isEntityRuntimeFields(entitySnapshot.type, entitySnapshot.runtimeFields)
        ) {
            return false;
        }
    }
    return isElementLayers(gameMode.elements, entityIds);
}

function isStandaloneStateSnapshot(snapshot: UnknownRecord): snapshot is JackalStandaloneModeStateSnapshot {
    if (!isStandaloneModeId(snapshot.modeId) || !isEncodedRecord(snapshot.modeFields, new Set<number>())) {
        return false;
    }
    if (!hasExactFields(snapshot.modeFields, modeFieldsForModeId(snapshot.modeId))) {
        return false;
    }
    const currentSongState = snapshot.currentSongState;
    if (!isSongSnapshot(currentSongState) || currentSongState?.activeMusic?.playback.transport === "paused") {
        return false;
    }
    return isModeExtraSnapshot(snapshot.modeId, snapshot.modeFields, snapshot.modeExtra);
}

function isRestorableMainFields(fields: EncodedRecord): boolean {
    return (
        isIntegerInRange(fields.loadIndex, 42, 1_000_000) &&
        isIntegerInRange(fields.stageIndex, 0, STAGE_COUNT - 1) &&
        isIntegerInRange(fields.score, 0, JAVA_INT_MAX) &&
        isIntegerInRange(fields.extraLives, 0, 1_000_000) &&
        isIntegerInRange(fields.missilePower, 0, 1_000_000) &&
        isIntegerInRange(fields.friendlySoldiersPickedUp, 0, 1_000_000) &&
        typeof fields.hardMode === "boolean"
    );
}

function isElementLayers(value: unknown, entityIds: Set<number>): boolean {
    if (!Array.isArray(value) || value.length !== GAME_MODE_LAYER_COUNT) {
        return false;
    }
    const layerRefs = new Set<number>();
    for (const layer of value) {
        if (!Array.isArray(layer) || layer.length > MAX_ENTITY_COUNT) {
            return false;
        }
        for (const id of layer) {
            if (!isNonNegativeInteger(id) || !entityIds.has(id) || layerRefs.has(id)) {
                return false;
            }
            layerRefs.add(id);
        }
    }
    return true;
}

function isModeExtraSnapshot(modeId: StandaloneModeId, modeFields: EncodedRecord, extra: unknown): boolean {
    switch (modeId) {
        case "INTRO":
        case "CONTINUE":
        case "DIFFICULTY":
        case "OPTIONS":
            return isExactObject(extra, "menu") && isMenuSnapshot(extra.menu);
        case "INPUT":
            return isExactObject(extra, "input") && isInputModeExtraSnapshot(modeFields, extra.input);
        case "YEAH":
        case "WE_MADE_IT":
            return isExactObject(extra, "jeepYeah") && isJeepYeahModeExtraSnapshot(extra.jeepYeah);
        default:
            return extra === null;
    }
}

function isExactObject(value: unknown, key: string): value is UnknownRecord {
    return isRecord(value) && Object.keys(value).length === 1 && Object.hasOwn(value, key);
}

function isMenuSnapshot(value: unknown): value is MenuSnapshot | null {
    return (
        value === null ||
        (isRecord(value) &&
            hasExactFields(value, MENU_SNAPSHOT_FIELDS) &&
            isEncodedRecord(value.fields, new Set<number>()) &&
            hasExactFields(value.fields, MENU_FIELD_NAMES))
    );
}

function isButtonMappingSnapshot(value: unknown): value is ButtonMappingSnapshot | null {
    if (value === null) {
        return true;
    }
    if (
        !isRecord(value) ||
        !hasExactFields(value, MENU_SNAPSHOT_FIELDS) ||
        !isEncodedRecord(value.fields, new Set<number>()) ||
        !hasExactFields(value.fields, BUTTON_MAPPING_FIELD_NAMES)
    ) {
        return false;
    }

    const fields = value.fields;
    for (const key of ["keyUp", "keyDown", "keyLeft", "keyRight", "keyGrenade", "keyGun", "keyStart"]) {
        if (!isBinding(fields[key], MAX_INPUT_CODE)) {
            return false;
        }
    }
    for (const key of [
        "controllerUp",
        "controllerDown",
        "controllerLeft",
        "controllerRight",
        "controllerGrenade",
        "controllerGun",
        "controllerStart"
    ]) {
        if (!isBinding(fields[key], MAX_CONTROLLER_BUTTON_INDEX)) {
            return false;
        }
    }
    return true;
}

function isInputModeExtraSnapshot(modeFields: EncodedRecord, value: unknown): value is InputModeExtraSnapshot {
    if (
        !isRecord(value) ||
        !hasExactFields(value, INPUT_MODE_EXTRA_FIELDS) ||
        !isMenuSnapshot(value.menu) ||
        !isButtonMappingSnapshot(value.draftButtonMapping) ||
        !isUniqueIntegerArray(value.assignedKeys, MAX_INPUT_ASSIGNMENTS, MAX_INPUT_CODE) ||
        !isUniqueIntegerArray(value.assignedControllerButtons, MAX_INPUT_ASSIGNMENTS, MAX_CONTROLLER_BUTTON_INDEX)
    ) {
        return false;
    }

    const state = modeFields.state;
    const nameIndex = modeFields.nameIndex;
    const delay = modeFields.delay;
    const selectedIndex = modeFields.selectedIndex;
    const message = modeFields.message;
    const armDelay = modeFields.armDelay;
    if (
        !isIntegerInRange(state, InputMode.STATE_FADE_IN, InputMode.STATE_SAVED) ||
        !isIntegerInRange(nameIndex, 0, InputMode.ACTIONS.length) ||
        !isIntegerInRange(selectedIndex, InputMode.OPTION_CHANGE, InputMode.OPTION_DONE) ||
        typeof message !== "string" ||
        message.length > MAX_ENCODED_STRING_LENGTH ||
        !isIntegerInRange(armDelay, 0, InputMode.ARM_DELAY) ||
        typeof delay !== "number" ||
        !Number.isInteger(delay)
    ) {
        return false;
    }

    const assignmentCount = value.assignedKeys.length + value.assignedControllerButtons.length;
    const reading = state === InputMode.STATE_READING;
    const readFade = state === InputMode.STATE_READ_FADE;
    const saved = state === InputMode.STATE_SAVED;
    const menuRequired = !reading && !readFade && !saved;
    if ((value.menu !== null) !== menuRequired || (value.draftButtonMapping !== null) !== (reading || readFade)) {
        return false;
    }

    if (reading) {
        return (
            nameIndex < InputMode.ACTIONS.length &&
            delay === 0 &&
            assignmentCount === nameIndex &&
            (message === "" || message === "ALREADY USED")
        );
    }
    if (readFade) {
        return (
            nameIndex < InputMode.ACTIONS.length &&
            delay >= 1 &&
            delay <= InputMode.FADE_TIME &&
            armDelay === 0 &&
            assignmentCount === nameIndex + 1 &&
            message === ""
        );
    }
    if (saved) {
        return (
            nameIndex === InputMode.ACTIONS.length &&
            delay >= 1 &&
            delay <= InputMode.DONE_DELAY &&
            armDelay === 0 &&
            assignmentCount === InputMode.ACTIONS.length &&
            message === "SAVED"
        );
    }

    return (
        delay === 0 &&
        armDelay === 0 &&
        (nameIndex === 0 || nameIndex === InputMode.ACTIONS.length) &&
        (assignmentCount === 0 || assignmentCount === InputMode.ACTIONS.length) &&
        message === ""
    );
}

function isJeepYeahModeExtraSnapshot(value: unknown): value is JeepYeahModeExtraSnapshot {
    if (!isRecord(value) || !hasExactFields(value, JEEP_YEAH_EXTRA_FIELDS) || !Array.isArray(value.bullets) || value.bullets.length > MAX_JEEP_YEAH_BULLETS) {
        return false;
    }
    if (
        !isNullableEncodedRecord(value.explosion) ||
        !isNullableEncodedRecord(value.leftPlane) ||
        !isNullableEncodedRecord(value.rightPlane) ||
        !isNullableEncodedRecord(value.fireLeft) ||
        !isNullableEncodedRecord(value.fireRight)
    ) {
        return false;
    }
    return value.bullets.every((bullet) => isEncodedRecord(bullet, new Set<number>()));
}

function isNullableEncodedRecord(value: unknown): value is EncodedRecord | null {
    return value === null || isEncodedRecord(value, new Set<number>());
}

function isEncodedRecord(value: unknown, entityIds?: Set<number>, depth = 0): value is EncodedRecord {
    if (!isRecord(value) || depth > MAX_ENCODED_DEPTH || Object.keys(value).length > MAX_ENCODED_RECORD_FIELDS) {
        return false;
    }
    return Object.entries(value).every(([key, entry]) => isEncodedValue(entry, entityIds, depth + 1, key));
}

function isEncodedValue(value: unknown, entityIds: Set<number> | undefined, depth: number, fieldName: string): value is EncodedValue {
    if (depth > MAX_ENCODED_DEPTH) {
        return false;
    }
    if (value === null || typeof value === "boolean") {
        return true;
    }
    if (typeof value === "string") {
        return value.length <= MAX_ENCODED_STRING_LENGTH;
    }
    if (typeof value === "number") {
        return isReasonableFiniteNumber(value, fieldName);
    }
    if (!isRecord(value) || typeof value.kind !== "string") {
        return false;
    }
    switch (value.kind) {
        case "nonFiniteNumber":
            return hasExactFields(value, ["kind", "value"]) && (value.value === "NaN" || value.value === "Infinity" || value.value === "-Infinity");
        case "bigint":
            return (
                hasExactFields(value, ["kind", "value"]) &&
                typeof value.value === "string" &&
                value.value.length <= MAX_BIGINT_DIGITS + 1 &&
                /^-?\d+$/.test(value.value)
            );
        case "array":
        case "arrayList":
            return (
                hasExactFields(value, ["kind", "items"]) &&
                Array.isArray(value.items) &&
                value.items.length <= MAX_ENCODED_ARRAY_LENGTH &&
                value.items.every((item) => isEncodedValue(item, entityIds, depth + 1, fieldName))
            );
        case "entityRef":
            return (
                hasExactFields(value, ["kind", "id"]) &&
                isIntegerInRange(value.id, 0, MAX_ENTITY_COUNT - 1) &&
                (typeof entityIds === "undefined" || entityIds.has(value.id))
            );
        case "playerRef":
        case "mainRef":
        case "gameModeRef":
        case "nullRef":
            return hasExactFields(value, ["kind"]);
        default:
            return false;
    }
}

function isReasonableFiniteNumber(value: number, fieldName: string): boolean {
    if (!Number.isFinite(value)) {
        return false;
    }
    if (fieldName === "score") {
        return Number.isInteger(value) && value >= 0 && value <= JAVA_INT_MAX;
    }
    if (fieldName === "vx" || fieldName === "vy") {
        return Math.abs(value) <= MAX_VELOCITY_MAGNITUDE;
    }
    if (fieldName === "x" || fieldName === "y" || fieldName.endsWith("X") || fieldName.endsWith("Y")) {
        return Math.abs(value) <= MAX_POSITION_MAGNITUDE;
    }
    return Math.abs(value) <= MAX_GENERAL_NUMBER_MAGNITUDE;
}

function isRandomSnapshot(value: unknown): value is RandomSnapshot {
    return (
        isRecord(value) &&
        hasExactFields(value, RANDOM_FIELDS) &&
        isJavaRandomSeedLimb(value.seed0) &&
        isJavaRandomSeedLimb(value.seed1) &&
        isJavaRandomSeedLimb(value.seed2)
    );
}

function isJavaRandomSeedLimb(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

function isAudioStateSnapshot(value: unknown): value is AudioStateSnapshot {
    if (
        !isRecord(value) ||
        !hasExactFields(value, AUDIO_STATE_FIELDS) ||
        !Array.isArray(value.sounds) ||
        value.sounds.length > SOUND_FIELD_NAMES.length ||
        !Array.isArray(value.cooldowns) ||
        value.cooldowns.length > SOUND_FIELD_NAMES.length
    ) {
        return false;
    }

    const soundIds = new Set<string>();
    let totalVoices = 0;
    for (const snapshot of value.sounds) {
        if (
            !isRecord(snapshot) ||
            !hasExactFields(snapshot, SOUND_FIELDS) ||
            !isSoundId(snapshot.id) ||
            soundIds.has(snapshot.id) ||
            !isSoundPlaybackSnapshot(snapshot.playback) ||
            snapshot.playback.voices.length === 0
        ) {
            return false;
        }
        soundIds.add(snapshot.id);
        totalVoices += snapshot.playback.voices.length;
        if (totalVoices > MAX_TOTAL_SOUND_VOICES || snapshot.playback.voices.some((voice) => voice.positionSeconds > MAX_SOUND_POSITION_SECONDS)) {
            return false;
        }
    }

    const cooldownIds = new Set<string>();
    for (const snapshot of value.cooldowns) {
        if (
            !isRecord(snapshot) ||
            !hasExactFields(snapshot, SOUND_COOLDOWN_FIELDS) ||
            !isSoundId(snapshot.id) ||
            cooldownIds.has(snapshot.id) ||
            typeof snapshot.remainingMs !== "number" ||
            !Number.isInteger(snapshot.remainingMs) ||
            snapshot.remainingMs < 0 ||
            snapshot.remainingMs > MainConstants.MINIMUM_SOUND_TIME
        ) {
            return false;
        }
        cooldownIds.add(snapshot.id);
    }

    return true;
}

function isSongSnapshot(value: unknown): value is SongSnapshot | null {
    if (value === null) {
        return true;
    }
    if (
        !isRecord(value) ||
        !hasExactFields(value, SONG_FIELDS) ||
        !isSongId(value.id) ||
        typeof value.playing !== "boolean" ||
        typeof value.playedIntro2 !== "boolean" ||
        !isMusicSnapshot(value.activeMusic)
    ) {
        return false;
    }
    if (value.activeMusic === null) {
        return true;
    }
    const parsed = parseMusicId(value.activeMusic.id);
    return parsed !== null && parsed.songId === value.id;
}

function isMusicSnapshot(value: unknown): value is MusicSnapshot | null {
    return (
        value === null ||
        (isRecord(value) &&
            hasExactFields(value, MUSIC_FIELDS) &&
            isMusicId(value.id) &&
            isMusicPlaybackSnapshot(value.playback) &&
            value.playback.transport !== "stopped" &&
            value.playback.positionSeconds <= MAX_MUSIC_POSITION_SECONDS)
    );
}

function isNullableSongId(value: unknown): boolean {
    return value === null || isSongId(value);
}

function isUniqueIntegerArray(value: unknown, maxLength: number, maximum: number): value is number[] {
    return (
        Array.isArray(value) &&
        value.length <= maxLength &&
        new Set(value).size === value.length &&
        value.every((entry) => isIntegerInRange(entry, 0, maximum))
    );
}

function isBinding(value: unknown, maximum: number): value is number {
    return value === ButtonMapping.NO_BINDING || isIntegerInRange(value, 0, maximum);
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function hasExactFields(value: object, fields: readonly string[]): boolean {
    const keys = Object.keys(value);
    return keys.length === fields.length && fields.every((field) => Object.hasOwn(value, field));
}

function isRecord(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
