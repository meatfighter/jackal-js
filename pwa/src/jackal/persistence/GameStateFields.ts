import type { ButtonMapping } from "../ButtonMapping.js";
import type { ContinueMode } from "../ContinueMode.js";
import type { GameMode } from "../GameMode.js";
import type { HardEndingMode } from "../HardEndingMode.js";
import type { InputMode } from "../InputMode.js";
import type { IntroMapMode } from "../IntroMapMode.js";
import type { IntroMode } from "../IntroMode.js";
import type { KonamiCode } from "../KonamiCode.js";
import type { JeepHereMode } from "../JeepHereMode.js";
import type { JeepYeahBullet } from "../JeepYeahBullet.js";
import type { JeepYeahExplosion } from "../JeepYeahExplosion.js";
import type { JeepYeahFireLeft } from "../JeepYeahFireLeft.js";
import type { JeepYeahMode } from "../JeepYeahMode.js";
import type { JeepYeahPlane } from "../JeepYeahPlane.js";
import type { Main } from "../Main.js";
import type { MapMode } from "../MapMode.js";
import type { Menu } from "../Menu.js";
import type { SunsetMode } from "../SunsetMode.js";

type FieldName<T extends object> = Extract<keyof T, string>;

function fieldsOf<T extends object>() {
    return <const Names extends readonly FieldName<T>[]>(...names: Names): Names => names;
}

export const MAIN_FIELD_NAMES = fieldsOf<Main>()(
    "fading",
    "fadeIndex",
    "fadeOut",
    "extraLives",
    "score",
    "stageIndex",
    "hasMissiles",
    "missilePower",
    "friendlySoldiersPickedUp",
    "hardMode",
    "continued",
);

export const GAME_MODE_FIELD_NAMES = fieldsOf<GameMode>()(
    "tileMap",
    "typesMap",
    "triggedGroups",
    "waterAlphaIndex",
    "conveyorOffset",
    "conveyorLastIndex",
    "conveyorDelta",
    "cameraX",
    "cameraY",
    "maxCameraX",
    "maxCameraY",
    "paused",
    "triggerY",
    "bossCameraPan",
    "endingCameraPan",
    "playing",
    "cameraPanListener",
    "stageIndex",
    "stageCompletedFlag",
    "stageCompletedDelay"
);

export const MENU_FIELD_NAMES = fieldsOf<Menu>()(
    "x",
    "y",
    "iconY",
    "selectedIndex",
    "icon",
    "selectState",
    "iconVy",
    "iconMidY",
    "iconA",
    "targetY",
    "selectionMade",
    "inputEnabled",
    "konamiCodeTest"
);

export const KONAMI_CODE_FIELD_NAMES = fieldsOf<KonamiCode>()("enabled", "sequenceIndex");

export const BUTTON_MAPPING_FIELD_NAMES = fieldsOf<ButtonMapping>()(
    "keyUp",
    "keyDown",
    "keyLeft",
    "keyRight",
    "keyGrenade",
    "keyGun",
    "keyStart",
    "controllerUp",
    "controllerDown",
    "controllerLeft",
    "controllerRight",
    "controllerGrenade",
    "controllerGun",
    "controllerStart"
);

export const INTRO_MODE_FIELD_NAMES = fieldsOf<IntroMode>()(
    "state",
    "delay",
    "scrollOffsetX",
    "upperSolderX",
    "lowerSolderX",
    "namesIndex",
    "nameLength",
    "soldierSet",
    "selectionMade",
    "selectedIndex"
);

// ContinueMode, DifficultyMode, and OptionsMode deliberately share this Java-shaped state.
export const SIMPLE_MENU_MODE_FIELD_NAMES = fieldsOf<ContinueMode>()("state", "optionSelectedFlag", "selectedIndex");

export const INPUT_MODE_FIELD_NAMES = fieldsOf<InputMode>()("state", "nameIndex", "delay", "selectedIndex", "message", "armDelay");

export const INTRO_MAP_MODE_FIELD_NAMES = fieldsOf<IntroMapMode>()("delay", "state");
export const MAP_MODE_FIELD_NAMES = fieldsOf<MapMode>()("state", "delay", "jeepY", "soldierDelay", "targetJeepY");
export const JEEP_HERE_MODE_FIELD_NAMES = fieldsOf<JeepHereMode>()("state", "jeepHereX", "delay");
export const JEEP_YEAH_MODE_FIELD_NAMES = fieldsOf<JeepYeahMode>()("smokeX", "smokeY", "bulletDelay", "yeahVisible", "yeah", "state");
export const JEEP_YEAH_PLANE_FIELD_NAMES = fieldsOf<JeepYeahPlane>()("x", "y", "z", "left", "angle");
export const JEEP_YEAH_EXPLOSION_FIELD_NAMES = fieldsOf<JeepYeahExplosion>()(
    "size",
    "spriteIndex",
    "scale",
    "grenadeExplosion",
    "damagesEnemies",
    "type",
    "tiny",
    "delay",
    "alpha",
    "enemyX",
    "enemyY",
    "x",
    "y",
    "remove"
);
export const JEEP_YEAH_FIRE_FIELD_NAMES = fieldsOf<JeepYeahFireLeft>()("scale", "state", "x", "y", "delay");
export const JEEP_YEAH_BULLET_FIELD_NAMES = fieldsOf<JeepYeahBullet>()("x", "y", "vx", "vy", "angle", "remove", "scale");

