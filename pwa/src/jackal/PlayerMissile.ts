import type { ArrayList } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
import { TravelingExplosion } from "./TravelingExplosion.js";
import type { Enemy } from "./Enemy.js";
export class PlayerMissile extends GameElement {
    declare public vx: number;
    declare public vy: number;
    declare public angle: number;
    declare public t: number;
    declare public power: number;
    declare public enemies: ArrayList<Enemy> | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.t = 0;
        this.power = 0;
        this.enemies = null;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: number, arg3?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_PlayerMissile(argCount, arg0, arg1, arg2, arg3);
    }

    private __construct_PlayerMissile(argCount: number, arg0?: number, arg1?: number, arg2?: number, arg3?: number): void {
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let angleLocal = arg2;
            let powerLocal = arg3;
            this.x = xLocal;
            this.y = yLocal;
            this.angle = angleLocal;
            this.power = powerLocal;

            let unit = this.main.createUnitVector(angleLocal);
            if (this.gameMode.player.longRange) {
                this.vx = unit[0] * PlayerMissile.VELOCITY2;
                this.vy = unit[1] * PlayerMissile.VELOCITY2;
            } else {
                this.vx = unit[0] * PlayerMissile.VELOCITY;
                this.vy = unit[1] * PlayerMissile.VELOCITY;
            }

            this.enemies = this.gameMode.enemies;

            this.main.playSound(this.main.missileSound);
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly DISTANCE: number = 360;
    public static readonly DISTANCE2: number = 500;
    public static readonly TRAVEL_TIME: number = 32;
    public static readonly VELOCITY: number = PlayerMissile.DISTANCE / PlayerMissile.TRAVEL_TIME;
    public static readonly VELOCITY2: number = PlayerMissile.DISTANCE2 / PlayerMissile.TRAVEL_TIME;
    public static readonly MARGIN: number = 21;

    public init(): void {
        this.layer = 4;
    }

    public update(): void {
        this.x += this.vx;
        this.y += this.vy;

        let x1 = this.x - PlayerMissile.MARGIN;
        let y1 = this.y - PlayerMissile.MARGIN;
        let x2 = this.x + PlayerMissile.MARGIN;
        let y2 = this.y + PlayerMissile.MARGIN;
        let hit = false;

        if (!this.gameMode.isOutsideOfFrame(x1, y1, x2, y2)) {
            for (let i = this.enemies!.size() - 1; i >= 0; i--) {
                let enemyLocal = this.enemies!.get(i);
                if (!enemyLocal.removeFlag && enemyLocal.attack(x1, y1, x2, y2, AttackSource.PLAYER_WEAPON)) {
                    hit = true;
                    break;
                }
            }
        }

        if (hit || ++this.t > PlayerMissile.TRAVEL_TIME || this.gameMode.isMissileTarget(this.x, this.y)) {
            this.removeFlag = true;
            if (!hit) {
                this.main.playExplodeSound3();
            }
            let explosion = new Explosion(this.x, this.y);
            if (this.power == 0) {
                explosion.setGrenadeExplosion(true);
            } else {
                new TravelingExplosion(this.x, this.y, -1, 0, true);
                new TravelingExplosion(this.x, this.y, 1, 0, false);
                if (this.power == 2) {
                    new TravelingExplosion(this.x, this.y, 0, -1, false);
                    new TravelingExplosion(this.x, this.y, 0, 1, false);
                }
            }
        }
    }

    public render(): void {
        this.main.drawRotated(this.main.playerMissile, this.x, this.y, this.angle);
    }
}
