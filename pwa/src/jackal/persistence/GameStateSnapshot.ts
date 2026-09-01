import type { GameElementTypeId } from "./GameElementTypeIds.js";
import type { MusicId, SongId, StandaloneModeId } from "./GameStateFields.js";
import type { SupportedGameStateVersion } from "./GameStateSchema.js";
export { GAME_STATE_VERSION } from "./GameStateSchema.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type RandomSnapshot = {
    seed0: number;
    seed1: number;
    seed2: number;
};

export type MusicSnapshot = {
    id: MusicId;
    position: number;
    volume: number;
};

export type SongSnapshot = {
    id: SongId;
    playing: boolean;
    playedIntro2: boolean;
    activeMusic: MusicSnapshot | null;
};

export type AudioStateSnapshot = {
    musicOn: boolean;
    soundOn: boolean;
};

export type EncodedValue =
    | JsonPrimitive
    | { kind: "nonFiniteNumber"; value: "NaN" | "Infinity" | "-Infinity" }
    | { kind: "bigint"; value: string }
    | { kind: "array"; items: EncodedValue[] }
    | { kind: "arrayList"; items: EncodedValue[] }
    | { kind: "entityRef"; id: number }
    | { kind: "playerRef" }
    | { kind: "mainRef" }
    | { kind: "gameModeRef" }
    | { kind: "nullRef" };

export type EncodedRecord = Record<string, EncodedValue>;

export type EntitySnapshot = {
    id: number;
    type: GameElementTypeId;
    fields: EncodedRecord;
    /** Transient browser asset/runtime descriptors kept separate from translated Java fields. */
    runtimeFields: EncodedRecord | null;
};

export type GameModeSnapshot = {
    fields: EncodedRecord;
    elements: number[][];
    entities: EntitySnapshot[];
};

export type MenuSnapshot = {
    fields: EncodedRecord;
};

export type ButtonMappingSnapshot = {
    fields: EncodedRecord;
};

export type JeepYeahModeExtraSnapshot = {
    explosion: EncodedRecord | null;
    leftPlane: EncodedRecord | null;
    rightPlane: EncodedRecord | null;
    fireLeft: EncodedRecord | null;
    fireRight: EncodedRecord | null;
    bullets: EncodedRecord[];
};

export type InputModeExtraSnapshot = {
    menu: MenuSnapshot | null;
    draftButtonMapping: ButtonMappingSnapshot | null;
    assignedKeys: number[];
    assignedControllerButtons: number[];
};

export type GenericModeExtraSnapshot = { menu: MenuSnapshot | null } | { input: InputModeExtraSnapshot } | { jeepYeah: JeepYeahModeExtraSnapshot };

export type JackalBaseStateSnapshot = {
    version: SupportedGameStateVersion;
    appVersion: string;
    savedAt: string;
    kind: "game" | "mode";
    mainFields: EncodedRecord;
    konamiCodeFields: EncodedRecord | null;
    random: RandomSnapshot;
    friendlySoldierCount: number;
    requestedSongId: SongId | null;
    currentSongState: SongSnapshot | null;
    audioState: AudioStateSnapshot;
};

export type JackalGameModeStateSnapshot = JackalBaseStateSnapshot & {
    kind: "game";
    gameMode: GameModeSnapshot;
    playerFields: EncodedRecord;
};

export type JackalStandaloneModeStateSnapshot = JackalBaseStateSnapshot & {
    kind: "mode";
    modeId: StandaloneModeId;
    modeFields: EncodedRecord;
    modeExtra: GenericModeExtraSnapshot | null;
};

export type JackalGameStateSnapshot = JackalGameModeStateSnapshot | JackalStandaloneModeStateSnapshot;
