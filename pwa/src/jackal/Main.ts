import { SoundCooldownClock } from "./SoundCooldownClock.js";
import { BasicGame, Color, GL11, Image, Music, Sound, SoundStore, Sys, XMLPackedSheet, type GameContainer, type Graphics } from "slick2d-ts";
import {
    ArrayList,
    JAVA_LONG_LOW_3_BITS,
    JAVA_LONG_PACKED_3BIT_SHIFTS,
    Point2D,
    Random,
    java2DArray,
    javaArray,
    javaByte,
    javaFloat,
    javaIntDiv
} from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";

import { ButtonMapping, type MappingWriteResult } from "./ButtonMapping.js";

import { ContinueMode } from "./ContinueMode.js";
import { DifficultyMode } from "./DifficultyMode.js";
import { ExtraLargeImage } from "./ExtraLargeImage.js";

import { FriendlySoldier } from "./FriendlySoldier.js";
import { GameMode } from "./GameMode.js";

import { HardEndingMode } from "./HardEndingMode.js";
import { HumanInput } from "./HumanInput.js";
import { InputMode } from "./InputMode.js";
import { IntroMapMode } from "./IntroMapMode.js";
import { IntroMode } from "./IntroMode.js";
import { JeepHereMode } from "./JeepHereMode.js";
import { JeepYeahMode } from "./JeepYeahMode.js";
import { rotatePointLikeJava } from "./JackalMath.js";
import { openDataResource } from "./JackalResources.js";
import { KonamiCode } from "./KonamiCode.js";
import { LargeImage } from "./LargeImage.js";
import { MapMode } from "./MapMode.js";
import { Menu } from "./Menu.js";
import {
    clearMainRuntime,
    installMainRuntime,
    isMainRuntimeActive,
    requireMainRuntime,
    requireMainRuntimeGameMode,
    setMainRuntimeGameMode
} from "./MainRuntimeState.js";
import { Modes } from "./Modes.js";
import { OptionsMode } from "./OptionsMode.js";

import { Song } from "./Song.js";
import { Stage } from "./Stage.js";
import { SunsetMode } from "./SunsetMode.js";

import { Triggers } from "./Triggers.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IInput } from "./IInput.js";
import type { IMode } from "./IMode.js";

