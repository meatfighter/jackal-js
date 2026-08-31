import { javaFloat, javaRoundFloat } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
export class SubmarineMissile extends Enemy {
    declare public vy: number;
    declare public vx: number;
    declare public tx: number;
    declare public ty: number;
    declare public angle: number;
    declare public explodeDelay: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vy = 0;
        this.vx = 0;
        this.tx = 0;
        this.ty = 0;
        this.angle = 0;
        this.explodeDelay = 0;
    }

    public constructor(x: number, y: number) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        y = javaFloat(y - 20);
        let player = this.gameMode.player;
        let ang = javaFloat(180 + javaFloat(SubmarineMissile.TO_DEGREES * javaFloat(Math.atan2(javaFloat(y - player.y), javaFloat(x - player.x)))));
        this.angle = 45 * javaRoundFloat(javaFloat(ang / 45));
        let v = this.main.createUnitVector(this.angle);
        this.vx = javaFloat(SubmarineMissile.SPEED * v[0]);
        this.vy = javaFloat(SubmarineMissile.SPEED * v[1]);
        this.tx = javaFloat(18 * v[0]);
        this.ty = javaFloat(18 * v[1]);
        this.x = javaFloat(x + javaFloat(v[0] * 24));
        this.y = javaFloat(y + javaFloat(v[1] * 24));
    }

    public static readonly SPEED: number = 8;

    public static readonly TO_DEGREES: number = javaFloat(180.0 / Math.PI);

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

    public update(): void {
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);

        if (this.gameMode.isOutsideOfFrameBounds(javaFloat(this.x - 32), javaFloat(this.y - 32), javaFloat(this.x + 32), javaFloat(this.y + 32))) {
            this.playSoundOnRemove = false;
            this.remove();
        }
    }

    public render(): void {
        this.main.drawRotated(this.main.statueMissiles[0], this.x, this.y, this.angle);
    }
}
