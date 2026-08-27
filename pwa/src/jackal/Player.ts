import {
    AppGameContainer,
    ApplicationGameContainer,
    BasicGame,
    Color,
    Cursor,
    Display,
    GameContainer,
    GL11,
    Graphics,
    Image,
    Input,
    Log,
    Music,
    Mouse,
    ResourceLoader,
    ScalableGame,
    SlickException,
    Sound,
    SoundStore,
    Sys,
    XMLPackedSheet
} from "slick2d-ts";
import {
    ArrayList,
    Arrays,
    BufferedInputStream,
    Character,
    Class,
    Collections,
    DataInputStream,
    HashMap,
    Integer,
    JAVA_LONG_LOW_3_BITS,
    JAVA_LONG_PACKED_3BIT_SHIFTS,
    JavaString,
    Point2D,
    Random,
    System,
    java2DArray,
    java3DArray,
    java4DArray,
    javaArray,
    javaByte,
    javaChar,
    javaDouble,
    javaFloat,
    javaInt,
    javaIntDiv,
    javaLong,
    javaRoundFloat,
    javaShort,
    rotatePoint
} from "../java/JavaRuntime.js";
import { Explosion } from "./Explosion.js";
import { FriendlySoldier } from "./FriendlySoldier.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import { GameMode } from "./GameMode.js";
import { Grenade } from "./Grenade.js";
import { MainRuntimeState } from "./MainRuntimeState.js";
import { Modes } from "./Modes.js";
import { PlayerBullet } from "./PlayerBullet.js";
import { PlayerMissile } from "./PlayerMissile.js";
export class Player {
    public constructor() {
        const argCount = arguments.length;
        this.__construct_Player(argCount);
    }