/*
 * Jackal
 * Copyright (C) 2013, 2026 meatfighter.com
 *
 * This file is part of Jackal
 *
 * Jackal is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published
 * by the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 * Jackal is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
export class Main extends BasicGame {
    public constructor() {
        super("Jackal");
    }

    public static readonly DISPLAY_WIDTH: number = MainConstants.DISPLAY_WIDTH;
    public static readonly DISPLAY_HEIGHT: number = MainConstants.DISPLAY_HEIGHT;

    public static readonly FONT_WHITE: number = MainConstants.FONT_WHITE;
    public static readonly FONT_GRAY: number = MainConstants.FONT_GRAY;
    public static readonly FONT_ORANGE: number = MainConstants.FONT_ORANGE;
    public static readonly FONT_ORANGE_GRAY: number = MainConstants.FONT_ORANGE_GRAY;

    public static readonly ISQRT2: number = javaFloat(MainConstants.ISQRT2);
    public static readonly I_QUARTER_WIDTH: number = javaFloat(MainConstants.I_QUARTER_WIDTH);
    public static readonly I_WIDTH: number = javaFloat(MainConstants.I_WIDTH);
    public static readonly MINIMUM_SOUND_TIME: number = MainConstants.MINIMUM_SOUND_TIME;
    private static readonly GAME_TICK_MS: number = 10;

    public static readonly CHARS: string = MainConstants.CHARS;

    public static readonly TILES: readonly number[] = MainConstants.TILES;

    public static readonly FADES: Color[] = javaArray(23, null!);

    static {
        for (let i = 0; i < Main.FADES.length; i++) {
            Main.FADES[i] = new Color(0, 0, 0, javaIntDiv(255 * i, Main.FADES.length - 1));
        }
    }

    public static get mainInstance(): Main {
        return requireMainRuntime();
    }

    public static set mainInstance(mainInstance: Main) {
        mainInstance.browserRuntimeActive = true;
        installMainRuntime(mainInstance);
    }

    public static get gameMode(): GameMode {
        return requireMainRuntimeGameMode();
    }

    public static set gameMode(gameMode: GameMode | null) {
        setMainRuntimeGameMode(gameMode);
    }

    public random: Random = new Random();
    public buttonMapping: ButtonMapping = new ButtonMapping();
    public nextFrameTime: number = 0;
    public mode: IMode | null = null;
    public input: IInput = null!;
    public currentSong: Song | null = null;
    public requestedSong: Song | null = null;
    public loadIndex: number = 0;

    public fadeListener: IFadeListener | null = null;
    public fading: boolean = false;
    public fadeIndex: number = 0;
    public fadeOut: boolean = false;

    public extraLives: number = 0;
    public extraLivesStr: string = null!;
    public score: number = 0;
    public scoreStr: string = null!;
    public stageIndex: number = 0;
    public hasMissiles: boolean = false;
    public missilePower: number = 0;
    public friendlySoldiersPickedUp: number = 0;
    public hardMode: boolean = false;
    public continued: boolean = false;
    public closeRequestedFlag: boolean = false;
    public controllerGrenadePressed: boolean = false;
    public controllerGunPressed: boolean = false;

    public stages: Stage[] = javaArray(6, null!);

    public players: Image[][] = java2DArray(4, 5, null!);
    public explosions: Image[] = javaArray(4, null!);
    public grenade: Image = null!;
    public playerMissile: Image = null!;
    public yellowBullet: Image = null!;
    public whiteBullet: Image = null!;
    public bulletHit: Image = null!;
    public grayGuns: Image[] = javaArray(2, null!);
    public enemySoldiers: Image[][] = java2DArray(2, 8, null!);
    public swampSoldiers: Image[][] = java2DArray(2, 8, null!);
    public deadEnemySoldier: Image = null!;
    public brownTanks: Image[] = javaArray(5, null!);
    public friendlySoldiers: Image[][] = java2DArray(4, 12, null!);
    public help: Image = null!;
    public greenBoats: Image[] = javaArray(2, null!);
    public stars: Image[] = javaArray(4, null!);
    public friendlyHelicopters: Image[] = javaArray(4, null!);
    public lamps: Image[] = javaArray(4, null!);
    public bossBlueTanks: Image[][] = java2DArray(4, 5, null!);
    public fonts: Image[][] = java2DArray(4, 256, null!);
    public statueBlueEyes: Image = null!;
    public statueBlueMouth: Image = null!;
    public statueWhiteEyes: Image = null!;
    public statueWhiteMouth: Image = null!;
    public statueMissiles: Image[] = javaArray(2, null!);
    public airplanes: Image[][] = java2DArray(2, 2, null!);
    public bomb: Image = null!;
    public grayJeeps: Image[] = javaArray(5, null!);
    public grayTanks: Image[] = javaArray(5, null!);
    public cannonball: Image = null!;
    public columns: Image[] = javaArray(2, null!);
    public parkedGrayJeep: Image = null!;
    public grayBoats: Image[] = javaArray(3, null!);
    public submarines: Image[] = javaArray(4, null!);
    public lasers: Image[] = javaArray(6, null!);
    public troopsTruck: Image = null!;
    public floorGuns: Image[] = javaArray(8, null!);
    public shipGuns: Image[] = javaArray(3, null!);
    public plainFloorGuns: Image[] = javaArray(2, null!);
    public playerWakes: Image[] = javaArray(6, null!);
    public swampMissiles: Image[] = javaArray(5, null!);
    public mines: Image[] = javaArray(4, null!);
    public rock: Image = null!;
    public cannonTruck: Image[][] = java2DArray(2, 2, null!);
    public cliffMissileLauncher: Image = null!;
    public trains: Image[] = javaArray(3, null!);
    public bossHelicopters: Image[] = javaArray(6, null!);
    public parachutes: Image[] = javaArray(5, null!);
    public tankShack: Image = null!;
    public cliffGuns: Image[] = javaArray(5, null!);
    public fires: Image[][] = java2DArray(2, 3, null!);
    public fireTanks: Image[] = javaArray(5, null!);
    public garages: Image[] = javaArray(5, null!);
    public sparks: Image[][] = java2DArray(2, 7, null!);
    public conveyors: Image[] = javaArray(16, null!);
    public greenGuns: Image[] = javaArray(2, null!);
    public brownGuns: Image[] = javaArray(2, null!);
    public parkedBrownTank: Image = null!;
    public floorMissileLauncher: Image[] = javaArray(4, null!);
    public enemyHelicopters: Image[] = javaArray(3, null!);
    public headquartersLights: Image[] = javaArray(2, null!);
    public elephantGuns: Image[] = javaArray(9, null!);
    public superTanks: Image[][] = java2DArray(4, 5, null!);
    public superFires: Image[][] = java2DArray(2, 3, null!);
    public superGuns: Image[] = javaArray(2, null!);
    public chinooks: Image[] = javaArray(4, null!);
    public heres: Image[] = javaArray(2, null!);
    public smoke: Image = null!;
    public blackPlane: Image = null!;
    public gunFires: Image[] = javaArray(2, null!);
    public jeepYeahBullet: Image = null!;
    public yeahs: Image[] = javaArray(4, null!);
    public suns: Image[] = null!;
    public waves: Image[] = null!;
    public rescueHelicopters: Image[] = javaArray(3, null!);

    public jeepHere: LargeImage = null!;
    public titleImage: LargeImage = null!;
    public map: LargeImage = null!;
    public soldiers: LargeImage[] = javaArray(4, null!);
    public sunset: ExtraLargeImage = null!;
    public jeepYeah: ExtraLargeImage = null!;

    public bossIntro: Music = null!;
    public bossRepeat: Music = null!;
    public superTankIntro: Music = null!;
    public stage0Intro: Music = null!;
    public stage0Repeat: Music = null!;
    public start: Music = null!;

    public bossSong: Song = null!;
    public continueSong: Song = null!;
    public cutsceneSong: Song = null!;
    public endingSong: Song = null!;
    public introSong: Song = null!;
    public stageSong0: Song = null!;
    public stageSong1: Song = null!;
    public stageSong2: Song = null!;
    public superTankSong: Song = null!;
    public titleSong: Song = null!;

    public bulletHitSound: Sound = null!;
    public enemyHitSound: Sound = null!;
    public explodeSound: Sound = null!;
    public explodeSound2: Sound = null!;
    public explodeSound3: Sound = null!;
    public extraLifeSound: Sound = null!;
    public fireSound: Sound = null!;
    public helicopterSound: Sound = null!;
    public helicopterSound2: Sound = null!;
    public helicopterPickupSound: Sound = null!;
    public headquartersExplodesSound: Sound = null!;
    public hutSound: Sound = null!;
    public introChingSound: Sound = null!;
    public introTypeSound: Sound = null!;
    public laserSound: Sound = null!;
    public machineGunSound: Sound = null!;
    public missileSound: Sound = null!;
    public pauseSound: Sound = null!;
    public pickupSound: Sound = null!;
    public playerExplodeSound: Sound = null!;
    public planeSound: Sound = null!;
    public soldierKilledSound: Sound = null!;
    public throwSound: Sound = null!;
    public weaponUpgradeSound: Sound = null!;
    public wellDoneSound: Sound = null!;

    public triggerSizes: number[][] = null!;
    public unitVector: number[] = javaArray(3, 0);
    private readonly soundCooldownClock = new SoundCooldownClock();

    public getSoundCooldownTime(): number {
        return this.soundCooldownClock.now();
    }

    public lastPlayTime: Map<Sound, number> = new Map<Sound, number>();
    public konamiCode: KonamiCode | null = null;

    public gc: GameContainer = null!;
    public loadingFinishedHandler: (() => void) | null = null;
    public loadingCompleteHandler: ((gc: GameContainer) => boolean) | null = null;
    public inputMappingChangedHandler: (() => MappingWriteResult) | null = null;
    public difficultyChangedHandler: ((hardMode: boolean) => boolean) | null = null;
    public browserSuspended: boolean = false;
    private loadingFinishedNotified: boolean = false;
    private browserRuntimeActive: boolean = false;

    public init(gc: GameContainer): void {
        if (this.browserRuntimeActive) {
            if (!isMainRuntimeActive(this)) {
                throw new Error("Cannot initialize a stale Jackal browser session.");
            }
        } else {
            Main.mainInstance = this;
        }
        this.gc = gc;

        gc.setAlwaysRender(true);
        gc.setVSync(true);
        gc.setSmoothDeltas(false);
        gc.setShowFPS(false);
        gc.setClearEachFrame(true);

        this.loadFont();

        gc.getInput().setAdditionalControllerDirectionAxes([
            { horizontalAxis: 2, verticalAxis: 3 },
            { horizontalAxis: 6, verticalAxis: 7 }
        ]);
        this.input = new HumanInput(this.buttonMapping, gc);
        this.konamiCode = new KonamiCode(this);
        this.startPlayer();
        this.resetNextFrameTime();
        this.completeLoadingImmediately(gc);
    }

    public update(gc: GameContainer, delta: number): void {
        if (this.browserSuspended) {
            this.resetNextFrameTime();
            return;
        }

        let musicUpdated = false;
        let count = 0;
        while (this.nextFrameTime <= Sys.getTime()) {
            const fadeCompleted = this.fading && this.advanceFade();

            if (!musicUpdated) {
                // Preserve Jackal's original outer-update music cadence and its
                // fade-before-music-before-mode ordering on the first fixed tick.
                this.updateMusic();
                musicUpdated = true;
            } else if (fadeCompleted) {
                // A later catch-up tick can complete a fade and enter a mode that
                // requests a new song. Start it before that tick updates the mode,
                // but do not poll Song twice during one outer browser update.
                this.applyRequestedSongChange();
            }

            this.input.snap();
            const mode = this.mode;
            if (mode === null) {
                throw new Error("Jackal mode is unavailable during update.");
            }
            mode.update(gc);
            this.nextFrameTime += Main.GAME_TICK_MS;
            if (++count === 8) {
                this.resetNextFrameTime();
                break;
            }
        }

        if (!musicUpdated) {
            // High-refresh displays often produce an outer callback with no fixed
            // game tick due. Music polling remains outer-update-driven as before.
            this.updateMusic();
        }
    }

    private advanceFade(): boolean {
        if (this.fadeOut) {
            if (++this.fadeIndex !== Main.FADES.length) {
                return false;
            }
        } else if (--this.fadeIndex !== -1) {
            return false;
        }

        this.fading = false;
        if (this.fadeListener !== null) {
            this.fadeListener.fadeCompleted();
        }
        return true;
    }

    private updateMusic(): void {
        this.applyRequestedSongChange();
        if (this.currentSong !== null) {
            this.currentSong.update();
        }
    }

    private applyRequestedSongChange(): void {
        if (this.currentSong?.lastLifeSuspended) return;
        if (this.currentSong === this.requestedSong) {
            return;
        }
        if (this.currentSong !== null) {
            this.currentSong.stop();
        }
        this.currentSong = this.requestedSong;
        if (this.currentSong !== null) {
            this.currentSong.play();
        }
    }

    public advancePlayerToHardMode(): void {
        this.hardMode = true;

        this.friendlySoldiersPickedUp = 0;

        FriendlySoldier.resetCount();

        this.continued = true;

        this.stageIndex = 0;
    }

    public continuePlayer(): void {
        if (this.konamiCode?.enabled) {
            this.extraLives = 30;
            this.extraLivesStr = "30";
        } else {
            this.extraLives = 4;
            this.extraLivesStr = "4";
        }

        this.hasMissiles = false;
        this.missilePower = 0;

        this.score = 0;
        this.scoreStr = "000000";

        this.friendlySoldiersPickedUp = 0;

        FriendlySoldier.resetCount();

        this.continued = true;
    }

    public startPlayer(): void {
        this.continuePlayer();
        this.continued = false;
        this.stageIndex = 0;
    }

    public render(gc: GameContainer, g: Graphics): void {
        const mode = this.mode;
        if (mode === null) {
            throw new Error("Jackal mode is unavailable during render.");
        }
        mode.render(gc, g);

        if (this.fading) {
            g.setColor(Main.FADES[this.fadeIndex]);
            g.fillRect(0, 0, Main.DISPLAY_WIDTH, Main.DISPLAY_HEIGHT);
        }
    }

    public upgradeWeapon(alwaysPlaySound: boolean): boolean {
        let soundPlayed = false;
        if (alwaysPlaySound) {
            Main.mainInstance.playSound(Main.mainInstance.weaponUpgradeSound);
            soundPlayed = true;
        }
        if (this.konamiCode?.enabled) {
            if (!(this.hasMissiles && this.missilePower === 2)) {
                this.hasMissiles = true;
                this.missilePower = 2;
                if (!alwaysPlaySound) {
                    Main.mainInstance.playSound(Main.mainInstance.weaponUpgradeSound);
                    soundPlayed = true;
                }
            }
        } else if (this.hasMissiles) {
            if (this.missilePower < 2) {
                this.missilePower++;
                if (!alwaysPlaySound) {
                    Main.mainInstance.playSound(Main.mainInstance.weaponUpgradeSound);
                    soundPlayed = true;
                }
            }
        } else {
            this.hasMissiles = true;
            if (!alwaysPlaySound) {
                Main.mainInstance.playSound(Main.mainInstance.weaponUpgradeSound);
                soundPlayed = true;
            }
        }
        return soundPlayed;
    }

    public advanceStageIndex(): void {
        this.stageIndex++;
    }

    public requestMode(mode: Modes, gc: GameContainer): void {
        switch (mode) {
            case Modes.GAME:
                Main.gameMode = new GameMode();
                Main.gameMode.setStage(this.stageIndex, this.stages[this.stageIndex], this.hardMode);
                this.setMode(Main.gameMode, gc);
                break;
            case Modes.INTRO:
                this.setMode(new IntroMode(), gc);
                break;
            case Modes.HERE:
                this.setMode(new JeepHereMode(), gc);
                break;
            case Modes.YEAH:
                this.setMode(new JeepYeahMode(true), gc);
                break;
            case Modes.WE_MADE_IT:
                this.setMode(new JeepYeahMode(false), gc);
                break;
            case Modes.SUNSET:
                this.setMode(new SunsetMode(), gc);
                break;
            case Modes.HARD_ENDING:
                this.setMode(new HardEndingMode(), gc);
                break;
            case Modes.MAP:
                this.setMode(new MapMode(), gc);
                break;
            case Modes.CONTINUE:
                this.setMode(new ContinueMode(), gc);
                break;
            case Modes.DIFFICULTY:
                this.setMode(new DifficultyMode(), gc);
                break;
            case Modes.OPTIONS:
                this.setMode(new OptionsMode(), gc);
                break;
            case Modes.INPUT:
                this.setMode(new InputMode(), gc);
                break;
            case Modes.INTRO_MAP:
                this.setMode(new IntroMapMode(), gc);
                break;
        }
    }

    public setMode(mode: IMode, gc: GameContainer): void {
        if (this.currentSong?.lastLifeSuspended) this.stopAllSongs();
        this.input.clearKeyPressedRecord();
        this.mode = mode;
        mode.init(this, gc);
        mode.update(gc);
        this.resetNextFrameTime();
    }

    public addPoints(points: number): void {
        let before = this.score;
        this.score += points;
        if ((before < 20000 && this.score >= 20000) || javaIntDiv(before - 20000, 50000) !== javaIntDiv(this.score - 20000, 50000)) {
            this.gainExtraLife();
        }

        this.scoreStr = Main.formatScore(this.score);
    }

    private static formatScore(score: number): string {
        let digits = score.toString();
        if (digits.length < 6) {
            digits = "000000".substring(0, 6 - digits.length) + digits;
        }
        return digits;
    }

    public loseLife(): void {
        this.extraLives--;
        this.extraLivesStr = this.extraLives.toString();
    }

    public gainExtraLife(): void {
        this.extraLives++;
        this.extraLivesStr = this.extraLives.toString();
        this.playSoundAlways(this.extraLifeSound);
    }

    public friendlySoldierPickedUp(): boolean {
        this.addPoints(500);
        this.friendlySoldiersPickedUp++;
        if (
            this.friendlySoldiersPickedUp === 3 ||
            this.friendlySoldiersPickedUp === 8 ||
            this.friendlySoldiersPickedUp === 13 ||
            this.friendlySoldiersPickedUp === 18
        ) {
            return this.upgradeWeapon(false);
        }
        return false;
    }

    public drawNumber(value: number, digits: number, x: number, y: number, color: number): void {
        const font = this.fonts[color];
        x += (digits - 1) << 5;
        for (let i = 0; i < digits; i++, x -= 32, value = javaIntDiv(value, 10)) {
            font["0".charCodeAt(0) + Math.trunc(value % 10)].draw(x, y);
        }
    }

    public startFade(fadeOut: boolean, fadeListener: IFadeListener | null): void {
        this.fading = true;
        this.fadeOut = fadeOut;
        this.fadeListener = fadeListener;

        if (fadeOut) {
            this.fadeIndex = 0;
        } else {
            this.fadeIndex = Main.FADES.length - 1;
        }
    }

    public removeFadeListener(): void {
        this.fadeListener = null;
    }

    public drawStringWithLength(string: string, length: number, x: number, y: number, color: number): void {
        const font = this.fonts[color];
        for (let i = 0; i < length; i++, x += 32) {
            font[string.charCodeAt(i)].draw(x, y);
        }
    }

    public drawString(string: string, x: number, y: number, color: number): void {
        const font = this.fonts[color];
        const length = string.length;
        for (let i = 0; i < length; i++, x += 32) {
            font[string.charCodeAt(i)].draw(x, y);
        }
    }

    public drawStringAlpha(string: string, x: number, y: number, color: number, alpha: number): void {
        const font = this.fonts[color];
        const length = string.length;
        for (let i = 0; i < length; i++, x += 32) {
            const image = font[string.charCodeAt(i)];
            image.setAlpha(alpha);
            image.draw(x, y);
            image.setAlpha(1);
        }
    }

    public drawImage(image: Image, x: number, y: number): void {
        image.draw(x, y);
    }

    public drawImageAlpha(image: Image, x: number, y: number, alpha: number): void {
        image.setAlpha(alpha);
        image.draw(x, y);
        image.setAlpha(1);
    }

    public playHitExplodeSound(): void {
        this.playSoundAtVolume(this.enemyHitSound, javaFloat(0.6));
        this.playSoundAtVolume(this.explodeSound, javaFloat(0.65));
    }

    public playExplodeSound2(): void {
        this.playSoundAtVolume(this.explodeSound2, javaFloat(0.65));
    }

    public playExplodeSound3(): void {
        this.playSoundAtVolume(this.explodeSound3, javaFloat(0.65));
    }

    public isSoundPlaying(sound: Sound): boolean {
        return sound.playing();
    }

    public playSound(sound: Sound): void {
        if (this.closeRequestedFlag) {
            return;
        }
        let time = this.lastPlayTime.get(sound);
        const now = this.getSoundCooldownTime();
        if (time === undefined || now - time > Main.MINIMUM_SOUND_TIME) {
            sound.play();
            this.lastPlayTime.set(sound, now);
        }
    }

    public playSoundAlways(sound: Sound): void {
        if (this.closeRequestedFlag) {
            return;
        }
        sound.play();
    }

    public playSoundAtVolume(sound: Sound, volume: number): void {
        volume = javaFloat(volume);

        if (this.closeRequestedFlag) {
            return;
        }
        let time = this.lastPlayTime.get(sound);
        const now = this.getSoundCooldownTime();
        if (time === undefined || now - time > Main.MINIMUM_SOUND_TIME) {
            sound.play(1, volume);
            this.lastPlayTime.set(sound, now);
        }
    }

    public playSoundIfNotPlaying(sound: Sound): void {
        if (this.closeRequestedFlag) {
            return;
        }
        if (!sound.playing()) {
            sound.play();
        }
    }

    public playSoundIfNotPlayingAtVolume(sound: Sound, volume: number): void {
        volume = javaFloat(volume);

        if (this.closeRequestedFlag) {
            return;
        }
        if (!sound.playing()) {
            sound.play(1, volume);
        }
    }

    public stopSong(song: Song): void {
        if (song !== null) {
            song.stop();
        }
    }

    public stopSound(sound: Sound): void {
        if (sound !== null && sound.playing()) {
            sound.stop();
        }
    }

    public createUnitVector2(angle: number): number[] {
        this.unitVector[0] = javaFloat(Math.cos(angle));
        this.unitVector[1] = javaFloat(Math.sin(angle));

        return this.unitVector;
    }

    public createUnitVector(angle: number): number[] {
        switch (angle) {
            case 0:
            case 360:
                this.unitVector[0] = 1;
                this.unitVector[1] = 0;
                break;
            case 45:
            case 405:
                this.unitVector[0] = Main.ISQRT2;
                this.unitVector[1] = Main.ISQRT2;
                break;
            case 90:
                this.unitVector[0] = 0;
                this.unitVector[1] = 1;
                break;
            case 135:
                this.unitVector[0] = -Main.ISQRT2;
                this.unitVector[1] = Main.ISQRT2;
                break;
            case 180:
                this.unitVector[0] = -1;
                this.unitVector[1] = 0;
                break;
            case 225:
                this.unitVector[0] = -Main.ISQRT2;
                this.unitVector[1] = -Main.ISQRT2;
                break;
            case 270:
                this.unitVector[0] = 0;
                this.unitVector[1] = -1;
                break;
            case 315:
            case -45:
                this.unitVector[0] = Main.ISQRT2;
                this.unitVector[1] = -Main.ISQRT2;
                break;
        }

        return this.unitVector;
    }

    public drawRotatedWithCenter(image: Image, x: number, y: number, centers: number[], angle: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        image.draw(centers[0], centers[1]);
        GL11.glPopMatrix();
    }

    public drawRotatedScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scaleX: number, scaleY: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        GL11.glScalef(scaleX, scaleY, 1);
        image.draw(centerX, centerY);
        GL11.glPopMatrix();
    }

    public drawRotatedScaledAlpha(
        image: Image,
        x: number,
        y: number,
        centerX: number,
        centerY: number,
        angle: number,
        scaleX: number,
        scaleY: number,
        alpha: number
    ): void {
        image.setAlpha(alpha);
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        GL11.glScalef(scaleX, scaleY, 1);
        image.draw(centerX, centerY);
        GL11.glPopMatrix();
        image.setAlpha(1);
    }

    public drawRotatedAtCenterScaled(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number, scale: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        GL11.glScalef(scale, scale, 1);
        image.draw(centerX, centerY);
        GL11.glPopMatrix();
    }

    public drawRotatedAtCenterScaledAlpha(
        image: Image,
        x: number,
        y: number,
        centerX: number,
        centerY: number,
        angle: number,
        scale: number,
        alpha: number
    ): void {
        image.setAlpha(alpha);
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        GL11.glScalef(scale, scale, 1);
        image.draw(centerX, centerY);
        GL11.glPopMatrix();
        image.setAlpha(1);
    }

    public drawRotatedAtCenter(image: Image, x: number, y: number, centerX: number, centerY: number, angle: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        image.draw(centerX, centerY);
        GL11.glPopMatrix();
    }

    public drawRotatedWithAlpha(image: Image, x: number, y: number, angle: number, alpha: number): void {
        image.setAlpha(alpha);
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
        image.setAlpha(1);
    }

    public translateGraphics(x: number, y: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
    }

    public rotateGraphicsScaled(x: number, y: number, angle: number, scale: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        GL11.glScalef(scale, scale, 1);
    }

    public scaleGraphics(x: number, y: number, scaleX: number, scaleY: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glScalef(scaleX, scaleY, 1);
    }

    public rotateGraphics(x: number, y: number, angle: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
    }

    public popGraphics(): void {
        GL11.glPopMatrix();
    }

    public drawRotated(image: Image, x: number, y: number, angle: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
    }

    public drawRotatedAlpha(image: Image, x: number, y: number, angle: number, alpha: number): void {
        image.setAlpha(alpha);
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
        image.setAlpha(1);
    }

    public drawImageRotatedScaled(image: Image, x: number, y: number, angle: number, scale: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glRotatef(angle, 0, 0, 1);
        GL11.glScalef(scale, scale, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
    }

    public drawCenteredAlpha(image: Image, x: number, y: number, alpha: number): void {
        image.setAlpha(alpha);
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
        image.setAlpha(1);
    }

    public drawCenteredScaledAlpha(image: Image, x: number, y: number, scale: number, alpha: number): void {
        image.setAlpha(alpha);
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glScalef(scale, scale, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
        image.setAlpha(1);
    }

    public drawCenteredScaled(image: Image, x: number, y: number, scale: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glScalef(scale, scale, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
    }

    public drawOffset(image: Image, x: number, y: number): void {
        image.draw(x, y);
    }

    public drawOffsetAlpha(image: Image, x: number, y: number, alpha: number): void {
        image.setAlpha(alpha);
        image.draw(x, y);
        image.setAlpha(1);
    }

    public drawCentered(image: Image): void {
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
    }

    public drawCenteredAt(image: Image, x: number, y: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
    }

    public drawScaledAlpha(image: Image, x: number, y: number, scale: number, alpha: number): void {
        image.setAlpha(alpha);
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glScalef(scale, scale, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
        image.setAlpha(1);
    }

    public drawScaled(image: Image, x: number, y: number, scale: number): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(x, y, 0);
        GL11.glScalef(scale, scale, 1);
        image.draw(-image.getWidth() * 0.5, -image.getHeight() * 0.5);
        GL11.glPopMatrix();
    }

    public drawVehicleWithCenters(sprites: Image[], x: number, y: number, centers: number[][], angle: number): void {
        angle %= 360;
        if (angle < 0) {
            angle += 360;
        }

        if (angle >= 337.5 || angle < 22.5) {
            this.drawRotatedWithCenter(sprites[0], x, y, centers[0], angle);
        } else if (angle < 67.5) {
            this.drawRotatedWithCenter(sprites[1], x, y, centers[1], angle + 45);
        } else if (angle < 112.5) {
            this.drawRotatedWithCenter(sprites[2], x, y, centers[2], angle + 90);
        } else if (angle < 157.5) {
            this.drawRotatedWithCenter(sprites[4], x, y, centers[4], angle - 225);
        } else if (angle < 202.5) {
            this.drawRotatedWithCenter(sprites[3], x, y, centers[3], angle - 180);
        } else if (angle < 247.5) {
            this.drawRotatedWithCenter(sprites[4], x, y, centers[4], angle - 225);
        } else if (angle < 292.5) {
            this.drawRotatedWithCenter(sprites[2], x, y, centers[2], angle + 90);
        } else {
            this.drawRotatedWithCenter(sprites[1], x, y, centers[1], angle + 45);
        }
    }

    public drawVehicleAlpha(sprites: Image[], x: number, y: number, angle: number, alpha: number): void {
        angle %= 360;
        if (angle < 0) {
            angle += 360;
        }

        if (angle >= 337.5 || angle < 22.5) {
            this.drawRotatedWithAlpha(sprites[0], x, y, angle, alpha);
        } else if (angle < 67.5) {
            this.drawRotatedWithAlpha(sprites[1], x, y, angle + 45, alpha);
        } else if (angle < 112.5) {
            this.drawRotatedWithAlpha(sprites[2], x, y, angle + 90, alpha);
        } else if (angle < 157.5) {
            this.drawRotatedWithAlpha(sprites[4], x, y, angle - 225, alpha);
        } else if (angle < 202.5) {
            this.drawRotatedWithAlpha(sprites[3], x, y, angle - 180, alpha);
        } else if (angle < 247.5) {
            this.drawRotatedWithAlpha(sprites[4], x, y, angle - 225, alpha);
        } else if (angle < 292.5) {
            this.drawRotatedWithAlpha(sprites[2], x, y, angle + 90, alpha);
        } else {
            this.drawRotatedWithAlpha(sprites[1], x, y, angle + 45, alpha);
        }
    }

    public drawVehicle(sprites: Image[], x: number, y: number, angle: number): void {
        angle %= 360;
        if (angle < 0) {
            angle += 360;
        }

        if (angle >= 337.5 || angle < 22.5) {
            this.drawRotated(sprites[0], x, y, angle);
        } else if (angle < 67.5) {
            this.drawRotated(sprites[1], x, y, angle + 45);
        } else if (angle < 112.5) {
            this.drawRotated(sprites[2], x, y, angle + 90);
        } else if (angle < 157.5) {
            this.drawRotated(sprites[4], x, y, angle - 225);
        } else if (angle < 202.5) {
            this.drawRotated(sprites[3], x, y, angle - 180);
        } else if (angle < 247.5) {
            this.drawRotated(sprites[4], x, y, angle - 225);
        } else if (angle < 292.5) {
            this.drawRotated(sprites[2], x, y, angle + 90);
        } else {
            this.drawRotated(sprites[1], x, y, angle + 45);
        }
    }

    public suspendMusicForLastLife(): void {
        if (this.closeRequestedFlag) return;
        const current = this.currentSong;
        if (current !== null && current.playing) {
            current.suspendForLastLife();
            return;
        }
        const requested = this.requestedSong;
        if (requested !== null && requested !== current) {
            current?.stop();
            this.currentSong = requested;
            requested.suspendForLastLife();
            return;
        }
        // No active or genuinely queued song: do not revive a naturally finished one.
        this.stopAllSongs();
    }

    public resumeMusicAfterLastLife(): void {
        if (this.closeRequestedFlag) return;
        const current = this.currentSong;
        if (current === null || !current.lastLifeSuspended) return;
        if (current !== this.requestedSong) {
            // A request already existed when death happened. Honor it at the normal
            // scheduling point without briefly resuming the superseded old track.
            current.stop();
            this.currentSong = null;
            return;
        }
        current.resumeAfterLastLife();
    }

    public isSongPlaying(): boolean {
        return this.currentSong !== null && this.currentSong.playing && !this.currentSong.lastLifeSuspended;
    }

    public stopAllSongs(): void {
        if (this.currentSong !== null) {
            this.currentSong.stop();
        }
        this.requestedSong = null;
        this.currentSong = null;
    }

    /** Destroy every logical SFX voice without changing application Sound policy. */
    public stopAllSoundEffects(): void {
        SoundStore.get().stopSoundEffects();
    }

    public stopAllSound(): void {
        this.stopSong(this.bossSong);
        this.stopSong(this.continueSong);
        this.stopSong(this.cutsceneSong);
        this.stopSong(this.endingSong);
        this.stopSong(this.introSong);
        this.stopSong(this.stageSong0);
        this.stopSong(this.stageSong1);
        this.stopSong(this.stageSong2);
        this.stopSong(this.superTankSong);
        this.stopSong(this.titleSong);

        this.stopAllSoundEffects();
    }

    public requestSong(song: Song): void {
        if (this.closeRequestedFlag) {
            return;
        }
        if (this.currentSong?.lastLifeSuspended) {
            this.currentSong.stop();
            this.currentSong = null;
        }
        this.requestedSong = song;
    }

    public reconcileStateAfterRestore(): void {
        this.extraLivesStr = this.extraLives.toString();
        this.scoreStr = Main.formatScore(this.score);
        this.closeRequestedFlag = false;
        this.controllerGrenadePressed = false;
        this.controllerGunPressed = false;
        this.unitVector.fill(0);
    }

    public resetNextFrameTime(): void {
        this.nextFrameTime = Sys.getTime();
    }

    public override closeRequested(): boolean {
        if (!super.closeRequested()) {
            return false;
        }
        this.closeRequestedFlag = true;
        this.stopAllSound();
        return true;
    }

    private getCharacterName(c: string): string {
        switch (c) {
            case ".":
                return "period";
            case ",":
                return "comma";
            case "'":
                return "apostrophe";
            case "!":
                return "exclamation";
            case "-":
                return "hyphen";
            case "@":
            case "\u00a9":
                return "copyright";
            case " ":
                return "space";
            case ":":
                return "colon";
            case "(":
                return "left-paren";
            case ")":
                return "right-paren";
            case "&":
                return "ampersand";
            case "`":
                return "left-quote";
            case '"':
                return "right-quote";
            default:
                return c;
        }
    }

    private loadFont(): void {
        let pack = new XMLPackedSheet("images/font.png", "images/font.xml");
        for (let i = 0; i < 4; i++) {
            let color = null;
            switch (i) {
                case 0:
                    color = "black";
                    break;
                case 1:
                    color = "gray";
                    break;
                case 2:
                    color = "orange";
                    break;
                case 3:
                    color = "orange-gray";
                    break;
            }
            for (let j = 0; j < Main.CHARS.length; j++) {
                const character = Main.CHARS.charAt(j);
                const image = pack.getSprite(`font-${color}-${this.getCharacterName(character)}.png`)!;
                this.fonts[i][character.charCodeAt(0)] = image;
                this.fonts[i][character.toLowerCase().charCodeAt(0)] = image;
            }
        }
    }

    private loadTiles(index: number, stage: Stage): void {
        let pack = new XMLPackedSheet(`images/tiles-${index}.png`, `images/tiles-${index}.xml`);
        let size = Main.TILES[index];
        stage.tiles = javaArray(size, null!);
        for (let i = 0; i < size; i++) {
            if (i === 225) {
                if (index === 5) {
                    pack = new XMLPackedSheet("images/large-5.png", "images/large-5.xml");
                } else {
                    pack = new XMLPackedSheet("images/tiles-6.png", "images/tiles-6.xml");
                }
            }
            stage.tiles[i] = pack.getSprite(`tile-${index}-${i.toString().padStart(3, "0")}.png`)!;
        }
        if (index === 5) {
            for (let i = 0; i < 16; i++) {
                this.conveyors[i] = stage.tiles[i];
            }
        }
    }

    private loadLargeImages(): void {
        this.sunset = this.loadExtraLargeImage("sunset", "large-0", "large-1");
        this.map = this.loadLargeImage("map", "large-1");
        this.jeepYeah = this.loadExtraLargeImage("jeep-yeah", "large-2", "large-3");
        this.soldiers[0] = this.loadLargeImage("soldier-0", "large-3");
        this.soldiers[1] = this.loadLargeImage("soldier-1", "large-3");
        this.soldiers[2] = this.loadLargeImage("soldier-2", "large-3");
        this.soldiers[3] = this.loadLargeImage("soldier-3", "large-3");
        this.jeepHere = this.loadLargeImage("jeep-here", "large-4");
        this.titleImage = this.loadLargeImage("title", "large-5");
    }

    private loadSprites(): void {
        let pack1 = new XMLPackedSheet("images/sprites-1.png", "images/sprites-1.xml");

        for (let i = 0; i < 4; i++) {
            let COLORS = ["green", "yellow", "brown", "gray"];
            for (let j = 0; j < 3; j++) {
                this.players[i][j] = pack1.getSprite(`player-${COLORS[i]}-${j}.png`)!;
            }
            this.players[i][3] = this.players[i][0].getFlippedCopy(true, false);
            this.players[i][4] = this.players[i][1].getFlippedCopy(true, false);
        }

        for (let i = 0; i < 4; i++) {
            this.explosions[i] = pack1.getSprite(`explosion-${i}.png`)!;
        }
        this.grenade = pack1.getSprite("grenade-large.png")!;
        this.playerMissile = pack1.getSprite("player-missile-1.png")!;
        this.whiteBullet = pack1.getSprite("white-bullet.png")!;
        this.yellowBullet = pack1.getSprite("yellow-bullet.png")!;
        this.bulletHit = pack1.getSprite("bullet-hit.png")!;

        this.grayGuns[0] = pack1.getSprite("gray-gun-4.png")!;
        this.grayGuns[1] = pack1.getSprite("gray-gun-5.png")!;

        for (let i = 0; i < 2; i++) {
            let color = i === 0 ? "brown" : "yellow";
            for (let j = 0; j < 8; j++) {
                if (j < 6) {
                    this.enemySoldiers[i][j] = pack1.getSprite(`enemy-soldier-${color}-${j}.png`)!;
                } else {
                    this.enemySoldiers[i][j] = this.enemySoldiers[i][j - 4].getFlippedCopy(true, false);
                }
            }
        }
        this.deadEnemySoldier = pack1.getSprite("enemy-soldier-dead.png")!;

        for (let i = 0; i < 3; i++) {
            this.brownTanks[i] = pack1.getSprite(`brown-tank-${i}.png`)!;
        }
        this.brownTanks[3] = this.brownTanks[0].getFlippedCopy(true, false);
        this.brownTanks[4] = this.brownTanks[1].getFlippedCopy(true, false);

        for (let i = 0; i < 3; i++) {
            this.grayJeeps[i] = pack1.getSprite(`gray-jeep-${i}.png`)!;
        }
        this.grayJeeps[3] = this.grayJeeps[0].getFlippedCopy(true, false);
        this.grayJeeps[4] = this.grayJeeps[1].getFlippedCopy(true, false);

        this.cannonball = pack1.getSprite("cannonball.png")!;

        this.parkedGrayJeep = pack1.getSprite("gray-parked.png")!;

        this.mines[0] = pack1.getSprite("mine-green.png")!;
        this.mines[1] = pack1.getSprite("mine-brown.png")!;
        this.mines[2] = pack1.getSprite("mine-gray.png")!;
        this.mines[3] = pack1.getSprite("mine-yellow.png")!;

        this.lamps[0] = pack1.getSprite("lamp-blue-bright.png")!;
        this.lamps[1] = pack1.getSprite("lamp-blue-dark.png")!;
        this.lamps[2] = pack1.getSprite("lamp-red-bright.png")!;
        this.lamps[3] = pack1.getSprite("lamp-red-dark.png")!;

        this.bomb = pack1.getSprite("bomb-large.png")!;

        this.statueBlueEyes = pack1.getSprite("blue-eyes.png")!;
        this.statueBlueMouth = pack1.getSprite("blue-mouth.png")!;
        this.statueWhiteEyes = pack1.getSprite("white-eyes.png")!;
        this.statueWhiteMouth = pack1.getSprite("white-mouth.png")!;
        this.statueMissiles[0] = pack1.getSprite("statue-missile.png")!;
        this.statueMissiles[1] = this.statueMissiles[0].getFlippedCopy(true, false);

        this.lasers[0] = pack1.getSprite("laser-green.png")!;
        this.lasers[1] = pack1.getSprite("laser-brown.png")!;
        this.lasers[2] = pack1.getSprite("laser-gray.png")!;
        this.lasers[3] = pack1.getSprite("laser-yellow.png")!;
        this.lasers[4] = pack1.getSprite("laser-flash-0.png")!;
        this.lasers[5] = pack1.getSprite("laser-flash-1.png")!;

        this.swampMissiles[0] = pack1.getSprite("swamp-missile-0.png")!;

        this.parkedBrownTank = pack1.getSprite("brown-parked.png")!;

        let pack2 = new XMLPackedSheet("images/sprites-2.png", "images/sprites-2.xml");

        this.swampMissiles[1] = pack2.getSprite("missile-splash-0.png")!;
        this.swampMissiles[2] = this.swampMissiles[1].getFlippedCopy(true, false);
        this.swampMissiles[3] = pack2.getSprite("missile-splash-1.png")!;
        this.swampMissiles[4] = pack2.getSprite("missile-splash-2.png")!;

        for (let i = 0; i < 4; i++) {
            let color = null;
            switch (i) {
                case 0:
                    color = "green";
                    break;
                case 1:
                    color = "brown";
                    break;
                case 2:
                    color = "gray";
                    break;
                case 3:
                    color = "yellow";
                    break;
            }
            this.friendlySoldiers[i][1] = pack2.getSprite(`friendly-soldier-${color}-0.png`)!;
            this.friendlySoldiers[i][0] = this.friendlySoldiers[i][1].getFlippedCopy(true, false);
            this.friendlySoldiers[i][2] = pack2.getSprite(`friendly-soldier-${color}-1.png`)!;
            this.friendlySoldiers[i][3] = pack2.getSprite(`friendly-soldier-${color}-2.png`)!;
            this.friendlySoldiers[i][4] = pack2.getSprite(`friendly-soldier-${color}-3.png`)!;
            this.friendlySoldiers[i][5] = this.friendlySoldiers[i][4].getFlippedCopy(true, false);
            this.friendlySoldiers[i][6] = this.friendlySoldiers[i][2].getFlippedCopy(true, false);
            this.friendlySoldiers[i][7] = this.friendlySoldiers[i][3].getFlippedCopy(true, false);
            this.friendlySoldiers[i][8] = pack2.getSprite(`friendly-soldier-${color}-4.png`)!;
            this.friendlySoldiers[i][9] = pack2.getSprite(`friendly-soldier-${color}-5.png`)!;
            this.friendlySoldiers[i][10] = this.friendlySoldiers[i][8].getFlippedCopy(true, false);
            this.friendlySoldiers[i][11] = this.friendlySoldiers[i][9].getFlippedCopy(true, false);
        }

        this.help = pack2.getSprite("help.png")!;

        this.greenBoats[0] = pack2.getSprite("green-boat-0.png")!;
        this.greenBoats[1] = pack2.getSprite("green-boat-1.png")!;

        this.stars[0] = pack2.getSprite("star-brown.png")!;
        this.stars[1] = pack2.getSprite("star-gray.png")!;
        this.stars[2] = pack2.getSprite("star-green.png")!;
        this.stars[3] = pack2.getSprite("star-yellow.png")!;

        this.friendlyHelicopters[0] = pack2.getSprite("friendly-helicopter-large.png")!;
        this.friendlyHelicopters[1] = pack2.getSprite("friendly-helicopter-shadow.png")!;
        this.friendlyHelicopters[2] = pack2.getSprite("friendly-helicopter-wing-15.png")!;
        this.friendlyHelicopters[3] = pack2.getSprite("friendly-helicopter-wing-30.png")!;

        this.airplanes[0][0] = pack2.getSprite("airplane.png")!;
        this.airplanes[0][1] = pack2.getSprite("airplane-shadow.png")!;
        this.airplanes[1][0] = this.airplanes[0][0].getFlippedCopy(false, true);
        this.airplanes[1][1] = this.airplanes[0][1].getFlippedCopy(false, true);

        this.columns[0] = pack2.getSprite("column-0.png")!.getFlippedCopy(true, false);
        this.columns[1] = pack2.getSprite("column-0.png")!.getFlippedCopy(false, true);

        this.grayBoats[0] = pack2.getSprite("gray-boat-0.png")!;
        this.grayBoats[1] = pack2.getSprite("gray-boat-1.png")!;
        this.grayBoats[2] = pack2.getSprite("gray-boat-2.png")!;

        this.playerWakes[0] = pack2.getSprite("player-wake-0.png")!;
        this.playerWakes[1] = this.playerWakes[0].getFlippedCopy(true, false);
        this.playerWakes[2] = pack2.getSprite("player-wake-2.png")!;
        this.playerWakes[3] = this.playerWakes[2].getFlippedCopy(false, true);
        this.playerWakes[4] = pack2.getSprite("player-wake-1.png")!;
        this.playerWakes[5] = this.playerWakes[4].getFlippedCopy(true, false);

        this.rock = pack2.getSprite("rock-large.png")!;

        for (let i = 0; i < 2; i++) {
            let color = i === 0 ? "brown" : "yellow";
            for (let j = 0; j < 8; j++) {
                if (j < 6) {
                    this.swampSoldiers[i][j] = pack2.getSprite(`swamp-soldier-${color}-${j}.png`)!;
                } else {
                    this.swampSoldiers[i][j] = this.swampSoldiers[i][j - 4].getFlippedCopy(true, false);
                }
            }
        }

        this.cliffMissileLauncher = pack2.getSprite("missile-launcher.png")!;

        let pack3 = new XMLPackedSheet("images/sprites-3.png", "images/sprites-3.xml");

        for (let j = 0; j < 2; j++) {
            let color = j === 0 ? "blue" : "brown";
            let k = j << 1;
            for (let i = 0; i < 3; i++) {
                this.bossBlueTanks[k][i] = pack3.getSprite(`boss-${color}-tank-${i << 1}.png`)!;
            }
            this.bossBlueTanks[k][3] = this.bossBlueTanks[k][0].getFlippedCopy(true, false);
            this.bossBlueTanks[k][4] = this.bossBlueTanks[k][1].getFlippedCopy(true, false);

            k++;
            for (let i = 0; i < 3; i++) {
                this.bossBlueTanks[k][i] = pack3.getSprite(`boss-${color}-tank-${(i << 1) + 1}.png`)!;
            }
            this.bossBlueTanks[k][3] = this.bossBlueTanks[k][0].getFlippedCopy(true, false);
            this.bossBlueTanks[k][4] = this.bossBlueTanks[k][1].getFlippedCopy(true, false);
        }

        for (let i = 0; i < 3; i++) {
            this.grayTanks[i] = pack3.getSprite(`gray-tank-${i}.png`)!;
        }
        this.grayTanks[3] = this.grayTanks[0].getFlippedCopy(true, false);
        this.grayTanks[4] = this.grayTanks[1].getFlippedCopy(true, false);

        this.troopsTruck = pack3.getSprite("troops-truck.png")!;

        this.cannonTruck[0][0] = pack3.getSprite("cannon-truck-0.png")!;
        this.cannonTruck[0][1] = pack3.getSprite("cannon-truck-1.png")!;
        this.cannonTruck[1][0] = this.cannonTruck[0][0].getFlippedCopy(true, false);
        this.cannonTruck[1][1] = this.cannonTruck[0][1].getFlippedCopy(true, false);

        this.tankShack = pack3.getSprite("gray-tank-shack.png")!;

        for (let i = 0; i < 7; i++) {
            this.sparks[0][i] = pack3.getSprite(`spark-${i}.png`)!;
            this.sparks[1][i] = this.sparks[0][i].getFlippedCopy(true, false);
        }

        this.greenGuns[0] = pack3.getSprite("green-gun-4.png")!;
        this.greenGuns[1] = pack3.getSprite("green-gun-5.png")!;
        this.brownGuns[0] = pack3.getSprite("brown-gun-4.png")!;
        this.brownGuns[1] = pack3.getSprite("brown-gun-5.png")!;

        let pack4 = new XMLPackedSheet("images/sprites-4.png", "images/sprites-4.xml");

        for (let i = 0; i < 4; i++) {
            this.submarines[i] = pack4.getSprite(`submarine-${i}.png`)!;
        }

        this.floorGuns[0] = pack4.getSprite("floor-gun-gray.png")!;
        this.floorGuns[1] = pack4.getSprite("floor-gun-yellow.png")!;
        this.floorGuns[2] = pack4.getSprite("floor-gun-brown.png")!;
        this.floorGuns[3] = pack4.getSprite("floor-gun-green.png")!;
        this.floorGuns[4] = pack4.getSprite("floor-gun-background-black.png")!;
        this.floorGuns[5] = pack4.getSprite("floor-gun-background-red.png")!;
        this.floorGuns[6] = pack4.getSprite("floor-gun-stripes-mask.png")!;
        this.floorGuns[7] = pack4.getSprite("floor-gun-striped-panel.png")!;

        this.shipGuns[0] = pack4.getSprite("ship-gun-mask.png")!;
        this.shipGuns[1] = pack4.getSprite("ship-gun-upper-panel.png")!;
        this.shipGuns[2] = pack4.getSprite("ship-gun-lower-panel.png")!;

        this.plainFloorGuns[0] = pack4.getSprite("floor-gun-plain-mask.png")!;
        this.plainFloorGuns[1] = pack4.getSprite("floor-gun-plain-panel.png")!;

        this.trains[0] = pack4.getSprite("train-0.png")!;
        this.trains[1] = pack4.getSprite("train-1.png")!;
        this.trains[2] = pack4.getSprite("tunnel.png")!;

        this.bossHelicopters[0] = pack4.getSprite("boss-helicopter-0.png")!;
        this.bossHelicopters[1] = this.bossHelicopters[0].getFlippedCopy(true, false);
        this.bossHelicopters[2] = pack4.getSprite("boss-helicopter-blade.png")!;
        this.bossHelicopters[3] = pack4.getSprite("boss-helicopter-tail-0.png")!;
        this.bossHelicopters[4] = pack4.getSprite("boss-helicopter-tail-1.png")!;
        this.bossHelicopters[5] = pack4.getSprite("boss-helicopter-shadow.png")!;

        for (let i = 0; i < 5; i++) {
            this.parachutes[i] = pack4.getSprite(`parachute-${i}.png`)!;
        }

        for (let i = 0; i < 5; i++) {
            this.cliffGuns[i] = pack4.getSprite(`cliff-gun-${i}.png`)!;
        }

        for (let i = 0; i < 3; i++) {
            this.fires[0][i] = pack4.getSprite(`fire-${i}.png`)!;
            if (i === 2) {
                this.fires[1][i] = this.fires[0][i].getFlippedCopy(true, false);
            } else {
                this.fires[1][i] = this.fires[0][i].getFlippedCopy(true, true);
            }
        }

        for (let i = 0; i < 3; i++) {
            this.fireTanks[i] = pack4.getSprite(`fire-tank-${i}.png`)!;
        }
        this.fireTanks[3] = this.fireTanks[0].getFlippedCopy(true, false);
        this.fireTanks[4] = this.fireTanks[1].getFlippedCopy(true, false);

        for (let i = 0; i < 5; i++) {
            this.garages[i] = pack4.getSprite(`door-${i}.png`)!;
        }

        let pack5 = new XMLPackedSheet("images/sprites-5.png", "images/sprites-5.xml");

        for (let i = 0; i < 4; i++) {
            this.floorMissileLauncher[i] = pack5.getSprite(`missile-launcher-floor-${i}.png`)!;
        }

        this.enemyHelicopters[0] = pack5.getSprite("enemy-helicopter-body.png")!;
        this.enemyHelicopters[1] = pack5.getSprite("enemy-helicopter-blade.png")!;
        this.enemyHelicopters[2] = pack5.getSprite("enemy-helicopter-shadow.png")!;

        this.headquartersLights[0] = pack5.getSprite("headquarters-light-yellow.png")!;
        this.headquartersLights[1] = pack5.getSprite("headquarters-light-brown.png")!;

        this.elephantGuns[1] = pack5.getSprite("elephant-gun-0.png")!;
        this.elephantGuns[2] = pack5.getSprite("elephant-gun-1.png")!;
        this.elephantGuns[0] = this.elephantGuns[2].getFlippedCopy(true, false);
        this.elephantGuns[3] = pack5.getSprite("elephant-gun-5.png")!;
        this.elephantGuns[4] = pack5.getSprite("elephant-gun-2.png")!;
        this.elephantGuns[5] = pack5.getSprite("elephant-gun-3.png")!;
        this.elephantGuns[6] = pack5.getSprite("elephant-gun-4.png")!;
        this.elephantGuns[7] = this.elephantGuns[6].getFlippedCopy(true, false);
        this.elephantGuns[8] = pack5.getSprite("elephant-missile.png")!;

        this.superTanks[0][0] = pack5.getSprite("super-tank-tread-yellow.png")!;
        this.superTanks[0][1] = pack5.getSprite("super-tank-wheel-yellow.png")!;
        this.superTanks[0][2] = pack5.getSprite("super-tank-top-yellow.png")!;
        this.superTanks[0][3] = pack5.getSprite("super-tank-middle-yellow.png")!;
        this.superTanks[0][4] = pack5.getSprite("super-tank-bottom-yellow.png")!;

        this.superFires[0][0] = pack5.getSprite("super-fire-0.png")!;
        this.superFires[0][1] = pack5.getSprite("super-fire-1.png")!;
        this.superFires[0][2] = this.superFires[0][0].getFlippedCopy(false, true);
        this.superFires[1][0] = pack5.getSprite("super-fire-2.png")!;
        this.superFires[1][1] = pack5.getSprite("super-fire-3.png")!;
        this.superFires[1][2] = this.superFires[0][0].getFlippedCopy(false, true);

        this.superGuns[0] = pack5.getSprite("super-tank-gun-green-0.png")!;
        this.superGuns[1] = pack5.getSprite("super-tank-gun-brown-0.png")!;

        let pack6 = new XMLPackedSheet("images/sprites-6.png", "images/sprites-6.xml");

        this.superTanks[1][0] = pack6.getSprite("super-tank-tread-orange.png")!;
        this.superTanks[1][1] = pack6.getSprite("super-tank-wheel-orange.png")!;
        this.superTanks[1][2] = pack6.getSprite("super-tank-top-orange.png")!;
        this.superTanks[1][3] = pack6.getSprite("super-tank-middle-orange.png")!;
        this.superTanks[1][4] = pack6.getSprite("super-tank-bottom-orange.png")!;

        this.superTanks[2][0] = pack6.getSprite("super-tank-tread-red.png")!;
        this.superTanks[2][1] = pack6.getSprite("super-tank-wheel-red.png")!;
        this.superTanks[2][2] = pack6.getSprite("super-tank-top-red.png")!;
        this.superTanks[2][3] = pack6.getSprite("super-tank-middle-red.png")!;
        this.superTanks[2][4] = pack6.getSprite("super-tank-bottom-red.png")!;

        let pack7 = new XMLPackedSheet("images/sprites-7.png", "images/sprites-7.xml");

        this.superTanks[3][0] = this.superTanks[2][0];
        this.superTanks[3][1] = this.superTanks[2][1];
        this.superTanks[3][2] = pack7.getSprite("super-tank-top-smashed.png")!;
        this.superTanks[3][3] = pack7.getSprite("super-tank-middle-smashed.png")!;
        this.superTanks[3][4] = pack7.getSprite("super-tank-bottom-smashed.png")!;

        this.chinooks[0] = pack7.getSprite("chinook-body.png")!;
        this.chinooks[1] = this.chinooks[0].getFlippedCopy(false, true);
        this.chinooks[2] = pack7.getSprite("chinook-blade.png")!;
        this.chinooks[3] = pack7.getSprite("chinook-shadow.png")!;

        this.heres[0] = pack7.getSprite("here-0.png")!;
        this.heres[1] = pack7.getSprite("here-1.png")!;
        this.smoke = pack7.getSprite("smoke.png")!;
        this.blackPlane = pack7.getSprite("jeep-yeah-plane.png")!;
        this.gunFires[0] = pack7.getSprite("jeep-yeah-fire-0.png")!;
        this.gunFires[1] = pack7.getSprite("jeep-yeah-fire-1.png")!;
        this.jeepYeahBullet = pack7.getSprite("jeep-yeah-bullet.png")!;
        this.yeahs[0] = pack7.getSprite("yeah-0.png")!;
        this.yeahs[1] = pack7.getSprite("yeah-1.png")!;
        this.yeahs[2] = pack7.getSprite("yeah-2.png")!;
        this.yeahs[3] = pack7.getSprite("yeah-3.png")!;

        let pack8 = new XMLPackedSheet("images/sprites-8.png", "images/sprites-8.xml");

        let sun = pack8.getSprite("sun.png")!;
        this.suns = javaArray(sun.getHeight(), null!);
        for (let i = this.suns.length - 1; i >= 0; i--) {
            this.suns[i] = sun.getSubImage(0, i, sun.getWidth(), 1);
        }

        let wave = pack8.getSprite("waves-0.png")!;
        this.waves = javaArray(wave.getHeight(), null!);
        for (let i = this.waves.length - 1; i >= 0; i--) {
            this.waves[i] = wave.getSubImage(0, i, wave.getWidth(), 1);
        }

        this.rescueHelicopters[0] = pack8.getSprite("rescue-helicopter-body-0.png")!;
        this.rescueHelicopters[1] = pack8.getSprite("rescue-helicopter-body-1.png")!;
        this.rescueHelicopters[2] = pack8.getSprite("rescue-helicopter-blade.png")!;
    }

    private loadExtraLargeImage(name: string, ...packNames: string[]): ExtraLargeImage {
        let packs = javaArray<XMLPackedSheet>(packNames.length, null!);
        for (let i = 0; i < packNames.length; i++) {
            packs[i] = new XMLPackedSheet("images/" + packNames[i] + ".png", "images/" + packNames[i] + ".xml")!;
        }

        const dis = openDataResource(`images/${name}.dat`);

        let width = dis.readShort();
        let height = dis.readShort();
        let tileCount = dis.readShort();
        let mapLocal = java2DArray(width * height, 3, 0);

        for (let y = 0; y < height; y++) {
            let Y = width * y;
            let y2 = y << 5;
            for (let x = 0; x < width; x++) {
                let cell = mapLocal[Y + x];
                cell[0] = dis.readShort();
                cell[1] = x << 5;
                cell[2] = y2;
            }
        }
        mapLocal.sort((cell1: number[], cell2: number[]) => cell1[0] - cell2[0]);

        let tiles = javaArray<Image>(tileCount, null!);
        for (let i = 0, j = 0; i < tileCount; i++) {
            while (true) {
                tiles[i] = packs[j]!.getSprite(`${name}-${i.toString().padStart(3, "0")}.png`)!;
                if (tiles[i] === null) {
                    j++;
                } else {
                    break;
                }
            }
        }

        return new ExtraLargeImage(this, tiles!, mapLocal);
    }

    private loadLargeImage(name: string, packName: string): LargeImage {
        const dis = openDataResource(`images/${name}.dat`);

        let width = dis.readShort();
        let height = dis.readShort();
        let tileCount = dis.readShort();
        let mapLocal = java2DArray(height, width, 0);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                mapLocal[y][x] = dis.readShort();
            }
        }

        let pack = new XMLPackedSheet("images/" + packName + ".png", "images/" + packName + ".xml");

        let tiles = javaArray<Image>(tileCount, null!);
        for (let i = 0; i < tileCount; i++) {
            tiles[i] = pack.getSprite(`${name}-${i.toString().padStart(3, "0")}.png`)!;
        }

        return new LargeImage(this, tiles!, mapLocal, width, height);
    }

    private loadTriggerMaps(height: number, enemySizes: number[][], stageIndex: number, stage: Stage): void {
        this.loadTriggerMap(height, enemySizes, stageIndex, stage, false);
        this.loadTriggerMap(height, enemySizes, stageIndex, stage, true);
    }

    private loadTriggerMap(height: number, enemySizes: number[][], stageIndex: number, stage: Stage, hard: boolean): void {
        let lists: ArrayList<number[]>[] = javaArray<ArrayList<number[]>>(height, null!);
        for (let i = 0; i < height; i++) {
            lists[i] = new ArrayList<number[]>();
        }
        const dis = openDataResource(`maps/enemies${hard ? "-hard" : ""}-${stageIndex}.dat`);
        let count = dis.readShort();
        for (let i = 0; i < count; i++) {
            let index = dis.readShort();
            let tileX = dis.readShort();
            let tileY = dis.readShort();
            let triggerY = tileY + enemySizes[index][1] - 1;

            lists[triggerY].add([index, tileX << 5, tileY << 5]);
        }
        dis.close();

        let triggerMap = javaArray<number[][]>(height, null!);
        stage.triggerMap[hard ? 1 : 0] = triggerMap!;
        for (let i = 0; i < height; i++) {
            let list = lists[i];
            triggerMap[i] = java2DArray(list.size(), 3, 0)!;
            for (let j = 0; j < list.size(); j++) {
                let element = list.get(j);
                for (let k = 0; k < 3; k++) {
                    triggerMap[i]![j][k] = element[k];
                }
            }
        }
    }

    private loadSizes(): void {
        const dis = openDataResource("maps/sizes.dat");
        let count = dis.readShort();
        this.triggerSizes = java2DArray(count, 2, 0);
        for (let i = 0; i < count; i++) {
            let width = dis.readShort();
            let height = dis.readShort();

            if (
                i === Triggers.BOSS_BLUE_TANKS ||
                i === Triggers.BOSS_GARAGE ||
                i === Triggers.BOSS_HEADQUARTERS ||
                i === Triggers.BOSS_HELICOPTER ||
                i === Triggers.BOSS_SHIP ||
                i === Triggers.BOSS_STATUES
            ) {
                height -= 4;
            }

            this.triggerSizes[i][0] = width;
            this.triggerSizes[i][1] = height;
        }
        dis.close();
    }

    private loadMaps(index: number, stage: Stage): void {
        const dis = openDataResource(`maps/map-${index}.dat`);
        stage.mapWidth = dis.readShort();
        stage.mapHeight = dis.readShort();
        stage.tileMap = java2DArray(stage.mapHeight + 1, stage.mapWidth, 0);
        stage.groupsMap = java2DArray(stage.mapHeight + 1, stage.mapWidth, 0);
        for (let y = 0; y < stage.mapHeight; y++) {
            for (let x = 0; x < stage.mapWidth; x++) {
                stage.tileMap[y][x] = dis.readShort();
            }
        }
        let groupCount = dis.readShort();
        stage.groups = javaArray(groupCount, null!);
        for (let i = 0; i < groupCount; i++) {
            let groupSize = dis.readShort();
            stage.groups[i] = java2DArray(groupSize, 4, 0);
            for (let j = 0; j < groupSize; j++) {
                for (let k = 0; k < 3; k++) {
                    stage.groups[i][j][k] = dis.readShort(); // { x, y, tile }
                }
                stage.groupsMap[stage.groups[i][j][1]][stage.groups[i][j][0]] = javaByte(i);
            }
        }
        dis.close();
    }

    private loadTypes(index: number, stage: Stage): void {
        const dis = openDataResource(`maps/types-${index}.dat`);
        stage.mapWidth = dis.readShort();
        stage.mapHeight = dis.readShort();
        stage.typesMap = java2DArray(stage.mapHeight + 1, stage.mapWidth, 0);
        for (let y = 0; y < stage.mapHeight; y++) {
            for (let x = 0; x < stage.mapWidth; x++) {
                stage.typesMap[y][x] = dis.readShort();
            }
        }
        for (let x = 0; x < stage.mapWidth; x++) {
            stage.typesMap[stage.mapHeight][x] = GameMode.TYPE_WATER;
        }
        stage.mapHeight++;
        let groupCount = dis.readShort();
        for (let i = 0; i < groupCount; i++) {
            let groupSize = dis.readShort();
            for (let j = 0; j < groupSize; j++) {
                dis.readShort(); // x
                dis.readShort(); // y
                stage.groups[i][j][3] = dis.readShort(); // type
            }
        }
        dis.close();
    }

    private loadStages(stages: Stage[]): void {
        for (let i = 0; i < 6; i++) {
            stages[i] = new Stage();
            this.loadStage(i, stages[i]);
        }
    }

    private loadStage(index: number, stage: Stage): void {
        this.loadTiles(index, stage);
        this.loadMaps(index, stage);
        this.loadTypes(index, stage);
        this.loadDirections(index, stage);
        this.loadTriggerMaps(stage.mapHeight, this.triggerSizes, index, stage);
    }

    private loadDirections(index: number, stage: Stage): void {
        const dis = openDataResource(`maps/dirs-${index}.dat`);
        let size = dis.readInt();
        stage.directionsWidth = dis.readInt();
        stage.directionsHeight = dis.readInt();
        stage.directions = javaArray(size, 0n);
        stage.directionsDecoded = new Uint8Array(size * 21);
        for (let i = 0; i < size; i++) {
            let value = dis.readLong();
            let decodedIndex = i * 21;
            stage.directions[i] = value;
            for (let j = 0; j < 21; j++) {
                stage.directionsDecoded[decodedIndex + j] = Number((value >> JAVA_LONG_PACKED_3BIT_SHIFTS[j]) & JAVA_LONG_LOW_3_BITS);
            }
        }
        dis.close();
    }

    public loadNext(): number {
        switch (this.loadIndex) {
            case 0:
                this.bossIntro = new Music("music/boss_intro.ogg", Song.STREAMING);
                break;
            case 1:
                this.bossRepeat = new Music("music/boss_repeat.ogg", Song.STREAMING);
                break;
            case 2:
                this.superTankIntro = new Music("music/super_tank_intro.ogg", Song.STREAMING);
                break;
            case 3:
                this.stage0Intro = new Music("music/stage0_intro.ogg", Song.STREAMING);
                break;
            case 4:
                this.stage0Repeat = new Music("music/stage0_repeat.ogg", Song.STREAMING);
                break;
            case 5:
                this.start = new Music("music/start.ogg", Song.STREAMING);
                break;
            case 6:
                this.bossSong = Song.fromIntroAndLoopMusic(this.bossIntro, this.bossRepeat);
                this.continueSong = Song.fromIntroPath("music/continue.ogg");
                break;
            case 7:
                this.cutsceneSong = Song.fromIntroPath("music/cutscene.ogg");
                break;
            case 8:
                this.endingSong = Song.fromIntroAndLoopPaths("music/ending_intro.ogg", "music/ending_repeat.ogg");
                break;
            case 9:
                this.introSong = Song.fromTwoIntrosAndLoopMusic(this.start, this.stage0Intro, this.stage0Repeat);
                this.stageSong0 = Song.fromIntroAndLoopMusic(this.stage0Intro, this.stage0Repeat);
                this.stageSong1 = Song.fromIntroAndLoopPaths("music/stage1_intro.ogg", "music/stage1_repeat.ogg");
                break;
            case 10:
                this.stageSong2 = Song.fromIntroAndLoopPaths(null, "music/stage2_repeat.ogg");
                break;
            case 11:
                this.superTankSong = Song.fromIntroAndLoopMusic(this.superTankIntro, this.bossRepeat);
                this.titleSong = Song.fromIntroPath("music/title.ogg");
                this.bossIntro = null!;
                this.bossRepeat = null!;
                this.superTankIntro = null!;
                this.stage0Intro = null!;
                this.stage0Repeat = null!;
                this.start = null!;
                break;
            case 12:
                this.bulletHitSound = new Sound("soundeffects/bullet_hit.ogg");
                break;
            case 13:
                this.enemyHitSound = new Sound("soundeffects/enemy_hit.ogg");
                break;
            case 14:
                this.explodeSound = new Sound("soundeffects/explode.ogg");
                break;
            case 15:
                this.explodeSound2 = new Sound("soundeffects/explode2.ogg");
                break;
            case 16:
                this.explodeSound3 = new Sound("soundeffects/explode3.ogg");
                break;
            case 17:
                this.extraLifeSound = new Sound("soundeffects/extra_life.ogg");
                break;
            case 18:
                this.fireSound = new Sound("soundeffects/fire.ogg");
                break;
            case 19:
                this.helicopterSound = new Sound("soundeffects/helicopter.ogg");
                break;
            case 20:
                this.helicopterSound2 = new Sound("soundeffects/helicopter2.ogg");
                break;
            case 21:
                this.helicopterPickupSound = new Sound("soundeffects/helicopter_pickup.ogg");
                break;
            case 22:
                this.headquartersExplodesSound = new Sound("soundeffects/hq_explodes.ogg");
                break;
            case 23:
                this.hutSound = new Sound("soundeffects/hut.ogg");
                break;
            case 24:
                this.introChingSound = new Sound("soundeffects/intro_ching.ogg");
                break;
            case 25:
                this.introTypeSound = new Sound("soundeffects/intro_type.ogg");
                break;
            case 26:
                this.laserSound = new Sound("soundeffects/laser.ogg");
                break;
            case 27:
                this.machineGunSound = new Sound("soundeffects/machine_gun.ogg");
                break;
            case 28:
                this.missileSound = new Sound("soundeffects/missile.ogg");
                break;
            case 29:
                this.pauseSound = new Sound("soundeffects/pause.ogg");
                break;
            case 30:
                this.pickupSound = new Sound("soundeffects/pickup.ogg");
                break;
            case 31:
                this.playerExplodeSound = new Sound("soundeffects/player_explodes.ogg");
                break;
            case 32:
                this.soldierKilledSound = new Sound("soundeffects/soldier_killed.ogg");
                break;
            case 33:
                this.planeSound = new Sound("soundeffects/plane.ogg");
                break;
            case 34:
                this.throwSound = new Sound("soundeffects/throw.ogg");
                break;
            case 35:
                this.weaponUpgradeSound = new Sound("soundeffects/weapon_upgrade.ogg");
                break;
            case 36:
                this.wellDoneSound = new Sound("soundeffects/well_done.ogg");
                break;
            case 37:
                this.loadSprites();
                break;
            case 38:
                this.loadLargeImages();
                break;
            case 39:
                this.loadSizes();
                break;
            case 40:
                this.loadStages(this.stages);
                break;
            case 41:
                let loadingHandled = false;
                if (this.loadingCompleteHandler !== null) {
                    loadingHandled = this.loadingCompleteHandler(this.gc) === true;
                }
                this.notifyLoadingFinished();
                if (!loadingHandled) {
                    this.requestMode(Modes.INTRO, this.gc);
                }
                break;
        }

        return javaFloat(++this.loadIndex / 42);
    }

    public completeLoadingImmediately(gc: GameContainer): void {
        while (this.loadIndex < 42) {
            this.loadNext();
        }
        this.resetNextFrameTime();
    }

    public isLoadingScreenActive(): boolean {
        return this.loadIndex < 42;
    }

    public isStateSaveReady(): boolean {
        return this.loadIndex >= 42 && this.mode !== null && this.gc !== null;
    }

    /** Reserves the process-wide Java-style runtime slot before asynchronous container startup. */
    public reserveBrowserRuntime(): void {
        Main.mainInstance = this;
    }

    public isBrowserRuntimeActive(): boolean {
        return this.browserRuntimeActive && isMainRuntimeActive(this);
    }

    public disposeBrowserRuntime(): void {
        if (!this.browserRuntimeActive) {
            return;
        }
        this.browserRuntimeActive = false;
        clearMainRuntime(this);
        this.inputMappingChangedHandler = null;
        this.difficultyChangedHandler = null;
        this.loadingCompleteHandler = null;
        this.loadingFinishedHandler = null;
    }

    /** PWA suspension controls simulation/input, never logical audio preferences. */
    public setBrowserSuspended(suspended: boolean): void {
        this.soundCooldownClock.setPaused(suspended);
        this.browserSuspended = suspended;
        this.clearInputPressedRecords();
        if (!suspended) {
            this.gc?.getInput().sampleControllersForBaseline();
            this.input?.snap();
            if (this.mode instanceof GameMode) {
                this.mode.player?.resyncInputAfterBrowserResume();
            } else if (this.mode instanceof InputMode) {
                this.mode.resyncInputAfterBrowserResume();
            }
            const mode = this.mode;
            if (mode !== null && typeof mode === "object" && Reflect.has(mode, "menu")) {
                const menu = Reflect.get(mode, "menu");
                if (menu instanceof Menu) {
                    menu.resyncInputAfterBrowserResume();
                }
            }
            this.konamiCode?.resyncInputAfterBrowserResume();
        }
        this.resetNextFrameTime();
    }

    public stopAllSounds(): void {
        this.stopAllSound();
    }

    public clearInputPressedRecords(): void {
        if (this.input !== null) {
            this.input.clearKeyPressedRecord();
        }
        if (this.gc !== null && this.gc.getInput !== null && this.gc.getInput !== undefined) {
            let slickInput = this.gc.getInput();
            if (
                slickInput !== null &&
                slickInput !== undefined &&
                slickInput.clearKeyPressedRecord !== null &&
                slickInput.clearKeyPressedRecord !== undefined
            ) {
                slickInput.clearKeyPressedRecord();
            }
            if (
                slickInput !== null &&
                slickInput !== undefined &&
                slickInput.clearControlPressedRecord !== null &&
                slickInput.clearControlPressedRecord !== undefined
            ) {
                slickInput.clearControlPressedRecord();
            }
        }
    }

    private notifyLoadingFinished(): void {
        if (this.loadingFinishedNotified) {
            return;
        }
        this.loadingFinishedNotified = true;
        if (this.loadingFinishedHandler !== null) {
            this.loadingFinishedHandler();
        }
    }

    public notifyInputMappingChanged(): MappingWriteResult {
        if (this.inputMappingChangedHandler === null) {
            return { saved: false, reason: "unavailable" };
        }
        return this.inputMappingChangedHandler();
    }

    public notifyDifficultyChanged(): boolean {
        return this.difficultyChangedHandler?.(this.hardMode) ?? false;
    }

    public static rotate(x: number, y: number, angle: number): InstanceType<typeof Point2D.Float> {
        return rotatePointLikeJava(x, y, angle);
    }
}
