import * as NesInputProfile from "../NesInputProfile.js";
import { isMusicPlaybackSnapshot, isSoundPlaybackSnapshot } from "slick2d-ts";
import { MainConstants } from "../../java/MainConstants.js";
import { SOUND_FIELD_NAMES, isSoundId } from "../AudioRegistry.js";
import { ButtonMapping } from "../ButtonMapping.js";
import { InputMode } from "../InputMode.js";
import { TILE_TYPE_CONVEYOR } from "../GameTileTypes.js";
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
import { isGameElementTypeId, type GameElementTypeId } from "./GameElementTypeIds.js";
import { isEntityDurableFields, isPlayerDurableFields } from "./GameStateFieldPolicies.js";
import { isEntityRuntimeFields } from "./EntityRuntimeFields.js";
import {
    BUTTON_MAPPING_FIELD_NAMES,
    GAME_MODE_FIELD_NAMES,
    GAME_MODE_LAYER_COUNT,
    HARD_ENDING_MODE_FIELD_NAMES,
    INTRO_MODE_FIELD_NAMES,
    INTRO_MAP_MODE_FIELD_NAMES,
    JEEP_HERE_MODE_FIELD_NAMES,
    JEEP_YEAH_BULLET_FIELD_NAMES,
    JEEP_YEAH_EXPLOSION_FIELD_NAMES,
    JEEP_YEAH_FIRE_FIELD_NAMES,
    JEEP_YEAH_MODE_FIELD_NAMES,
    JEEP_YEAH_PLANE_FIELD_NAMES,
    KONAMI_CODE_FIELD_NAMES,
    MAIN_FIELD_NAMES,
    MAP_MODE_FIELD_NAMES,
    MENU_FIELD_NAMES,
    STAGE_COUNT,
    SUNSET_MODE_FIELD_NAMES,
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
const INPUT_MODE_EXTRA_FIELDS = ["menu", "draftButtonMapping", "assignedKeys", "assignedControllerBindings"] as const;
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
const MAX_TOTAL_SNAPSHOT_CONTAINERS = 65_536;
const MAX_TOTAL_SNAPSHOT_CHILDREN = 524_288;
const MAX_TOTAL_SNAPSHOT_STRING_CHARS = 1_500_000;
const MAX_INPUT_ASSIGNMENTS = InputMode.ACTIONS.length;
const MAX_JEEP_YEAH_BULLETS = 4096;
const MAX_FRIENDLY_SOLDIER_COUNT = 4096;
const MAX_GENERAL_NUMBER_MAGNITUDE = 1_000_000_000_000;
const MAX_POSITION_MAGNITUDE = 1_000_000;
const MAX_VELOCITY_MAGNITUDE = 10_000;
const MAX_MUSIC_POSITION_SECONDS = 86_400;
const MAX_SOUND_POSITION_SECONDS = 86_400;
const MIN_FADE_INDEX = -1;
const MAX_FADE_INDEX = 23;
const MAX_TOTAL_SOUND_VOICES = 62;
const JAVA_INT_MAX = 2_147_483_647;
const FORBIDDEN_STATE_FIELD_NAMES = new Set(["__proto__", "constructor", "prototype"]);
const CAMERA_PAN_LISTENER_TYPES = new Set([
    "BossBlueTanksManager",
    "BossGarageManager",
    "BossHeadquartersManager",
    "BossHelicopterManager",
    "BossShipManager",
    "BossStatuesManager",
    "BossSuperTank"
]);

export function isSupportedGameStateSnapshot(snapshot: unknown): snapshot is JackalGameStateSnapshot {
    if (!isWithinGameStateValidationBudget(snapshot)) {
        return false;
    }
    if (!isRecord(snapshot) || !isSupportedGameStateVersion(snapshot.version) || (snapshot.kind !== "game" && snapshot.kind !== "mode")) {
        return false;
    }
    if (!hasExactFields(snapshot, snapshot.kind === "game" ? GAME_SNAPSHOT_FIELDS : MODE_SNAPSHOT_FIELDS) || !isBaseSnapshot(snapshot)) {
        return false;
    }
    return snapshot.kind === "game" ? isGameStateSnapshot(snapshot) : isStandaloneStateSnapshot(snapshot);
}

export function isWithinGameStateValidationBudget(value: unknown): boolean {
    const stack: unknown[] = [value];
    const seen = new WeakSet<object>();
    let containers = 0;
    let children = 0;
    let stringChars = 0;

    while (stack.length > 0) {
        const current = stack.pop();
        if (typeof current === "string") {
            stringChars += current.length;
            if (stringChars > MAX_TOTAL_SNAPSHOT_STRING_CHARS) {
                return false;
            }
            continue;
        }
        if (current === null || typeof current !== "object") {
            continue;
        }
        if (seen.has(current)) {
            return false;
        }
        seen.add(current);
        if (++containers > MAX_TOTAL_SNAPSHOT_CONTAINERS) {
            return false;
        }

        if (Array.isArray(current)) {
            children += current.length;
            if (children > MAX_TOTAL_SNAPSHOT_CHILDREN) {
                return false;
            }
            for (const child of current) {
                stack.push(child);
            }
            continue;
        }

        const entries = Object.entries(current);
        children += entries.length;
        if (children > MAX_TOTAL_SNAPSHOT_CHILDREN) {
            return false;
        }
        for (const [key, child] of entries) {
            stringChars += key.length;
            if (stringChars > MAX_TOTAL_SNAPSHOT_STRING_CHARS) {
                return false;
            }
            stack.push(child);
        }
    }

    return true;
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
        !isRecord(snapshot.playerFields)
    ) {
        return false;
    }
    const entityIds = new Set<number>();
    const entityTypes = new Map<number, GameElementTypeId>();
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
        entityTypes.set(entitySnapshot.id, entitySnapshot.type);
    }
    const mainFields = snapshot.mainFields;
    if (!isPlayerDurableFields(snapshot.playerFields) || !isEncodedRecord(gameMode.fields, entityIds) || !isEncodedRecord(mainFields)) {
        return false;
    }
    if (gameMode.fields.stageIndex !== mainFields.stageIndex || !isGameModeFieldsValid(gameMode.fields, entityIds, entityTypes)) {
        return false;
    }
    if (!isGameModeFadeStateConsistent(mainFields, gameMode.fields)) {
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
            !isEntityDurableFields(entitySnapshot.type, entitySnapshot.fields, entityTypes) ||
            !isEntityRuntimeFields(entitySnapshot.type, entitySnapshot.runtimeFields)
        ) {
            return false;
        }
    }
    return isElementLayers(gameMode.elements, entityIds);
}

