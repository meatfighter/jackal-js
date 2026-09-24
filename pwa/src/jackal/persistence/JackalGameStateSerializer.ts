import type { GameContainer } from "slick2d-ts";
import { ArrayList, Random } from "../../java/JavaRuntime.js";
import { FriendlySoldier } from "../FriendlySoldier.js";
import { Enemy } from "../Enemy.js";
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
import { SunsetMode } from "../SunsetMode.js";
import { ButtonMapping } from "../ButtonMapping.js";
import { ContinueMode } from "../ContinueMode.js";
import { DifficultyMode } from "../DifficultyMode.js";
import {
    type ButtonMappingSnapshot,
    type EncodedRecord,
    type EntitySnapshot,
    type GenericModeExtraSnapshot,
    type InputModeExtraSnapshot,
    type JackalBaseStateSnapshot,
    type JackalGameStateSnapshot,
    type JackalGameModeStateSnapshot,
    type JackalStandaloneModeStateSnapshot,
    type JeepYeahModeExtraSnapshot,
    type MenuSnapshot
} from "./GameStateSnapshot.js";
import { GAME_ELEMENT_TYPES, getGameElementTypeId } from "./GameElementTypeRegistry.js";
import { captureEntityRuntimeFields, restoreEntityRuntimeState } from "./EntityRuntimePersistence.js";
import {
    BUTTON_MAPPING_FIELD_NAMES,
    GAME_MODE_FIELD_NAMES,
    JEEP_YEAH_BULLET_FIELD_NAMES,
    JEEP_YEAH_EXPLOSION_FIELD_NAMES,
    JEEP_YEAH_FIRE_FIELD_NAMES,
    JEEP_YEAH_PLANE_FIELD_NAMES,
    KONAMI_CODE_FIELD_NAMES,
    MAIN_FIELD_NAMES,
    MENU_FIELD_NAMES,
    modeFieldsForModeId,
    type StandaloneModeId
} from "./GameStateFields.js";
import { GAME_STATE_VERSION } from "./GameStateSchema.js";
import { isSupportedSnapshotForLoadedResources } from "./GameStateResourcePreflight.js";
import { isSupportedGameStateSnapshot } from "./GameStateSnapshotValidator.js";
import { captureAudioStateSnapshot, captureSongSnapshot, restoreAudioPlayback, songIdFor } from "./GameStateAudio.js";
import {
    createUninitialized,
    decodeNamedFieldsInto,
    encodeNamedFields,
    encodeNullableNamedFields,
    readEncodedBooleanField,
    readEncodedNumberField,
    type GameStateDecodeContext,
    type GameStateEncodeContext
} from "./GameStateCodec.js";
import { getDurableEntityReferences, getEntityDurableFieldNames, getPlayerDurableFieldNames } from "./GameStateFieldPolicies.js";
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
    type JavaFloatStateSpec
} from "./JavaFloatState.js";
type RestoreContext = GameStateDecodeContext & {
    gc: GameContainer;
};

type GameModeEncodeContext = GameStateEncodeContext & {
    gameMode: GameMode;
    player: Player;
};

type ModeWithMenu = IntroMode | ContinueMode | DifficultyMode | OptionsMode | InputMode;

export class JackalGameStateSerializer {
    public createSnapshot(main: Main, appVersion: string): JackalGameStateSnapshot {
        const activeMode = main.mode;
        if (activeMode instanceof GameMode && activeMode.player instanceof Player) {
            return this.createGameModeSnapshot(main, activeMode, activeMode.player, appVersion);
        }

        if (activeMode === null || typeof activeMode !== "object") {
            throw new Error("Jackal save requires an active mode.");
        }
        return this.createStandaloneModeSnapshot(main, activeMode, appVersion);
    }

    public restoreSnapshot(main: Main, gc: GameContainer, snapshot: JackalGameStateSnapshot): void {
        if (!this.isSupportedSnapshot(snapshot) || !this.isSupportedSnapshotForLoadedResources(main, snapshot)) {
            throw new Error("Unsupported Jackal game-state snapshot.");
        }

        if (snapshot.kind === "game") {
            this.restoreGameModeSnapshot(main, gc, snapshot);
            return;
        }

        this.restoreStandaloneModeSnapshot(main, gc, snapshot);
    }

