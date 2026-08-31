import { javaFloat } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import type { Player } from "./Player.js";
export class SwampMissile extends Enemy {
    declare public vx: number;
    declare public vy: number;
    declare public launcherX: number;
    declare public launcherY: number;
    declare public clipX: number;
    declare public explodeDelay: number;
    declare public player: Player | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.launcherX = 0;
        this.launcherY = 0;
        this.clipX = 0;
        this.explodeDelay = 0;
        this.player = null;
        this.entryDelay = 0;
    }

    public constructor(launcherX: number, launcherY: number) {
        super();

        launcherX = javaFloat(launcherX);
        launcherY = javaFloat(launcherY);
        this.launcherX = launcherX;
        this.launcherY = launcherY;
        this.player = this.gameMode.player;
        this.x = launcherX;
        this.y = javaFloat(launcherY + 32);
        this.vx = 0;
        this.vy = -SwampMissile.SPEED;
    }

    public static readonly ROTATION_SPEED: number = javaFloat(0.9);
    public static readonly EXPLODE_DELAY: number = 8 * 91;
    public static readonly SPEED: number = 4;
    public static readonly TO_RADIANS: number = javaFloat(Math.PI / 180);
    public static readonly EXPLODE_OFFSET: number = javaFloat(21 / SwampMissile.SPEED);
    public static readonly ENTRY_DELAY: number = 45;
    public static readonly REMOVE_MARGIN: number = 336;

    public angle: number = 270;

    public entryDelay: number = SwampMissile.ENTRY_DELAY;

    public override init(): void {
        super.init();

        this.layer = 4;

        this.bulletHits = 1;

        this.hitX1 = -26;
        this.hitY1 = -26;
        this.hitX2 = 26;
        this.hitY2 = 26;

        this.mine = true;
        this.mineX1 = -8;
        this.mineY1 = -8;
        this.mineX2 = 8;
        this.mineY2 = 8;
    }

    public update(): void {
        if (this.entryDelay > 0) {
            this.entryDelay--;
            this.y = javaFloat(this.y - SwampMissile.SPEED);
        } else {
            let targetAngle = javaFloat((Math.atan2(javaFloat(this.player!.y - this.y), javaFloat(this.player!.x - this.x)) * 180) / Math.PI);
            let deltaAngle = javaFloat(javaFloat(javaFloat(targetAngle - this.angle) + 180) % 360);
            if (deltaAngle < 0) {
                deltaAngle = javaFloat(deltaAngle + 180);
            } else {
                deltaAngle = javaFloat(deltaAngle - 180);
            }
            if (Math.abs(deltaAngle) < SwampMissile.ROTATION_SPEED) {
                this.angle = targetAngle;
            } else {
                if (deltaAngle < 0) {
                    this.angle = javaFloat(this.angle - SwampMissile.ROTATION_SPEED);
                } else {
                    this.angle = javaFloat(this.angle + SwampMissile.ROTATION_SPEED);
                }
            }

            let ang = javaFloat(SwampMissile.TO_RADIANS * this.angle);
            this.vx = javaFloat(SwampMissile.SPEED * javaFloat(Math.cos(ang)));
            this.vy = javaFloat(SwampMissile.SPEED * javaFloat(Math.sin(ang)));
            this.x = javaFloat(this.x + this.vx);
            this.y = javaFloat(this.y + this.vy);
        }

        if (
            this.y < javaFloat(this.gameMode.cameraY - SwampMissile.REMOVE_MARGIN) ||
            this.y > javaFloat(javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT) + SwampMissile.REMOVE_MARGIN) ||
            this.x < javaFloat(this.gameMode.cameraX - SwampMissile.REMOVE_MARGIN) ||
            this.x > javaFloat(javaFloat(this.gameMode.cameraX + MainConstants.DISPLAY_WIDTH) + SwampMissile.REMOVE_MARGIN)
        ) {
            this.playSoundOnRemove = false;
            this.remove();
        } else if (++this.explodeDelay === SwampMissile.EXPLODE_DELAY) {
            this.remove();
            Explosion.create(
                javaFloat(this.x + javaFloat(SwampMissile.EXPLODE_OFFSET * this.vx)),
                javaFloat(this.y + javaFloat(SwampMissile.EXPLODE_OFFSET * this.vy))
            ).setTiny(true);
        }
    }

    public render(): void {
        if (this.entryDelay > 0) {
            this.gameMode.g.setWorldClip(this.launcherX - 20, this.launcherY - 256, 40, 256);
            this.main.drawRotated(this.main.swampMissiles[0], this.x, this.y, this.angle);
            this.gameMode.g.clearWorldClip();
        } else {
            this.main.drawRotated(this.main.swampMissiles[0], this.x, this.y, this.angle);
        }
    }
}
