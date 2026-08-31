import { javaFloat, javaIntDiv, type ArrayList } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { GameElement } from "./GameElement.js";
import type { Enemy } from "./Enemy.js";
export class TravelingExplosion extends GameElement {
    declare public vx: number;
    declare public vy: number;
    declare public notifier: boolean;
    declare public t: number;
    declare public scale: number;
    declare public enemies: ArrayList<Enemy> | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.notifier = false;
        this.t = 0;
        this.scale = 0;
        this.enemies = null;
    }

    public constructor(x: number, y: number, vx: number, vy: number, notifier: boolean) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        vx = javaFloat(vx);
        vy = javaFloat(vy);

        this.x = x;
        this.y = y;
        this.notifier = notifier;
        this.vx = javaFloat(TravelingExplosion.VELOCITY * vx);
        this.vy = javaFloat(TravelingExplosion.VELOCITY * vy);
        this.enemies = this.gameMode.enemies;
    }

    public static readonly DISTANCE: number = 320;
    public static readonly TRAVEL_TIME: number = 64;
    public static readonly PERIOD0: number = javaIntDiv(TravelingExplosion.TRAVEL_TIME, 3);
    public static readonly PERIOD1: number = javaIntDiv(2 * TravelingExplosion.TRAVEL_TIME, 3);
    public static readonly VELOCITY: number = javaFloat(TravelingExplosion.DISTANCE / TravelingExplosion.TRAVEL_TIME);
    public static readonly ALPHA: number = javaFloat(0.6);

    public static readonly K0: number = javaFloat(1.25 / TravelingExplosion.PERIOD0);
    public static readonly K1: number = javaFloat(0.75 / (TravelingExplosion.PERIOD1 - TravelingExplosion.PERIOD0));
    public static readonly K2: number = javaFloat(javaFloat(0.333) / (TravelingExplosion.TRAVEL_TIME - TravelingExplosion.PERIOD1));

    public init(): void {
        this.layer = 4;
    }

    public update(): void {
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);

        if (++this.t > TravelingExplosion.TRAVEL_TIME) {
            this.removeFlag = true;
            if (this.notifier) {
                this.gameMode.player.setWeaponArmed(true);
            }
        } else {
            let margin = 0;
            if (this.t < TravelingExplosion.PERIOD0) {
                this.scale = javaFloat(2.25 - javaFloat(this.t * TravelingExplosion.K0));
                margin = javaFloat(28 * this.scale);
            } else if (this.t < TravelingExplosion.PERIOD1) {
                this.scale = javaFloat(1.75 - javaFloat((this.t - TravelingExplosion.PERIOD0) * TravelingExplosion.K1));
                margin = javaFloat(18 * this.scale);
            } else {
                this.scale = javaFloat(javaFloat(1.333) - javaFloat((this.t - TravelingExplosion.PERIOD1) * TravelingExplosion.K2));
                margin = javaFloat(16 * this.scale);
            }

            let x1 = javaFloat(this.x - margin);
            let y1 = javaFloat(this.y - margin);
            let x2 = javaFloat(this.x + margin);
            let y2 = javaFloat(this.y + margin);
            if (!this.gameMode.isOutsideOfFrameBounds(x1, y1, x2, y2)) {
                for (let i = this.enemies!.size() - 1; i >= 0; i--) {
                    let enemyLocal = this.enemies!.get(i);
                    if (!enemyLocal.removeFlag) {
                        enemyLocal.attack(x1, y1, x2, y2, AttackSource.TRAVELING_EXPLOSION);
                    }
                }
            }
        }
    }

    public render(): void {
        if (this.t < TravelingExplosion.PERIOD0) {
            this.main.drawScaledAlpha(this.main.explosions[1], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
        } else if (this.t < TravelingExplosion.PERIOD1) {
            this.main.drawScaledAlpha(this.main.explosions[0], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
        } else {
            this.main.drawScaledAlpha(this.main.explosions[3], this.x, this.y, this.scale, TravelingExplosion.ALPHA);
        }
    }
}
