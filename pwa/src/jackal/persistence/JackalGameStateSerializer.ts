import type { GameContainer, Music } from "slick2d-ts";
import { ArrayList, Random } from "../../java/JavaRuntime.js";
import { BossGarage } from "../BossGarage.js";
import { EnemyBullet } from "../EnemyBullet.js";
import { Explosion } from "../Explosion.js";
import { Fire } from "../Fire.js";
import { FloorGun } from "../FloorGun.js";
import { FriendlySoldier } from "../FriendlySoldier.js";
import type { Enemy } from "../Enemy.js";
import type { GameElement } from "../GameElement.js";
import { GameMode } from "../GameMode.js";
import { HardEndingMode } from "../HardEndingMode.js";
import { InputMode } from "../InputMode.js";
import { IntroMapMode } from "../IntroMapMode.js";
import { IntroMode } from "../IntroMode.js";
import { JeepHereMode } from "../JeepHereMode.js";
import { JeepYeahBullet } from "../JeepYeahBullet.js";
import { JeepYeahExplosion } from "../JeepYeahExplosion.js";
import { JeepYeahFireLeft } from "../JeepYeahFireLeft.js";
import { JeepYeahFireRight } from "../JeepYeahFireRight.js";
import { JeepYeahMode } from "../JeepYeahMode.js";
import { JeepYeahPlane } from "../JeepYeahPlane.js";
import { KonamiCode } from "../KonamiCode.js";
import type { IFadeListener } from "../IFadeListener.js";
import type { IMenuListener } from "../IMenuListener.js";
import type { IMode } from "../IMode.js";
import { Main } from "../Main.js";
import { MapMode } from "../MapMode.js";
import { Menu } from "../Menu.js";

import { OptionsMode } from "../OptionsMode.js";
import { Player } from "../Player.js";
import { RotatingGun } from "../RotatingGun.js";
import { StatueMissile } from "../StatueMissile.js";
import { StatueSeekerMissile } from "../StatueSeekerMissile.js";
import type { Song } from "../Song.js";
import { SunsetMode } from "../SunsetMode.js";
import { TileDebris } from "../TileDebris.js";
import { ButtonMapping } from "../ButtonMapping.js";
import { ContinueMode } from "../ContinueMode.js";
import { DifficultyMode } from "../DifficultyMode.js";
import {
    GAME_STATE_VERSION,
    type AudioStateSnapshot,
    type ButtonMappingSnapshot,
    type EncodedRecord,
    type EncodedValue,
    type EntitySnapshot,
    type GenericModeExtraSnapshot,
    type InputModeExtraSnapshot,
    type JackalBaseStateSnapshot,
    type JackalGameStateSnapshot,
    type JackalGameModeStateSnapshot,
    type JackalStandaloneModeStateSnapshot,
    type JeepYeahModeExtraSnapshot,
    type MenuSnapshot,
    type MusicSnapshot,
    type RandomSnapshot,
    type SongSnapshot
} from "./GameStateSnapshot.js";
import {
    GAME_ELEMENT_TYPES,
    getGameElementTypeId,
    isGameElementTypeId,
    type GameElementConstructor,
    type GameElementTypeId
} from "./GameElementTypeRegistry.js";
import {
    GAME_ELEMENT_JAVA_FLOAT_FIELDS,
    GAME_MODE_JAVA_FLOAT_FIELDS,
    JEEP_YEAH_BULLET_JAVA_FLOAT_FIELDS,
    JEEP_YEAH_EXPLOSION_JAVA_FLOAT_FIELDS,
    JEEP_YEAH_FIRE_LEFT_JAVA_FLOAT_FIELDS,
    JEEP_YEAH_FIRE_RIGHT_JAVA_FLOAT_FIELDS,
    JEEP_YEAH_PLANE_JAVA_FLOAT_FIELDS,
    MAIN_JAVA_FLOAT_FIELDS,
    MENU_JAVA_FLOAT_FIELDS,
    PLAYER_JAVA_FLOAT_FIELDS,
    STANDALONE_MODE_JAVA_FLOAT_FIELDS,
    normalizeJavaFloatFields,
    type JavaFloatStateSpec
} from "./JavaFloatState.js";
type EntityContext = {
    main: Main;
    gameMode: GameMode | null;
    player: Player | null;
    ids: Map<object, number>;
    entities: GameElement[];
};

type RestoreContext = {
    main: Main;
    gameMode: GameMode | null;
    gc: GameContainer;
    player: Player | null;
    entitiesById: Map<number, GameElement>;
    audioState: AudioStateSnapshot;
};

type UnknownRecord = Record<string, unknown>;

type MenuMode = object & { menu: Menu | null };
type ModeRuntimePointers = object & {
    main: Main;
    gc: GameContainer;
    input?: Main["input"];
    buttonMapping?: ButtonMapping;
    menu?: Menu | null;
};
type InputModeListenerControls = {
    listeningForInput: boolean;
    state: number;
    addInputListeners(): void;
    removeInputListeners(): void;
};
type GameElementRuntimePointers = GameElement &
    Partial<{
        solids: ArrayList<Enemy>;
        enemies: ArrayList<Enemy>;
        mines: ArrayList<Enemy>;
        player: Player;
    }>;
type PlayerRuntimePointers = {
    main: Main;
    gameMode: GameMode;
    input: Main["input"];
    mines: ArrayList<Enemy>;
};
type JavaRandomState = { seed0: number; seed1: number; seed2: number };
type EntityPersistenceView = GameElementRuntimePointers & {
    type: number;
    sprites: RotatingGun["sprites"];
    sprite: EnemyBullet["sprite"];
    mask: FloorGun["mask"];
    panel: FloorGun["panel"];
    right: StatueMissile["right"];
    X: TileDebris["X"];
    Y: TileDebris["Y"];
    state: BossGarage["state"];
    vehicle: BossGarage["vehicle"];
    isBrownTank: BossGarage["isBrownTank"];
    [key: string]: unknown;
};

const MAIN_FIELD_NAMES = [
    "nextFrameTime",
    "loadIndex",
    "fading",
    "fadeIndex",
    "fadeOut",
    "extraLives",
    "extraLivesStr",
    "score",
    "scoreStr",
    "stageIndex",
    "hasMissiles",
    "missilePower",
    "friendlySoldiersPickedUp",
    "hardMode",
    "continued",
    "closeRequestedFlag",
    "controllerGrenadePressed",
    "controllerGunPressed",
    "unitVector"
];

const GAME_MODE_FIELD_NAMES = [
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
];

const MENU_FIELD_NAMES = [
    "x",
    "y",
    "iconY",
    "selectedIndex",
    "icon",
    "buttonReleased",
    "selectState",
    "iconVy",
    "iconMidY",
    "iconA",
    "targetY",
    "selectionMade",
    "inputEnabled",
    "konamiCodeTest"
];

const BUTTON_MAPPING_FIELD_NAMES = [
    "keyUp",
    "keyDown",
    "keyLeft",
    "keyRight",
    "keyGrenade",
    "keyGun",
    "keyStart",
    "controller",
    "controllerIndex",
    "controllerUp",
    "controllerDown",
    "controllerLeft",
    "controllerRight",
    "controllerGrenade",
    "controllerGun",
    "controllerStart",
    "gunKeyMapped"
];

const INTRO_MODE_FIELD_NAMES = [
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
];

const SIMPLE_MENU_MODE_FIELD_NAMES = ["state", "optionSelectedFlag", "selectedIndex"];

const INPUT_MODE_FIELD_NAMES = [
    "state",
    "nameIndex",
    "delay",
    "selectedIndex",
    "message",
    "armDelay",
    "extraAxisBaselines",
    "extraAxisUpDown",
    "extraAxisDownDown",
    "extraAxisLeftDown",
    "extraAxisRightDown"
];

const INTRO_MAP_MODE_FIELD_NAMES = ["delay", "state"];

const MAP_MODE_FIELD_NAMES = ["state", "delay", "jeepY", "soldierDelay", "targetJeepY"];

