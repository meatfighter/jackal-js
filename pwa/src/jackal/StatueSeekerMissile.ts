import type { Image } from "slick2d-ts";
import { javaFloat } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import type { Player } from "./Player.js";
export class StatueSeekerMissile extends Enemy {
    declare public vx: number;
    declare public vy: number;
    declare public sprite: Image | null;
    declare public statueX: number;
    declare public statueY: number;
    declare public clipX: number;
    declare public explodeDelay: number;
    declare public player: Player | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.sprite = null;
        this.statueX = 0;
        this.statueY = 0;
        this.clipX = 0;
        this.explodeDelay = 0;
        this.player = null;
        this.entryDelay = 0;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_StatueSeekerMissile(argCount, arg0, arg1);
    }

    private __construct_StatueSeekerMissile(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let statueXLocal = arg0;
            let statueYLocal = arg1;
            this.statueX = statueXLocal;
            this.statueY = statueYLocal;

            this.player = this.gameMode.player;

            this.x = statueXLocal + 48;
            this.y = statueYLocal + 86;
            this.vx = 0;
            this.vy = StatueSeekerMissile.SPEED;

            this.sprite = this.main.statueMissiles[0];
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly ROTATION_SPEED: number = 0.9;
    public static readonly EXPLODE_DELAY: number = 8 * 91;
    public static readonly SPEED: number = 3.5;
    public static readonly TO_RADIANS: number = javaFloat(Math.PI / 180);
    public static readonly EXPLODE_OFFSET: number = 18 / StatueSeekerMissile.SPEED;
    public static readonly ENTRY_DELAY: number = 16;

    public angle: number = 90;

    public entryDelay: number = StatueSeekerMissile.ENTRY_DELAY;

    public override init(): void {
        super.init();

        this.layer = 4;

        this.bulletHits = 1;

        this.hitX1 = -22;
        this.hitY1 = -22;
        this.hitX2 = 22;
        this.hitY2 = 22;

        this.mine = true;
        this.mineX1 = -8;
        this.mineY1 = -8;
        this.mineX2 = 8;
        this.mineY2 = 8;
    }

    public override remove(): void {
        this.removeFlag = true;
        if (this.playSoundOnRemove) {
            this.main.playExplodeSound2();
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource < AttackSource.PLAYER_EXPLOSION && this.hit(x1, y1, x2, y2)) {
            this.playSoundOnRemove = false;
            this.remove();
            this.main.playHitExplodeSound();
            new Explosion(this.x + this.explosionX, this.y + this.explosionY);
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    public update(): void {
        if (this.entryDelay > 0) {
            this.entryDelay--;
            this.y += StatueSeekerMissile.SPEED;
        } else {
            let targetAngle = javaFloat((Math.atan2(this.player.y - this.y, this.player.x - this.x) * 180) / Math.PI);
            let deltaAngle = (targetAngle - this.angle + 180) % 360;
            if (deltaAngle < 0) {
                deltaAngle += 180;
            } else {
                deltaAngle -= 180;
            }
            if (Math.abs(deltaAngle) < StatueSeekerMissile.ROTATION_SPEED) {
                this.angle = targetAngle;
            } else {
                if (deltaAngle < 0) {
                    this.angle -= StatueSeekerMissile.ROTATION_SPEED;
                } else {
                    this.angle += StatueSeekerMissile.ROTATION_SPEED;
                }
            }

            let ang = StatueSeekerMissile.TO_RADIANS * this.angle;
            this.vx = StatueSeekerMissile.SPEED * javaFloat(Math.cos(ang));
            this.vy = StatueSeekerMissile.SPEED * javaFloat(Math.sin(ang));
            this.x += this.vx;
            this.y += this.vy;
        }

        if (++this.explodeDelay == StatueSeekerMissile.EXPLODE_DELAY) {
            this.playSoundOnRemove = false;
            if (!this.gameMode.isOutsideOfFrame(this.x, this.y)) {
                this.main.playExplodeSound2();
            }
            this.remove();
            new Explosion(this.x + StatueSeekerMissile.EXPLODE_OFFSET * this.vx, this.y + StatueSeekerMissile.EXPLODE_OFFSET * this.vy).setTiny(true);
        }
    }

    public render(): void {
        if (this.entryDelay > 0) {
            this.gameMode.g.setWorldClip(this.statueX + 24, this.statueY + 100, 48, 96);
            this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
            this.gameMode.g.clearWorldClip();
        } else {
            this.main.drawRotated(this.sprite, this.x, this.y, this.angle);
        }
    }
}