    private __construct_Player(argCount: number): void {
        if (argCount === 0) {
            this.main = MainRuntimeState.mainInstance;
            this.gameMode = MainRuntimeState.gameMode;
            this.input = this.main.input;
            this.mines = this.gameMode.mines;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly SPEED: number = 2.5;
    public static readonly ANGLE_STEPS: number = 8;
    public static readonly ANGLE_VELOCITY: number = 45 / Player.ANGLE_STEPS;
    public static readonly DIAGONAL_DELAY: number = 4;
    public static readonly GUN_ARMED_DELAY: number = 45;
    public static readonly RESPAWN_DELAY: number = 91 * 2;
    public static readonly INVINCIBLE_DELAY: number = 91 * 3;

    public static readonly SENSOR_X: number = 32;
    public static readonly SENSOR_Y: number = 16;
    // Assigned once in the static block, matching Java static-final initialization.
    public static SENSOR_D_X0: number = 0;
    public static SENSOR_D_X1: number = 0;
    public static SENSOR_D_X2: number = 0;
    public static SENSOR_D_Y0: number = 0;
    public static SENSOR_D_Y1: number = 0;
    public static SENSOR_D_Y2: number = 0;

    public static readonly RUMBLE: any[] = javaArray(17, 0);
    public static readonly WAKE_ALPHAS: any[] = javaArray(17, 0);

    static {
        let angle = 0;
        for (let i = 0; i < 17; i++) {
            Player.WAKE_ALPHAS[i] = 0.5 + 0.5 * javaFloat(Math.sin(angle));
            Player.RUMBLE[i] = 1.6 * javaFloat(Math.sin(angle));
            angle += 0.74;
        }

        let p0 = rotatePoint(Player.SENSOR_X + Player.SPEED, 0, javaFloat(Math.PI / 4));
        let p1 = rotatePoint(Player.SENSOR_X + Player.SPEED, Player.SENSOR_Y, javaFloat(Math.PI / 4));
        let p2 = rotatePoint(Player.SENSOR_X + Player.SPEED, -Player.SENSOR_Y, javaFloat(Math.PI / 4));

        Player.SENSOR_D_X0 = javaInt(p0.x);
        Player.SENSOR_D_Y0 = javaInt(p0.y);
        Player.SENSOR_D_X1 = javaInt(p1.x);
        Player.SENSOR_D_Y1 = javaInt(p1.y);
        Player.SENSOR_D_X2 = javaInt(p2.x);
        Player.SENSOR_D_Y2 = javaInt(p2.y);
    }

    private main: any = null as any;
    private gameMode: any = null as any;
    private input: any = null as any;
    public mines: any = null as any;

    public x: number = 512;
    public y: number = 480;
    public angle: number = 270;
    public nextAngle: number = this.angle;
    public displayAngle: number = this.angle;
    public angleVelocity: number = 0;
    public angleSteps: number = 0;
    public diagonalDelay: number = 0;
    public targetAngle: number = 0;
    public lastTargetAngle: number = this.angle;
    public fireAngle: number = this.angle;
    public rumble: number = 0;
    public invincible: number = 0;
    public invincibleColor: number = 0;
    public weaponArmed: boolean = true;
    public gunArmed: number = 0;
    public fireReleased: boolean = false;
    public shootReleased: boolean = false;
    public longRange: boolean = false;
    public respawning: number = 0;
    public pows: number = 0;
    public releaseablePows: number = 0;
    public inSwamp: boolean = false;

    public setWeaponArmed(weaponArmed: any): void {
        this.weaponArmed = weaponArmed;
    }

    public pickUpFlashingSoldier(): void {
        this.pows++;
        this.main.upgradeWeapon(true);
    }

    public collectPOW(): void {
        this.pows++;
        this.releaseablePows++;
        this.main.playSound(this.main.pickupSound);
    }

    public dropOffPOW(): void {
        this.pows--;
        if (this.pows < this.releaseablePows) {
            this.releaseablePows = this.pows;
        }
    }

    public explode(): void {
        if (this.gameMode.stageCompletedFlag) {
            return;
        }

        this.main.playSound(this.main.playerExplodeSound);
        if (this.main.extraLives == 0) {
            this.main.stopSong();
        }
        new Explosion(this.x, this.y, true);

        if (this.releaseablePows > 1) {
            let weaponCarrier = this.main.hasMissiles && this.main.random.nextInt(5) == 3;
            if (weaponCarrier) {
                this.releaseablePows++;
            }
            let release = this.releaseablePows - 2;
            if (release > 3) {
                release = 3;
            }
            for (let i = release; i >= 0; i--) {
                new FriendlySoldier(this.x, this.y, weaponCarrier && i == 0 ? FriendlySoldierType.WEAPON_CARRIER_WANDERER : FriendlySoldierType.WANDERER);
            }
        }
        this.pows = 0;
        this.releaseablePows = 0;
        this.main.missilePower = 0;
        this.main.hasMissiles = false;
        this.respawning = Player.RESPAWN_DELAY;
    }

    public attack(arg0?: any, arg1?: any, arg2?: any, arg3?: any): any {
        const argCount = arguments.length;
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
            return this.attack__overload0(arg0, arg1, arg2, arg3);
        }
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            return this.attack__overload1(arg0, arg1);
        }
        throw new Error(`No Java method overload matched attack: ${argCount}`);
    }

    public attack__overload0(x1: any, y1: any, x2: any, y2: any): boolean {
        if (this.respawning == 0 && this.invincible == 0 && x1 <= this.x + 32 && x2 >= this.x - 32 && y1 <= this.y + 32 && y2 >= this.y - 32) {
            this.explode();
            return true;
        } else {
            return false;
        }
    }

    public attack__overload1(x: any, y: any): boolean {
        if (this.respawning == 0 && this.invincible == 0 && x >= this.x - 32 && x <= this.x + 32 && y >= this.y - 32 && y <= this.y + 32) {
            this.explode();
            return true;
        } else {
            return false;
        }
    }

    public collectFlashingStar(): void {
        this.main.playSound(this.main.weaponUpgradeSound);
        this.main.hasMissiles = true;
        this.main.missilePower = 2;
    }