const JEEP_HERE_MODE_FIELD_NAMES = ["state", "jeepHereX", "delay"];

const JEEP_YEAH_MODE_FIELD_NAMES = ["smokeX", "smokeY", "bulletDelay", "yeahVisible", "yeah", "state"];

const JEEP_YEAH_PLANE_FIELD_NAMES = ["x", "y", "z", "left", "angle"];

const JEEP_YEAH_EXPLOSION_FIELD_NAMES = [
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
];

const JEEP_YEAH_FIRE_FIELD_NAMES = ["scale", "state", "x", "y", "delay"];

const JEEP_YEAH_BULLET_FIELD_NAMES = ["x", "y", "vx", "vy", "angle", "remove", "scale"];

const SUNSET_MODE_FIELD_NAMES = [
    "sunOffset",
    "sunOffsetCounter",
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
];

const HARD_ENDING_MODE_FIELD_NAMES = ["finalScore", "finalScoreX", "state", "lineIndex", "lineLength", "cardIndex", "delay", "creditsY", "jeepX", "rumble"];

const SKIPPED_INSTANCE_FIELDS = new Set([
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

const RUNTIME_ENEMY_BULLET_SPRITE_FIELD = "__jackalEnemyBulletSprite";
const RUNTIME_FLOOR_GUN_PLAIN_FIELD = "__jackalFloorGunPlain";
const RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD = "__jackalTileDebrisSpriteTile";
const ENEMY_BULLET_SPRITE_CANNONBALL = "cannonball";
const ENEMY_BULLET_SPRITE_WHITE = "white";
const ENEMY_BULLET_SPRITE_YELLOW = "yellow";

const SONG_IDS = [
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
];

const STANDALONE_MODE_IDS = ["INTRO", "HERE", "YEAH", "WE_MADE_IT", "SUNSET", "HARD_ENDING", "MAP", "CONTINUE", "DIFFICULTY", "OPTIONS", "INPUT", "INTRO_MAP"];
const MENU_EXTRA_MODE_IDS = ["INTRO", "CONTINUE", "DIFFICULTY", "OPTIONS"];
const JEEP_YEAH_EXTRA_MODE_IDS = ["YEAH", "WE_MADE_IT"];
const MUSIC_ID_SUFFIXES = ["intro", "intro2", "loop"];
const GAME_MODE_LAYER_COUNT = 8;
const STAGE_COUNT = 6;

export class JackalGameStateSerializer {
    public createSnapshot(main: Main, appVersion: string): JackalGameStateSnapshot {
        const activeMode = main.mode as object | null;
        if (activeMode instanceof GameMode && activeMode.player instanceof Player) {
            return this.createGameModeSnapshot(main, activeMode, activeMode.player, appVersion);
        }

        if (activeMode === null) {
            throw new Error("Jackal save requires an active mode.");
        }
        return this.createStandaloneModeSnapshot(main, activeMode, appVersion);
    }

    public restoreSnapshot(main: Main, gc: GameContainer, snapshot: JackalGameStateSnapshot): void {
        if (!this.isSupportedSnapshot(snapshot)) {
            throw new Error("Unsupported Jackal game-state snapshot.");
        }

        if (snapshot.kind === "game") {
            this.restoreGameModeSnapshot(main, gc, snapshot);
            return;
        }

        this.restoreStandaloneModeSnapshot(main, gc, snapshot);
    }

    public isSupportedSnapshot(snapshot: unknown): snapshot is JackalGameStateSnapshot {
        if (!this.isRecord(snapshot) || snapshot.version !== GAME_STATE_VERSION || (snapshot.kind !== "game" && snapshot.kind !== "mode")) {
            return false;
        }
        if (!this.isBaseSnapshot(snapshot, snapshot.kind)) {
            return false;
        }
        if (snapshot.kind === "game") {
            return this.isGameStateSnapshot(snapshot);
        }
        return this.isStandaloneStateSnapshot(snapshot);
    }

    private isBaseSnapshot(snapshot: UnknownRecord, kind: "game" | "mode"): boolean {
        return (
            typeof snapshot.appVersion === "string" &&
            typeof snapshot.savedAt === "string" &&
            this.isEncodedRecord(snapshot.mainFields, new Set<number>()) &&
            this.hasEncodedFields(snapshot.mainFields, MAIN_FIELD_NAMES, new Set<number>()) &&
            this.isRestorableMainFields(snapshot.mainFields as EncodedRecord, kind) &&
            (snapshot.konamiCodeFields === null || this.isEncodedRecord(snapshot.konamiCodeFields, new Set<number>())) &&
            this.isRandomSnapshot(snapshot.random) &&
            this.isNonNegativeInteger(snapshot.friendlySoldierCount) &&
            this.isNullableSongId(snapshot.currentSongId) &&
            this.isNullableSongId(snapshot.requestedSongId) &&
            this.isSongSnapshot(snapshot.currentSongState) &&
            this.isAudioStateSnapshot(snapshot.audioState)
        );
    }

    private isGameStateSnapshot(snapshot: UnknownRecord): snapshot is JackalGameModeStateSnapshot {
        if (
            !this.isRecord(snapshot.gameMode) ||
            !this.isEncodedRecord(snapshot.gameMode.fields) ||
            !this.hasEncodedFields(snapshot.gameMode.fields, GAME_MODE_FIELD_NAMES)
        ) {
            return false;
        }
        if (!Array.isArray(snapshot.gameMode.entities) || !Array.isArray(snapshot.gameMode.elements) || !this.isEncodedRecord(snapshot.playerFields)) {
            return false;
        }

        const entityIds = new Set<number>();
        for (const entitySnapshot of snapshot.gameMode.entities) {
            if (
                !this.isRecord(entitySnapshot) ||
                !this.isNonNegativeInteger(entitySnapshot.id) ||
                entityIds.has(entitySnapshot.id) ||
                !this.isGameElementType(entitySnapshot.type)
            ) {
                return false;
            }
            entityIds.add(entitySnapshot.id);
        }

        if (!this.isEncodedRecord(snapshot.playerFields, entityIds) || !this.isEncodedRecord(snapshot.gameMode.fields, entityIds)) {
            return false;
        }

        for (const entitySnapshot of snapshot.gameMode.entities) {
            if (!this.isRecord(entitySnapshot) || !this.isEncodedRecord(entitySnapshot.fields, entityIds)) {
                return false;
            }
        }

        return this.isElementLayers(snapshot.gameMode.elements, entityIds);
    }

    private isStandaloneStateSnapshot(snapshot: UnknownRecord): snapshot is JackalStandaloneModeStateSnapshot {
        if (!this.isStandaloneModeId(snapshot.modeId) || !this.isEncodedRecord(snapshot.modeFields, new Set<number>())) {
            return false;
        }
        if (!this.hasEncodedFields(snapshot.modeFields, this.modeFieldsForModeId(snapshot.modeId), new Set<number>())) {
            return false;
        }
        return this.isModeExtraSnapshot(snapshot.modeId, snapshot.modeExtra);
    }

    private isRestorableMainFields(fields: EncodedRecord, _kind: "game" | "mode"): boolean {
        return (
            this.isNonNegativeInteger(fields.loadIndex) &&
            fields.loadIndex >= 42 &&
            this.isIntegerInRange(fields.stageIndex, 0, STAGE_COUNT - 1) &&
            typeof fields.hardMode === "boolean"
        );
    }

    private isElementLayers(value: unknown, entityIds: Set<number>): boolean {
        if (!Array.isArray(value) || value.length !== GAME_MODE_LAYER_COUNT) {
            return false;
        }
        const layerRefs = new Set<number>();
        for (const layer of value) {
            if (!Array.isArray(layer)) {
                return false;
            }
            for (const id of layer) {
                if (!this.isNonNegativeInteger(id) || !entityIds.has(id) || layerRefs.has(id)) {
                    return false;
                }
                layerRefs.add(id);
            }
        }
        return true;
    }

    private isModeExtraSnapshot(modeId: string, extra: unknown): boolean {
        if (MENU_EXTRA_MODE_IDS.includes(modeId)) {
            return this.isRecord(extra) && this.isMenuSnapshot(extra.menu);
        }
        if (modeId === "INPUT") {
            return this.isRecord(extra) && this.isInputModeExtraSnapshot(extra.input);
        }
        if (JEEP_YEAH_EXTRA_MODE_IDS.includes(modeId)) {
            return this.isRecord(extra) && this.isJeepYeahModeExtraSnapshot(extra.jeepYeah);
        }
        return typeof extra === "undefined";
    }

    private isMenuSnapshot(value: unknown): value is MenuSnapshot | null {
        if (value === null) {
            return true;
        }
        return this.isRecord(value) && this.hasEncodedFields(value.fields, MENU_FIELD_NAMES, new Set<number>());
    }

    private isButtonMappingSnapshot(value: unknown): value is ButtonMappingSnapshot | null {
        if (value === null) {
            return true;
        }
        return this.isRecord(value) && this.hasEncodedFields(value.fields, BUTTON_MAPPING_FIELD_NAMES, new Set<number>());
    }

    private isInputModeExtraSnapshot(value: unknown): value is InputModeExtraSnapshot {
        return (
            this.isRecord(value) &&
            this.isMenuSnapshot(value.menu) &&
            this.isButtonMappingSnapshot(value.draftButtonMapping) &&
            this.isIntegerArray(value.assignedKeys) &&
            this.isIntegerArray(value.assignedControllerButtons)
        );
    }

    private isJeepYeahModeExtraSnapshot(value: unknown): value is JeepYeahModeExtraSnapshot {
        if (!this.isRecord(value) || !Array.isArray(value.bullets)) {
            return false;
        }
        if (
            !this.isNullableEncodedRecord(value.explosion) ||
            !this.isNullableEncodedRecord(value.leftPlane) ||
            !this.isNullableEncodedRecord(value.rightPlane) ||
            !this.isNullableEncodedRecord(value.fireLeft) ||
            !this.isNullableEncodedRecord(value.fireRight)
        ) {
            return false;
        }
        return value.bullets.every((bullet) => this.isEncodedRecord(bullet, new Set<number>()));
    }

    private isNullableEncodedRecord(value: unknown): value is EncodedRecord | null {
        return value === null || this.isEncodedRecord(value, new Set<number>());
    }

    private hasEncodedFields(value: unknown, fields: readonly string[], entityIds?: Set<number>): boolean {
        if (!this.isEncodedRecord(value, entityIds)) {
            return false;
        }
        const record = value as UnknownRecord;
        return fields.every((field) => Object.prototype.hasOwnProperty.call(record, field));
    }

    private isEncodedRecord(value: unknown, entityIds?: Set<number>): value is EncodedRecord {
        if (!this.isRecord(value)) {
            return false;
        }
        return Object.values(value).every((entry) => this.isEncodedValue(entry, entityIds));
    }

    private isEncodedValue(value: unknown, entityIds?: Set<number>): value is EncodedValue {
        if (value === null || typeof value === "string" || typeof value === "boolean") {
            return true;
        }
        if (typeof value === "number") {
            return Number.isFinite(value);
        }
        if (!this.isRecord(value) || typeof value.kind !== "string") {
            return false;
        }

        switch (value.kind) {
            case "nonFiniteNumber":
                return value.value === "NaN" || value.value === "Infinity" || value.value === "-Infinity";
            case "bigint":
                return typeof value.value === "string" && /^-?\d+$/.test(value.value);
            case "array":
            case "arrayList":
                return Array.isArray(value.items) && value.items.every((item) => this.isEncodedValue(item, entityIds));
            case "entityRef":
                return this.isNonNegativeInteger(value.id) && (typeof entityIds === "undefined" || entityIds.has(value.id));
            case "playerRef":
            case "mainRef":
            case "gameModeRef":
            case "nullRef":
                return true;
            default:
                return false;
        }
    }

    private isRandomSnapshot(value: unknown): value is RandomSnapshot {
        return this.isRecord(value) && Number.isFinite(value.seed0) && Number.isFinite(value.seed1) && Number.isFinite(value.seed2);
    }

    private isAudioStateSnapshot(value: unknown): value is AudioStateSnapshot {
        return this.isRecord(value) && typeof value.musicOn === "boolean" && typeof value.soundOn === "boolean";
    }

    private isSongSnapshot(value: unknown): value is SongSnapshot | null {
        if (value === null) {
            return true;
        }
        return (
            this.isRecord(value) &&
            this.isSongId(value.id) &&
            typeof value.playing === "boolean" &&
            typeof value.playedIntro2 === "boolean" &&
            this.isMusicSnapshot(value.activeMusic)
        );
    }

    private isMusicSnapshot(value: unknown): value is MusicSnapshot | null {
        if (value === null) {
            return true;
        }
        return (
            this.isRecord(value) &&
            this.isMusicId(value.id) &&
            typeof value.looped === "boolean" &&
            typeof value.paused === "boolean" &&
            typeof value.playing === "boolean" &&
            Number.isFinite(value.playbackRate) &&
            Number.isFinite(value.position) &&
            Number.isFinite(value.volume)
        );
    }

    private isNullableSongId(value: unknown): value is string | null {
        return value === null || this.isSongId(value);
    }

    private isSongId(value: unknown): value is string {
        return typeof value === "string" && SONG_IDS.includes(value);
    }

    private isMusicId(value: unknown): value is string {
        if (typeof value !== "string") {
            return false;
        }
        const dot = value.lastIndexOf(".");
        if (dot < 0) {
            return false;
        }
        return SONG_IDS.includes(value.substring(0, dot)) && MUSIC_ID_SUFFIXES.includes(value.substring(dot + 1));
    }

    private isStandaloneModeId(value: unknown): value is string {
        return typeof value === "string" && STANDALONE_MODE_IDS.includes(value);
    }

    private isGameElementType(value: unknown): value is GameElementTypeId {
        return isGameElementTypeId(value);
    }

    private isIntegerArray(value: unknown): value is number[] {
        return Array.isArray(value) && value.every((entry) => this.isNonNegativeInteger(entry));
    }

    private isIntegerInRange(value: unknown, minimum: number, maximum: number): value is number {
        return typeof value === "number" && Number.isInteger(value) && value >= minimum && value <= maximum;
    }

    private isNonNegativeInteger(value: unknown): value is number {
        return typeof value === "number" && Number.isInteger(value) && value >= 0;
    }

    private isRecord(value: unknown): value is UnknownRecord {
        return value !== null && typeof value === "object" && !Array.isArray(value);
    }

    private createGameModeSnapshot(main: Main, gameMode: GameMode, player: Player, appVersion: string): JackalGameModeStateSnapshot {
        const context = this.createEntityContext(main, gameMode, gameMode.player);
        const entities = context.entities.map((entity) => this.createEntitySnapshot(entity, context));
        return {
            kind: "game",
            ...this.createBaseSnapshot(main, appVersion, context),
            gameMode: {
                fields: this.encodeNamedFields(gameMode, GAME_MODE_FIELD_NAMES, context),
                elements: this.snapshotElementLayers(gameMode, context),
                entities
            },
            playerFields: this.encodeObjectFields(player, context)
        };
    }

    private createStandaloneModeSnapshot(main: Main, mode: object, appVersion: string): JackalStandaloneModeStateSnapshot {
        const context = this.createModeContext(main);
        const modeId = this.modeIdForMode(mode);
        return {
            kind: "mode",
            ...this.createBaseSnapshot(main, appVersion, context),
            modeId,
            modeFields: this.encodeNamedFields(mode, this.modeFieldsForModeId(modeId), context),
            modeExtra: this.createModeExtraSnapshot(modeId, mode, context)
        };
    }

    private createBaseSnapshot(main: Main, appVersion: string, context: EntityContext): Omit<JackalBaseStateSnapshot, "kind"> {
        return {
            version: GAME_STATE_VERSION,
            appVersion,
            savedAt: new Date().toISOString(),
            mainFields: this.encodeNamedFields(main, MAIN_FIELD_NAMES, context),
            konamiCodeFields: main.konamiCode === null ? null : this.encodeObjectFields(main.konamiCode, context),
            random: this.snapshotRandom(main.random),
            friendlySoldierCount: FriendlySoldier.count,
            currentSongId: this.songIdFor(main, main.currentSong),
            requestedSongId: this.songIdFor(main, main.requestedSong),
            currentSongState: this.createSongSnapshot(main, main.currentSong),
            audioState: this.createAudioStateSnapshot(main)
        };
    }

    private createAudioStateSnapshot(main: Main): AudioStateSnapshot {
        if (main.browserSuspended) {
            return {
                musicOn: Boolean(main.browserSuspendedMusicOn),
                soundOn: Boolean(main.browserSuspendedSoundOn)
            };
        }
        return {
            musicOn: main.gc === null ? true : main.gc.isMusicOn(),
            soundOn: main.gc === null ? true : main.gc.isSoundOn()
        };
    }

    private restoreGameModeSnapshot(main: Main, gc: GameContainer, snapshot: JackalGameModeStateSnapshot): void {
        const gameMode = new GameMode();
        Main.mainInstance = main;
        Main.gameMode = gameMode;
        gameMode.setStage(
            snapshot.mainFields.stageIndex as number,
            main.stages[snapshot.mainFields.stageIndex as number],
            snapshot.mainFields.hardMode as boolean
        );
        gameMode.init(main, gc);
        const player = gameMode.player as Player;

        const entitiesById = new Map<number, GameElement>();
        for (const entitySnapshot of snapshot.gameMode.entities) {
            const constructor = this.constructorFor(entitySnapshot.type);
            entitiesById.set(entitySnapshot.id, Object.create(constructor.prototype) as GameElement);
        }

        const context: RestoreContext = {
            main,
            gameMode,
            gc,
            player,
            entitiesById,
            audioState: snapshot.audioState
        };

        this.decodeFieldsInto(main, snapshot.mainFields, context, MAIN_JAVA_FLOAT_FIELDS);
        main.random = this.restoreRandom(snapshot.random);
        this.restoreKonamiCode(main, snapshot, context);

        this.decodeFieldsInto(gameMode, snapshot.gameMode.fields, context, GAME_MODE_JAVA_FLOAT_FIELDS);
        this.decodeFieldsInto(player, snapshot.playerFields, context, PLAYER_JAVA_FLOAT_FIELDS);
        this.restoreBackPointers(main, gameMode, player, gc);

        for (const entitySnapshot of snapshot.gameMode.entities) {
            const entity = entitiesById.get(entitySnapshot.id);
            if (entity === undefined) {
                throw new Error(`Missing restored entity ${entitySnapshot.id}.`);
            }
            this.decodeFieldsInto(entity, entitySnapshot.fields, context, GAME_ELEMENT_JAVA_FLOAT_FIELDS[entitySnapshot.type]);
            this.normalizeTranslatedEntityFields(entity);
            this.restoreEntityRuntimePointers(entity, main, gameMode);
        }

        this.restoreElementLayers(gameMode, snapshot.gameMode.elements, entitiesById);
        this.rebuildGameModeIndexes(gameMode);
        FriendlySoldier.count = snapshot.friendlySoldierCount;
        main.mode = gameMode;
        this.restoreFadeListener(main, gameMode);
        this.restoreSongPlayback(context, snapshot);
        main.resetNextFrameTime();
        main.clearInputPressedRecords();
    }

    private restoreStandaloneModeSnapshot(main: Main, gc: GameContainer, snapshot: JackalStandaloneModeStateSnapshot): void {
        Main.mainInstance = main;
        Main.gameMode = null!;

        const context: RestoreContext = {
            main,
            gameMode: null,
            gc,
            player: null,
            entitiesById: new Map<number, GameElement>(),
            audioState: snapshot.audioState
        };

        this.decodeFieldsInto(main, snapshot.mainFields, context, MAIN_JAVA_FLOAT_FIELDS);
        main.random = this.restoreRandom(snapshot.random);
        this.restoreKonamiCode(main, snapshot, context);

        const mode = this.createStandaloneMode(snapshot.modeId);
        mode.init(main, gc);
        this.decodeFieldsInto(main, snapshot.mainFields, context, MAIN_JAVA_FLOAT_FIELDS);
        main.random = this.restoreRandom(snapshot.random);
        this.decodeFieldsInto(mode, snapshot.modeFields, context, STANDALONE_MODE_JAVA_FLOAT_FIELDS[snapshot.modeId] ?? []);
        this.restoreModeRuntimePointers(mode, main, gc);
        this.restoreModeExtraSnapshot(mode, snapshot.modeExtra, context);

        FriendlySoldier.count = snapshot.friendlySoldierCount;
        main.mode = mode;
        this.restoreFadeListener(main, mode);
        this.restoreSongPlayback(context, snapshot);
        main.resetNextFrameTime();
        main.clearInputPressedRecords();
    }

    private createModeContext(main: Main): EntityContext {
        return {
            main,
            gameMode: null,
            player: null,
            ids: new Map<object, number>(),
            entities: []
        };
    }

    private restoreKonamiCode(main: Main, snapshot: JackalGameStateSnapshot, context: RestoreContext): void {
        if (snapshot.konamiCodeFields === null) {
            main.konamiCode = null!;
            return;
        }
        main.konamiCode = Object.create(KonamiCode.prototype);
        this.decodeFieldsInto(main.konamiCode, snapshot.konamiCodeFields, context);
        main.konamiCode.main = main;
        main.konamiCode.input = main.input;
    }

    private restoreFadeListener(main: Main, mode: object): void {
        if (main.fading && typeof (mode as { fadeCompleted?: unknown }).fadeCompleted === "function") {
            main.fadeListener = mode as IFadeListener;
        } else {
            main.fadeListener = null!;
        }
    }

    private modeIdForMode(mode: object): string {
        if (mode instanceof IntroMode) {
            return "INTRO";
        }
        if (mode instanceof JeepHereMode) {
            return "HERE";
        }
        if (mode instanceof JeepYeahMode) {
            return mode.yeah ? "YEAH" : "WE_MADE_IT";
        }
        if (mode instanceof SunsetMode) {
            return "SUNSET";
        }
        if (mode instanceof HardEndingMode) {
            return "HARD_ENDING";
        }
        if (mode instanceof MapMode) {
            return "MAP";
        }
        if (mode instanceof ContinueMode) {
            return "CONTINUE";
        }
        if (mode instanceof DifficultyMode) {
            return "DIFFICULTY";
        }
        if (mode instanceof OptionsMode) {
            return "OPTIONS";
        }
        if (mode instanceof InputMode) {
            return "INPUT";
        }
        if (mode instanceof IntroMapMode) {
            return "INTRO_MAP";
        }
        throw new Error(`Unsupported Jackal mode for game-state save: ${mode.constructor?.name ?? "unknown"}.`);
    }

    private createStandaloneMode(modeId: string): IMode {
        switch (modeId) {
            case "INTRO":
                return new IntroMode();
            case "HERE":
                return new JeepHereMode();
            case "YEAH":
                return new JeepYeahMode(true);
            case "WE_MADE_IT":
                return new JeepYeahMode(false);
            case "SUNSET":
                return new SunsetMode();
            case "HARD_ENDING":
                return new HardEndingMode();
            case "MAP":
                return new MapMode();
            case "CONTINUE":
                return new ContinueMode();
            case "DIFFICULTY":
                return new DifficultyMode();
            case "OPTIONS":
                return new OptionsMode();
            case "INPUT":
                return new InputMode();
            case "INTRO_MAP":
                return new IntroMapMode();
            default:
                throw new Error(`Unsupported Jackal mode in saved game state: ${modeId}.`);
        }
    }

    private modeFieldsForModeId(modeId: string): string[] {
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
            default:
                throw new Error(`Unsupported Jackal mode field map: ${modeId}.`);
        }
    }

    private createModeExtraSnapshot(modeId: string, mode: object, context: EntityContext): GenericModeExtraSnapshot | undefined {
        switch (modeId) {
            case "INTRO":
            case "CONTINUE":
            case "DIFFICULTY":
            case "OPTIONS":
                return {
                    menu: this.createMenuSnapshot((mode as MenuMode).menu, context)
                };
            case "INPUT":
                return {
                    input: this.createInputModeExtraSnapshot(mode as InputMode, context)
                };
            case "YEAH":
            case "WE_MADE_IT":
                return {
                    jeepYeah: this.createJeepYeahModeExtraSnapshot(mode as JeepYeahMode, context)
                };
            default:
                return undefined;
        }
    }

    private createMenuSnapshot(menu: Menu | null, context: EntityContext): MenuSnapshot | null {
        if (menu === null) {
            return null;
        }
        return {
            fields: this.encodeNamedFields(menu, MENU_FIELD_NAMES, context)
        };
    }

    private createButtonMappingSnapshot(buttonMapping: ButtonMapping | null, context: EntityContext): ButtonMappingSnapshot | null {
        if (buttonMapping === null) {
            return null;
        }
        return {
            fields: this.encodeNamedFields(buttonMapping, BUTTON_MAPPING_FIELD_NAMES, context)
        };
    }

    private createInputModeExtraSnapshot(mode: InputMode, context: EntityContext): InputModeExtraSnapshot {
        const mutableMode = mode;
        return {
            menu: this.createMenuSnapshot(mutableMode.menu, context),
            draftButtonMapping: this.createButtonMappingSnapshot(mutableMode.draftButtonMapping, context),
            assignedKeys: Array.from(mutableMode.assignedKeys ?? []),
            assignedControllerButtons: Array.from(mutableMode.assignedControllerButtons ?? [])
        };
    }

    private createJeepYeahModeExtraSnapshot(mode: JeepYeahMode, context: EntityContext): JeepYeahModeExtraSnapshot {
        const mutableMode = mode;
        const bullets: EncodedRecord[] = [];
        if (mutableMode.bullets !== null) {
            for (let i = 0; i < mutableMode.bullets.size(); i++) {
                bullets.push(this.encodeLegacyJeepYeahFields(mutableMode.bullets.get(i), JEEP_YEAH_BULLET_FIELD_NAMES, context));
            }
        }
        return {
            explosion: this.encodeNullableLegacyJeepYeahFields(mutableMode.explosion, JEEP_YEAH_EXPLOSION_FIELD_NAMES, context),
            leftPlane: this.encodeNullableNamedFields(mutableMode.leftPlane, JEEP_YEAH_PLANE_FIELD_NAMES, context),
            rightPlane: this.encodeNullableNamedFields(mutableMode.rightPlane, JEEP_YEAH_PLANE_FIELD_NAMES, context),
            fireLeft: this.encodeNullableNamedFields(mutableMode.fireLeft, JEEP_YEAH_FIRE_FIELD_NAMES, context),
            fireRight: this.encodeNullableNamedFields(mutableMode.fireRight, JEEP_YEAH_FIRE_FIELD_NAMES, context),
            bullets
        };
    }

    private encodeNullableNamedFields(source: object | null, names: string[], context: EntityContext): EncodedRecord | null {
        return source === null ? null : this.encodeNamedFields(source, names, context);
    }

    private restoreModeExtraSnapshot(mode: object, extra: GenericModeExtraSnapshot | undefined, context: RestoreContext): void {
        if (extra === undefined) {
            return;
        }
        if (extra.menu !== undefined) {
            this.restoreModeMenu(mode, extra.menu, context);
        }
        if (extra.input !== undefined && mode instanceof InputMode) {
            this.restoreInputModeExtraSnapshot(mode, extra.input, context);
        }
        if (extra.jeepYeah !== undefined && mode instanceof JeepYeahMode) {
            this.restoreJeepYeahModeExtraSnapshot(mode, extra.jeepYeah, context);
        }
    }

    private restoreModeMenu(mode: object, snapshot: MenuSnapshot | null, context: RestoreContext): void {
        const mutableMode = mode as MenuMode;
        if (snapshot === null) {
            mutableMode.menu = null;
            return;
        }
        if (mutableMode.menu === null) {
            mutableMode.menu = Object.create(Menu.prototype);
        }
        this.decodeFieldsInto(mutableMode.menu!, snapshot.fields, context, MENU_JAVA_FLOAT_FIELDS);
        this.restoreMenuRuntimePointers(mutableMode.menu!, context.main, mode);
    }

    private restoreInputModeExtraSnapshot(mode: InputMode, snapshot: InputModeExtraSnapshot, context: RestoreContext): void {
        const mutableMode = mode;
        this.restoreModeMenu(mode, snapshot.menu, context);
        if (snapshot.draftButtonMapping === null) {
            mutableMode.draftButtonMapping = null!;
        } else {
            mutableMode.draftButtonMapping = new ButtonMapping();
            this.decodeFieldsInto(mutableMode.draftButtonMapping, snapshot.draftButtonMapping.fields, context);
        }
        mutableMode.assignedKeys = new Set(snapshot.assignedKeys);
        mutableMode.assignedControllerButtons = new Set(snapshot.assignedControllerButtons);
        this.restoreInputModeListenerState(mutableMode as unknown as InputModeListenerControls);
    }

    private restoreInputModeListenerState(mode: InputModeListenerControls): void {
        if (mode.listeningForInput && typeof mode.removeInputListeners === "function") {
            mode.removeInputListeners();
        }
        mode.listeningForInput = false;
        if ((mode.state === InputMode.STATE_READING || mode.state === InputMode.STATE_READ_FADE) && typeof mode.addInputListeners === "function") {
            mode.addInputListeners();
        }
    }

    private restoreJeepYeahModeExtraSnapshot(mode: JeepYeahMode, snapshot: JeepYeahModeExtraSnapshot, context: RestoreContext): void {
        const mutableMode = mode;
        mutableMode.explosion = this.restoreNullableTypedRecord(JeepYeahExplosion, snapshot.explosion, context, JEEP_YEAH_EXPLOSION_JAVA_FLOAT_FIELDS)!;
        this.normalizeLegacyJeepYeahRemoval(mutableMode.explosion);
        mutableMode.leftPlane = this.restoreNullableTypedRecord(JeepYeahPlane, snapshot.leftPlane, context, JEEP_YEAH_PLANE_JAVA_FLOAT_FIELDS)!;
        mutableMode.rightPlane = this.restoreNullableTypedRecord(JeepYeahPlane, snapshot.rightPlane, context, JEEP_YEAH_PLANE_JAVA_FLOAT_FIELDS)!;
        mutableMode.fireLeft = this.restoreNullableTypedRecord(JeepYeahFireLeft, snapshot.fireLeft, context, JEEP_YEAH_FIRE_LEFT_JAVA_FLOAT_FIELDS)!;
        mutableMode.fireRight = this.restoreNullableTypedRecord(JeepYeahFireRight, snapshot.fireRight, context, JEEP_YEAH_FIRE_RIGHT_JAVA_FLOAT_FIELDS)!;
        mutableMode.bullets = new ArrayList<JeepYeahBullet>(snapshot.bullets.length);
        for (const bulletSnapshot of snapshot.bullets) {
            const bullet = Object.create(JeepYeahBullet.prototype) as JeepYeahBullet;
            this.decodeFieldsInto(bullet, bulletSnapshot, context, JEEP_YEAH_BULLET_JAVA_FLOAT_FIELDS);
            this.normalizeLegacyJeepYeahRemoval(bullet);
            mutableMode.bullets.add(bullet);
        }
    }

    /**
     * Java lets Fire/Explosion hide GameElement.enemy:boolean with Enemy enemy.
     * JavaScript has one property namespace, so the translated reference is sourceEnemy.
     * Also migrates snapshots written before the two Java fields were separated.
     */
    private normalizeTranslatedEntityFields(entity: object): void {
        if (!(entity instanceof Fire) && !(entity instanceof Explosion)) {
            return;
        }

        const mutableEntity = entity as { enemy?: unknown; sourceEnemy?: unknown };
        if (!Object.prototype.hasOwnProperty.call(mutableEntity, "sourceEnemy")) {
            mutableEntity.sourceEnemy = mutableEntity.enemy !== null && typeof mutableEntity.enemy === "object" ? mutableEntity.enemy : null;
        }
        mutableEntity.enemy = false;
    }

    /** Migrates JeepYeah snapshots produced by the old accidental removeFlag translation. */
    private normalizeLegacyJeepYeahRemoval(value: { remove: boolean; removeFlag?: unknown } | null): void {
        if (value === null) {
            return;
        }
        if (value.removeFlag === true) {
            value.remove = true;
        }
        delete value.removeFlag;
    }

    private restoreNullableTypedRecord<T extends object>(
        constructor: { prototype: T },
        snapshot: EncodedRecord | null,
        context: RestoreContext,
        javaFloatFields: JavaFloatStateSpec
    ): T | null {
        if (snapshot === null) {
            return null;
        }
        const value = Object.create(constructor.prototype) as T;
        this.decodeFieldsInto(value, snapshot, context, javaFloatFields);
        return value;
    }

    private restoreModeRuntimePointers(mode: object, main: Main, gc: GameContainer): void {
        const mutableMode = mode as ModeRuntimePointers;
        mutableMode.main = main;
        mutableMode.gc = gc;
        if ("input" in mutableMode) {
            mutableMode.input = main.input;
        }
        if ("buttonMapping" in mutableMode) {
            mutableMode.buttonMapping = main.buttonMapping;
        }
        if (mutableMode.menu !== null && typeof mutableMode.menu !== "undefined") {
            this.restoreMenuRuntimePointers(mutableMode.menu, main, mode);
        }
    }

    private restoreMenuRuntimePointers(menu: Menu, main: Main, listener: object): void {
        const mutableMenu = menu;
        mutableMenu.main = main;
        mutableMenu.input = main.input;
        mutableMenu.menuListener = listener as IMenuListener;
    }

    private createEntityContext(main: Main, gameMode: GameMode, player: Player): EntityContext {
        const ids = new Map<object, number>();
        const entities: GameElement[] = [];
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i);
                if (entity !== null && !ids.has(entity)) {
                    ids.set(entity, entities.length);
                    entities.push(entity);
                }
            }
        }
        return { main, gameMode, player, ids, entities };
    }

    private createEntitySnapshot(entity: GameElement, context: EntityContext): EntitySnapshot {
        const type = getGameElementTypeId(entity);
        const id = context.ids.get(entity);
        if (id === undefined) {
            throw new Error(`Unregistered Jackal entity: ${type}`);
        }
        const fields = this.encodeEntityFields(entity, context);
        this.encodeEntityRuntimeFields(entity, fields, context);
        return {
            id,
            type,
            fields
        };
    }

    private snapshotElementLayers(gameMode: GameMode, context: EntityContext): number[][] {
        const layers: number[][] = [];
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            const ids: number[] = [];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i);
                const id = context.ids.get(entity);
                if (id === undefined) {
                    throw new Error(`Unregistered entity in layer ${layer}.`);
                }
                ids.push(id);
            }
            layers.push(ids);
        }
        return layers;
    }

    private restoreElementLayers(gameMode: GameMode, layers: number[][], entitiesById: Map<number, GameElement>): void {
        gameMode.elements = new Array(8);
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = new ArrayList<GameElement>(256);
            const ids = layers[layer] ?? [];
            for (const id of ids) {
                const entity = entitiesById.get(id);
                if (entity === undefined) {
                    throw new Error(`Missing layer entity ${id}.`);
                }
                list.add(entity);
            }
            gameMode.elements[layer] = list;
        }
    }

    private rebuildGameModeIndexes(gameMode: GameMode): void {
        gameMode.enemies = new ArrayList<Enemy>(256);
        gameMode.solids = new ArrayList<Enemy>(256);
        gameMode.mines = new ArrayList<Enemy>(256);
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i);
                if (entity.enemy) {
                    gameMode.enemies.add(entity as Enemy);
                    if ((entity as Enemy).solid) {
                        gameMode.solids.add(entity as Enemy);
                    }
                    if ((entity as Enemy).mine) {
                        gameMode.mines.add(entity as Enemy);
                    }
                }
            }
        }
        gameMode.player.mines = gameMode.mines;
        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i) as GameElementRuntimePointers;
                entity.solids = gameMode.solids;
                entity.enemies = gameMode.enemies;
                entity.mines = gameMode.mines;
                entity.player = gameMode.player;
            }
        }
    }

    private restoreBackPointers(main: Main, gameMode: GameMode, player: Player, gc: GameContainer): void {
        main.gc = gc;
        gameMode.main = main;
        gameMode.gc = gc;
        gameMode.input = main.input;
        gameMode.player = player;
        const mutablePlayer = player as unknown as PlayerRuntimePointers;
        mutablePlayer.main = main;
        mutablePlayer.gameMode = gameMode;
        mutablePlayer.input = main.input;
        mutablePlayer.mines = gameMode.mines;
    }

    private restoreEntityRuntimePointers(entity: GameElement, main: Main, gameMode: GameMode): void {
        const mutableEntity = entity as GameElementRuntimePointers;
        mutableEntity.main = main;
        mutableEntity.gameMode = gameMode;
        mutableEntity.solids = gameMode.solids;
        mutableEntity.enemies = gameMode.enemies;
        mutableEntity.mines = gameMode.mines;
        mutableEntity.player = gameMode.player;
        this.restoreEntityRuntimeImages(mutableEntity, main, gameMode);
        this.clearEntityRuntimeFields(mutableEntity);
    }

    private encodeEntityRuntimeFields(entity: GameElement, fields: EncodedRecord, context: EntityContext): void {
        const mutableEntity = entity as unknown as EntityPersistenceView;
        if (entity instanceof EnemyBullet) {
            fields[RUNTIME_ENEMY_BULLET_SPRITE_FIELD] = this.enemyBulletSpriteId(mutableEntity.sprite, context.main);
        } else if (entity instanceof FloorGun) {
            fields[RUNTIME_FLOOR_GUN_PLAIN_FIELD] = this.floorGunUsesPlainSprites(mutableEntity as unknown as FloorGun, context.main);
        } else if (entity instanceof TileDebris) {
            fields[RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD] = this.indexOfReference(context.gameMode!.tiles, mutableEntity.sprite, "TileDebris sprite");
        }
    }

    private restoreEntityRuntimeImages(entity: GameElement, main: Main, gameMode: GameMode): void {
        const mutableEntity = entity as unknown as EntityPersistenceView;
        if (entity instanceof RotatingGun) {
            switch (mutableEntity.type) {
                case RotatingGun.TYPE_GREEN:
                    mutableEntity.sprites = main.greenGuns;
                    break;
                case RotatingGun.TYPE_BROWN:
                    mutableEntity.sprites = main.brownGuns;
                    break;
                default:
                    mutableEntity.sprites = main.grayGuns;
                    break;
            }
        } else if (entity instanceof EnemyBullet) {
            mutableEntity.sprite = this.enemyBulletSpriteById(main, mutableEntity[RUNTIME_ENEMY_BULLET_SPRITE_FIELD]);
        } else if (entity instanceof FloorGun) {
            const plain = mutableEntity[RUNTIME_FLOOR_GUN_PLAIN_FIELD] === true;
            mutableEntity.mask = plain ? main.plainFloorGuns[0] : main.floorGuns[6];
            mutableEntity.panel = plain ? main.plainFloorGuns[1] : main.floorGuns[7];
        } else if (entity instanceof StatueMissile) {
            mutableEntity.sprite = mutableEntity.right ? main.statueMissiles[0] : main.statueMissiles[1];
        } else if (entity instanceof StatueSeekerMissile) {
            mutableEntity.sprite = main.statueMissiles[0];
        } else if (entity instanceof TileDebris) {
            const tile = mutableEntity[RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD];
            if (Number.isInteger(tile) && (tile as number) >= 0 && (tile as number) < gameMode.tiles.length) {
                mutableEntity.sprite = gameMode.tiles[tile as number];
            } else {
                mutableEntity.sprite = gameMode.tiles[gameMode.tileMap[mutableEntity.Y][mutableEntity.X]];
            }
        } else if (entity instanceof BossGarage) {
            if (mutableEntity.state === BossGarage.STATE_CLOSED) {
                mutableEntity.vehicle = null;
            } else {
                mutableEntity.vehicle = mutableEntity.isBrownTank ? main.brownTanks : main.grayTanks;
            }
        }
    }

    private clearEntityRuntimeFields(entity: GameElement): void {
        delete (entity as unknown as Record<string, unknown>)[RUNTIME_ENEMY_BULLET_SPRITE_FIELD];
        delete (entity as unknown as Record<string, unknown>)[RUNTIME_FLOOR_GUN_PLAIN_FIELD];
        delete (entity as unknown as Record<string, unknown>)[RUNTIME_TILE_DEBRIS_SPRITE_TILE_FIELD];
    }

    private enemyBulletSpriteId(sprite: unknown, main: Main): string {
        if (sprite === main.cannonball) {
            return ENEMY_BULLET_SPRITE_CANNONBALL;
        }
        if (sprite === main.whiteBullet) {
            return ENEMY_BULLET_SPRITE_WHITE;
        }
        if (sprite === main.yellowBullet) {
            return ENEMY_BULLET_SPRITE_YELLOW;
        }
        throw new Error("Unable to identify EnemyBullet sprite for game-state save.");
    }

    private enemyBulletSpriteById(main: Main, id: unknown): Main["cannonball"] {
        switch (id) {
            case ENEMY_BULLET_SPRITE_CANNONBALL:
                return main.cannonball;
            case ENEMY_BULLET_SPRITE_WHITE:
                return main.whiteBullet;
            case ENEMY_BULLET_SPRITE_YELLOW:
                return main.yellowBullet;
            default:
                throw new Error("Unsupported EnemyBullet sprite in saved game state.");
        }
    }

    private floorGunUsesPlainSprites(entity: FloorGun, main: Main): boolean {
        if (entity.mask === main.plainFloorGuns[0] && entity.panel === main.plainFloorGuns[1]) {
            return true;
        }
        if (entity.mask === main.floorGuns[6] && entity.panel === main.floorGuns[7]) {
            return false;
        }
        throw new Error("Unable to identify FloorGun sprite set for game-state save.");
    }

    private indexOfReference(values: unknown[], value: unknown, label: string): number {
        for (let i = 0; i < values.length; i++) {
            if (values[i] === value) {
                return i;
            }
        }
        throw new Error(`Unable to identify ${label} for game-state save.`);
    }

    private encodeNamedFields(source: object, names: string[], context: EntityContext): EncodedRecord {
        const record: EncodedRecord = {};
        for (const name of names) {
            record[name] = this.encodeValue((source as Record<string, unknown>)[name], context);
        }
        return record;
    }

    private encodeObjectFields(source: object, context: EntityContext): EncodedRecord {
        const record: EncodedRecord = {};
        for (const key of Object.keys(source)) {
            if (SKIPPED_INSTANCE_FIELDS.has(key)) {
                continue;
            }
            const value = (source as Record<string, unknown>)[key];
            if (typeof value === "function" || typeof value === "undefined") {
                continue;
            }
            record[key] = this.encodeValue(value, context);
        }
        return record;
    }

    /**
     * Keeps the persisted Fire/Explosion shape compatible with releases from before
     * the two Java `enemy` fields were separated in TypeScript. Old and new readers
     * therefore see the Enemy reference under the legacy `enemy` key.
     */
    private encodeEntityFields(entity: GameElement, context: EntityContext): EncodedRecord {
        const record = this.encodeObjectFields(entity, context);
        if (entity instanceof Fire || entity instanceof Explosion) {
            record.enemy = this.encodeValue(entity.sourceEnemy, context);
            delete record.sourceEnemy;
        }
        return record;
    }

    /** Writes the old removeFlag alias so a rolled-back release can read new saves. */
    private encodeLegacyJeepYeahFields(source: JeepYeahBullet | JeepYeahExplosion, names: string[], context: EntityContext): EncodedRecord {
        const record = this.encodeNamedFields(source, names, context);
        record.removeFlag = this.encodeValue(source.remove, context);
        return record;
    }

    private encodeNullableLegacyJeepYeahFields(source: JeepYeahExplosion | null, names: string[], context: EntityContext): EncodedRecord | null {
        return source === null ? null : this.encodeLegacyJeepYeahFields(source, names, context);
    }

    private encodeValue(value: unknown, context: EntityContext): EncodedValue {
        if (typeof value === "number") {
            if (Number.isFinite(value)) {
                return value;
            }
            if (Number.isNaN(value)) {
                return { kind: "nonFiniteNumber", value: "NaN" };
            }
            return { kind: "nonFiniteNumber", value: value < 0 ? "-Infinity" : "Infinity" };
        }
        if (value === null || typeof value === "string" || typeof value === "boolean") {
            return value as EncodedValue;
        }
        if (typeof value === "bigint") {
            return { kind: "bigint", value: value.toString() };
        }
        if (value === context.main) {
            return { kind: "mainRef" };
        }
        if (value === context.gameMode) {
            return { kind: "gameModeRef" };
        }
        if (value === context.player) {
            return { kind: "playerRef" };
        }
        if (value instanceof ArrayList) {
            const items: EncodedValue[] = [];
            for (let i = 0; i < value.size(); i++) {
                items.push(this.encodeValue(value.get(i), context));
            }
            return { kind: "arrayList", items };
        }
        if (Array.isArray(value)) {
            return {
                kind: "array",
                items: value.map((item) => this.encodeValue(item, context))
            };
        }
        if (typeof value === "object") {
            const id = context.ids.get(value as object);
            if (id !== undefined) {
                return { kind: "entityRef", id };
            }
            return { kind: "nullRef" };
        }
        return null;
    }

    private decodeFieldsInto(target: object, fields: EncodedRecord, context: RestoreContext, javaFloatFields: JavaFloatStateSpec = []): void {
        for (const [key, value] of Object.entries(fields)) {
            (target as Record<string, unknown>)[key] = this.decodeValue(value, context);
        }
        normalizeJavaFloatFields(target, javaFloatFields);
    }

    private decodeValue(value: EncodedValue, context: RestoreContext): unknown {
        if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
            return value;
        }
        switch (value.kind) {
            case "nonFiniteNumber":
                switch (value.value) {
                    case "NaN":
                        return Number.NaN;
                    case "Infinity":
                        return Number.POSITIVE_INFINITY;
                    case "-Infinity":
                        return Number.NEGATIVE_INFINITY;
                }
                return Number.NaN;
            case "bigint":
                return BigInt(value.value);
            case "array":
                return value.items.map((item) => this.decodeValue(item, context));
            case "arrayList": {
                const list = new ArrayList<unknown>(value.items.length);
                for (const item of value.items) {
                    list.add(this.decodeValue(item, context));
                }
                return list;
            }
            case "entityRef": {
                const entity = context.entitiesById.get(value.id);
                if (entity === undefined) {
                    throw new Error(`Missing entity reference ${value.id}.`);
                }
                return entity;
            }
            case "playerRef":
                return context.player;
            case "mainRef":
                return context.main;
            case "gameModeRef":
                return context.gameMode;
            case "nullRef":
                return null;
            default:
                return null;
        }
    }

    private snapshotRandom(random: Random): RandomSnapshot {
        return {
            seed0: (random as unknown as JavaRandomState).seed0,
            seed1: (random as unknown as JavaRandomState).seed1,
            seed2: (random as unknown as JavaRandomState).seed2
        };
    }

    private restoreRandom(snapshot: RandomSnapshot): Random {
        const random = Object.create(Random.prototype) as Random;
        const mutableRandom = random as unknown as JavaRandomState;
        mutableRandom.seed0 = snapshot.seed0;
        mutableRandom.seed1 = snapshot.seed1;
        mutableRandom.seed2 = snapshot.seed2;
        return random;
    }

    private constructorFor(type: GameElementTypeId): GameElementConstructor {
        const constructor = GAME_ELEMENT_TYPES[type];
        if (constructor === undefined) {
            throw new Error(`Unsupported Jackal entity type: ${type}`);
        }
        return constructor;
    }

    private songIdFor(main: Main, song: Song | null): string | null {
        if (song === null) {
            return null;
        }
        for (const id of SONG_IDS) {
            if ((main as unknown as Record<string, Song | null | undefined>)[id] === song) {
                return id;
            }
        }
        return null;
    }

    private createSongSnapshot(main: Main, song: Song | null): JackalGameStateSnapshot["currentSongState"] {
        const id = this.songIdFor(main, song);
        if (id === null) {
            return null;
        }

        const songValue = song;
        return {
            id,
            playing: Boolean(songValue!.playing),
            playedIntro2: Boolean(songValue!.playedIntro2),
            activeMusic: this.captureActiveSongMusic(main, songValue!)
        };
    }

    private captureActiveSongMusic(main: Main, song: Song): MusicSnapshot | null {
        const intro = song.intro as Music | null;
        if (intro !== null && this.isMusicActiveForSnapshot(intro)) {
            return this.captureMusic(main, intro);
        }

        const intro2 = song.intro2 as Music | null;
        if (intro2 !== null && this.isMusicActiveForSnapshot(intro2)) {
            return this.captureMusic(main, intro2);
        }

        const loop = song.loop as Music | null;
        if (loop !== null && this.isMusicActiveForSnapshot(loop)) {
            return this.captureMusic(main, loop);
        }

        return null;
    }

    private captureMusic(main: Main, music: Music): MusicSnapshot {
        const id = this.musicIdForMusic(main, music);
        if (id === null) {
            throw new Error("Unable to identify music for game-state save.");
        }

        const looped = Boolean(this.getField(music, "looped"));
        return {
            id,
            looped,
            paused: Boolean(this.getField(music, "paused")),
            playing: music.playing(),
            playbackRate: this.numberField(music, "playbackRate", 1),
            position: this.normalizeMusicPosition(music, music.getPosition(), looped),
            volume: music.getVolume()
        };
    }

    private restoreSongPlayback(context: RestoreContext, snapshot: JackalGameStateSnapshot): void {
        const currentSongState = snapshot.currentSongState;
        if (typeof currentSongState === "undefined") {
            context.main.currentSong = null!;
            context.main.requestedSong = this.songById(context.main, snapshot.requestedSongId ?? snapshot.currentSongId)!;
            this.restoreAudioEnabledForSnapshot(context);
            return;
        }

        const currentSong = currentSongState === null ? null : this.songById(context.main, currentSongState.id);
        const requestedSong = this.songById(context.main, snapshot.requestedSongId ?? snapshot.currentSongId);
        context.main.currentSong = currentSong!;
        context.main.requestedSong = requestedSong!;
        if (currentSongState === null || currentSong === null || currentSong !== requestedSong) {
            this.restoreAudioEnabledForSnapshot(context);
            return;
        }

        const song = currentSong;
        song.playing = currentSongState.playing;
        song.playedIntro2 = currentSongState.playedIntro2;
        if (currentSongState.activeMusic !== null && currentSongState.playing) {
            this.restoreActiveMusic(context, currentSongState.activeMusic);
        } else {
            this.restoreAudioEnabledForSnapshot(context);
        }
    }

    private songById(main: Main, id: string | null): Song | null {
        if (id === null) {
            return null;
        }
        return (main as unknown as Record<string, Song | null | undefined>)[id] ?? null;
    }

    private musicIdForMusic(main: Main, music: Music | null): string | null {
        if (music === null) {
            return null;
        }

        for (const songId of SONG_IDS) {
            const song = (main as unknown as Record<string, Song | null | undefined>)[songId];
            if (song === null || typeof song === "undefined") {
                continue;
            }
            if (song.intro === music) {
                return `${songId}.intro`;
            }
            if (song.intro2 === music) {
                return `${songId}.intro2`;
            }
            if (song.loop === music) {
                return `${songId}.loop`;
            }
        }

        return null;
    }

    private musicById(main: Main, id: string | null): Music | null {
        if (id === null) {
            return null;
        }

        const dot = id.lastIndexOf(".");
        if (dot < 0) {
            return null;
        }

        const song = this.songById(main, id.substring(0, dot));
        if (song === null) {
            return null;
        }

        switch (id.substring(dot + 1)) {
            case "intro":
                return song.intro as Music | null;
            case "intro2":
                return song.intro2 as Music | null;
            case "loop":
                return song.loop as Music | null;
            default:
                return null;
        }
    }

    private restoreActiveMusic(context: RestoreContext, snapshot: MusicSnapshot): void {
        const music = this.musicById(context.main, snapshot.id);
        if (music === null) {
            this.restoreAudioEnabledForSnapshot(context);
            return;
        }

        const position = this.normalizeMusicPosition(music, snapshot.position, snapshot.looped);
        if (!snapshot.playing && !snapshot.paused) {
            music.setVolume(snapshot.volume);
            music.setPosition(position);
            this.restoreAudioEnabledForSnapshot(context);
            return;
        }

        context.gc.setMusicOn(false);
        music.setVolume(snapshot.volume);
        music.setPosition(position);
        if (snapshot.looped) {
            music.loop(snapshot.playbackRate, snapshot.volume);
        } else {
            music.play(snapshot.playbackRate, snapshot.volume);
        }

        void music
            .ready()
            .then(() => {
                globalThis.setTimeout(() => {
                    music.setPosition(this.normalizeMusicPosition(music, position, snapshot.looped));
                    music.setVolume(snapshot.volume);
                    if (snapshot.paused) {
                        music.pause();
                    }
                    this.restoreAudioEnabledForSnapshot(context);
                }, 0);
            })
            .catch(() => {
                this.restoreAudioEnabledForSnapshot(context);
            });
    }

    private restoreAudioEnabledForSnapshot(context: RestoreContext): void {
        if (context.main.browserSuspended) {
            context.main.browserSuspendedMusicOn = context.audioState.musicOn;
            context.main.browserSuspendedSoundOn = context.audioState.soundOn;
            context.gc.setMusicOn(false);
            context.gc.setSoundOn(false);
            return;
        }
        context.gc.setMusicOn(context.audioState.musicOn);
        context.gc.setSoundOn(context.audioState.soundOn);
    }

    private normalizeMusicPosition(music: Music, position: number, looped: boolean): number {
        const sanitized = Number.isFinite(position) ? Math.max(0, position) : 0;
        if (!looped) {
            return sanitized;
        }

        const buffer = this.getField(music, "buffer") as { duration?: unknown } | null;
        const duration = typeof buffer?.duration === "number" ? buffer.duration : 0;
        if (!Number.isFinite(duration) || duration <= 0) {
            return sanitized;
        }

        return sanitized % duration;
    }

    private getField(target: object, field: string): unknown {
        return (target as Record<string, unknown>)[field];
    }

    private isMusicActiveForSnapshot(music: Music): boolean {
        return music.playing() || Boolean(this.getField(music, "paused"));
    }

    private numberField(target: object, field: string, fallback: number): number {
        const value = this.getField(target, field);
        return typeof value === "number" && Number.isFinite(value) ? value : fallback;
    }
}
