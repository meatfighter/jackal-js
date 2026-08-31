import { javaArray, javaDouble, javaFloat, javaIntDiv } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import { Explosion } from "./Explosion.js";
import { Parachute } from "./Parachute.js";
import type { Player } from "./Player.js";
export class BossHelicopter extends Enemy {
    declare public player: Player | null;
    declare public angle: number;
    declare public rotorAngle: number;
    declare public tailIndexCounter: boolean;
    declare public tailIndex: number;
    declare public positionDriftTime: number;
    declare public positionDriftDx: number;
    declare public positionDriftDy: number;
    declare public delay: number;
    declare public vy: number;
    declare public va: number;
    declare public rotateCW: boolean;
    declare public hits: number;
    declare public tinyExplosions: number;
    declare public tinyExplosionsDelay: number;
    declare public shuttering: number;
    declare public parachutes: number;
    declare public soldiers: number;
    declare public bulletDelay: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.angle = 0;
        this.rotorAngle = 0;
        this.tailIndexCounter = false;
        this.tailIndex = 0;
        this.positionDriftTime = 0;
        this.positionDriftDx = 0;
        this.positionDriftDy = 0;
        this.delay = 0;
        this.state = 0;
        this.vy = 0;
        this.va = 0;
        this.rotateCW = false;
        this.hits = 0;
        this.tinyExplosions = 0;
        this.tinyExplosionsDelay = 0;
        this.shuttering = 0;
        this.parachutes = 0;
        this.soldiers = 0;
        this.bulletDelay = 0;
    }

    public constructor() {
        super();

        this.randomizeLocation();
    }

    public static readonly STATE_ENTERING: number = 0;
    public static readonly STATE_HOVERING: number = 1;
    public static readonly STATE_RELEASING: number = 2;
    public static readonly STATE_LEAVING: number = 3;
    public static readonly STATE_HIDDEN: number = 4;

    public static readonly HITS: number = 7;
    public static readonly POSITION_DRIFT_TIME: number = 2 * 91 + 1;
    public static readonly POSITION_DRIFT_DISTANCE: number = 32;
    public static readonly PI2: number = javaFloat(2 * Math.PI);
    public static readonly POSITIONS: number[] = javaArray(BossHelicopter.POSITION_DRIFT_TIME, 0);
    public static readonly DRIFT_ANGLES: number[] = javaArray(BossHelicopter.POSITION_DRIFT_TIME, 0);
    public static readonly DRIFT_ANGLE: number = 5;
    public static readonly MIN_Y: number = -96;
    public static readonly MIN_Y2: number = -256;
    public static readonly MAX_Y: number = 480;
    public static readonly ENTERING_TIME: number = 2 * 91;
    public static readonly ENTERINGS: number[] = javaArray(BossHelicopter.ENTERING_TIME, 0);
    // Assigned once in the static block, matching Java static-final initialization.
    public static ENTER_ACCELERATION: number = 0;
    public static readonly HOVER_TIME: number = 45;
    public static readonly RELEASING_TIME_MIN: number = 23;
    public static readonly RELEASING_TIME_MAX: number = 45;
    public static readonly HIDDEN_TIME: number = 91;
    public static readonly ROTATE_TIME: number = 2 * 91;
    public static readonly ROTATE_HALF_TIME: number = javaFloat(BossHelicopter.ROTATE_TIME / 2);
    public static readonly ROTATE_ACCELERATION: number = javaFloat(180 / javaFloat(BossHelicopter.ROTATE_HALF_TIME * BossHelicopter.ROTATE_HALF_TIME));
    public static readonly MAX_APPEAR_DISTANCE: number = 128;
    public static readonly TO_RADIANS: number = javaFloat(Math.PI / 180);
    public static readonly SHUTTER_TIME: number = 91;
    public static readonly SHUTTER_AMPLITUDE: number = 8;
    public static readonly SHUTTER_CYCLES: number = 5;
    public static readonly SHUTTERS: number[] = javaArray(BossHelicopter.SHUTTER_TIME, 0);
    public static readonly MAX_SOLDIERS: number = 32;
    public static readonly BULLET_DELAY: number = 68;
    public static readonly BULLET_SPEED: number = 1.75;
    public static readonly BULLET_TRAVEL_TIME: number = 91;

    static {
        let XS = javaArray(BossHelicopter.POSITION_DRIFT_TIME + 1, 0);
        let HALF_TIME = javaIntDiv(BossHelicopter.POSITION_DRIFT_TIME, 2);
        let T = javaFloat(HALF_TIME);
        let a = javaFloat(BossHelicopter.POSITION_DRIFT_DISTANCE / javaFloat(T * T));
        for (let i = 0; i <= HALF_TIME; i++) {
            XS[i] = javaFloat(javaFloat(javaFloat(0.5 * a) * i) * i);
            XS[BossHelicopter.POSITION_DRIFT_TIME - i - 1] = javaFloat(BossHelicopter.POSITION_DRIFT_DISTANCE - XS[i]);
        }
        for (let i = 0; i < BossHelicopter.POSITION_DRIFT_TIME; i++) {
            BossHelicopter.POSITIONS[i] = javaFloat(XS[i + 1] - XS[i]);
            let ang = (2 * Math.PI * i) / javaDouble(BossHelicopter.POSITION_DRIFT_TIME) - Math.PI;
            BossHelicopter.DRIFT_ANGLES[i] = javaFloat(BossHelicopter.DRIFT_ANGLE * javaFloat(0.5 + 0.5 * Math.cos(ang)));
        }
        BossHelicopter.POSITIONS[BossHelicopter.POSITION_DRIFT_TIME - 1] = 0;

        XS = javaArray(BossHelicopter.ENTERING_TIME + 1, 0);
        BossHelicopter.ENTER_ACCELERATION = javaFloat(javaFloat(2 * javaFloat(BossHelicopter.MAX_Y - BossHelicopter.MIN_Y)) / javaFloat(XS.length * XS.length));
        for (let i = 0; i < XS.length; i++) {
            let t = XS.length - 1 - i;
            XS[i] = javaFloat(BossHelicopter.MAX_Y - javaFloat(javaFloat(javaFloat(0.5 * BossHelicopter.ENTER_ACCELERATION) * t) * t));
        }
        for (let i = 0; i < BossHelicopter.ENTERING_TIME; i++) {
            BossHelicopter.ENTERINGS[i] = javaFloat(XS[i + 1] - XS[i]);
        }
        XS = javaArray(BossHelicopter.SHUTTER_TIME + 1, 0);
        for (let i = 0; i < XS.length; i++) {
            XS[i] = javaFloat(
                (javaFloat((XS.length - 1 - i) * BossHelicopter.SHUTTER_AMPLITUDE) / javaDouble(XS.length)) *
                    Math.sin((i * 2 * Math.PI * BossHelicopter.SHUTTER_CYCLES) / javaDouble(XS.length))
            );
        }
        for (let i = 0; i < BossHelicopter.SHUTTER_TIME; i++) {
            BossHelicopter.SHUTTERS[BossHelicopter.SHUTTER_TIME - 1 - i] = javaFloat(XS[i + 1] - XS[i]);
        }
    }

    public state: number = BossHelicopter.STATE_ENTERING;

    public override init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 6;

        this.hitX1 = -24;
        this.hitY1 = -40;
        this.hitX2 = 24;
        this.hitY2 = 80;

        this.points = 5000;
    }

    private randomizeLocation(): void {
        this.y = BossHelicopter.MIN_Y;
        this.x = javaFloat(javaFloat(this.player!.x + this.main.random.nextInt(2 * BossHelicopter.MAX_APPEAR_DISTANCE)) - BossHelicopter.MAX_APPEAR_DISTANCE);
        if (this.x < 672) {
            this.x = 672;
        } else if (this.x > 1376) {
            this.x = 1376;
        }
        this.hitX1 = -24;
        this.hitY1 = -40;
        this.hitX2 = 24;
        this.hitY2 = 80;
    }

    public update(): void {
        if (this.state !== BossHelicopter.STATE_HIDDEN) {
            this.main.playSoundIfNotPlaying(this.main.helicopterSound2);
        }

        if (--this.bulletDelay < 0) {
            this.bulletDelay = BossHelicopter.BULLET_DELAY;
            let dx = javaFloat(this.player!.x - this.x);
            let dy = javaFloat(this.player!.y - this.y);
            let imag = javaFloat(BossHelicopter.BULLET_SPEED / javaFloat(Math.sqrt(javaFloat(javaFloat(dx * dx) + javaFloat(dy * dy)))));
            dx = javaFloat(dx * imag);
            dy = javaFloat(dy * imag);

            EnemyBullet.colored(javaFloat(this.x + dx), javaFloat(this.y + dy), dx, dy, BossHelicopter.BULLET_TRAVEL_TIME, true);
        }

        if (this.tinyExplosions > 0) {
            if (--this.tinyExplosionsDelay <= 0) {
                let ang = javaFloat(
                    BossHelicopter.TO_RADIANS *
                        javaFloat(javaFloat(this.angle + 90) - javaFloat(BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] * this.positionDriftDx))
                );
                let dx = javaFloat(Math.cos(ang));
                let dy = javaFloat(Math.sin(ang));
                let d = javaFloat(this.tinyExplosions * 40 - 232);
                let explosion = Explosion.create(javaFloat(this.x + javaFloat(d * dx)), javaFloat(this.y + javaFloat(d * dy)));
                explosion.setTiny(true);
                explosion.changeLayer(7);
                explosion.setAlpha(0.5);
                this.tinyExplosionsDelay = 4;
                this.tinyExplosions--;
            }
        }
        if (this.shuttering > 0) {
            this.shuttering--;
            this.x = javaFloat(this.x + BossHelicopter.SHUTTERS[this.shuttering]);
        }

        if (--this.positionDriftTime <= 0) {
            this.positionDriftTime = BossHelicopter.POSITION_DRIFT_TIME - 1;
            let driftAngle = javaFloat(BossHelicopter.PI2 * this.main.random.nextFloat());
            this.positionDriftDx = javaFloat(Math.cos(driftAngle));
            this.positionDriftDy = javaFloat(Math.sin(driftAngle));
        }
        this.x = javaFloat(this.x + javaFloat(this.positionDriftDx * BossHelicopter.POSITIONS[this.positionDriftTime]));
        this.y = javaFloat(this.y + javaFloat(this.positionDriftDy * BossHelicopter.POSITIONS[this.positionDriftTime]));

        switch (this.state) {
            case BossHelicopter.STATE_ENTERING:
                this.y = javaFloat(this.y + BossHelicopter.ENTERINGS[this.delay]);
                if (++this.delay === BossHelicopter.ENTERING_TIME) {
                    this.state = BossHelicopter.STATE_HOVERING;
                    this.delay = 0;
                }
                break;
            case BossHelicopter.STATE_HOVERING:
                if (++this.delay === BossHelicopter.HOVER_TIME) {
                    this.state = BossHelicopter.STATE_RELEASING;
                    this.delay = 0;
                }
                break;
            case BossHelicopter.STATE_RELEASING:
                if (--this.delay <= 0) {
                    if (this.parachutes++ === 3) {
                        this.state = BossHelicopter.STATE_LEAVING;
                        this.delay = 0;
                        this.vy = 0;
                        this.va = 0;
                        this.rotateCW = this.main.random.nextBoolean();
                        this.parachutes = 0;
                    } else {
                        if (this.soldiers < BossHelicopter.MAX_SOLDIERS) {
                            new Parachute(this.x, javaFloat(this.y - 32), javaFloat((1 + this.parachutes) * 64), this.x > 1024, this);
                            this.soldiers++;
                        }
                        this.delay =
                            BossHelicopter.RELEASING_TIME_MIN + this.main.random.nextInt(BossHelicopter.RELEASING_TIME_MAX - BossHelicopter.RELEASING_TIME_MIN);
                    }
                }
                break;
            case BossHelicopter.STATE_LEAVING:
                this.vy = javaFloat(this.vy + BossHelicopter.ENTER_ACCELERATION);
                this.y = javaFloat(this.y - this.vy);
                if (this.y < BossHelicopter.MIN_Y2) {
                    this.delay = 0;
                    this.state = BossHelicopter.STATE_HIDDEN;
                    this.main.stopSound(this.main.helicopterSound2);
                }
                if (this.rotateCW) {
                    if (this.angle > 68 && this.angle < 112) {
                        this.hitX1 = -24;
                        this.hitY1 = -32;
                        this.hitX2 = 24;
                        this.hitY2 = 32;
                    } else {
                        this.hitX1 = -24;
                        this.hitY1 = -80;
                        this.hitX2 = 24;
                        this.hitY2 = 40;
                    }
                    if (this.angle < 90) {
                        this.va = javaFloat(this.va + BossHelicopter.ROTATE_ACCELERATION);
                        this.angle = javaFloat(this.angle + this.va);
                    } else if (this.angle < 180) {
                        this.va = javaFloat(this.va - BossHelicopter.ROTATE_ACCELERATION);
                        this.angle = javaFloat(this.angle + this.va);
                    } else {
                        this.angle = 180;
                    }
                } else {
                    if (this.angle < -68 && this.angle > -112) {
                        this.hitX1 = -24;
                        this.hitY1 = -32;
                        this.hitX2 = 24;
                        this.hitY2 = 32;
                    } else {
                        this.hitX1 = -24;
                        this.hitY1 = -80;
                        this.hitX2 = 24;
                        this.hitY2 = 40;
                    }
                    if (this.angle > -90) {
                        this.va = javaFloat(this.va + BossHelicopter.ROTATE_ACCELERATION);
                        this.angle = javaFloat(this.angle - this.va);
                    } else if (this.angle > -180) {
                        this.va = javaFloat(this.va - BossHelicopter.ROTATE_ACCELERATION);
                        this.angle = javaFloat(this.angle - this.va);
                    } else {
                        this.angle = -180;
                        this.hitX1 = -24;
                        this.hitY1 = -80;
                        this.hitX2 = 24;
                        this.hitY2 = 40;
                    }
                }
                break;
            case BossHelicopter.STATE_HIDDEN:
                if (++this.delay === BossHelicopter.HIDDEN_TIME) {
                    this.delay = 0;
                    this.state = BossHelicopter.STATE_ENTERING;
                    this.randomizeLocation();
                    this.angle = 0;
                }
                break;
        }
    }

    // returns true if player bumped into the enemy
    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        return false;
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.tinyExplosions === 0 && attackSource === AttackSource.PLAYER_WEAPON && this.hitBounds(x1, y1, x2, y2)) {
            this.main.playHitExplodeSound();
            if (++this.hits === BossHelicopter.HITS) {
                this.main.stopSound(this.main.helicopterSound2);
                this.remove();
                let ang = javaFloat(
                    BossHelicopter.TO_RADIANS *
                        javaFloat(javaFloat(this.angle + 90) - javaFloat(BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] * this.positionDriftDx))
                );
                let dx = javaFloat(Math.cos(ang));
                let dy = javaFloat(Math.sin(ang));
                for (let i = 0; i < 4; i++) {
                    let d = javaFloat(i * 80 - 232);
                    Explosion.create(javaFloat(this.x + javaFloat(d * dx)), javaFloat(this.y + javaFloat(d * dy))).setDelayed(3 * (3 - i));
                }
                this.main.addPoints(this.points);
                this.gameMode.destroyAll();
                this.gameMode.stageCompleted();
            }
            this.tinyExplosions = 8;
            this.tinyExplosionsDelay = 0;
            this.shuttering = BossHelicopter.SHUTTER_TIME;
            return true;
        } else {
            return false;
        }
    }

    public soldierKilled(): void {
        this.soldiers--;
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public override checkBounds(maxY: number): void {}

    public render(): void {
        this.rotorAngle -= 30;
        if (this.rotorAngle === -90) {
            this.rotorAngle = 0;
        }
        this.tailIndexCounter = !this.tailIndexCounter;
        if (this.tailIndexCounter) {
            this.tailIndex = this.tailIndex === 3 ? 4 : 3;
        }

        let ang = this.angle - BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] * this.positionDriftDx;

        this.main.drawRotatedAtCenter(this.main.bossHelicopters[5], this.x + 64, this.y + 64, -18, -65, ang);
        this.main.drawRotatedAtCenter(this.main.bossHelicopters[0], this.x, this.y, -64, -232, ang);
        this.main.drawRotatedAtCenter(this.main.bossHelicopters[1], this.x, this.y, 0, -232, ang);
        this.main.drawRotatedAtCenter(this.main.bossHelicopters[this.tailIndex], this.x, this.y, -16, -224, ang);
        for (let i = 0; i < 4; i++) {
            this.main.drawRotatedAtCenter(this.main.bossHelicopters[2], this.x, this.y, 0, -32, 90 * i + this.rotorAngle);
        }
    }
}