function isGameModeFieldsValid(fields: EncodedRecord, entityIds: ReadonlySet<number>, entityTypes: ReadonlyMap<number, GameElementTypeId>): boolean {
    if (
        !isEncodedIntegerMatrix(fields.tileMap, 0, 32_767) ||
        !isEncodedIntegerMatrix(fields.typesMap, 0, TILE_TYPE_CONVEYOR) ||
        !isEncodedBooleanArray(fields.triggedGroups) ||
        !isIntegerInRange(fields.waterAlphaIndex, 0, 135) ||
        !isFiniteNumberInRange(fields.conveyorOffset, 0, 16, false) ||
        !isIntegerInRange(fields.conveyorLastIndex, 0, 15) ||
        !isFiniteNumberInRange(fields.conveyorDelta, 0, 16, false) ||
        !isFiniteNumberInRange(fields.cameraX, 0, MAX_POSITION_MAGNITUDE) ||
        !isFiniteNumberInRange(fields.cameraY, 0, MAX_POSITION_MAGNITUDE) ||
        !isFiniteNumberInRange(fields.maxCameraX, 0, MAX_POSITION_MAGNITUDE) ||
        !isFiniteNumberInRange(fields.maxCameraY, 0, MAX_POSITION_MAGNITUDE) ||
        typeof fields.paused !== "boolean" ||
        !isIntegerInRange(fields.triggerY, 0, 32_767) ||
        typeof fields.bossCameraPan !== "boolean" ||
        typeof fields.endingCameraPan !== "boolean" ||
        (fields.bossCameraPan && fields.endingCameraPan) ||
        typeof fields.playing !== "boolean" ||
        !isIntegerInRange(fields.stageIndex, 0, STAGE_COUNT - 1) ||
        typeof fields.stageCompletedFlag !== "boolean" ||
        !isIntegerInRange(fields.stageCompletedDelay, 0, 228)
    ) {
        return false;
    }

    const cameraPanListener = fields.cameraPanListener;
    if (cameraPanListener !== null && !isCameraPanListenerReference(cameraPanListener, entityIds, entityTypes)) {
        return false;
    }
    return !(fields.bossCameraPan || fields.endingCameraPan) || cameraPanListener !== null;
}