    public isSupportedSnapshot(snapshot: unknown): snapshot is JackalGameStateSnapshot {
        return isSupportedGameStateSnapshot(snapshot);
    }

    public isSupportedSnapshotForLoadedResources(main: Main, snapshot: JackalGameStateSnapshot): boolean {
        return isSupportedSnapshotForLoadedResources(main, snapshot);
    }

    private createGameModeSnapshot(main: Main, gameMode: GameMode, player: Player, appVersion: string): JackalGameModeStateSnapshot {
        const context = this.createGameStateEncodeContext(main, gameMode, gameMode.player);
        const entities = new Array<EntitySnapshot>(context.entities.length);
        for (let i = 0; i < context.entities.length; i++) {
            entities[i] = this.createEntitySnapshot(context.entities[i], context);
        }
        return {
            kind: "game",
            ...this.createBaseSnapshot(main, appVersion, context),
            gameMode: {
                fields: encodeNamedFields(gameMode, GAME_MODE_FIELD_NAMES, context),
                elements: this.snapshotElementLayers(gameMode, context),
                entities
            },
            playerFields: encodeNamedFields(player, getPlayerDurableFieldNames(), context)
        };
    }

    private createStandaloneModeSnapshot(main: Main, mode: object, appVersion: string): JackalStandaloneModeStateSnapshot {
        const context = this.createModeContext(main);
        const modeId = this.modeIdForMode(mode);
        return {
            kind: "mode",
            ...this.createBaseSnapshot(main, appVersion, context),
            modeId,
            modeFields: encodeNamedFields(mode, modeFieldsForModeId(modeId), context),
            modeExtra: this.createModeExtraSnapshot(modeId, mode, context)
        };
    }

    private createBaseSnapshot(main: Main, appVersion: string, context: GameStateEncodeContext): Omit<JackalBaseStateSnapshot, "kind"> {
        return {
            version: GAME_STATE_VERSION,
            appVersion,
            savedAt: new Date().toISOString(),
            mainFields: encodeNamedFields(main, MAIN_FIELD_NAMES, context),
            konamiCodeFields: main.konamiCode === null ? null : encodeNamedFields(main.konamiCode, KONAMI_CODE_FIELD_NAMES, context),
            random: main.random.getState(),
            friendlySoldierCount: FriendlySoldier.count,
            requestedSongId: songIdFor(main, main.requestedSong),
            currentSongState: captureSongSnapshot(main, main.currentSong),
            audioState: captureAudioStateSnapshot(main)
        };
    }

