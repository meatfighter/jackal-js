import type { GameElementTypeId } from "./GameElementTypeRegistry.js";
export { GAME_STATE_VERSION } from "./GameStateSchema.js";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type RandomSnapshot = {
    seed0: number;
    seed1: number;
    seed2: number;
};

export type MusicSnapshot = {
    id: string;
    looped: boolean;
    paused: boolean;
    playing: boolean;
    playbackRate: number;
    position: number;
    volume: number;
};

export type SongSnapshot = {
    id: string;
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

export type GenericModeExtraSnapshot = {
    menu?: MenuSnapshot | null;
    input?: InputModeExtraSnapshot;
    jeepYeah?: JeepYeahModeExtraSnapshot;
};

export type JackalBaseStateSnapshot = {
    version: number;
    appVersion: string;
    savedAt: string;
    kind: "game" | "mode";
    mainFields: EncodedRecord;
    konamiCodeFields: EncodedRecord | null;
    random: RandomSnapshot;
    friendlySoldierCount: number;
    currentSongId: string | null;
    requestedSongId: string | null;
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
    modeId: string;
    modeFields: EncodedRecord;
    modeExtra?: GenericModeExtraSnapshot;
};

export type JackalGameStateSnapshot = JackalGameModeStateSnapshot | JackalStandaloneModeStateSnapshot;