function isEncodedIntegerMatrix(value: unknown, min: number, max: number): boolean {
    const rows = encodedArrayItems(value);
    if (rows === null || rows.length === 0) {
        return false;
    }
    let width = -1;
    for (const row of rows) {
        const items = encodedArrayItems(row);
        if (items === null || items.length === 0 || (width >= 0 && items.length !== width)) {
            return false;
        }
        width = items.length;
        for (const item of items) {
            if (!isIntegerInRange(item, min, max)) {
                return false;
            }
        }
    }
    return true;
}

function isEncodedBooleanArray(value: unknown): boolean {
    const items = encodedArrayItems(value);
    return items !== null && items.every((item) => typeof item === "boolean");
}

function encodedArrayItems(value: unknown): readonly unknown[] | null {
    return isRecord(value) &&
        hasExactFields(value, ["kind", "items"]) &&
        value.kind === "array" &&
        Array.isArray(value.items) &&
        value.items.length <= MAX_ENCODED_ARRAY_LENGTH
        ? value.items
        : null;
}

function isFiniteNumberInRange(value: unknown, min: number, max: number, inclusiveMax: boolean = true): value is number {
    return typeof value === "number" && Number.isFinite(value) && value >= min && (inclusiveMax ? value <= max : value < max);
}

function isCameraPanListenerReference(value: unknown, entityIds: ReadonlySet<number>, entityTypes: ReadonlyMap<number, GameElementTypeId>): boolean {
    if (
        !isRecord(value) ||
        Object.keys(value).length !== 2 ||
        value.kind !== "entityRef" ||
        !isIntegerInRange(value.id, 0, MAX_ENTITY_COUNT - 1) ||
        !entityIds.has(value.id)
    ) {
        return false;
    }
    const type = entityTypes.get(value.id);
    return type !== undefined && CAMERA_PAN_LISTENER_TYPES.has(type);
}

function isStandaloneStateSnapshot(snapshot: UnknownRecord): snapshot is JackalStandaloneModeStateSnapshot {
    if (!isStandaloneModeId(snapshot.modeId) || !isEncodedRecord(snapshot.modeFields, new Set<number>())) {
        return false;
    }
    if (!hasExactFields(snapshot.modeFields, modeFieldsForModeId(snapshot.modeId)) || !isStandaloneModeFieldsValid(snapshot.modeId, snapshot.modeFields)) {
        return false;
    }
    const currentSongState = snapshot.currentSongState;
    if (!isSongSnapshot(currentSongState) || currentSongState?.activeMusic?.playback.transport === "paused") {
        return false;
    }
    return isModeExtraSnapshot(snapshot.modeId, snapshot.modeFields, snapshot.modeExtra);
}

function isStandaloneModeFieldsValid(modeId: StandaloneModeId, fields: EncodedRecord): boolean {
    switch (modeId) {
        case "INTRO":
            return (
                hasPrimitiveFieldTypes(fields, INTRO_MODE_FIELD_NAMES, ["selectionMade"]) &&
                isIntegerInRange(fields.state, 0, 11) &&
                isIntegerInRange(fields.selectedIndex, 0, 1)
            );
        case "HERE":
            return hasPrimitiveFieldTypes(fields, JEEP_HERE_MODE_FIELD_NAMES) && isIntegerInRange(fields.state, 0, 4);
        case "YEAH":
        case "WE_MADE_IT":
            return hasPrimitiveFieldTypes(fields, JEEP_YEAH_MODE_FIELD_NAMES, ["yeah"]) && isIntegerInRange(fields.state, 0, 3);
        case "SUNSET":
            return hasPrimitiveFieldTypes(fields, SUNSET_MODE_FIELD_NAMES) && isIntegerInRange(fields.state, 0, 9);
        case "HARD_ENDING":
            return hasPrimitiveFieldTypes(fields, HARD_ENDING_MODE_FIELD_NAMES, [], ["finalScore"]) && isIntegerInRange(fields.state, 0, 9);
        case "MAP":
            return hasPrimitiveFieldTypes(fields, MAP_MODE_FIELD_NAMES) && isIntegerInRange(fields.state, 0, 5);
        case "INTRO_MAP":
            return hasPrimitiveFieldTypes(fields, INTRO_MAP_MODE_FIELD_NAMES) && isIntegerInRange(fields.state, 0, 3);
        case "CONTINUE":
        case "DIFFICULTY":
            return isSimpleMenuModeFields(fields, 1);
        case "OPTIONS":
            return isSimpleMenuModeFields(fields, 2);
        case "INPUT":
            return true; // Input-mode fields are checked together with its logical extra snapshot.
    }
    return false;
}