    private restoreGameModeSnapshot(main: Main, gc: GameContainer, snapshot: JackalGameModeStateSnapshot): void {
        const gameMode = new GameMode();
        Main.mainInstance = main;
        Main.gameMode = gameMode;
        const stageIndex = readEncodedNumberField(snapshot.mainFields, "stageIndex");
        const hardMode = readEncodedBooleanField(snapshot.mainFields, "hardMode");
        gameMode.setStage(stageIndex, main.stages[stageIndex], hardMode);
        gameMode.init(main, gc);
        const player = gameMode.player;

        const entitiesById = new Map<number, GameElement>();
        for (const entitySnapshot of snapshot.gameMode.entities) {
            const constructor = GAME_ELEMENT_TYPES[entitySnapshot.type];
            entitiesById.set(entitySnapshot.id, createUninitialized(constructor.prototype));
        }

        const context: RestoreContext = {
            main,
            gameMode,
            gc,
            player,
            entitiesById
        };

        decodeNamedFieldsInto(main, snapshot.mainFields, MAIN_FIELD_NAMES, context, MAIN_JAVA_FLOAT_FIELDS);
        main.random = Random.fromState(snapshot.random);
        this.restoreKonamiCode(main, snapshot, context);

        decodeNamedFieldsInto(gameMode, snapshot.gameMode.fields, GAME_MODE_FIELD_NAMES, context, GAME_MODE_JAVA_FLOAT_FIELDS);
        decodeNamedFieldsInto(player, snapshot.playerFields, getPlayerDurableFieldNames(), context, PLAYER_JAVA_FLOAT_FIELDS);
        this.restoreBackPointers(main, gameMode, player, gc);

        for (const entitySnapshot of snapshot.gameMode.entities) {
            const entity = entitiesById.get(entitySnapshot.id);
            if (entity === undefined) {
                throw new Error(`Missing restored entity ${entitySnapshot.id}.`);
            }
            decodeNamedFieldsInto(
                entity,
                entitySnapshot.fields,
                getEntityDurableFieldNames(entitySnapshot.type),
                context,
                GAME_ELEMENT_JAVA_FLOAT_FIELDS[entitySnapshot.type]
            );
        }

        this.restoreElementLayers(gameMode, snapshot.gameMode.elements, entitiesById);
        this.rebuildGameModeIndexes(gameMode);
        player.restoreRuntimeReferences(main, gameMode);
        for (const entitySnapshot of snapshot.gameMode.entities) {
            const entity = entitiesById.get(entitySnapshot.id);
            if (entity === undefined) {
                throw new Error(`Missing restored entity ${entitySnapshot.id}.`);
            }
            restoreEntityRuntimeState(entity, entitySnapshot.type, main, gameMode, entitySnapshot.runtimeFields);
        }
        FriendlySoldier.count = snapshot.friendlySoldierCount;
        main.mode = gameMode;
        main.reconcileStateAfterRestore();
        this.restoreFadeListener(main, gameMode);
        restoreAudioPlayback(main, snapshot);
        main.resetNextFrameTime();
        main.clearInputPressedRecords();
    }

    private restoreStandaloneModeSnapshot(main: Main, gc: GameContainer, snapshot: JackalStandaloneModeStateSnapshot): void {
        Main.mainInstance = main;
        Main.gameMode = null;

        const context: RestoreContext = {
            main,
            gameMode: null,
            gc,
            player: null,
            entitiesById: new Map<number, GameElement>()
        };

        decodeNamedFieldsInto(main, snapshot.mainFields, MAIN_FIELD_NAMES, context, MAIN_JAVA_FLOAT_FIELDS);
        main.random = Random.fromState(snapshot.random);
        this.restoreKonamiCode(main, snapshot, context);

        const mode = this.createStandaloneMode(snapshot.modeId);
        mode.init(main, gc);
        decodeNamedFieldsInto(main, snapshot.mainFields, MAIN_FIELD_NAMES, context, MAIN_JAVA_FLOAT_FIELDS);
        main.random = Random.fromState(snapshot.random);
        decodeNamedFieldsInto(
            mode,
            snapshot.modeFields,
            modeFieldsForModeId(snapshot.modeId),
            context,
            STANDALONE_MODE_JAVA_FLOAT_FIELDS[snapshot.modeId] ?? []
        );
        this.restoreModeRuntimePointers(mode, main, gc);
        this.restoreModeExtraSnapshot(mode, snapshot.modeExtra, context);

        FriendlySoldier.count = snapshot.friendlySoldierCount;
        main.mode = mode;
        main.reconcileStateAfterRestore();
        this.restoreFadeListener(main, mode);
        restoreAudioPlayback(main, snapshot);
        main.resetNextFrameTime();
        main.clearInputPressedRecords();
    }

