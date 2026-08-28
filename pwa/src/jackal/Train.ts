import { ArrayList } from "../java/JavaRuntime.js";
import { Enemy } from "./Enemy.js";
import { EnemyBullet } from "./EnemyBullet.js";
import type { Player } from "./Player.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Train extends Enemy {
    declare public mines: ArrayList<Enemy> | null;
    declare public player: Player | null;
    declare public carIndex: number;
    declare public shootX: number;
    declare public shootY: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.mines = null;
        this.player = null;
        this.carIndex = 0;
        this.shootDelay = 0;
        this.shootX = 0;
        this.shootY = 0;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_Train(argCount, arg0, arg1, arg2);
    }

    private __construct_Train(argCount: number, arg0?: number, arg1?: number, arg2?: boolean): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let locomotive = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.carIndex = locomotive ? 0 : 1;
            this.shootX = locomotive ? 28 : 24;
            this.shootY = 64;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly SPEED: number = 3.5;
    public static readonly SHOOT_DELAY: number = 3 * 91;
    public static readonly BULLET_SPEED: number = 1.5;
    public static readonly BULLET_TRAVEL_TIME: number = 4 * 91;

    public shootDelay: number = this.main.random.nextInt(Train.SHOOT_DELAY);

    public override init(): void {
        super.init();

        this.mines = this.gameMode.mines;
        this.player = this.gameMode.player;

        this.layer = 3;

        this.bulletHits = 4;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = this.carIndex == 0 ? 48 : 40;
        this.hitY2 = 120;

        this.mine = true;
        this.mineX1 = 8;
        this.mineY1 = 8;
        this.mineX2 = this.carIndex == 0 ? 48 : 40;
        this.mineY2 = 120;

        this.solid = true;
        this.solidX1 = 0;
        this.solidY1 = 0;
        this.solidX2 = this.carIndex == 0 ? 56 : 48;
        this.solidY2 = 128;

        this.points = this.carIndex == 0 ? 1500 : 1200;

        this.explosionX = this.carIndex == 0 ? 28 : 24;
        this.explosionY = 64;
    }

    public override checkBounds(maxY: number): void {}

    public override flatten(): void {}

    public update(): void {
        this.y = javaFloat(this.y - Train.SPEED);
        if (this.y < 3104) {
            this.playSoundOnRemove = false;
            this.remove();
        } else {
            if (this.y > 3296 && --this.shootDelay <= 0) {
                this.shootDelay = Train.SHOOT_DELAY;
                new EnemyBullet(
                    javaFloat(this.x + this.shootX),
                    javaFloat(this.y + this.shootY),
                    this.player!.x > this.x ? Train.BULLET_SPEED : -Train.BULLET_SPEED,
                    0,
                    Train.BULLET_TRAVEL_TIME,
                    false
                );
            }
            for (let i = this.mines!.size() - 1; i >= 0; i--) {
                let mineLocal = this.mines!.get(i);
                if (
                    mineLocal != this &&
                    mineLocal.isMine(
                        javaFloat(this.x + this.mineX1),
                        javaFloat(this.y + this.mineY1),
                        javaFloat(this.x + this.mineX2),
                        javaFloat(this.y + this.mineY2)
                    )
                ) {
                    mineLocal.flatten();
                }
            }
        }
    }

    public render(): void {
        if (this.y <= 3296) {
            this.gameMode.g.setWorldClip(384, 3248, 64, 192);
            this.main.draw(this.main.trains[this.carIndex], this.x, this.y);
            this.main.draw(this.main.trains[2], 384, 3232);
            this.gameMode.g.clearWorldClip();
        } else {
            this.main.draw(this.main.trains[this.carIndex], this.x, this.y);
        }
    }
}
