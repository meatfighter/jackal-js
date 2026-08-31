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
    public static readonly CONVEYOR_SPEED: number = javaFloat(Player.SPEED / 3);
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
            GameMode.WATER_ALPHAS[i] = javaFloat(0.5 + javaFloat(0.5 * javaFloat(Math.sin((2.0 * Math.PI * i) / javaDouble(GameMode.WATER_ALPHAS_PERIOD)))));
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
        this.maxCameraX = javaFloat((this.mapWidth - 32) * 32);
        this.maxCameraY = javaFloat((this.mapHeight - 31) * 32);
        this.cameraX = 0;
        this.cameraY = this.maxCameraY;

        this.player = new Player();
        this.player.y = javaFloat(this.cameraY + 2 * MainConstants.DISPLAY_HEIGHT);
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

        v[0] = javaFloat(javaFloat(x * cos) - javaFloat(y * sin));
        v[1] = javaFloat(javaFloat(x * sin) + javaFloat(y * cos));
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

    public suggestDirectionFromVelocity(vx: number, vy: number): number[] {
        vx = javaFloat(vx);
        vy = javaFloat(vy);

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

        let angle = javaFloat(javaFloat(1.571) + javaFloat(javaFloat(0.4) * this.main.random.nextFloat()));
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
        let angle = javaFloat((Math.atan2(javaFloat(y2 - y1), javaFloat(x2 - x1)) * 180) / Math.PI);
        if (angle < 0) {
            angle = javaFloat(angle + 360);
        }

        let ang = 45 * javaRoundFloat(javaFloat(angle / 45));
        let v = this.main.createUnitVector(ang);
        v[2] = javaFloat(ang);

        return v;
    }

    public suggestDirectionWithCurrentAngle(x1: number, y1: number, x2: number, y2: number, currentAngle: number, addRandomness: boolean): number[] {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

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
            let angle = javaFloat(GameMode.DIRECTION_RADIANS[direction] + javaFloat(javaFloat(this.main.random.nextFloat() - 0.5) * javaFloat(0.7854)));

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
            if (deltaAngle !== 0) {
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
            v[2] = javaFloat(currentAngle);
        }

        return v;
    }

    public suggestDirection(x1: number, y1: number, x2: number, y2: number, addRandomness: boolean): number[] {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

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
            let angle = javaFloat(GameMode.DIRECTION_RADIANS[direction] + javaFloat(javaFloat(this.main.random.nextFloat() - 0.5) * javaFloat(0.7854)));

            v = this.main.createUnitVector2(angle);
            v[2] = angle;
        } else {
            let angle = GameMode.DIRECTION_DEGREES[direction];
            v = this.main.createUnitVector(angle);
            v[2] = javaFloat(GameMode.DIRECTION_DEGREES[direction]);
        }

        return v;
    }

    private cameraTrackPlayer(): void {
        if (javaFloat(this.player.x - this.cameraX) < GameMode.CAMERA_MARGIN_SIDES) {
            this.cameraX = javaFloat(this.player.x - GameMode.CAMERA_MARGIN_SIDES);
            if (this.cameraX < 0) {
                this.cameraX = 0;
            }
        } else if (javaFloat(this.cameraX - this.player.x) < javaFloat(GameMode.CAMERA_MARGIN_SIDES - MainConstants.DISPLAY_WIDTH)) {
            this.cameraX = javaFloat(javaFloat(this.player.x + GameMode.CAMERA_MARGIN_SIDES) - MainConstants.DISPLAY_WIDTH);
            if (this.cameraX > this.maxCameraX) {
                this.cameraX = this.maxCameraX;
            }
        }

        if (javaFloat(this.player.y - this.cameraY) < GameMode.CAMERA_MARGIN_NORTH) {
            this.cameraY = javaFloat(this.player.y - GameMode.CAMERA_MARGIN_NORTH);
            if (this.cameraY < 0) {
                this.cameraY = 0;
            }
        } else if (javaFloat(this.cameraY - this.player.y) < javaFloat(GameMode.CAMERA_MARGIN_SOUTH - MainConstants.DISPLAY_HEIGHT)) {
            this.cameraY = javaFloat(javaFloat(this.player.y + GameMode.CAMERA_MARGIN_SOUTH) - MainConstants.DISPLAY_HEIGHT);
            if (this.cameraY > this.maxCameraY) {
                this.cameraY = this.maxCameraY;
            }
        }

        let maxY = javaFloat(this.cameraY + GameMode.CAMERA_BOUND);
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
                RotatingGun.withWhiteBullets(javaFloat(x + 64), javaFloat(y + 64), true);
                break;
            case Triggers.SOLDIER_WALKER:
                new EnemySoldier(javaFloat(x + 32), javaFloat(y + 74), EnemySoldierType.WALKER);
                break;
            case Triggers.SOLDIER_STATIONARY:
                new EnemySoldier(javaFloat(x + 32), javaFloat(y + 74), EnemySoldierType.STATIONARY);
                break;
            case Triggers.GREEN_BOAT:
                new GreenBoat(javaFloat(x + 72), javaFloat(y + 56));
                break;
            case Triggers.BROWN_TANK:
                BrownTank.create(javaFloat(x + 32), javaFloat(y + 48));
                break;
            case Triggers.FRIENDLY_HELICOPTER_LANDING:
                new FriendlyHelicopter(
                    javaFloat(this.cameraX + MainConstants.DISPLAY_WIDTH / 2),
                    javaFloat(javaFloat(this.cameraY + MainConstants.DISPLAY_HEIGHT) + 128),
                    true,
                    false
                );
                break;
            case Triggers.YELLOW_GUN:
                RotatingGun.withWhiteBullets(javaFloat(x + 64), javaFloat(y + 64), false);
                break;
            case Triggers.STAR_BROWN:
                new InvisibleStar(javaFloat(x + 32), javaFloat(y + 32), Star.TYPE_BROWN);
                break;
            case Triggers.GRAY_TANK:
                GrayTank.create(javaFloat(x + 64), javaFloat(y + 64));
                break;
            case Triggers.STAR_FLASHING:
                new InvisibleStar(javaFloat(x + 32), javaFloat(y + 32), Star.TYPE_FLASHING);
                break;
            case Triggers.AIRPLANE:
                Airplane.at(javaFloat(x + 60), javaFloat(y + 62));
                break;
            case Triggers.GRAY_JEEP:
                new GrayJeep(javaFloat(x + 32), javaFloat(y + 46));
                break;
            case Triggers.PARKED_GRAY_JEEP:
                new ParkedGrayJeep(javaFloat(x + 32), javaFloat(y + 46));
                break;
            case Triggers.GRAY_BOAT:
                new GrayBoat(javaFloat(x), javaFloat(y));
                break;
            case Triggers.APPEARING_SOLDIER:
                new AppearingSoldier(javaFloat(x + 32), javaFloat(y + 74));
                break;
            case Triggers.APPEARING_BROWN_TANK:
                new AppearingBrownTank(javaFloat(x + 8), javaFloat(y + 12));
                break;
            case Triggers.SUBMARINE:
                new Submarine(javaFloat(x + 32), javaFloat(y + 128));
                break;
            case Triggers.TROOPS_TRUCK:
                new TroopsTruck(javaFloat(x), javaFloat(y + 8));
                break;
            case Triggers.FLOOR_GUN:
                FloorGun.create(javaFloat(x), javaFloat(y + 28));
                break;
            case Triggers.SWAMP_MISSILE_LAUNCHER:
                new SwampMissileLauncher(javaFloat(x), javaFloat(y));
                break;
            case Triggers.ROCK:
                new Rock(javaFloat(x + 32), javaFloat(y + 32));
                break;
            case Triggers.CANNON_TRUCK_RIGHT:
                new CannonTruck(javaFloat(x + 16), javaFloat(y), true);
                break;
            case Triggers.MINE:
                new Mine(javaFloat(x + 16), javaFloat(y));
                break;
            case Triggers.CLIFF_MISSILE_LAUNCHER:
                new CliffMissileLauncher(javaFloat(x + 16), javaFloat(y + 20));
                break;
            case Triggers.TRAIN:
                new TrainManager(javaFloat(x + 4), javaFloat(y));
                break;
            case Triggers.CANNON_TRUCK_LEFT:
                new CannonTruck(javaFloat(x + 16), javaFloat(y), false);
                break;
            case Triggers.HOUSE_LEFT:
                new House(javaFloat(x), javaFloat(y), true);
                break;
            case Triggers.HOUSE_RIGHT:
                new House(javaFloat(x), javaFloat(y), false);
                break;
            case Triggers.HUT:
                new Hut(javaFloat(x), javaFloat(y), false, false);
                break;
            case Triggers.SHACK:
                new Hut(javaFloat(x), javaFloat(y), true, false);
                break;
            case Triggers.GATE:
                Gate.create(javaFloat(x), javaFloat(y));
                break;
            case Triggers.TANK_SHACK:
                new Hut(javaFloat(x), javaFloat(y), true, true);
                break;
            case Triggers.CLIFF_GUN:
                new CliffGun(javaFloat(x), javaFloat(y));
                break;
            case Triggers.FIRE_TANK:
                new FireTank(javaFloat(x + 64), javaFloat(y + 64));
                break;
            case Triggers.SOLDIER_FIRE:
                new EnemySoldier(javaFloat(x + 32), javaFloat(y + 74), EnemySoldierType.FIRE);
                break;
            case Triggers.PARKED_BROWN_TANK:
                new ParkedBrownTank(javaFloat(x + 32), javaFloat(y + 40));
                break;
            case Triggers.PLAYER:
                this.createPlayer(javaFloat(x + 48), javaFloat(y + 48));
                this.main.startFade(false, null);
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
                RotatingGun.ofType(javaFloat(x + 48), javaFloat(y + 44), RotatingGun.TYPE_GREEN);
                break;
            case Triggers.APPEARING_PLANE:
                new AppearingPlane(javaFloat(x + 60), javaFloat(y + 62));
                break;
            case Triggers.ENEMY_HELICOPTER:
                new EnemyHelicopter(true);
                break;
            case Triggers.FLOOR_GUN_PLAIN:
                FloorGun.withPlainStyle(javaFloat(x), javaFloat(y + 28), true);
                break;
            case Triggers.BROWN_GUN:
                RotatingGun.ofType(javaFloat(x + 48), javaFloat(y + 44), RotatingGun.TYPE_BROWN);
                break;
            case Triggers.APPEARING_ENEMY_HELICOPTER:
                new AppearingEnemyHelicopter(javaFloat(y));
                break;
            case Triggers.APPEARING_GRAY_JEEP:
                new AppearingGrayJeep(javaFloat(x + 32), javaFloat(y + 46));
                break;
            case Triggers.FLOOR_MISSILE_LAUNCHER:
                new FloorMissileLauncher(javaFloat(x + 16), javaFloat(y + 8));
                break;
            case Triggers.STATUE_NONE:
                new Statue(javaFloat(x), javaFloat(y), Statue.TYPE_NONE);
                break;
            case Triggers.STATUE_LEFT:
                new Statue(javaFloat(x), javaFloat(y), Statue.TYPE_LEFT);
                break;
            case Triggers.STATUE_RIGHT:
                new Statue(javaFloat(x), javaFloat(y), Statue.TYPE_RIGHT);
                break;
            case Triggers.COLUMN:
                new Column(javaFloat(x), javaFloat(y));
                break;
            case Triggers.LANDING_PORT_LEFT:
                new LandingPort(javaFloat(x), javaFloat(y), LandingPort.TYPE_LEFT);
                break;
            case Triggers.LANDING_PORT_RIGHT:
                new LandingPort(javaFloat(x), javaFloat(y), LandingPort.TYPE_RIGHT);
                break;
            case Triggers.LANDING_PORT_CIRCLE:
                new LandingPort(javaFloat(x), javaFloat(y), LandingPort.TYPE_CIRCLE);
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
                new LasersManager(javaFloat(x), javaFloat(y));
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
                new InvisibleStar(javaFloat(x + 32), javaFloat(y + 32), Star.SPRITE_GREEN);
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
                this.main.startFade(false, null);
                break;
        }
    }

    private createPlayer(x: number, y: number): void {
        this.cameraX = javaFloat(javaFloat(x - GameMode.CAMERA_MARGIN_NORTH) - 48);
        if (this.cameraX < 0) {
            this.cameraX = 0;
        }
        this.player.x = x;
        this.player.y = y;
        this.player.makeInvincible();
    }

    public isMissileTarget(x: number, y: number): boolean {
        let type = this.getTileType(x, y);
        return type === GameMode.TYPE_SOLID || type === GameMode.TYPE_SHIELD;
    }

    public isDriveableBounds(x1: number, y1: number, x2: number, y2: number): boolean {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

        return this.isDriveable(x1, y1) && this.isDriveable(x2, y2) && this.isDriveable(x1, y2) && this.isDriveable(x2, y1);
    }

    public isSolidTile(x: number, y: number): boolean {
        return this.typesMap[y][x] === GameMode.TYPE_SOLID;
    }

    public isDriveable(x: number, y: number): boolean {
        x = javaFloat(x);
        y = javaFloat(y);

        let type = this.getTileType(x, y);
        return type === GameMode.TYPE_EMPTY || type === GameMode.TYPE_SWAMP || type === GameMode.TYPE_CONVEYOR;
    }

    public isDriveableLand(x: number, y: number): boolean {
        let type = this.getTileType(x, y);
        return type === GameMode.TYPE_EMPTY || type === GameMode.TYPE_CONVEYOR;
    }

    public isSolid(x: number, y: number): boolean {
        return this.getTileType(x, y) === GameMode.TYPE_SOLID;
    }

    public isEmpty(x: number, y: number): boolean {
        return this.getTileType(x, y) === GameMode.TYPE_EMPTY;
    }

    public isShield(x: number, y: number): boolean {
        return this.getTileType(x, y) === GameMode.TYPE_SHIELD;
    }

    public isWater(x: number, y: number): boolean {
        return this.getTileType(x, y) === GameMode.TYPE_WATER;
    }

    public isSwamp(x: number, y: number): boolean {
        return this.getTileType(x, y) === GameMode.TYPE_SWAMP;
    }

    public isConveyor(x: number, y: number): boolean {
        return this.getTileType(x, y) === GameMode.TYPE_CONVEYOR;
    }

    public isOutsideOfFrame(x: number, y: number): boolean {
        x = javaFloat(x);
        y = javaFloat(y);

        return (
            y > javaFloat(this.cameraY + MainConstants.DISPLAY_HEIGHT) ||
            x < this.cameraX ||
            y < this.cameraY ||
            x > javaFloat(this.cameraX + MainConstants.DISPLAY_WIDTH)
        );
    }

    public isOutsideOfFrameBounds(x1: number, y1: number, x2: number, y2: number): boolean {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

        return (
            y1 > javaFloat(this.cameraY + MainConstants.DISPLAY_HEIGHT) ||
            x2 < this.cameraX ||
            y2 < this.cameraY ||
            x1 > javaFloat(this.cameraX + MainConstants.DISPLAY_WIDTH)
        );
    }

    public distanceOutsideOfFrame(x: number, y: number): number {
        if (y < this.cameraY) {
            return javaFloat(this.cameraY - y);
        }
        if (y > javaFloat(this.cameraY + MainConstants.DISPLAY_HEIGHT)) {
            return javaFloat(y - javaFloat(this.cameraY + MainConstants.DISPLAY_HEIGHT));
        }
        if (x < this.cameraX) {
            return javaFloat(this.cameraX - x);
        }
        if (x > javaFloat(this.cameraX + MainConstants.DISPLAY_WIDTH)) {
            return javaFloat(x - javaFloat(this.cameraX + MainConstants.DISPLAY_WIDTH));
        }
        return 0;
    }

    public audioVolume(x: number, y: number): number {
        let d = javaFloat(this.distanceOutsideOfFrame(x, y));
        if (d === 0) {
            return 1;
        } else if (d >= 256) {
            return 0;
        } else {
            return javaFloat(1 - javaFloat(d / 256));
        }
    }

    public destroyAllExcept(exceptEnemy: Enemy): void {
        for (let i = this.enemies.size() - 1; i >= 0; i--) {
            let enemy = this.enemies.get(i);
            if (enemy !== exceptEnemy) {
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

    public destroyAll(): void {
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
            if (
                !this.isOutsideOfFrameBounds(
                    javaFloat(enemy.x + enemy.hitX1),
                    javaFloat(enemy.y + enemy.hitY1),
                    javaFloat(enemy.x + enemy.hitX2),
                    javaFloat(enemy.y + enemy.hitY2)
                )
            ) {
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

    public addEnemy(enemy: Enemy): void {
        this.elements[enemy.layer].add(enemy);
        this.enemies.add(enemy);
        if (enemy.solid) {
            this.solids.add(enemy);
        }
        if (enemy.mine) {
            this.mines.add(enemy);
        }
    }

    public addGameElement(gameElement: GameElement): void {
        if (gameElement.enemy) {
            this.addEnemy(gameElement as Enemy);
        } else {
            this.elements[gameElement.layer].add(gameElement);
        }
    }

    public stageCompleted(): void {
        this.stageCompletedFlag = true;
        this.main.stopAllSongs();
    }

    public fadeCompleted(): void {
        if (this.stageIndex === 5) {
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

        if (++this.waterAlphaIndex === GameMode.WATER_ALPHAS_PERIOD) {
            this.waterAlphaIndex = 0;
        }

        if (this.stageIndex === 5) {
            this.conveyorOffset = javaFloat(this.conveyorOffset + GameMode.CONVEYOR_SPEED);
            if (this.conveyorOffset >= 16) {
                this.conveyorOffset = javaFloat(this.conveyorOffset - 16);
            }
            let conveyorIndex = javaInt(this.conveyorOffset);
            this.conveyorDelta = javaFloat(conveyorIndex - this.conveyorLastIndex);
            if (this.conveyorDelta < 0) {
                this.conveyorDelta = javaFloat(this.conveyorDelta + 16);
            }
            this.tiles[0] = this.main.conveyors[conveyorIndex];
            this.conveyorLastIndex = conveyorIndex;
        }

        if (this.bossCameraPan && this.cameraY !== 0) {
            this.cameraY = javaFloat(this.cameraY - GameMode.BOSS_PAN_CAMERA_SPEED);
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
                this.cameraX = javaFloat(this.cameraX - GameMode.ENDING_PAN_CAMERA_SPEED);
                if (this.cameraX <= 512) {
                    this.cameraX = 512;
                    this.endingCameraPan = false;
                    this.cameraPanListener.panComplete();
                } else {
                    return;
                }
            } else {
                this.cameraX = javaFloat(this.cameraX + GameMode.ENDING_PAN_CAMERA_SPEED);
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

        let maxBoundY = javaFloat(this.maxCameraY + GameMode.REMOVE_BOUND);

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
                        if (element.layer !== element.changeLayerValue) {
                            element.layer = element.changeLayerValue;
                            list.removeAt(j);
                            this.elements[element.layer].add(element);
                        }
                        element.changeLayerValue = -1;
                    }
                }
                if (element.removeFlag) {
                    list.removeAt(j);
                    if (element.enemy) {
                        let enemy = element as Enemy;
                        this.enemies.removeValue(enemy);
                        if (enemy.solid) {
                            this.solids.removeValue(enemy);
                        }
                        if (enemy.mine) {
                            this.mines.removeValue(enemy);
                        }
                    }
                }
            }
        }

        if (this.playing) {
            this.player.update();
            this.cameraTrackPlayer();
        }

        if (this.stageCompletedFlag && --this.stageCompletedDelay === 0) {
            this.main.startFade(true, this);
        }
    }

    private drawBackground(): void {
        let xOffset = this.cameraX % 32;
        let yOffset = this.cameraY % 32;
        let xTile = javaInt(this.cameraX / 32);
        let yTile = javaInt(this.cameraY / 32);
        let xStart = 32 + xTile === this.mapWidth ? 31 : 32;
        let main = this.main;
        let tiles = this.tiles;
        let tileMap = this.tileMap;

        if (this.stageIndex > 0) {
            if (this.stageIndex === 2) {
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
                            main.drawImage(tiles[water + 4], X, Y);
                            main.drawImage(tiles[water], X, Y);
                        }
                        if (tile < 225) {
                            main.drawImage(tiles[tile], X, Y);
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
                            main.drawImage(tiles[tile], (x << 5) - xOffset, Y);
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
                        main.drawImage(tiles[tile], (x << 5) - xOffset, Y);
                    }
                }
            }
        } else {
            // tile sheet [stage index]
            for (let y = 30; y >= 0; y--) {
                for (let x = xStart; x >= 0; x--) {
                    main.drawImage(tiles[tileMap[y + yTile][x + xTile]], (x << 5) - xOffset, (y << 5) - yOffset);
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
