import { javaArray, javaFloat, javaInt, type ArrayList } from "../java/JavaRuntime.js";
import { rotatePointLikeJava } from "./JackalMath.js";
import { Explosion } from "./Explosion.js";
import { FriendlySoldier } from "./FriendlySoldier.js";
import { FriendlySoldierType } from "./FriendlySoldierType.js";
import { TILE_TYPE_CONVEYOR, TILE_TYPE_SWAMP } from "./GameTileTypes.js";
import { PLAYER_ANGLE_STEPS, PLAYER_ANGLE_VELOCITY, PLAYER_RUMBLE, PLAYER_RUMBLE_STEPS, PLAYER_SPEED, playerRumblePhase } from "./PlayerMotionConstants.js";
import type { GameMode } from "./GameMode.js";
import { Grenade } from "./Grenade.js";
import { requireMainRuntime, requireMainRuntimeGameMode } from "./MainRuntimeState.js";
import { Modes } from "./Modes.js";
import { PlayerBullet } from "./PlayerBullet.js";
import { PlayerMissile } from "./PlayerMissile.js";
import type { Enemy } from "./Enemy.js";
import type { IInput } from "./IInput.js";
import type { Main } from "./Main.js";
export class Player {
    public constructor() {
        this.main = requireMainRuntime();
        this.gameMode = requireMainRuntimeGameMode();
        this.input = this.main.input;
        this.mines = this.gameMode.mines;
    }

    public static readonly SPEED: number = javaFloat(PLAYER_SPEED);
    public static readonly ANGLE_STEPS: number = PLAYER_ANGLE_STEPS;
    public static readonly ANGLE_VELOCITY: number = javaFloat(PLAYER_ANGLE_VELOCITY);
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

    public static readonly RUMBLE: number[] = PLAYER_RUMBLE;
    public static readonly WAKE_ALPHAS: number[] = javaArray(PLAYER_RUMBLE_STEPS, 0);

    static {
        let angle = 0;
        for (let i = 0; i < PLAYER_RUMBLE_STEPS; i++) {
            angle = javaFloat(playerRumblePhase(i));
            Player.WAKE_ALPHAS[i] = javaFloat(0.5 + javaFloat(0.5 * javaFloat(Math.sin(angle))));
        }

        let p0 = rotatePointLikeJava(javaFloat(Player.SENSOR_X + Player.SPEED), 0, javaFloat(Math.PI / 4));
        let p1 = rotatePointLikeJava(javaFloat(Player.SENSOR_X + Player.SPEED), Player.SENSOR_Y, javaFloat(Math.PI / 4));
        let p2 = rotatePointLikeJava(javaFloat(Player.SENSOR_X + Player.SPEED), -Player.SENSOR_Y, javaFloat(Math.PI / 4));

        Player.SENSOR_D_X0 = javaInt(p0.x);
        Player.SENSOR_D_Y0 = javaInt(p0.y);
        Player.SENSOR_D_X1 = javaInt(p1.x);
        Player.SENSOR_D_Y1 = javaInt(p1.y);
        Player.SENSOR_D_X2 = javaInt(p2.x);
        Player.SENSOR_D_Y2 = javaInt(p2.y);
    }

    private main: Main = null!;
    private gameMode: GameMode = null!;
    private input: IInput = null!;
    public mines: ArrayList<Enemy> = null!;

    public x: number = 512;
    public y: number = 480;
    public angle: number = 270;
    public nextAngle: number = this.angle;
    public displayAngle: number = javaFloat(this.angle);
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

    /** Reconnects browser/runtime-only links after constructor-free save restoration. */
    public restoreRuntimeReferences(main: Main, gameMode: GameMode): void {
        this.main = main;
        this.gameMode = gameMode;
        this.input = main.input;
        this.mines = gameMode.mines;
    }