    public getSpeed(): number {
        return this.inSwamp ? 0.5 * Player.SPEED : Player.SPEED;
    }

    public makeInvincible(): void {
        this.invincible = Player.INVINCIBLE_DELAY;
    }

    public update(): void {
        let tileType = this.gameMode.getTileType(this.x, this.y);
        this.inSwamp = tileType == GameMode.TYPE_SWAMP;
        let speed = this.getSpeed();

        if (this.respawning > 0) {
            if (--this.respawning == 0) {
                if (this.main.extraLives > 0) {
                    this.main.loseLife();
                    this.invincible = Player.INVINCIBLE_DELAY;
                } else if (!this.gameMode.stageCompletedFlag) {
                    this.main.konamiCode.enabled = false;
                    this.main.requestMode(Modes.CONTINUE, this.gameMode.gc);
                }
            } else {
                return;
            }
        }

        if (tileType == GameMode.TYPE_CONVEYOR) {
            let Y = this.y + Player.SENSOR_X + Player.SPEED;
            if (
                this.gameMode.isDriveable(this.x, Y) &&
                this.gameMode.isDriveable(this.x - Player.SENSOR_Y, Y) &&
                this.gameMode.isDriveable(this.x + Player.SENSOR_Y, Y)
            ) {
                this.y += this.gameMode.conveyorDelta;
            }
        }

        this.targetAngle = -1;
        if (this.input.isDown() && this.input.isRight()) {
            // 45
            this.fireAngle = this.targetAngle = 45;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(this.x + Player.SENSOR_D_X0, this.y + Player.SENSOR_D_Y0) &&
                this.gameMode.isDriveable(this.x + Player.SENSOR_D_X1, this.y + Player.SENSOR_D_Y1) &&
                this.gameMode.isDriveable(this.x + Player.SENSOR_D_X2, this.y + Player.SENSOR_D_Y2)
            ) {
                this.x += speed;
                this.y += speed;
            }
        } else if (this.input.isDown() && this.input.isLeft()) {
            // 135
            this.fireAngle = this.targetAngle = 135;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(this.x - Player.SENSOR_D_X0, this.y + Player.SENSOR_D_Y0) &&
                this.gameMode.isDriveable(this.x - Player.SENSOR_D_X1, this.y + Player.SENSOR_D_Y1) &&
                this.gameMode.isDriveable(this.x - Player.SENSOR_D_X2, this.y + Player.SENSOR_D_Y2)
            ) {
                this.x -= speed;
                this.y += speed;
            }
        } else if (this.input.isUp() && this.input.isLeft()) {
            // 225
            this.fireAngle = this.targetAngle = 225;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(this.x - Player.SENSOR_D_X0, this.y - Player.SENSOR_D_Y0) &&
                this.gameMode.isDriveable(this.x - Player.SENSOR_D_X1, this.y - Player.SENSOR_D_Y1) &&
                this.gameMode.isDriveable(this.x - Player.SENSOR_D_X2, this.y - Player.SENSOR_D_Y2)
            ) {
                this.x -= speed;
                this.y -= speed;
            }
        } else if (this.input.isUp() && this.input.isRight()) {
            // 315
            this.fireAngle = this.targetAngle = 315;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(this.x + Player.SENSOR_D_X0, this.y - Player.SENSOR_D_Y0) &&
                this.gameMode.isDriveable(this.x + Player.SENSOR_D_X1, this.y - Player.SENSOR_D_Y1) &&
                this.gameMode.isDriveable(this.x + Player.SENSOR_D_X2, this.y - Player.SENSOR_D_Y2)
            ) {
                this.x += speed;
                this.y -= speed;
            }
        } else if (this.input.isRight()) {
            // 0
            this.fireAngle = 0;
            if ((this.lastTargetAngle == 45 || this.lastTargetAngle == 315) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 0;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let X = this.x + Player.SENSOR_X + Player.SPEED;
                if (
                    this.gameMode.isDriveable(X, this.y) &&
                    this.gameMode.isDriveable(X, this.y - Player.SENSOR_Y) &&
                    this.gameMode.isDriveable(X, this.y + Player.SENSOR_Y)
                ) {
                    this.x += speed;
                }
            }
        } else if (this.input.isDown()) {
            // 90
            this.fireAngle = 90;
            if ((this.lastTargetAngle == 45 || this.lastTargetAngle == 135) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 90;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let Y = this.y + Player.SENSOR_X + Player.SPEED;
                if (
                    this.gameMode.isDriveable(this.x, Y) &&
                    this.gameMode.isDriveable(this.x - Player.SENSOR_Y, Y) &&
                    this.gameMode.isDriveable(this.x + Player.SENSOR_Y, Y)
                ) {
                    this.y += speed;
                }
            }
        } else if (this.input.isLeft()) {
            // 180
            this.fireAngle = 180;
            if ((this.lastTargetAngle == 135 || this.lastTargetAngle == 225) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 180;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let X = this.x - Player.SENSOR_X - Player.SPEED;
                if (
                    this.gameMode.isDriveable(X, this.y) &&
                    this.gameMode.isDriveable(X, this.y - Player.SENSOR_Y) &&
                    this.gameMode.isDriveable(X, this.y + Player.SENSOR_Y)
                ) {
                    this.x -= speed;
                }
            }
        } else if (this.input.isUp()) {
            // 270
            this.fireAngle = 270;
            if ((this.lastTargetAngle == 225 || this.lastTargetAngle == 315) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 270;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let Y = this.y - Player.SENSOR_X - Player.SPEED;
                if (
                    this.gameMode.isDriveable(this.x, Y) &&
                    this.gameMode.isDriveable(this.x - Player.SENSOR_Y, Y) &&
                    this.gameMode.isDriveable(this.x + Player.SENSOR_Y, Y)
                ) {
                    this.y -= speed;
                }
            }
        } else {
            this.diagonalDelay = 0;
        }

        if (this.y > this.gameMode.maxCameraY + 928) {
            this.y = this.gameMode.maxCameraY + 928;
        }

        if (this.angleSteps > 0) {
            if (--this.angleSteps == 0) {
                this.angle = this.nextAngle;
                this.displayAngle = this.nextAngle;
            } else {
                this.displayAngle += this.angleVelocity;
            }
        }

        if (this.angleSteps == 0 && this.targetAngle != -1 && this.targetAngle != this.angle) {
            this.angleSteps = Player.ANGLE_STEPS;
            if (this.targetAngle == 0) {
                if (this.angle >= 180) {
                    this.nextAngle = this.angle + 45;
                    if (this.nextAngle == 360) {
                        this.nextAngle = 0;
                    }
                    this.angleVelocity = Player.ANGLE_VELOCITY;
                } else {
                    this.nextAngle = this.angle - 45;
                    this.angleVelocity = -Player.ANGLE_VELOCITY;
                }
            } else if (this.targetAngle == 180) {
                if (this.angle > 180) {
                    this.nextAngle = this.angle - 45;
                    this.angleVelocity = -Player.ANGLE_VELOCITY;
                } else if (this.angle == 0) {
                    this.nextAngle = 315;
                    this.angleVelocity = -Player.ANGLE_VELOCITY;
                } else {
                    this.nextAngle = this.angle + 45;
                    this.angleVelocity = Player.ANGLE_VELOCITY;
                }
            } else if (this.targetAngle > 180) {
                if (this.angle < this.targetAngle && this.angle >= this.targetAngle - 180) {
                    this.nextAngle = this.angle + 45;
                    this.angleVelocity = Player.ANGLE_VELOCITY;
                } else {
                    this.nextAngle = this.angle - 45;
                    this.angleVelocity = -Player.ANGLE_VELOCITY;
                }
            } else {
                if (this.angle > this.targetAngle && this.angle <= this.targetAngle + 180) {
                    this.nextAngle = this.angle - 45;
                    this.angleVelocity = -Player.ANGLE_VELOCITY;
                } else {
                    this.nextAngle = this.angle + 45;
                    this.angleVelocity = Player.ANGLE_VELOCITY;
                }
            }
            if (this.nextAngle == -45) {
                this.nextAngle = 315;
            } else if (this.nextAngle == 360) {
                this.nextAngle = 0;
            }
        }

        if (this.invincible > 0) {
            this.invincible--;
        }

        if (this.input.isFire()) {
            if (this.fireReleased && this.weaponArmed) {
                this.fireReleased = false;
                this.weaponArmed = false;
                if (this.targetAngle == -1 && this.angleSteps == 0) {
                    this.fireAngle = this.angle;
                }
                if (this.main.hasMissiles) {
                    new PlayerMissile(this.x, this.y, this.fireAngle, this.main.missilePower);
                } else {
                    new Grenade(this.x, this.y, this.fireAngle);
                }
            }
        } else {
            this.fireReleased = true;
        }

        if (this.gunArmed > 0) {
            this.gunArmed--;
        }
        if (this.input.isShoot()) {
            if (this.shootReleased || this.gunArmed == 0) {
                new PlayerBullet(this.x, this.y);
                this.gunArmed = Player.GUN_ARMED_DELAY;
            }
            this.shootReleased = false;
        } else {
            this.shootReleased = true;
            this.gunArmed = 0;
        }

        let invincibleLocal = this.invincible > 0;
        let xMargin = 32;
        let yMargin = 32;
        if (this.angle == 0 || this.angle == 180) {
            xMargin = 48;
        } else if (this.angle == 90 || this.angle == 270) {
            yMargin = 46;
        }
        for (let i = this.mines.size() - 1; i >= 0; i--) {
            let mine = this.mines.get(i);
            if (mine.bump(this.x - xMargin, this.y - yMargin, this.x + xMargin, this.y + yMargin, invincibleLocal)) {
                if (!invincibleLocal) {
                    this.explode();
                    break;
                }
            }
        }
    }

    public render(): void {
        if (this.respawning != 0) {
            return;
        }

        if (
            this.targetAngle != -1 &&
            !this.gameMode.bossCameraPan &&
            !this.gameMode.endingCameraPan &&
            this.gameMode.playing &&
            !this.gameMode.paused &&
            ++this.rumble == 17
        ) {
            this.rumble = 0;
        }

        if (this.invincible > 0) {
            if (!this.gameMode.paused && ++this.invincibleColor == 4) {
                this.invincibleColor = 0;
            }
        } else {
            this.invincibleColor = 0;
        }

        if (this.inSwamp && this.targetAngle != -1 && this.angleSteps == 0) {
            switch (this.nextAngle) {
                case 0:
                case 360:
                    this.main.draw(this.main.playerWakes[0], this.x - 37, this.y - 43, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 45:
                    this.main.drawRotatedAlpha(this.main.playerWakes[4], this.x - 8, this.y - 2, 90, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 90:
                    this.main.draw(this.main.playerWakes[3], this.x - 52, this.y - 31, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 135:
                    this.main.drawRotatedAlpha(this.main.playerWakes[5], this.x + 8, this.y + 2, -90, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 180:
                    this.main.draw(this.main.playerWakes[1], this.x - 27, this.y - 43, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 225:
                    this.main.draw(this.main.playerWakes[5], this.x - 42, this.y - 36, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 270:
                    this.main.draw(this.main.playerWakes[2], this.x - 52, this.y - 31, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 315:
                    this.main.draw(this.main.playerWakes[4], this.x - 49, this.y - 36, Player.WAKE_ALPHAS[this.rumble]);
                    break;
            }
        }

        this.main.drawVehicle(this.main.players[this.invincibleColor], this.x, this.y + Player.RUMBLE[this.rumble], this.displayAngle);
    }
}
