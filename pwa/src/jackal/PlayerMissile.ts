import { ArrayList } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
import { TravelingExplosion } from "./TravelingExplosion.js";
import type { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

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

    public constructor(x: number, y: number, angle: number, power: number) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.angle = javaFloat(angle);
        this.power = power;
        let unit = this.main.createUnitVector(angle);
        if (this.gameMode.player.longRange) {
            this.vx = javaFloat(unit[0] * PlayerMissile.VELOCITY2);
            this.vy = javaFloat(unit[1] * PlayerMissile.VELOCITY2);
        } else {
            this.vx = javaFloat(unit[0] * PlayerMissile.VELOCITY);
            this.vy = javaFloat(unit[1] * PlayerMissile.VELOCITY);
        }
        this.enemies = this.gameMode.enemies;
        this.main.playSound(this.main.missileSound);
    }

    public static readonly DISTANCE: number = 360;
    public static readonly DISTANCE2: number = 500;
    public static readonly TRAVEL_TIME: number = 32;
    public static readonly VELOCITY: number = javaFloat(PlayerMissile.DISTANCE / PlayerMissile.TRAVEL_TIME);
    public static readonly VELOCITY2: number = javaFloat(PlayerMissile.DISTANCE2 / PlayerMissile.TRAVEL_TIME);
    public static readonly MARGIN: number = 21;

    public init(): void {
        this.layer = 4;
    }

    public update(): void {
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);

        let x1 = javaFloat(this.x - PlayerMissile.MARGIN);
        let y1 = javaFloat(this.y - PlayerMissile.MARGIN);
        let x2 = javaFloat(this.x + PlayerMissile.MARGIN);
        let y2 = javaFloat(this.y + PlayerMissile.MARGIN);
        let hit = false;

        if (!this.gameMode.isOutsideOfFrameBounds(x1, y1, x2, y2)) {
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
            let explosion = Explosion.create(this.x, this.y);
            if (this.power === 0) {
                explosion.setGrenadeExplosion(true);
            } else {
                new TravelingExplosion(this.x, this.y, -1, 0, true);
                new TravelingExplosion(this.x, this.y, 1, 0, false);
                if (this.power === 2) {
                    new TravelingExplosion(this.x, this.y, 0, -1, false);
                    new TravelingExplosion(this.x, this.y, 0, 1, false);
                }
            }
        }
    }

    public render(): void {
        const renderX = Math.floor(this.x);
        const renderY = Math.floor(this.y);
        this.main.drawRotated(this.main.playerMissile, renderX, renderY, this.angle);
    }
}
