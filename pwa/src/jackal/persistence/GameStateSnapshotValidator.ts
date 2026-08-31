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
    MAIN_FIELD_NAMES,
    MENU_FIELD_NAMES,
    STAGE_COUNT,
    isMusicId,
    isSongId,
    isStandaloneModeId,
    modeFieldsForModeId,
    type StandaloneModeId
} from "./GameStateFields.js";

type UnknownRecord = Record<string, unknown>;

export function isSupportedGameStateSnapshot(snapshot: unknown): snapshot is JackalGameStateSnapshot {
    if (!isRecord(snapshot) || !isSupportedGameStateVersion(snapshot.version) || (snapshot.kind !== "game" && snapshot.kind !== "mode")) {
        return false;
    }
    if (!isBaseSnapshot(snapshot)) {
        return false;
    }
    return snapshot.kind === "game" ? isGameStateSnapshot(snapshot) : isStandaloneStateSnapshot(snapshot);
}

function isBaseSnapshot(snapshot: UnknownRecord): boolean {
    const mainFields = snapshot.mainFields;
    if (!isEncodedRecord(mainFields, new Set<number>())) {
        return false;
    }
    return (
        typeof snapshot.appVersion === "string" &&
        typeof snapshot.savedAt === "string" &&
        hasEncodedFields(mainFields, MAIN_FIELD_NAMES, new Set<number>()) &&
        isRestorableMainFields(mainFields) &&
        (snapshot.konamiCodeFields === null || isEncodedRecord(snapshot.konamiCodeFields, new Set<number>())) &&
        isRandomSnapshot(snapshot.random) &&
        isNonNegativeInteger(snapshot.friendlySoldierCount) &&
        isNullableSongId(snapshot.currentSongId) &&
        isNullableSongId(snapshot.requestedSongId) &&
        isSongSnapshot(snapshot.currentSongState) &&
        isAudioStateSnapshot(snapshot.audioState)
    );
}

