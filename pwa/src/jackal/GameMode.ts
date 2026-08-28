import { GL11, type GameContainer, type Graphics, type Image } from "slick2d-ts";
import { ArrayList, System, java2DArray, javaArray, javaDouble, javaFloat, javaInt, javaRoundFloat } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { Airplane } from "./Airplane.js";
import { AppearingBrownTank } from "./AppearingBrownTank.js";
import { AppearingEnemyHelicopter } from "./AppearingEnemyHelicopter.js";
import { AppearingGrayJeep } from "./AppearingGrayJeep.js";
import { AppearingPlane } from "./AppearingPlane.js";
import { AppearingSoldier } from "./AppearingSoldier.js";
import { BossBlueTanksManager } from "./BossBlueTanksManager.js";
import { BossGarageManager } from "./BossGarageManager.js";
import { BossHeadquartersManager } from "./BossHeadquartersManager.js";
import { BossHelicopterManager } from "./BossHelicopterManager.js";
import { BossShipManager } from "./BossShipManager.js";
import { BossStatuesManager } from "./BossStatuesManager.js";
import { BrownTank } from "./BrownTank.js";
import { CannonTruck } from "./CannonTruck.js";
import { Chinook } from "./Chinook.js";
import { CliffGun } from "./CliffGun.js";
import { CliffMissileLauncher } from "./CliffMissileLauncher.js";
import { Column } from "./Column.js";
import { CutsceneSequence } from "./CutsceneSequence.js";
import { Enemy } from "./Enemy.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { EnemySoldier } from "./EnemySoldier.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
import { FireTank } from "./FireTank.js";
import { FloorGun } from "./FloorGun.js";
import { FloorMissileLauncher } from "./FloorMissileLauncher.js";
import { FriendlyHelicopter } from "./FriendlyHelicopter.js";
import { FriendlySoldier } from "./FriendlySoldier.js";
import { GameElement } from "./GameElement.js";
import { Gate } from "./Gate.js";
import { GrayBoat } from "./GrayBoat.js";
import { GrayJeep } from "./GrayJeep.js";
import { GrayTank } from "./GrayTank.js";
import { GreenBoat } from "./GreenBoat.js";
import { House } from "./House.js";
import { Hut } from "./Hut.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IMode } from "./IMode.js";
import { InvisibleStar } from "./InvisibleStar.js";
import { LandingPort } from "./LandingPort.js";
import { LasersManager } from "./LasersManager.js";
import { Mine } from "./Mine.js";
import { Modes } from "./Modes.js";
import { ParkedBrownTank } from "./ParkedBrownTank.js";
import { ParkedGrayJeep } from "./ParkedGrayJeep.js";
import { Player } from "./Player.js";
import { Rock } from "./Rock.js";
import { RotatingGun } from "./RotatingGun.js";
import { Star } from "./Star.js";
import { Statue } from "./Statue.js";
import { Submarine } from "./Submarine.js";
import { SwampMissileLauncher } from "./SwampMissileLauncher.js";
import { TrainManager } from "./TrainManager.js";
import { Triggers } from "./Triggers.js";
import { TroopsTruck } from "./TroopsTruck.js";
import type { ICameraPanListener } from "./ICameraPanListener.js";
import type { IInput } from "./IInput.js";
import type { Stage } from "./Stage.js";
import type { Main } from "./Main.js";
export class GameMode implements IMode, IFadeListener {
    public static readonly CAMERA_MARGIN_NORTH: number = 384;
    public static readonly CAMERA_MARGIN_SOUTH: number = 192;
    public static readonly CAMERA_MARGIN_SIDES: number = 256;
    public static readonly CAMERA_BOUND: number = 224;
    public static readonly REMOVE_BOUND: number = 1536;
    public static readonly BOSS_PAN_CAMERA_SPEED: number = 4;
    public static readonly ENDING_PAN_CAMERA_SPEED: number = 2;
    public static readonly CONVEYOR_SPEED: number = Player.SPEED / 3;
    public static readonly STAGE_COMPLETED_DELAY: number = 228;

    public static readonly TYPE_SOLID: number = 0;
    public static readonly TYPE_EMPTY: number = 1;
    public static readonly TYPE_SHIELD: number = 2;
    public static readonly TYPE_WATER: number = 3;
    public static readonly TYPE_SWAMP: number = 4;
    public static readonly TYPE_CONVEYOR: number = 5;

    public static readonly DIR_UP: number = 0;
    public static readonly DIR_DOWN: number = 1;
    public static readonly DIR_LEFT: number = 2;
    public static readonly DIR_RIGHT: number = 3;
    public static readonly DIR_UP_LEFT: number = 4;
    public static readonly DIR_UP_RIGHT: number = 5;
    public static readonly DIR_DOWN_LEFT: number = 6;
    public static readonly DIR_DOWN_RIGHT: number = 7;

    public static readonly DIRECTION_RADIANS: number[] = [
        javaFloat((3.0 * Math.PI) / 2.0),
        javaFloat(Math.PI / 2.0),
        javaFloat(Math.PI),
        javaFloat(0.0),
        javaFloat((5.0 * Math.PI) / 4.0),
        javaFloat((7.0 * Math.PI) / 4.0),
        javaFloat((3.0 * Math.PI) / 4.0),
        javaFloat(Math.PI / 4.0)
    ];