export const SUNSET_MODE_FIELD_NAMES = fieldsOf<SunsetMode>()(
    "sunPhase",
    "rotorAngle",
    "helicopterX",
    "helicopterY",
    "helicopterZ",
    "helicopterAngle",
    "delay",
    "helicopterDelay",
    "state",
    "creditsIndex",
    "lineIndex",
    "lineLength"
);

export const HARD_ENDING_MODE_FIELD_NAMES = fieldsOf<HardEndingMode>()(
    "finalScore",
    "finalScoreX",
    "state",
    "lineIndex",
    "lineLength",
    "cardIndex",
    "delay",
    "creditsY",
    "jeepX",
    "rumble"
);

/** Runtime-only Java/browser links and loaded assets are reconstructed, never serialized. */
export const SKIPPED_INSTANCE_FIELDS: ReadonlySet<string> = new Set([
    "main",
    "gameMode",
    "gc",
    "input",
    "g",
    "stage",
    "tiles",
    "groups",
    "triggerMap",
    "groupsMap",
    "directions",
    "directionsDecoded",
    "elements",
    "enemies",
    "solids",
    "mines",
    "player",
    "mask",
    "panel",
    "sprite",
    "sprites",
    "vehicle"
]);

export const SONG_IDS = [
    "bossSong",
    "continueSong",
    "cutsceneSong",
    "endingSong",
    "introSong",
    "stageSong0",
    "stageSong1",
    "stageSong2",
    "superTankSong",
    "titleSong"
] as const;
export type SongId = (typeof SONG_IDS)[number];
const SONG_ID_SET: ReadonlySet<string> = new Set(SONG_IDS);

export function isSongId(value: unknown): value is SongId {
    return typeof value === "string" && SONG_ID_SET.has(value);
}

export const STANDALONE_MODE_IDS = [
    "INTRO",
    "HERE",
    "YEAH",
    "WE_MADE_IT",
    "SUNSET",
    "HARD_ENDING",
    "MAP",
    "CONTINUE",
    "DIFFICULTY",
    "OPTIONS",
    "INPUT",
    "INTRO_MAP"
] as const;
export type StandaloneModeId = (typeof STANDALONE_MODE_IDS)[number];
const STANDALONE_MODE_ID_SET: ReadonlySet<string> = new Set(STANDALONE_MODE_IDS);

export function isStandaloneModeId(value: unknown): value is StandaloneModeId {
    return typeof value === "string" && STANDALONE_MODE_ID_SET.has(value);
}

export const MENU_EXTRA_MODE_IDS = ["INTRO", "CONTINUE", "DIFFICULTY", "OPTIONS"] as const satisfies readonly StandaloneModeId[];
export const JEEP_YEAH_EXTRA_MODE_IDS = ["YEAH", "WE_MADE_IT"] as const satisfies readonly StandaloneModeId[];
export const MUSIC_ID_SUFFIXES = ["intro", "intro2", "loop"] as const;
export type MusicIdSuffix = (typeof MUSIC_ID_SUFFIXES)[number];
export type MusicId = `${SongId}.${MusicIdSuffix}`;
const MUSIC_ID_SUFFIX_SET: ReadonlySet<string> = new Set(MUSIC_ID_SUFFIXES);

export function isMusicIdSuffix(value: unknown): value is MusicIdSuffix {
    return typeof value === "string" && MUSIC_ID_SUFFIX_SET.has(value);
}

export function parseMusicId(value: unknown): { songId: SongId; suffix: MusicIdSuffix } | null {
    if (typeof value !== "string") {
        return null;
    }
    const dot = value.lastIndexOf(".");
    if (dot < 0) {
        return null;
    }
    const songId = value.substring(0, dot);
    const suffix = value.substring(dot + 1);
    return isSongId(songId) && isMusicIdSuffix(suffix) ? { songId, suffix } : null;
}

export function isMusicId(value: unknown): value is MusicId {
    return parseMusicId(value) !== null;
}

export const GAME_MODE_LAYER_COUNT = 8;
export const STAGE_COUNT = 6;

export function modeFieldsForModeId(modeId: StandaloneModeId): readonly string[] {
    switch (modeId) {
        case "INTRO":
            return INTRO_MODE_FIELD_NAMES;
        case "HERE":
            return JEEP_HERE_MODE_FIELD_NAMES;
        case "YEAH":
        case "WE_MADE_IT":
            return JEEP_YEAH_MODE_FIELD_NAMES;
        case "SUNSET":
            return SUNSET_MODE_FIELD_NAMES;
        case "HARD_ENDING":
            return HARD_ENDING_MODE_FIELD_NAMES;
        case "MAP":
            return MAP_MODE_FIELD_NAMES;
        case "CONTINUE":
        case "DIFFICULTY":
        case "OPTIONS":
            return SIMPLE_MENU_MODE_FIELD_NAMES;
        case "INPUT":
            return INPUT_MODE_FIELD_NAMES;
        case "INTRO_MAP":
            return INTRO_MAP_MODE_FIELD_NAMES;
    }
}
