import { javaFloat, javaIntDiv, type ArrayList } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
import type { Enemy } from "./Enemy.js";
export class Grenade extends GameElement {
    declare public vx: number;
    declare public vy: number;
    declare public scale: number;
    declare public angle: number;
    declare public t: number;
    declare public enemies: ArrayList<Enemy> | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.scale = 0;
        this.angle = 0;
        this.t = 0;
        this.enemies = null;
    }

    public constructor(x: number, y: number, angle: number) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        let unit = this.main.createUnitVector(angle);
        if (this.gameMode.player.longRange) {
            this.vx = javaFloat(unit[0] * Grenade.VELOCITY2);
            this.vy = javaFloat(unit[1] * Grenade.VELOCITY2);
        } else {
            this.vx = javaFloat(unit[0] * Grenade.VELOCITY);
            this.vy = javaFloat(unit[1] * Grenade.VELOCITY);
        }
        this.enemies = this.gameMode.enemies;
        this.main.playSound(this.main.throwSound);
    }

    public static readonly DISTANCE: number = 320;
    public static readonly DISTANCE2: number = 400;
    public static readonly MIN_SCALE: number = javaFloat(0.6);
    public static readonly TRAVEL_TIME: number = 64;
    public static readonly HALF_TIME: number = javaIntDiv(Grenade.TRAVEL_TIME, 2);
    public static readonly GRAVITY: number = javaFloat(javaFloat(-2 * javaFloat(1 - Grenade.MIN_SCALE)) / (Grenade.HALF_TIME * Grenade.HALF_TIME));
    public static readonly VELOCITY: number = javaFloat(Grenade.DISTANCE / Grenade.TRAVEL_TIME);
    public static readonly VELOCITY2: number = javaFloat(Grenade.DISTANCE2 / Grenade.TRAVEL_TIME);
    public static readonly HALF_GRAVITY: number = javaFloat(Grenade.GRAVITY / 2);
    public static readonly V0: number = javaFloat(-Grenade.GRAVITY * Grenade.HALF_TIME);
    public static readonly ANGULAR_VELOCITY: number = 10;
    public static readonly MARGIN: number = 21;

    public init(): void {
        this.layer = 4;
    }

    public update(): void {
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);
        this.scale = javaFloat(Grenade.MIN_SCALE + javaFloat(this.t * javaFloat(Grenade.V0 + javaFloat(Grenade.HALF_GRAVITY * this.t))));
        this.angle = javaFloat(this.angle + Grenade.ANGULAR_VELOCITY);

        let x1 = javaFloat(this.x - Grenade.MARGIN);
        let y1 = javaFloat(this.y - Grenade.MARGIN);
        let x2 = javaFloat(this.x + Grenade.MARGIN);
        let y2 = javaFloat(this.y + Grenade.MARGIN);
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

        if (hit || ++this.t > Grenade.TRAVEL_TIME) {
            this.remove();
            if (!hit) {
                this.main.playExplodeSound2();
            }
            Explosion.create(this.x, this.y).setGrenadeExplosion(true);
        }
    }

    public render(): void {
        const renderX = Math.floor(this.x);
        const renderY = Math.floor(this.y);
        this.main.drawImageRotatedScaled(this.main.grenade, renderX, renderY, this.angle, this.scale);
    }
}