    public static readonly DIRECTION_DEGREES: number[] = [270, 90, 180, 0, 225, 315, 135, 45];

    public static readonly WATER_ALPHAS_PERIOD: number = 136;
    public static readonly WATER_ALPHAS: number[] = javaArray(GameMode.WATER_ALPHAS_PERIOD, 0);
    static {
        for (let i = 0; i < GameMode.WATER_ALPHAS_PERIOD; i++) {
            GameMode.WATER_ALPHAS[i] = 0.5 + 0.5 * javaFloat(Math.sin((2.0 * Math.PI * i) / javaDouble(GameMode.WATER_ALPHAS_PERIOD)));
        }
    }

    public main: Main = null!;
    public gc: GameContainer = null!;
    public input: IInput = null!;

    public stage: Stage = null!;

    public tileMap: number[][] = null!; // mutable during gameplay
    public typesMap: number[][] = null!; // mutable during gameplay
    public triggedGroups: boolean[] = null!; // mutable during gameplay

    public tiles: Image[] = null!;
    public groups: number[][][] = null!;
    public triggerMap: number[][][] = null!;
    public groupsMap: number[][] = null!;
    public mapWidth: number = 0;
    public mapHeight: number = 0;
    public directions: bigint[] = null!;
    public directionsDecoded: Uint8Array = null!;
    public directionsWidth: number = 0;
    public directionsHeight: number = 0;
    public g: Graphics = null!;
    public waterAlphaIndex: number = 0;
    public conveyorOffset: number = 0;
    public conveyorLastIndex: number = 0;
    public conveyorDelta: number = 0;

    public player: Player = null!;
    public cameraX: number = 0;
    public cameraY: number = 0;
    public maxCameraX: number = 0;
    public maxCameraY: number = 0;
    public paused: boolean = false;
    public triggerY: number = 0;
    public bossCameraPan: boolean = false;
    public endingCameraPan: boolean = false;
    public playing: boolean = true;
    public cameraPanListener: ICameraPanListener = null!;

    public stageIndex: number = 0;

    public stageCompletedFlag: boolean = false;
    public stageCompletedDelay: number = GameMode.STAGE_COMPLETED_DELAY;

    public elements: ArrayList<GameElement>[] = javaArray(8, null!);

    public enemies: ArrayList<Enemy> = new ArrayList<Enemy>(256);
    public solids: ArrayList<Enemy> = new ArrayList<Enemy>(256);
    public mines: ArrayList<Enemy> = new ArrayList<Enemy>(256);

    public init(main: Main, gc: GameContainer): void {
        this.main = main;
        this.gc = gc;
        this.input = main.input;

        main.friendlySoldiersPickedUp = 0;
        FriendlySoldier.resetCount();

        for (let i = 0; i < this.elements.length; i++) {
            this.elements[i] = new ArrayList<GameElement>(256);
        }

        this.triggerY = this.mapHeight;
        this.maxCameraX = (this.mapWidth - 32) * 32;
        this.maxCameraY = (this.mapHeight - 31) * 32;
        this.cameraX = 0;
        this.cameraY = this.maxCameraY;

        this.player = new Player();
        this.player.y = this.cameraY + 2 * MainConstants.DISPLAY_HEIGHT;
    }

    public setStage(stageIndex: number, stage: Stage, hard: boolean): void {
        this.stageIndex = stageIndex;
        this.stage = stage;

        this.tiles = stage.tiles;
        this.groups = stage.groups;
        this.triggerMap = stage.triggerMap[hard ? 1 : 0];
        this.groupsMap = stage.groupsMap;
        this.mapWidth = stage.mapWidth;
        this.mapHeight = stage.mapHeight;
        this.directions = stage.directions;
        this.directionsDecoded = stage.directionsDecoded;
        this.directionsWidth = stage.directionsWidth;
        this.directionsHeight = stage.directionsHeight;

        this.tileMap = java2DArray(stage.tileMap.length, stage.tileMap[0].length, 0);
        for (let i = stage.tileMap.length - 1; i >= 0; i--) {
            System.arraycopy(stage.tileMap[i], 0, this.tileMap[i], 0, stage.tileMap[i].length);
        }

        this.typesMap = java2DArray(stage.typesMap.length, stage.typesMap[0].length, 0);
        for (let i = stage.typesMap.length - 1; i >= 0; i--) {
            System.arraycopy(stage.typesMap[i], 0, this.typesMap[i], 0, stage.typesMap[i].length);
        }

        this.triggedGroups = javaArray(this.groups.length, false);
    }

    public startBossCameraPan(cameraPanListener: ICameraPanListener): void {
        this.bossCameraPan = true;
        this.cameraPanListener = cameraPanListener;
    }

    public startEndingCameraPan(cameraPanListener: ICameraPanListener): void {
        this.playing = false;
        this.endingCameraPan = true;
        this.cameraPanListener = cameraPanListener;
    }

    public rotate(v: number[], angle: number): void {
        let cos = javaFloat(Math.cos(angle));
        let sin = javaFloat(Math.sin(angle));

        let x = v[0];
        let y = v[1];

        v[0] = x * cos - y * sin;
        v[1] = x * sin + y * cos;
    }

