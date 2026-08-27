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

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_SubmarineMissile(argCount, arg0, arg1);
    }

    private __construct_SubmarineMissile(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            yLocal -= 20;

            let player = this.gameMode.player;
            let ang = 180 + SubmarineMissile.TO_DEGREES * javaFloat(Math.atan2(yLocal - player.y, xLocal - player.x));
            this.angle = 45 * javaRoundFloat(ang / 45);
            let v = this.main.createUnitVector(this.angle);
            this.vx = SubmarineMissile.SPEED * v[0];
            this.vy = SubmarineMissile.SPEED * v[1];
            this.tx = 18 * v[0];
            this.ty = 18 * v[1];

            this.x = xLocal + v[0] * 24;
            this.y = yLocal + v[1] * 24;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
        this.x += this.vx;
        this.y += this.vy;

        if (this.gameMode.isOutsideOfFrame(this.x - 32, this.y - 32, this.x + 32, this.y + 32)) {
            this.playSoundOnRemove = false;
            this.remove();
        }
    }

    public render(): void {
        this.main.drawRotated(this.main.statueMissiles[0], this.x, this.y, this.angle);
    }
}