    public setWeaponArmed(weaponArmed: boolean): void {
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
        if (this.main.extraLives === 0) {
            this.main.stopAllSongs();
        }
        Explosion.withPlayerExplosion(this.x, this.y, true);

        if (this.releaseablePows > 1) {
            let weaponCarrier = this.main.hasMissiles && this.main.random.nextInt(5) === 3;
            if (weaponCarrier) {
                this.releaseablePows++;
            }
            let release = this.releaseablePows - 2;
            if (release > 3) {
                release = 3;
            }
            for (let i = release; i >= 0; i--) {
                FriendlySoldier.wandering(
                    this.x,
                    this.y,
                    weaponCarrier && i === 0 ? FriendlySoldierType.WEAPON_CARRIER_WANDERER : FriendlySoldierType.WANDERER
                );
            }
        }
        this.pows = 0;
        this.releaseablePows = 0;
        this.main.missilePower = 0;
        this.main.hasMissiles = false;
        this.respawning = Player.RESPAWN_DELAY;
    }

    public attackBounds(x1: number, y1: number, x2: number, y2: number): boolean {
        x1 = javaFloat(x1);
        y1 = javaFloat(y1);
        x2 = javaFloat(x2);
        y2 = javaFloat(y2);

        if (
            this.respawning === 0 &&
            this.invincible === 0 &&
            x1 <= javaFloat(this.x + 32) &&
            x2 >= javaFloat(this.x - 32) &&
            y1 <= javaFloat(this.y + 32) &&
            y2 >= javaFloat(this.y - 32)
        ) {
            this.explode();
            return true;
        } else {
            return false;
        }
    }