function isGameStateSnapshot(snapshot: UnknownRecord): snapshot is JackalGameModeStateSnapshot {
    if (!isSupportedGameStateVersion(snapshot.version)) {
        return false;
    }
    const version = snapshot.version;
    const gameMode = snapshot.gameMode;
    if (!isRecord(gameMode) || !isEncodedRecord(gameMode.fields) || !hasEncodedFields(gameMode.fields, GAME_MODE_FIELD_NAMES)) {
        return false;
    }
    if (!Array.isArray(gameMode.entities) || !Array.isArray(gameMode.elements) || !isEncodedRecord(snapshot.playerFields)) {
        return false;
    }

    const entityIds = new Set<number>();
    for (const entitySnapshot of gameMode.entities) {
        if (
            !isRecord(entitySnapshot) ||
            !isNonNegativeInteger(entitySnapshot.id) ||
            entityIds.has(entitySnapshot.id) ||
            !isGameElementTypeId(entitySnapshot.type)
        ) {
            return false;
        }
        entityIds.add(entitySnapshot.id);
    }

    if (!isEncodedRecord(snapshot.playerFields, entityIds) || !isEncodedRecord(gameMode.fields, entityIds)) {
        return false;
    }
    for (const entitySnapshot of gameMode.entities) {
        if (
            !isRecord(entitySnapshot) ||
            !isGameElementTypeId(entitySnapshot.type) ||
            !isEncodedRecord(entitySnapshot.fields, entityIds) ||
            !isEntityRuntimeFields(entitySnapshot.type, entitySnapshot.runtimeFields, version)
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
    if (!hasEncodedFields(snapshot.modeFields, modeFieldsForModeId(snapshot.modeId), new Set<number>())) {
        return false;
    }
    return isModeExtraSnapshot(snapshot.modeId, snapshot.modeExtra);
}

function isRestorableMainFields(fields: EncodedRecord): boolean {
    return (
        isNonNegativeInteger(fields.loadIndex) &&
        fields.loadIndex >= 42 &&
        isIntegerInRange(fields.stageIndex, 0, STAGE_COUNT - 1) &&
        typeof fields.hardMode === "boolean"
    );
}

function isElementLayers(value: unknown, entityIds: Set<number>): boolean {
    if (!Array.isArray(value) || value.length !== GAME_MODE_LAYER_COUNT) {
        return false;
    }
    const layerRefs = new Set<number>();
    for (const layer of value) {
        if (!Array.isArray(layer)) {
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

function isModeExtraSnapshot(modeId: StandaloneModeId, extra: unknown): boolean {
    switch (modeId) {
        case "INTRO":
        case "CONTINUE":
        case "DIFFICULTY":
        case "OPTIONS":
            return isRecord(extra) && isMenuSnapshot(extra.menu);
        case "INPUT":
            return isRecord(extra) && isInputModeExtraSnapshot(extra.input);
        case "YEAH":
        case "WE_MADE_IT":
            return isRecord(extra) && isJeepYeahModeExtraSnapshot(extra.jeepYeah);
        default:
            return typeof extra === "undefined";
    }
}

function isMenuSnapshot(value: unknown): value is MenuSnapshot | null {
    return value === null || (isRecord(value) && hasEncodedFields(value.fields, MENU_FIELD_NAMES, new Set<number>()));
}

function isButtonMappingSnapshot(value: unknown): value is ButtonMappingSnapshot | null {
    return value === null || (isRecord(value) && hasEncodedFields(value.fields, BUTTON_MAPPING_FIELD_NAMES, new Set<number>()));
}

function isInputModeExtraSnapshot(value: unknown): value is InputModeExtraSnapshot {
    return (
        isRecord(value) &&
        isMenuSnapshot(value.menu) &&
        isButtonMappingSnapshot(value.draftButtonMapping) &&
        isIntegerArray(value.assignedKeys) &&
        isIntegerArray(value.assignedControllerButtons)
    );
}

function isJeepYeahModeExtraSnapshot(value: unknown): value is JeepYeahModeExtraSnapshot {
    if (!isRecord(value) || !Array.isArray(value.bullets)) {
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

function hasEncodedFields(value: unknown, fields: readonly string[], entityIds?: Set<number>): boolean {
    return isEncodedRecord(value, entityIds) && fields.every((field) => Object.hasOwn(value, field));
}

function isEncodedRecord(value: unknown, entityIds?: Set<number>): value is EncodedRecord {
    return isRecord(value) && Object.values(value).every((entry) => isEncodedValue(entry, entityIds));
}

function isEncodedValue(value: unknown, entityIds?: Set<number>): value is EncodedValue {
    if (value === null || typeof value === "string" || typeof value === "boolean") {
        return true;
    }
    if (typeof value === "number") {
        return Number.isFinite(value);
    }
    if (!isRecord(value) || typeof value.kind !== "string") {
        return false;
    }

    switch (value.kind) {
        case "nonFiniteNumber":
            return value.value === "NaN" || value.value === "Infinity" || value.value === "-Infinity";
        case "bigint":
            return typeof value.value === "string" && /^-?\d+$/.test(value.value);
        case "array":
        case "arrayList":
            return Array.isArray(value.items) && value.items.every((item) => isEncodedValue(item, entityIds));
        case "entityRef":
            return isNonNegativeInteger(value.id) && (typeof entityIds === "undefined" || entityIds.has(value.id));
        case "playerRef":
        case "mainRef":
        case "gameModeRef":
        case "nullRef":
            return true;
        default:
            return false;
    }
}

function isRandomSnapshot(value: unknown): value is RandomSnapshot {
    return isRecord(value) && isJavaRandomSeedLimb(value.seed0) && isJavaRandomSeedLimb(value.seed1) && isJavaRandomSeedLimb(value.seed2);
}

function isJavaRandomSeedLimb(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 0xffff;
}

function isAudioStateSnapshot(value: unknown): value is AudioStateSnapshot {
    return isRecord(value) && typeof value.musicOn === "boolean" && typeof value.soundOn === "boolean";
}

function isSongSnapshot(value: unknown): value is SongSnapshot | null {
    return (
        value === null ||
        (isRecord(value) &&
            isSongId(value.id) &&
            typeof value.playing === "boolean" &&
            typeof value.playedIntro2 === "boolean" &&
            isMusicSnapshot(value.activeMusic))
    );
}

function isMusicSnapshot(value: unknown): value is MusicSnapshot | null {
    return (
        value === null ||
        (isRecord(value) &&
            isMusicId(value.id) &&
            typeof value.looped === "boolean" &&
            typeof value.paused === "boolean" &&
            typeof value.playing === "boolean" &&
            Number.isFinite(value.playbackRate) &&
            Number.isFinite(value.position) &&
            Number.isFinite(value.volume))
    );
}

function isNullableSongId(value: unknown): boolean {
    return value === null || isSongId(value);
}

function isIntegerArray(value: unknown): value is number[] {
    return Array.isArray(value) && value.every((entry) => isNonNegativeInteger(entry));
}

function isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
}

function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isRecord(value: unknown): value is UnknownRecord {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}