function hasPrimitiveFieldTypes(
    fields: EncodedRecord,
    expectedFields: readonly string[],
    booleanFields: readonly string[] = [],
    stringFields: readonly string[] = []
): boolean {
    if (!hasExactFields(fields, expectedFields)) {
        return false;
    }
    const booleans = new Set(booleanFields);
    const strings = new Set(stringFields);
    for (const name of expectedFields) {
        const value = fields[name];
        if (booleans.has(name)) {
            if (typeof value !== "boolean") return false;
        } else if (strings.has(name)) {
            if (typeof value !== "string" || value.length > MAX_ENCODED_STRING_LENGTH) return false;
        } else if (typeof value !== "number" || !isReasonableFiniteNumber(value, name)) {
            return false;
        }
    }
    return true;
}

function isSimpleMenuModeFields(fields: EncodedRecord, maximumSelectedIndex: number): boolean {
    const state = fields.state;
    const optionSelected = fields.optionSelectedFlag;
    const selectedIndex = fields.selectedIndex;
    if (!isIntegerInRange(state, 0, 3) || typeof optionSelected !== "boolean" || !isIntegerInRange(selectedIndex, 0, maximumSelectedIndex)) {
        return false;
    }
    if (state === 0) {
        return optionSelected === false && selectedIndex === 0;
    }
    if (state === 1) {
        return optionSelected || selectedIndex === 0;
    }
    return optionSelected;
}