    public triggerGroup(groupIndex: number): void {
        if (!this.triggedGroups[groupIndex]) {
            this.triggedGroups[groupIndex] = true;
            let group = this.groups[groupIndex];
            for (let i = group.length - 1; i >= 0; i--) {
                let gLocal = group[i];
                let x = gLocal[0];
                let y = gLocal[1];
                let tile = gLocal[2];
                let type = gLocal[3];
                this.tileMap[y][x] = tile;
                this.typesMap[y][x] = type;
            }
        }
    }

    // rotates 90+ degrees, used after a collision
    public suggestDirection(arg0?: number, arg1?: number, arg2?: number, arg3?: number, arg4?: number | boolean, arg5?: boolean): number[] {
        const argCount = arguments.length;
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            return this.suggestDirection__overload0(arg0, arg1);
        }
        if (
            argCount === 6 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "number" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number" &&
            typeof arg5 === "boolean"
        ) {
            return this.suggestDirection__overload1(arg0, arg1, arg2, arg3, arg4, arg5);
        }
        if (
            argCount === 5 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "number" &&
            typeof arg3 === "number" &&
            typeof arg4 === "boolean"
        ) {
            return this.suggestDirection__overload2(arg0, arg1, arg2, arg3, arg4);
        }
        throw new Error(`No Java method overload matched suggestDirection: ${argCount}`);
    }

    public suggestDirection__overload0(vx: number, vy: number): number[] {
        let clockwise = true;

        if (vy >= 0) {
            if (vx >= 0) {
                if (vy > vx) {
                    clockwise = false;
                }
            } else {
                if (-vx > vy) {
                    clockwise = false;
                }
            }
        } else {
            if (vx >= 0) {
                if (vx > -vy) {
                    clockwise = false;
                }
            } else {
                if (vx >= vy) {
                    clockwise = false;
                }
            }
        }

        let angle = 1.571 + 0.4 * this.main.random.nextFloat();
        let v = this.main.unitVector;
        v[0] = vx;
        v[1] = vy;
        if (clockwise) {
            this.rotate(v, angle);
        } else {
            this.rotate(v, -angle);
        }

        return v;
    }

    public straightDirection(x1: number, y1: number, x2: number, y2: number): number[] {
        let angle = javaFloat((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI);
        if (angle < 0) {
            angle += 360;
        }

        let ang = 45 * javaRoundFloat(angle / 45);
        let v = this.main.createUnitVector(ang);
        v[2] = ang;

        return v;
    }

    public suggestDirection__overload1(x1: number, y1: number, x2: number, y2: number, currentAngle: number, addRandomness: boolean): number[] {
        let v: number[] = null!;

        let X1 = javaInt(x1) >> 7;
        let Y1 = javaInt(y1) >> 7;
        let X2 = javaInt(x2) >> 7;
        let Y2 = javaInt(y2) >> 7;

        if (
            X1 < 0 ||
            Y1 < 0 ||
            X1 >= this.directionsWidth ||
            Y1 >= this.directionsHeight ||
            X2 < 0 ||
            Y2 < 0 ||
            X2 >= this.directionsWidth ||
            Y2 >= this.directionsHeight
        ) {
            return this.straightDirection(x1, y1, x2, y2);
        }

        let i = (((Y1 << 4) + X1) << 4) * this.directionsHeight + ((Y2 << 4) + X2);
        let index = (i / 21) | 0;

        if (index < 0 || index >= this.directions.length) {
            return this.straightDirection(x1, y1, x2, y2);
        }

        let direction = this.directionsDecoded[i];

        if (addRandomness) {
            let angle = GameMode.DIRECTION_RADIANS[direction] + (this.main.random.nextFloat() - 0.5) * 0.7854;

            v = this.main.createUnitVector2(angle);
            v[2] = angle;
        } else {
            let targetAngle = GameMode.DIRECTION_DEGREES[direction];
            let deltaAngle = (targetAngle - currentAngle + 180) % 360;
            if (deltaAngle < 0) {
                deltaAngle += 180;
            } else {
                deltaAngle -= 180;
            }
            if (deltaAngle != 0) {
                if (deltaAngle < 0) {
                    currentAngle -= 45;
                } else {
                    currentAngle += 45;
                }
                if (currentAngle < 0) {
                    currentAngle += 360;
                } else if (currentAngle >= 360) {
                    currentAngle -= 360;
                }
            }

            v = this.main.createUnitVector(currentAngle);
            v[2] = currentAngle;
        }

        return v;
    }

    public suggestDirection__overload2(x1: number, y1: number, x2: number, y2: number, addRandomness: boolean): number[] {
        let v: number[] = null!;

        let X1 = javaInt(x1) >> 7;
        let Y1 = javaInt(y1) >> 7;
        let X2 = javaInt(x2) >> 7;
        let Y2 = javaInt(y2) >> 7;

        if (
            X1 < 0 ||
            Y1 < 0 ||
            X1 >= this.directionsWidth ||
            Y1 >= this.directionsHeight ||
            X2 < 0 ||
            Y2 < 0 ||
            X2 >= this.directionsWidth ||
            Y2 >= this.directionsHeight
        ) {
            return this.straightDirection(x1, y1, x2, y2);
        }

        let i = (((Y1 << 4) + X1) << 4) * this.directionsHeight + ((Y2 << 4) + X2);
        let index = (i / 21) | 0;

        if (index < 0 || index >= this.directions.length) {
            return this.straightDirection(x1, y1, x2, y2);
        }

        let direction = this.directionsDecoded[i];

        if (addRandomness) {
            let angle = GameMode.DIRECTION_RADIANS[direction] + (this.main.random.nextFloat() - 0.5) * 0.7854;

            v = this.main.createUnitVector2(angle);
            v[2] = angle;
        } else {
            let angle = GameMode.DIRECTION_DEGREES[direction];
            v = this.main.createUnitVector(angle);
            v[2] = GameMode.DIRECTION_DEGREES[direction];
        }

        return v;
    }

    private cameraTrackPlayer(): void {
        if (this.player.x - this.cameraX < GameMode.CAMERA_MARGIN_SIDES) {
            this.cameraX = this.player.x - GameMode.CAMERA_MARGIN_SIDES;
            if (this.cameraX < 0) {
                this.cameraX = 0;
            }
        } else if (this.cameraX - this.player.x < GameMode.CAMERA_MARGIN_SIDES - MainConstants.DISPLAY_WIDTH) {
            this.cameraX = this.player.x + GameMode.CAMERA_MARGIN_SIDES - MainConstants.DISPLAY_WIDTH;
            if (this.cameraX > this.maxCameraX) {
                this.cameraX = this.maxCameraX;
            }
        }

        if (this.player.y - this.cameraY < GameMode.CAMERA_MARGIN_NORTH) {
            this.cameraY = this.player.y - GameMode.CAMERA_MARGIN_NORTH;
            if (this.cameraY < 0) {
                this.cameraY = 0;
            }
        } else if (this.cameraY - this.player.y < GameMode.CAMERA_MARGIN_SOUTH - MainConstants.DISPLAY_HEIGHT) {
            this.cameraY = this.player.y + GameMode.CAMERA_MARGIN_SOUTH - MainConstants.DISPLAY_HEIGHT;
            if (this.cameraY > this.maxCameraY) {
                this.cameraY = this.maxCameraY;
            }
        }

        let maxY = this.cameraY + GameMode.CAMERA_BOUND;
        if (maxY < this.maxCameraY) {
            this.maxCameraY = maxY;
        }
    }

    private processTriggers(): void {
        let row = (javaInt(this.cameraY) >> 5) - 1;
        if (row >= 0) {
            while (this.triggerY > row) {
                let triggers = this.triggerMap[--this.triggerY];
                for (let i = triggers.length - 1; i >= 0; i--) {
                    let trigger = triggers[i];
                    this.processTrigger(trigger[0], trigger[1], trigger[2]);
                }
            }
        }
    }

    private processTrigger(index: number, x: number, y: number): void {
        switch (index) {
            case Triggers.GRAY_GUN:
                new RotatingGun(x + 64, y + 64, true);
                break;
            case Triggers.SOLDIER_WALKER:
                new EnemySoldier(x + 32, y + 74, EnemySoldierType.WALKER);
                break;
            case Triggers.SOLDIER_STATIONARY:
                new EnemySoldier(x + 32, y + 74, EnemySoldierType.STATIONARY);
                break;
            case Triggers.GREEN_BOAT:
                new GreenBoat(x + 72, y + 56);
                break;
            case Triggers.BROWN_TANK:
                new BrownTank(x + 32, y + 48);
                break;
            case Triggers.FRIENDLY_HELICOPTER_LANDING:
                new FriendlyHelicopter(this.cameraX + MainConstants.DISPLAY_WIDTH / 2, this.cameraY + MainConstants.DISPLAY_HEIGHT + 128, true, false);
                break;
            case Triggers.YELLOW_GUN:
                new RotatingGun(x + 64, y + 64, false);
                break;
            case Triggers.STAR_BROWN:
                new InvisibleStar(x + 32, y + 32, Star.TYPE_BROWN);
                break;
            case Triggers.GRAY_TANK:
                new GrayTank(x + 64, y + 64);
                break;
            case Triggers.STAR_FLASHING:
                new InvisibleStar(x + 32, y + 32, Star.TYPE_FLASHING);
                break;
            case Triggers.AIRPLANE:
                new Airplane(x + 60, y + 62);
                break;
            case Triggers.GRAY_JEEP:
                new GrayJeep(x + 32, y + 46);
                break;
            case Triggers.PARKED_GRAY_JEEP:
                new ParkedGrayJeep(x + 32, y + 46);
                break;
            case Triggers.GRAY_BOAT:
                new GrayBoat(x, y);
                break;
            case Triggers.APPEARING_SOLDIER:
                new AppearingSoldier(x + 32, y + 74);
                break;
            case Triggers.APPEARING_BROWN_TANK:
                new AppearingBrownTank(x + 8, y + 12);
                break;
            case Triggers.SUBMARINE:
                new Submarine(x + 32, y + 128);
                break;
            case Triggers.TROOPS_TRUCK:
                new TroopsTruck(x, y + 8);
                break;
            case Triggers.FLOOR_GUN:
                new FloorGun(x, y + 28);
                break;
            case Triggers.SWAMP_MISSILE_LAUNCHER:
                new SwampMissileLauncher(x, y);
                break;
            case Triggers.ROCK:
                new Rock(x + 32, y + 32);
                break;
            case Triggers.CANNON_TRUCK_RIGHT:
                new CannonTruck(x + 16, y, true);
                break;
            case Triggers.MINE:
                new Mine(x + 16, y);
                break;
            case Triggers.CLIFF_MISSILE_LAUNCHER:
                new CliffMissileLauncher(x + 16, y + 20);
                break;
            case Triggers.TRAIN:
                new TrainManager(x + 4, y);
                break;
            case Triggers.CANNON_TRUCK_LEFT:
                new CannonTruck(x + 16, y, false);
                break;
            case Triggers.HOUSE_LEFT:
                new House(x, y, true);
                break;
            case Triggers.HOUSE_RIGHT:
                new House(x, y, false);
                break;
            case Triggers.HUT:
                new Hut(x, y, false, false);
                break;
            case Triggers.SHACK:
                new Hut(x, y, true, false);
                break;
            case Triggers.GATE:
                new Gate(x, y);
                break;
            case Triggers.TANK_SHACK:
                new Hut(x, y, true, true);
                break;
            case Triggers.CLIFF_GUN:
                new CliffGun(x, y);
                break;
            case Triggers.FIRE_TANK:
                new FireTank(x + 64, y + 64);
                break;
            case Triggers.SOLDIER_FIRE:
                new EnemySoldier(x + 32, y + 74, EnemySoldierType.FIRE);
                break;
            case Triggers.PARKED_BROWN_TANK:
                new ParkedBrownTank(x + 32, y + 40);
                break;
            case Triggers.PLAYER:
                this.createPlayer(x + 48, y + 48);
                this.main.startFade(false, null!);
                switch (this.main.stageIndex) {
                    case 3:
                        this.main.requestSong(this.main.stageSong0);
                        break;
                    case 1:
                    case 4:
                        this.main.requestSong(this.main.stageSong1);
                        break;
                    case 2:
                    case 5:
                        this.main.requestSong(this.main.stageSong2);
                        break;
                }
                break;
            case Triggers.GREEN_GUN:
                new RotatingGun(x + 48, y + 44, RotatingGun.TYPE_GREEN);
                break;
            case Triggers.APPEARING_PLANE:
                new AppearingPlane(x + 60, y + 62);
                break;
            case Triggers.ENEMY_HELICOPTER:
                new EnemyHelicopter(true);
                break;
            case Triggers.FLOOR_GUN_PLAIN:
                new FloorGun(x, y + 28, true);
                break;
            case Triggers.BROWN_GUN:
                new RotatingGun(x + 48, y + 44, RotatingGun.TYPE_BROWN);
                break;
            case Triggers.APPEARING_ENEMY_HELICOPTER:
                new AppearingEnemyHelicopter(y);
                break;
            case Triggers.APPEARING_GRAY_JEEP:
                new AppearingGrayJeep(x + 32, y + 46);
                break;
            case Triggers.FLOOR_MISSILE_LAUNCHER:
                new FloorMissileLauncher(x + 16, y + 8);
                break;
            case Triggers.STATUE_NONE:
                new Statue(x, y, Statue.TYPE_NONE);
                break;
            case Triggers.STATUE_LEFT:
                new Statue(x, y, Statue.TYPE_LEFT);
                break;
            case Triggers.STATUE_RIGHT:
                new Statue(x, y, Statue.TYPE_RIGHT);
                break;
            case Triggers.COLUMN:
                new Column(x, y);
                break;
            case Triggers.LANDING_PORT_LEFT:
                new LandingPort(x, y, LandingPort.TYPE_LEFT);
                break;
            case Triggers.LANDING_PORT_RIGHT:
                new LandingPort(x, y, LandingPort.TYPE_RIGHT);
                break;
            case Triggers.LANDING_PORT_CIRCLE:
                new LandingPort(x, y, LandingPort.TYPE_CIRCLE);
                break;
            case Triggers.BOSS_BLUE_TANKS:
                new BossBlueTanksManager();
                this.main.requestSong(this.main.bossSong);
                break;
            case Triggers.BOSS_STATUES:
                new BossStatuesManager();
                this.main.requestSong(this.main.bossSong);
                break;
            case Triggers.LASER:
                new LasersManager(x, y);
                break;
            case Triggers.BOSS_SHIP:
                new BossShipManager();
                this.main.requestSong(this.main.bossSong);
                break;
            case Triggers.BOSS_HELICOPTER:
                new BossHelicopterManager();
                this.main.requestSong(this.main.bossSong);
                break;
            case Triggers.STAR_GREEN:
                new InvisibleStar(x + 32, y + 32, Star.SPRITE_GREEN);
                break;
            case Triggers.BOSS_GARAGE:
                new BossGarageManager();
                this.main.requestSong(this.main.bossSong);
                break;
            case Triggers.BOSS_HEADQUARTERS:
                new BossHeadquartersManager();
                this.main.requestSong(this.main.bossSong);
                break;
            case Triggers.CHINOOK:
                new Chinook();
                if (this.main.continued) {
                    this.main.requestSong(this.main.stageSong0);
                }
                this.main.startFade(false, null!);
                break;
        }
    }

    private createPlayer(x: number, y: number): void {
        this.cameraX = x - GameMode.CAMERA_MARGIN_NORTH - 48;
        if (this.cameraX < 0) {
            this.cameraX = 0;
        }
        this.player.x = x;
        this.player.y = y;
        this.player.makeInvincible();
    }

    public isMissileTarget(x: number, y: number): boolean {
        let type = this.getTileType(x, y);
        return type == GameMode.TYPE_SOLID || type == GameMode.TYPE_SHIELD;
    }

    public isDriveable(arg0?: number, arg1?: number, arg2?: number, arg3?: number): boolean {
        const argCount = arguments.length;
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
            return this.isDriveable__overload0(arg0, arg1, arg2, arg3);
        }
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            return this.isDriveable__overload1(arg0, arg1);
        }
        throw new Error(`No Java method overload matched isDriveable: ${argCount}`);
    }

    public isDriveable__overload0(x1: number, y1: number, x2: number, y2: number): boolean {
        return this.isDriveable(x1, y1) && this.isDriveable(x2, y2) && this.isDriveable(x1, y2) && this.isDriveable(x2, y1);
    }

    public isSolidTile(x: number, y: number): boolean {
        return this.typesMap[y][x] == GameMode.TYPE_SOLID;
    }

    public isDriveable__overload1(x: number, y: number): boolean {
        let type = this.getTileType(x, y);
        return type == GameMode.TYPE_EMPTY || type == GameMode.TYPE_SWAMP || type == GameMode.TYPE_CONVEYOR;
    }

    public isDriveableLand(x: number, y: number): boolean {
        let type = this.getTileType(x, y);
        return type == GameMode.TYPE_EMPTY || type == GameMode.TYPE_CONVEYOR;
    }

    public isSolid(x: number, y: number): boolean {
        return this.getTileType(x, y) == GameMode.TYPE_SOLID;
    }

    public isEmpty(x: number, y: number): boolean {
        return this.getTileType(x, y) == GameMode.TYPE_EMPTY;
    }

    public isShield(x: number, y: number): boolean {
        return this.getTileType(x, y) == GameMode.TYPE_SHIELD;
    }

    public isWater(x: number, y: number): boolean {
        return this.getTileType(x, y) == GameMode.TYPE_WATER;
    }

    public isSwamp(x: number, y: number): boolean {
        return this.getTileType(x, y) == GameMode.TYPE_SWAMP;
    }

    public isConveyor(x: number, y: number): boolean {
        return this.getTileType(x, y) == GameMode.TYPE_CONVEYOR;
    }

    public isOutsideOfFrame(arg0?: number, arg1?: number, arg2?: number, arg3?: number): boolean {
        const argCount = arguments.length;
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            return this.isOutsideOfFrame__overload0(arg0, arg1);
        }
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
            return this.isOutsideOfFrame__overload1(arg0, arg1, arg2, arg3);
        }
        throw new Error(`No Java method overload matched isOutsideOfFrame: ${argCount}`);
    }

    public isOutsideOfFrame__overload0(x: number, y: number): boolean {
        return y > this.cameraY + MainConstants.DISPLAY_HEIGHT || x < this.cameraX || y < this.cameraY || x > this.cameraX + MainConstants.DISPLAY_WIDTH;
    }

    public isOutsideOfFrame__overload1(x1: number, y1: number, x2: number, y2: number): boolean {
        return y1 > this.cameraY + MainConstants.DISPLAY_HEIGHT || x2 < this.cameraX || y2 < this.cameraY || x1 > this.cameraX + MainConstants.DISPLAY_WIDTH;
    }

    public distanceOutsideOfFrame(x: number, y: number): number {
        if (y < this.cameraY) {
            return this.cameraY - y;
        }
        if (y > this.cameraY + MainConstants.DISPLAY_HEIGHT) {
            return y - (this.cameraY + MainConstants.DISPLAY_HEIGHT);
        }
        if (x < this.cameraX) {
            return this.cameraX - x;
        }
        if (x > this.cameraX + MainConstants.DISPLAY_WIDTH) {
            return x - (this.cameraX + MainConstants.DISPLAY_WIDTH);
        }
        return 0;
    }

    public audioVolume(x: number, y: number): number {
        let d = this.distanceOutsideOfFrame(x, y);
        if (d == 0) {
            return 1;
        } else if (d >= 256) {
            return 0;
        } else {
            return 1 - d / 256;
        }
    }

    public destroyAll(arg0?: Enemy): void {
        const argCount = arguments.length;
        if (argCount === 1 && (arg0 === null || arg0 instanceof Enemy)) {
            return this.destroyAll__overload0(arg0);
        }
        if (argCount === 0) {
            return this.destroyAll__overload1();
        }
        throw new Error(`No Java method overload matched destroyAll: ${argCount}`);
    }

    public destroyAll__overload0(exceptEnemy: Enemy): void {
        for (let i = this.enemies.size() - 1; i >= 0; i--) {
            let enemy = this.enemies.get(i);
            if (enemy != exceptEnemy) {
                enemy.explode();
            }
        }
        for (let i = 7; i >= 0; i--) {
            let list = this.elements[i];
            for (let j = list.size() - 1; j >= 0; j--) {
                let element = list.get(j);
                if (element.enemyBullet) {
                    element.removeFlag = true;
                }
            }
        }
    }

    public destroyAll__overload1(): void {
        for (let i = this.enemies.size() - 1; i >= 0; i--) {
            let enemy = this.enemies.get(i);
            enemy.explode();
        }
        for (let i = 7; i >= 0; i--) {
            let list = this.elements[i];
            for (let j = list.size() - 1; j >= 0; j--) {
                let element = list.get(j);
                if (element.enemyBullet) {
                    element.remove();
                }
            }
        }
    }

    public destroyAllWithinFrame(): void {
        for (let i = this.enemies.size() - 1; i >= 0; i--) {
            let enemy = this.enemies.get(i);
            if (!this.isOutsideOfFrame(enemy.x + enemy.hitX1, enemy.y + enemy.hitY1, enemy.x + enemy.hitX2, enemy.y + enemy.hitY2)) {
                enemy.explode();
            }
        }
        for (let i = 7; i >= 0; i--) {
            let list = this.elements[i];
            for (let j = list.size() - 1; j >= 0; j--) {
                let element = list.get(j);
                if (element.enemyBullet) {
                    element.removeFlag = true;
                }
            }
        }
    }

    public getTileType(x: number, y: number): number {
        let X = javaInt(x) >> 5;
        let Y = javaInt(y) >> 5;
        if (X < 0) {
            X = 0;
        } else if (X >= this.mapWidth) {
            X = this.mapWidth - 1;
        }
        if (Y < 0) {
            Y = 0;
        } else if (Y >= this.mapHeight) {
            Y = this.mapHeight - 1;
        }

        return this.typesMap[Y][X];
    }

    public add(arg0?: Enemy | GameElement): void {
        const argCount = arguments.length;
        if (argCount === 1 && (arg0 === null || arg0 instanceof Enemy)) {
            return this.add__overload0(arg0 as Enemy);
        }
        if (argCount === 1 && (arg0 === null || arg0 instanceof GameElement)) {
            return this.add__overload1(arg0 as GameElement);
        }
        throw new Error(`No Java method overload matched add: ${argCount}`);
    }

    public add__overload0(enemy: Enemy): void {
        this.elements[enemy.layer].add(enemy);
        this.enemies.add(enemy);
        if (enemy.solid) {
            this.solids.add(enemy);
        }
        if (enemy.mine) {
            this.mines.add(enemy);
        }
    }

    public add__overload1(gameElement: GameElement): void {
        if (gameElement.enemy) {
            this.add(gameElement);
        } else {
            this.elements[gameElement.layer].add(gameElement);
        }
    }

    public stageCompleted(): void {
        this.stageCompletedFlag = true;
        this.main.stopSong();
    }

    public fadeCompleted(): void {
        if (this.stageIndex == 5) {
            this.main.requestMode(Modes.SUNSET, this.gc);
        } else {
            CutsceneSequence.requestCutscene(this.gc);
        }
    }

    public update(gc: GameContainer): void {
        if (this.paused) {
            if (this.input.isPause()) {
                this.paused = false;
                gc.setMusicOn(true);
            }
            this.main.resetNextFrameTime();
            return;
        } else if (this.input.isPause() && !this.stageCompletedFlag && this.playing && this.main.isSongPlaying()) {
            this.paused = true;
            this.main.playSound(this.main.pauseSound);
            gc.setMusicOn(false);
        }

        if (++this.waterAlphaIndex == GameMode.WATER_ALPHAS_PERIOD) {
            this.waterAlphaIndex = 0;
        }

        if (this.stageIndex == 5) {
            this.conveyorOffset += GameMode.CONVEYOR_SPEED;
            if (this.conveyorOffset >= 16) {
                this.conveyorOffset -= 16;
            }
            let conveyorIndex = javaInt(this.conveyorOffset);
            this.conveyorDelta = conveyorIndex - this.conveyorLastIndex;
            if (this.conveyorDelta < 0) {
                this.conveyorDelta += 16;
            }
            this.tiles[0] = this.main.conveyors[conveyorIndex];
            this.conveyorLastIndex = conveyorIndex;
        }

        if (this.bossCameraPan && this.cameraY != 0) {
            this.cameraY -= GameMode.BOSS_PAN_CAMERA_SPEED;
            if (this.cameraY <= 0) {
                this.maxCameraY = this.cameraY = 0;
                this.bossCameraPan = false;
                this.cameraPanListener.panComplete();
            } else {
                return;
            }
        }

        if (this.endingCameraPan) {
            if (this.cameraX > 512) {
                this.cameraX -= GameMode.ENDING_PAN_CAMERA_SPEED;
                if (this.cameraX <= 512) {
                    this.cameraX = 512;
                    this.endingCameraPan = false;
                    this.cameraPanListener.panComplete();
                } else {
                    return;
                }
            } else {
                this.cameraX += GameMode.ENDING_PAN_CAMERA_SPEED;
                if (this.cameraX >= 512) {
                    this.cameraX = 512;
                    this.endingCameraPan = false;
                    this.cameraPanListener.panComplete();
                } else {
                    return;
                }
            }
        }

        this.processTriggers();

        let maxBoundY = this.maxCameraY + GameMode.REMOVE_BOUND;

        for (let i = 7; i >= 0; i--) {
            let list = this.elements[i];
            for (let j = list.size() - 1; j >= 0; j--) {
                let element = list.get(j);
                if (!element.removeFlag) {
                    element.checkBounds(maxBoundY);
                }
                if (!element.removeFlag) {
                    element.update();
                    if (element.changeLayerValue >= 0) {
                        if (element.layer != element.changeLayerValue) {
                            element.layer = element.changeLayerValue;
                            list.remove(j);
                            this.elements[element.layer].add(element);
                        }
                        element.changeLayerValue = -1;
                    }
                }
                if (element.removeFlag) {
                    list.remove(j);
                    if (element.enemy) {
                        let enemy = element as Enemy;
                        this.enemies.remove(enemy);
                        if (enemy.solid) {
                            this.solids.remove(enemy);
                        }
                        if (enemy.mine) {
                            this.mines.remove(enemy);
                        }
                    }
                }
            }
        }

        if (this.playing) {
            this.player.update();
            this.cameraTrackPlayer();
        }

        if (this.stageCompletedFlag && --this.stageCompletedDelay == 0) {
            this.main.startFade(true, this);
        }
    }

    private drawBackground(): void {
        let xOffset = this.cameraX % 32;
        let yOffset = this.cameraY % 32;
        let xTile = javaInt(this.cameraX / 32);
        let yTile = javaInt(this.cameraY / 32);
        let xStart = 32 + xTile == this.mapWidth ? 31 : 32;
        let main = this.main;
        let tiles = this.tiles;
        let tileMap = this.tileMap;

        if (this.stageIndex > 0) {
            if (this.stageIndex == 2) {
                for (let i = 0; i < 4; i++) {
                    tiles[i].setAlpha(GameMode.WATER_ALPHAS[this.waterAlphaIndex]);
                }
                // tile sheet 2 (includes water rendering)
                for (let y = 30; y >= 0; y--) {
                    let Y = (y << 5) - yOffset;
                    for (let x = xStart; x >= 0; x--) {
                        let tile = tileMap[y + yTile][x + xTile];
                        let X = (x << 5) - xOffset;
                        if (tile < 32) {
                            let water = (((y + yTile) & 1) << 1) + ((x + xTile) & 1);
                            main.draw__overload0(tiles[water + 4], X, Y);
                            main.draw__overload0(tiles[water], X, Y);
                        }
                        if (tile < 225) {
                            main.draw__overload0(tiles[tile], X, Y);
                        }
                    }
                }
            } else {
                // tile sheet [stage index]
                for (let y = 30; y >= 0; y--) {
                    let Y = (y << 5) - yOffset;
                    for (let x = xStart; x >= 0; x--) {
                        let tile = tileMap[y + yTile][x + xTile];
                        if (tile < 225) {
                            main.draw__overload0(tiles[tile], (x << 5) - xOffset, Y);
                        }
                    }
                }
            }

            // tile sheet 6
            for (let y = 30; y >= 0; y--) {
                let Y = (y << 5) - yOffset;
                for (let x = xStart; x >= 0; x--) {
                    let tile = tileMap[y + yTile][x + xTile];
                    if (tile >= 225) {
                        main.draw__overload0(tiles[tile], (x << 5) - xOffset, Y);
                    }
                }
            }
        } else {
            // tile sheet [stage index]
            for (let y = 30; y >= 0; y--) {
                for (let x = xStart; x >= 0; x--) {
                    main.draw__overload0(tiles[tileMap[y + yTile][x + xTile]], (x << 5) - xOffset, (y << 5) - yOffset);
                }
            }
        }
    }

    private drawSprites(): void {
        GL11.glPushMatrix();
        GL11.glTranslatef(-this.cameraX, -this.cameraY, 0);

        for (let i = 0; i < 4; i++) {
            let list = this.elements[i];
            for (let j = list.size() - 1; j >= 0; j--) {
                let element = list.get(j);
                if (!element.removeFlag) {
                    element.render();
                }
            }
        }

        this.player.render();

        for (let i = 4; i < 8; i++) {
            let list = this.elements[i];
            for (let j = list.size() - 1; j >= 0; j--) {
                let element = list.get(j);
                if (!element.removeFlag) {
                    element.render();
                }
            }
        }

        GL11.glPopMatrix();
    }

    private drawScore(): void {
        this.main.drawString("1P", 64, 804, MainConstants.FONT_WHITE);
        this.main.drawString(this.main.scoreStr, 160, 804, MainConstants.FONT_WHITE);
        this.main.drawString("P", 176, 868, MainConstants.FONT_WHITE);
        this.main.drawString(this.main.extraLivesStr, 216, 868, MainConstants.FONT_WHITE);
    }

    public render(gc: GameContainer, g: Graphics): void {
        this.g = g;

        this.drawBackground();
        this.drawSprites();

        if (this.playing) {
            this.drawScore();
        }
    }
}
