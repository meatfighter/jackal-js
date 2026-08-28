import { ArrayList } from "../java/JavaRuntime.js";
import { BulletHit } from "./BulletHit.js";
import { GameElement } from "./GameElement.js";
import type { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class PlayerBullet extends GameElement {
    declare public t: number;
    declare public enemies: ArrayList<Enemy> | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.t = 0;
        this.enemies = null;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_PlayerBullet(argCount, arg0, arg1);
    }

    private __construct_PlayerBullet(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;

            this.enemies = this.gameMode.enemies;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly DISTANCE: number = 360;
    public static readonly TRAVEL_TIME: number = 20;
    public static readonly VELOCITY: number = javaFloat(PlayerBullet.DISTANCE / PlayerBullet.TRAVEL_TIME);
    public static readonly MARGIN: number = 16;

    public init(): void {
        this.layer = 4;
        this.main.playSoundAlways(this.main.machineGunSound);
    }

    public update(): void {
        this.y = javaFloat(this.y - PlayerBullet.VELOCITY);

        let hit = false;
        let x1 = javaFloat(this.x - PlayerBullet.MARGIN);
        let y1 = javaFloat(this.y - PlayerBullet.MARGIN);
        let x2 = javaFloat(this.x + PlayerBullet.MARGIN);
        let y2 = javaFloat(this.y + PlayerBullet.MARGIN);
        for (let i = this.enemies!.size() - 1; i >= 0; i--) {
            let enemyLocal = this.enemies!.get(i);
            if (!enemyLocal.removeFlag && enemyLocal.bulletAttack(x1, y1, x2, y2)) {
                hit = true;
                break;
            }
        }

        if (hit || ++this.t > PlayerBullet.TRAVEL_TIME || this.gameMode.isMissileTarget(this.x, this.y)) {
            this.removeFlag = true;
            new BulletHit(this.x, this.y);
        }
    }

    public render(): void {
        this.main.drawCentered(this.main.yellowBullet, this.x, this.y);
    }
}