    private createModeContext(main: Main): GameStateEncodeContext {
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
            main.konamiCode = null;
            return;
        }
        const konamiCode = createUninitialized(KonamiCode.prototype);
        decodeNamedFieldsInto(konamiCode, snapshot.konamiCodeFields, KONAMI_CODE_FIELD_NAMES, context);
        konamiCode.main = main;
        konamiCode.input = main.input;
        konamiCode.resyncInputAfterBrowserResume();
        main.konamiCode = konamiCode;
    }

    private restoreFadeListener(main: Main, mode: object): void {
        if (!main.fading) {
            main.fadeListener = null;
            return;
        }
        if (mode instanceof GameMode) {
            // Entrance fades have no callback; completed-stage fade-out owns one.
            main.fadeListener = main.fadeOut && mode.stageCompletedFlag && mode.stageCompletedDelay === 0 ? mode : null;
            return;
        }
        main.fadeListener = this.isFadeListener(mode) ? mode : null;
    }

    private isFadeListener(value: object): value is IFadeListener {
        return typeof Reflect.get(value, "fadeCompleted") === "function";
    }

    private modeIdForMode(mode: object): StandaloneModeId {
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

    private createStandaloneMode(modeId: StandaloneModeId): IMode {
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
        }
    }

    private createModeExtraSnapshot(modeId: StandaloneModeId, mode: object, context: GameStateEncodeContext): GenericModeExtraSnapshot | null {
        switch (modeId) {
            case "INTRO":
            case "CONTINUE":
            case "DIFFICULTY":
            case "OPTIONS":
                return { menu: this.createMenuSnapshot(this.requireModeWithMenu(mode).menu, context) };
            case "INPUT":
                if (!(mode instanceof InputMode)) {
                    throw new Error("Input-mode save state does not match the active mode.");
                }
                return { input: this.createInputModeExtraSnapshot(mode, context) };
            case "YEAH":
            case "WE_MADE_IT":
                if (!(mode instanceof JeepYeahMode)) {
                    throw new Error("Jeep-Yeah save state does not match the active mode.");
                }
                return { jeepYeah: this.createJeepYeahModeExtraSnapshot(mode, context) };
            default:
                return null;
        }
    }

    private createMenuSnapshot(menu: Menu | null, context: GameStateEncodeContext): MenuSnapshot | null {
        if (menu === null) {
            return null;
        }
        return {
            fields: encodeNamedFields(menu, MENU_FIELD_NAMES, context)
        };
    }

    private createButtonMappingSnapshot(buttonMapping: ButtonMapping | null, context: GameStateEncodeContext): ButtonMappingSnapshot | null {
        if (buttonMapping === null) {
            return null;
        }
        return {
            fields: encodeNamedFields(buttonMapping, BUTTON_MAPPING_FIELD_NAMES, context)
        };
    }

    private createInputModeExtraSnapshot(mode: InputMode, context: GameStateEncodeContext): InputModeExtraSnapshot {
        return {
            menu: this.createMenuSnapshot(mode.menu, context),
            draftButtonMapping: this.createButtonMappingSnapshot(mode.draftButtonMapping, context),
            assignedKeys: Array.from(mode.assignedKeys ?? []),
            assignedControllerButtons: Array.from(mode.assignedControllerButtons ?? [])
        };
    }

    private createJeepYeahModeExtraSnapshot(mode: JeepYeahMode, context: GameStateEncodeContext): JeepYeahModeExtraSnapshot {
        const bullets: EncodedRecord[] = [];
        if (mode.bullets !== null) {
            for (let i = 0; i < mode.bullets.size(); i++) {
                bullets.push(encodeNamedFields(mode.bullets.get(i), JEEP_YEAH_BULLET_FIELD_NAMES, context));
            }
        }
        return {
            explosion: encodeNullableNamedFields(mode.explosion, JEEP_YEAH_EXPLOSION_FIELD_NAMES, context),
            leftPlane: encodeNullableNamedFields(mode.leftPlane, JEEP_YEAH_PLANE_FIELD_NAMES, context),
            rightPlane: encodeNullableNamedFields(mode.rightPlane, JEEP_YEAH_PLANE_FIELD_NAMES, context),
            fireLeft: encodeNullableNamedFields(mode.fireLeft, JEEP_YEAH_FIRE_FIELD_NAMES, context),
            fireRight: encodeNullableNamedFields(mode.fireRight, JEEP_YEAH_FIRE_FIELD_NAMES, context),
            bullets
        };
    }

    private restoreModeExtraSnapshot(mode: object, extra: GenericModeExtraSnapshot | null, context: RestoreContext): void {
        if (extra === null) {
            return;
        }
        if ("menu" in extra) {
            this.restoreModeMenu(mode, extra.menu, context);
        } else if ("input" in extra && mode instanceof InputMode) {
            this.restoreInputModeExtraSnapshot(mode, extra.input, context);
        } else if ("jeepYeah" in extra && mode instanceof JeepYeahMode) {
            this.restoreJeepYeahModeExtraSnapshot(mode, extra.jeepYeah, context);
        }
    }

    private restoreModeMenu(mode: object, snapshot: MenuSnapshot | null, context: RestoreContext): void {
        const menuMode = this.requireModeWithMenu(mode);
        if (snapshot === null) {
            Reflect.set(menuMode, "menu", null);
            return;
        }
        const menu = menuMode.menu === null ? createUninitialized(Menu.prototype) : menuMode.menu;
        menuMode.menu = menu;
        decodeNamedFieldsInto(menu, snapshot.fields, MENU_FIELD_NAMES, context, MENU_JAVA_FLOAT_FIELDS);
        this.restoreMenuRuntimePointers(menu, context.main, menuMode);
    }

    private restoreInputModeExtraSnapshot(mode: InputMode, snapshot: InputModeExtraSnapshot, context: RestoreContext): void {
        this.restoreModeMenu(mode, snapshot.menu, context);
        if (snapshot.draftButtonMapping === null) {
            Reflect.set(mode, "draftButtonMapping", null);
        } else {
            mode.draftButtonMapping = new ButtonMapping();
            decodeNamedFieldsInto(mode.draftButtonMapping, snapshot.draftButtonMapping.fields, BUTTON_MAPPING_FIELD_NAMES, context);
        }
        mode.assignedKeys = new Set(snapshot.assignedKeys);
        mode.assignedControllerButtons = new Set(snapshot.assignedControllerButtons);
        mode.syncInputListenerState();

        mode.restorePersistencePresentation();
    }

    private restoreJeepYeahModeExtraSnapshot(mode: JeepYeahMode, snapshot: JeepYeahModeExtraSnapshot, context: RestoreContext): void {
        Reflect.set(
            mode,
            "explosion",
            this.restoreNullableTypedRecord(
                JeepYeahExplosion,
                snapshot.explosion,
                JEEP_YEAH_EXPLOSION_FIELD_NAMES,
                context,
                JEEP_YEAH_EXPLOSION_JAVA_FLOAT_FIELDS
            )
        );
        Reflect.set(
            mode,
            "leftPlane",
            this.restoreNullableTypedRecord(JeepYeahPlane, snapshot.leftPlane, JEEP_YEAH_PLANE_FIELD_NAMES, context, JEEP_YEAH_PLANE_JAVA_FLOAT_FIELDS)
        );
        Reflect.set(
            mode,
            "rightPlane",
            this.restoreNullableTypedRecord(JeepYeahPlane, snapshot.rightPlane, JEEP_YEAH_PLANE_FIELD_NAMES, context, JEEP_YEAH_PLANE_JAVA_FLOAT_FIELDS)
        );
        Reflect.set(
            mode,
            "fireLeft",
            this.restoreNullableTypedRecord(JeepYeahFireLeft, snapshot.fireLeft, JEEP_YEAH_FIRE_FIELD_NAMES, context, JEEP_YEAH_FIRE_LEFT_JAVA_FLOAT_FIELDS)
        );
        Reflect.set(
            mode,
            "fireRight",
            this.restoreNullableTypedRecord(JeepYeahFireRight, snapshot.fireRight, JEEP_YEAH_FIRE_FIELD_NAMES, context, JEEP_YEAH_FIRE_RIGHT_JAVA_FLOAT_FIELDS)
        );
        mode.bullets = new ArrayList<JeepYeahBullet>(snapshot.bullets.length);
        for (const bulletSnapshot of snapshot.bullets) {
            const bullet = createUninitialized(JeepYeahBullet.prototype);
            decodeNamedFieldsInto(bullet, bulletSnapshot, JEEP_YEAH_BULLET_FIELD_NAMES, context, JEEP_YEAH_BULLET_JAVA_FLOAT_FIELDS);
            mode.bullets.add(bullet);
        }
    }

    private restoreNullableTypedRecord<T extends object>(
        constructor: { prototype: T },
        snapshot: EncodedRecord | null,
        fieldNames: readonly string[],
        context: RestoreContext,
        javaFloatFields: JavaFloatStateSpec
    ): T | null {
        if (snapshot === null) {
            return null;
        }
        const value = createUninitialized(constructor.prototype);
        decodeNamedFieldsInto(value, snapshot, fieldNames, context, javaFloatFields);
        return value;
    }

    private restoreModeRuntimePointers(mode: object, main: Main, gc: GameContainer): void {
        Reflect.set(mode, "main", main);
        Reflect.set(mode, "gc", gc);
        if (Reflect.has(mode, "input")) {
            Reflect.set(mode, "input", main.input);
        }
        if (Reflect.has(mode, "buttonMapping")) {
            Reflect.set(mode, "buttonMapping", main.buttonMapping);
        }
        if (this.isModeWithMenu(mode) && mode.menu !== null) {
            this.restoreMenuRuntimePointers(mode.menu, main, mode);
        }
    }

    private restoreMenuRuntimePointers(menu: Menu, main: Main, listener: IMenuListener): void {
        menu.main = main;
        menu.input = main.input;
        menu.menuListener = listener;
        menu.resyncInputAfterBrowserResume();
    }

    private isModeWithMenu(mode: object): mode is ModeWithMenu {
        return (
            mode instanceof IntroMode ||
            mode instanceof ContinueMode ||
            mode instanceof DifficultyMode ||
            mode instanceof OptionsMode ||
            mode instanceof InputMode
        );
    }

    private requireModeWithMenu(mode: object): ModeWithMenu {
        if (!this.isModeWithMenu(mode)) {
            throw new Error(`Jackal mode ${mode.constructor?.name ?? "unknown"} does not own a menu.`);
        }
        return mode;
    }

    private createGameStateEncodeContext(main: Main, gameMode: GameMode, player: Player): GameModeEncodeContext {
        const ids = new Map<object, number>();
        const entities: GameElement[] = [];
        const register = (entity: GameElement): void => {
            if (!ids.has(entity)) {
                ids.set(entity, entities.length);
                entities.push(entity);
            }
        };

        for (let layer = 0; layer < gameMode.elements.length; layer++) {
            const list = gameMode.elements[layer];
            for (let i = 0; i < list.size(); i++) {
                const entity = list.get(i);
                if (entity !== null) {
                    register(entity);
                }
            }
        }

        // Layer membership is the active simulation graph, but durable references can
        // legitimately keep detached objects alive. Preserve the transitive reference
        // closure so save/restore never silently converts those links to null.
        for (let i = 0; i < entities.length; i++) {
            const entity = entities[i];
            if (entity === undefined) {
                throw new Error(`Missing registered Jackal entity at index ${i}.`);
            }
            const type = getGameElementTypeId(entity);
            for (const referenced of getDurableEntityReferences(type, entity)) {
                getGameElementTypeId(referenced); // fail closed on unsupported object types
                register(referenced);
            }
        }

        return { main, gameMode, player, ids, entities };
    }

    private createEntitySnapshot(entity: GameElement, context: GameModeEncodeContext): EntitySnapshot {
        const type = getGameElementTypeId(entity);
        const id = context.ids.get(entity);
        if (id === undefined) {
            throw new Error(`Unregistered Jackal entity: ${type}`);
        }
        const fields = encodeNamedFields(entity, getEntityDurableFieldNames(type), context);
        const runtimeFields = captureEntityRuntimeFields(entity, context.main, context.gameMode);
        return {
            id,
            type,
            fields,
            runtimeFields
        };
    }

    private snapshotElementLayers(gameMode: GameMode, context: GameStateEncodeContext): number[][] {
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
                if (entity instanceof Enemy) {
                    gameMode.enemies.add(entity);
                    if (entity.solid) {
                        gameMode.solids.add(entity);
                    }
                    if (entity.mine) {
                        gameMode.mines.add(entity);
                    }
                }
            }
        }
        gameMode.player.mines = gameMode.mines;
    }

    private restoreBackPointers(main: Main, gameMode: GameMode, player: Player, gc: GameContainer): void {
        main.gc = gc;
        gameMode.main = main;
        gameMode.gc = gc;
        gameMode.input = main.input;
        gameMode.player = player;
    }
}