function isRestorableMainFields(fields: EncodedRecord): boolean {
    return (
        typeof fields.fading === "boolean" &&
        isIntegerInRange(fields.fadeIndex, MIN_FADE_INDEX, MAX_FADE_INDEX) &&
        typeof fields.fadeOut === "boolean" &&
        isIntegerInRange(fields.stageIndex, 0, STAGE_COUNT - 1) &&
        isIntegerInRange(fields.score, 0, JAVA_INT_MAX) &&
        isIntegerInRange(fields.extraLives, 0, 1_000_000) &&
        typeof fields.hasMissiles === "boolean" &&
        isIntegerInRange(fields.missilePower, 0, 1_000_000) &&
        isIntegerInRange(fields.friendlySoldiersPickedUp, 0, 1_000_000) &&
        typeof fields.hardMode === "boolean" &&
        typeof fields.continued === "boolean" &&
        (!fields.fading || isIntegerInRange(fields.fadeIndex, 0, MAX_FADE_INDEX - 1))
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
            return isExactObject(extra, "menu") && isRequiredMenuSnapshot(extra.menu, 1) && isIntroMenuSnapshotConsistent(modeFields, extra.menu);
        case "CONTINUE":
        case "DIFFICULTY":
            return isExactObject(extra, "menu") && isRequiredMenuSnapshot(extra.menu, 1) && isSimpleMenuSnapshotConsistent(modeFields, extra.menu);
        case "OPTIONS":
            return isExactObject(extra, "menu") && isRequiredMenuSnapshot(extra.menu, 2) && isSimpleMenuSnapshotConsistent(modeFields, extra.menu);
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

function isMenuSnapshot(value: unknown, maximumSelectedIndex: number = 2): value is MenuSnapshot | null {
    if (value === null) {
        return true;
    }
    if (
        !isRecord(value) ||
        !hasExactFields(value, MENU_SNAPSHOT_FIELDS) ||
        !isEncodedRecord(value.fields, new Set<number>()) ||
        !hasExactFields(value.fields, MENU_FIELD_NAMES)
    ) {
        return false;
    }

    const fields = value.fields;
    return (
        isFiniteNumber(fields.x) &&
        isFiniteNumber(fields.y) &&
        isFiniteNumber(fields.iconY) &&
        isIntegerInRange(fields.selectedIndex, 0, maximumSelectedIndex) &&
        isIntegerInRange(fields.icon, 0, 5) &&
        isIntegerInRange(fields.selectState, 0, 2) &&
        isFiniteNumber(fields.iconVy) &&
        isFiniteNumber(fields.iconMidY) &&
        isFiniteNumber(fields.iconA) &&
        isFiniteNumber(fields.targetY) &&
        typeof fields.selectionMade === "boolean" &&
        typeof fields.inputEnabled === "boolean" &&
        typeof fields.konamiCodeTest === "boolean"
    );
}

function isRequiredMenuSnapshot(value: unknown, maximumSelectedIndex: number): value is MenuSnapshot {
    return value !== null && isMenuSnapshot(value, maximumSelectedIndex);
}

function isIntroMenuSnapshotConsistent(modeFields: EncodedRecord, menu: MenuSnapshot): boolean {
    const selectionMade = modeFields.selectionMade;
    const selectedIndex = modeFields.selectedIndex;
    const menuSelectionMade = menu.fields.selectionMade;
    const menuSelectedIndex = menu.fields.selectedIndex;
    if (
        typeof selectionMade !== "boolean" ||
        !isIntegerInRange(selectedIndex, 0, 1) ||
        typeof menuSelectionMade !== "boolean" ||
        !isIntegerInRange(menuSelectedIndex, 0, 1)
    ) {
        return false;
    }
    return selectionMade ? menuSelectionMade && menuSelectedIndex === selectedIndex : !menuSelectionMade;
}

function isSimpleMenuSnapshotConsistent(modeFields: EncodedRecord, menu: MenuSnapshot): boolean {
    const optionSelected = modeFields.optionSelectedFlag;
    const selectedIndex = modeFields.selectedIndex;
    if (typeof optionSelected !== "boolean" || !isIntegerInRange(selectedIndex, 0, 2)) {
        return false;
    }
    const menuSelectedIndex = menu.fields.selectedIndex;
    const menuSelectionMade = menu.fields.selectionMade;
    if (typeof menuSelectionMade !== "boolean" || typeof menuSelectedIndex !== "number") {
        return false;
    }
    if (optionSelected) {
        return menuSelectionMade && menuSelectedIndex === selectedIndex;
    }
    return !menuSelectionMade;
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
    const keyNames = NesInputProfile.KEY_FIELDS;
    const controllerNames = NesInputProfile.CONTROLLER_FIELDS;
    if (!keyNames.every((key) => ButtonMapping.isValidKeyBinding(fields[key]))) return false;
    if (!controllerNames.every((key) => ButtonMapping.isValidControllerBinding(fields[key]))) return false;
    return hasUniqueNonBindingValues(keyNames.map((key) => fields[key])) && hasUniqueNonBindingValues(controllerNames.map((key) => fields[key]));
}

function isInputModeExtraSnapshot(modeFields: EncodedRecord, value: unknown): value is InputModeExtraSnapshot {
    if (
        !isRecord(value) ||
        !hasExactFields(value, INPUT_MODE_EXTRA_FIELDS) ||
        !isMenuSnapshot(value.menu, 2) ||
        !isButtonMappingSnapshot(value.draftButtonMapping) ||
        !isUniqueKeyArray(value.assignedKeys, MAX_INPUT_ASSIGNMENTS) ||
        !isUniqueControllerAssignmentArray(value.assignedControllerBindings, MAX_INPUT_ASSIGNMENTS)
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

    const assignmentCount = value.assignedKeys.length + value.assignedControllerBindings.length;
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
            assignmentsMatchInputDraft(value.draftButtonMapping, value.assignedKeys, value.assignedControllerBindings, nameIndex) &&
            (message === "" || (message === "ALREADY USED" && armDelay === 0))
        );
    }
    if (readFade) {
        return (
            nameIndex < InputMode.ACTIONS.length &&
            delay >= 1 &&
            delay <= InputMode.FADE_TIME &&
            assignmentCount === nameIndex + 1 &&
            assignmentsMatchInputDraft(value.draftButtonMapping, value.assignedKeys, value.assignedControllerBindings, nameIndex + 1) &&
            message === ""
        );
    }
    if (saved) {
        return (
            nameIndex === InputMode.ACTIONS.length &&
            delay >= 1 &&
            delay <= InputMode.DONE_DELAY &&
            assignmentCount === InputMode.ACTIONS.length &&
            (message === "SAVED" || message === "NOT SAVED")
        );
    }

    return (
        delay === 0 &&
        ((nameIndex === 0 && assignmentCount === 0) || (nameIndex === InputMode.ACTIONS.length && assignmentCount === InputMode.ACTIONS.length)) &&
        message === ""
    );
}

function assignmentsMatchInputDraft(
    draft: ButtonMappingSnapshot | null,
    assignedKeyValues: readonly number[],
    assignedControllerValues: readonly number[],
    completedSteps: number
): boolean {
    if (draft === null) {
        return false;
    }
    const assignedKeys = new Set(assignedKeyValues);
    const assignedControllers = new Set(assignedControllerValues);
    for (const [i, row] of NesInputProfile.INPUTS.entries()) {
        const ownsKey = assignedKeys.has(draft.fields[row.key] as number);
        const ownsController = assignedControllers.has(draft.fields[row.controller] as number);
        if (i < completedSteps) {
            if (ownsKey === ownsController) {
                return false;
            }
        } else if (ownsKey || ownsController) {
            return false;
        }
    }
    return true;
}

function isJeepYeahModeExtraSnapshot(value: unknown): value is JeepYeahModeExtraSnapshot {
    if (!isRecord(value) || !hasExactFields(value, JEEP_YEAH_EXTRA_FIELDS) || !Array.isArray(value.bullets) || value.bullets.length > MAX_JEEP_YEAH_BULLETS) {
        return false;
    }
    if (
        !isNullablePrimitiveRecord(value.explosion, JEEP_YEAH_EXPLOSION_FIELD_NAMES, ["grenadeExplosion", "damagesEnemies", "tiny", "remove"]) ||
        !isNullablePrimitiveRecord(value.leftPlane, JEEP_YEAH_PLANE_FIELD_NAMES, ["left"]) ||
        !isNullablePrimitiveRecord(value.rightPlane, JEEP_YEAH_PLANE_FIELD_NAMES, ["left"]) ||
        !isNullablePrimitiveRecord(value.fireLeft, JEEP_YEAH_FIRE_FIELD_NAMES) ||
        !isNullablePrimitiveRecord(value.fireRight, JEEP_YEAH_FIRE_FIELD_NAMES)
    ) {
        return false;
    }
    return value.bullets.every((bullet) => isPrimitiveRecord(bullet, JEEP_YEAH_BULLET_FIELD_NAMES, ["remove"]));
}

function isNullablePrimitiveRecord(
    value: unknown,
    expectedFields: readonly string[],
    booleanFields: readonly string[] = [],
    stringFields: readonly string[] = []
): value is EncodedRecord | null {
    return value === null || isPrimitiveRecord(value, expectedFields, booleanFields, stringFields);
}

function isPrimitiveRecord(
    value: unknown,
    expectedFields: readonly string[],
    booleanFields: readonly string[] = [],
    stringFields: readonly string[] = []
): value is EncodedRecord {
    return (
        isRecord(value) &&
        isEncodedRecord(value, new Set<number>()) &&
        hasPrimitiveFieldTypes(value as EncodedRecord, expectedFields, booleanFields, stringFields)
    );
}

function isEncodedRecord(value: unknown, entityIds?: Set<number>, depth = 0): value is EncodedRecord {
    if (!isRecord(value) || depth > MAX_ENCODED_DEPTH || Object.keys(value).length > MAX_ENCODED_RECORD_FIELDS) {
        return false;
    }
    return Object.entries(value).every(([key, entry]) => !FORBIDDEN_STATE_FIELD_NAMES.has(key) && isEncodedValue(entry, entityIds, depth + 1, key));
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

function isUniqueKeyArray(value: unknown, maxLength: number): value is number[] {
    return (
        Array.isArray(value) &&
        value.length <= maxLength &&
        new Set(value).size === value.length &&
        value.every((entry) => ButtonMapping.isValidKeyBinding(entry) && entry !== ButtonMapping.NO_BINDING)
    );
}

function isUniqueControllerAssignmentArray(value: unknown, maxLength: number): value is number[] {
    return (
        Array.isArray(value) &&
        value.length <= maxLength &&
        new Set(value).size === value.length &&
        value.every((entry) => ButtonMapping.isValidControllerBinding(entry) && entry !== ButtonMapping.NO_BINDING)
    );
}

function hasUniqueNonBindingValues(values: readonly unknown[]): boolean {
    const assigned = values.filter((value): value is number => typeof value === "number" && value !== ButtonMapping.NO_BINDING);
    return new Set(assigned).size === assigned.length;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
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

function isGameModeFadeStateConsistent(mainFields: EncodedRecord, gameModeFields: EncodedRecord): boolean {
    if (mainFields.fading !== true) return true;
    if (mainFields.fadeOut === true) return gameModeFields.stageCompletedFlag === true && gameModeFields.stageCompletedDelay === 0;
    return gameModeFields.stageCompletedFlag === false;
}