    public attackAt(x: number, y: number): boolean {
        x = javaFloat(x);
        y = javaFloat(y);

        if (
            this.respawning === 0 &&
            this.invincible === 0 &&
            x >= javaFloat(this.x - 32) &&
            x <= javaFloat(this.x + 32) &&
            y >= javaFloat(this.y - 32) &&
            y <= javaFloat(this.y + 32)
        ) {
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
        return javaFloat(this.inSwamp ? javaFloat(0.5 * Player.SPEED) : Player.SPEED);
    }

    public makeInvincible(): void {
        this.invincible = Player.INVINCIBLE_DELAY;
    }

    public update(): void {
        let tileType = this.gameMode.getTileType(this.x, this.y);
        this.inSwamp = tileType === TILE_TYPE_SWAMP;
        let speed = javaFloat(this.getSpeed());

        if (this.respawning > 0) {
            if (--this.respawning === 0) {
                if (this.main.extraLives > 0) {
                    this.main.loseLife();
                    this.invincible = Player.INVINCIBLE_DELAY;
                } else if (!this.gameMode.stageCompletedFlag) {
                    if (this.main.konamiCode !== null) {
                        this.main.konamiCode.enabled = false;
                    }
                    this.main.requestMode(Modes.CONTINUE, this.gameMode.gc);
                }
            } else {
                return;
            }
        }

        if (tileType === TILE_TYPE_CONVEYOR) {
            let Y = javaFloat(javaFloat(this.y + Player.SENSOR_X) + Player.SPEED);
            if (
                this.gameMode.isDriveable(this.x, Y) &&
                this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_Y), Y) &&
                this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_Y), Y)
            ) {
                this.y = javaFloat(this.y + this.gameMode.conveyorDelta);
            }
        }

        this.targetAngle = -1;
        if (this.input.isDown() && this.input.isRight()) {
            // 45
            this.fireAngle = this.targetAngle = 45;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_D_X0), javaFloat(this.y + Player.SENSOR_D_Y0)) &&
                this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_D_X1), javaFloat(this.y + Player.SENSOR_D_Y1)) &&
                this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_D_X2), javaFloat(this.y + Player.SENSOR_D_Y2))
            ) {
                this.x = javaFloat(this.x + speed);
                this.y = javaFloat(this.y + speed);
            }
        } else if (this.input.isDown() && this.input.isLeft()) {
            // 135
            this.fireAngle = this.targetAngle = 135;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_D_X0), javaFloat(this.y + Player.SENSOR_D_Y0)) &&
                this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_D_X1), javaFloat(this.y + Player.SENSOR_D_Y1)) &&
                this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_D_X2), javaFloat(this.y + Player.SENSOR_D_Y2))
            ) {
                this.x = javaFloat(this.x - speed);
                this.y = javaFloat(this.y + speed);
            }
        } else if (this.input.isUp() && this.input.isLeft()) {
            // 225
            this.fireAngle = this.targetAngle = 225;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_D_X0), javaFloat(this.y - Player.SENSOR_D_Y0)) &&
                this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_D_X1), javaFloat(this.y - Player.SENSOR_D_Y1)) &&
                this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_D_X2), javaFloat(this.y - Player.SENSOR_D_Y2))
            ) {
                this.x = javaFloat(this.x - speed);
                this.y = javaFloat(this.y - speed);
            }
        } else if (this.input.isUp() && this.input.isRight()) {
            // 315
            this.fireAngle = this.targetAngle = 315;
            this.lastTargetAngle = this.targetAngle;
            this.diagonalDelay = Player.DIAGONAL_DELAY;

            if (
                this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_D_X0), javaFloat(this.y - Player.SENSOR_D_Y0)) &&
                this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_D_X1), javaFloat(this.y - Player.SENSOR_D_Y1)) &&
                this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_D_X2), javaFloat(this.y - Player.SENSOR_D_Y2))
            ) {
                this.x = javaFloat(this.x + speed);
                this.y = javaFloat(this.y - speed);
            }
        } else if (this.input.isRight()) {
            // 0
            this.fireAngle = 0;
            if ((this.lastTargetAngle === 45 || this.lastTargetAngle === 315) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 0;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let X = javaFloat(javaFloat(this.x + Player.SENSOR_X) + Player.SPEED);
                if (
                    this.gameMode.isDriveable(X, this.y) &&
                    this.gameMode.isDriveable(X, javaFloat(this.y - Player.SENSOR_Y)) &&
                    this.gameMode.isDriveable(X, javaFloat(this.y + Player.SENSOR_Y))
                ) {
                    this.x = javaFloat(this.x + speed);
                }
            }
        } else if (this.input.isDown()) {
            // 90
            this.fireAngle = 90;
            if ((this.lastTargetAngle === 45 || this.lastTargetAngle === 135) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 90;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let Y = javaFloat(javaFloat(this.y + Player.SENSOR_X) + Player.SPEED);
                if (
                    this.gameMode.isDriveable(this.x, Y) &&
                    this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_Y), Y) &&
                    this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_Y), Y)
                ) {
                    this.y = javaFloat(this.y + speed);
                }
            }
        } else if (this.input.isLeft()) {
            // 180
            this.fireAngle = 180;
            if ((this.lastTargetAngle === 135 || this.lastTargetAngle === 225) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 180;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let X = javaFloat(javaFloat(this.x - Player.SENSOR_X) - Player.SPEED);
                if (
                    this.gameMode.isDriveable(X, this.y) &&
                    this.gameMode.isDriveable(X, javaFloat(this.y - Player.SENSOR_Y)) &&
                    this.gameMode.isDriveable(X, javaFloat(this.y + Player.SENSOR_Y))
                ) {
                    this.x = javaFloat(this.x - speed);
                }
            }
        } else if (this.input.isUp()) {
            // 270
            this.fireAngle = 270;
            if ((this.lastTargetAngle === 225 || this.lastTargetAngle === 315) && this.diagonalDelay > 0) {
                this.diagonalDelay--;
            } else {
                this.targetAngle = 270;
                this.lastTargetAngle = this.targetAngle;
                this.diagonalDelay = 0;

                let Y = javaFloat(javaFloat(this.y - Player.SENSOR_X) - Player.SPEED);
                if (
                    this.gameMode.isDriveable(this.x, Y) &&
                    this.gameMode.isDriveable(javaFloat(this.x - Player.SENSOR_Y), Y) &&
                    this.gameMode.isDriveable(javaFloat(this.x + Player.SENSOR_Y), Y)
                ) {
                    this.y = javaFloat(this.y - speed);
                }
            }
        } else {
            this.diagonalDelay = 0;
        }

        if (this.y > javaFloat(this.gameMode.maxCameraY + 928)) {
            this.y = javaFloat(this.gameMode.maxCameraY + 928);
        }

        if (this.angleSteps > 0) {
            if (--this.angleSteps === 0) {
                this.angle = this.nextAngle;
                this.displayAngle = javaFloat(this.nextAngle);
            } else {
                this.displayAngle = javaFloat(this.displayAngle + this.angleVelocity);
            }
        }

        if (this.angleSteps === 0 && this.targetAngle !== -1 && this.targetAngle !== this.angle) {
            this.angleSteps = Player.ANGLE_STEPS;
            if (this.targetAngle === 0) {
                if (this.angle >= 180) {
                    this.nextAngle = this.angle + 45;
                    if (this.nextAngle === 360) {
                        this.nextAngle = 0;
                    }
                    this.angleVelocity = Player.ANGLE_VELOCITY;
                } else {
                    this.nextAngle = this.angle - 45;
                    this.angleVelocity = -Player.ANGLE_VELOCITY;
                }
            } else if (this.targetAngle === 180) {
                if (this.angle > 180) {
                    this.nextAngle = this.angle - 45;
                    this.angleVelocity = -Player.ANGLE_VELOCITY;
                } else if (this.angle === 0) {
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
            if (this.nextAngle === -45) {
                this.nextAngle = 315;
            } else if (this.nextAngle === 360) {
                this.nextAngle = 0;
            }
        }

        if (
            this.targetAngle !== -1 &&
            !this.gameMode.bossCameraPan &&
            !this.gameMode.endingCameraPan &&
            this.gameMode.playing &&
            !this.gameMode.paused &&
            ++this.rumble === PLAYER_RUMBLE_STEPS
        ) {
            this.rumble = 0;
        }

        if (this.invincible > 0) {
            this.invincible--;
        }

        if (this.input.isFire()) {
            if (this.fireReleased && this.weaponArmed) {
                this.fireReleased = false;
                this.weaponArmed = false;
                if (this.targetAngle === -1 && this.angleSteps === 0) {
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
            if (this.shootReleased || this.gunArmed === 0) {
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
        if (this.angle === 0 || this.angle === 180) {
            xMargin = 48;
        } else if (this.angle === 90 || this.angle === 270) {
            yMargin = 46;
        }
        for (let i = this.mines.size() - 1; i >= 0; i--) {
            let mine = this.mines.get(i);
            if (
                mine.bump(javaFloat(this.x - xMargin), javaFloat(this.y - yMargin), javaFloat(this.x + xMargin), javaFloat(this.y + yMargin), invincibleLocal)
            ) {
                if (!invincibleLocal) {
                    this.explode();
                    break;
                }
            }
        }
    }

    public render(): void {
        if (this.respawning !== 0) {
            return;
        }

        if (this.invincible > 0) {
            if (!this.gameMode.paused && ++this.invincibleColor === 4) {
                this.invincibleColor = 0;
            }
        } else {
            this.invincibleColor = 0;
        }

        if (this.inSwamp && this.targetAngle !== -1 && this.angleSteps === 0) {
            switch (this.nextAngle) {
                case 0:
                case 360:
                    this.main.drawImageAlpha(this.main.playerWakes[0], this.x - 37, this.y - 43, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 45:
                    this.main.drawRotatedAlpha(this.main.playerWakes[4], this.x - 8, this.y - 2, 90, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 90:
                    this.main.drawImageAlpha(this.main.playerWakes[3], this.x - 52, this.y - 31, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 135:
                    this.main.drawRotatedAlpha(this.main.playerWakes[5], this.x + 8, this.y + 2, -90, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 180:
                    this.main.drawImageAlpha(this.main.playerWakes[1], this.x - 27, this.y - 43, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 225:
                    this.main.drawImageAlpha(this.main.playerWakes[5], this.x - 42, this.y - 36, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 270:
                    this.main.drawImageAlpha(this.main.playerWakes[2], this.x - 52, this.y - 31, Player.WAKE_ALPHAS[this.rumble]);
                    break;
                case 315:
                    this.main.drawImageAlpha(this.main.playerWakes[4], this.x - 49, this.y - 36, Player.WAKE_ALPHAS[this.rumble]);
                    break;
            }
        }

        this.main.drawVehicle(this.main.players[this.invincibleColor], this.x, this.y + Player.RUMBLE[this.rumble], this.displayAngle);
    }
}
