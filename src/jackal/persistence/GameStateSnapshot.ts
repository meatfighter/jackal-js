export const GAME_STATE_VERSION = 2;

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

export type EncodedValue =
    | JsonPrimitive
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
    type: string;
    fields: EncodedRecord;
};

export type GameModeSnapshot = {
    fields: EncodedRecord;
    elements: number[][];
    entities: EntitySnapshot[];
};

export type JackalGameStateSnapshot = {
    version: number;
    appVersion: string;
    savedAt: string;
    mainFields: EncodedRecord;
    konamiCodeFields: EncodedRecord | null;
    random: RandomSnapshot;
    friendlySoldierCount: number;
    currentSongId: string | null;
    requestedSongId: string | null;
    currentSongState?: SongSnapshot | null;
    gameMode: GameModeSnapshot;
    playerFields: EncodedRecord;
};
