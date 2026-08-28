import { javaIntDiv, type ArrayList } from "../java/JavaRuntime.js";
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

    public constructor(arg0?: number, arg1?: number, arg2?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_Grenade(argCount, arg0, arg1, arg2);
    }

    private __construct_Grenade(argCount: number, arg0?: number, arg1?: number, arg2?: number): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let angleLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;

            let unit = this.main.createUnitVector(angleLocal);
            if (this.gameMode.player.longRange) {
                this.vx = unit[0] * Grenade.VELOCITY2;
                this.vy = unit[1] * Grenade.VELOCITY2;
            } else {
                this.vx = unit[0] * Grenade.VELOCITY;
                this.vy = unit[1] * Grenade.VELOCITY;
            }

            this.enemies = this.gameMode.enemies;

            this.main.playSound(this.main.throwSound);
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly DISTANCE: number = 320;
    public static readonly DISTANCE2: number = 400;
    public static readonly MIN_SCALE: number = 0.6;
    public static readonly TRAVEL_TIME: number = 64;
    public static readonly HALF_TIME: number = javaIntDiv(Grenade.TRAVEL_TIME, 2);
    public static readonly GRAVITY: number = (-2 * (1 - Grenade.MIN_SCALE)) / (Grenade.HALF_TIME * Grenade.HALF_TIME);
    public static readonly VELOCITY: number = Grenade.DISTANCE / Grenade.TRAVEL_TIME;
    public static readonly VELOCITY2: number = Grenade.DISTANCE2 / Grenade.TRAVEL_TIME;
    public static readonly HALF_GRAVITY: number = Grenade.GRAVITY / 2;
    public static readonly V0: number = -Grenade.GRAVITY * Grenade.HALF_TIME;
    public static readonly ANGULAR_VELOCITY: number = 10;
    public static readonly MARGIN: number = 21;

    public init(): void {
        this.layer = 4;
    }

    public update(): void {
        this.x += this.vx;
        this.y += this.vy;
        this.scale = Grenade.MIN_SCALE + this.t * (Grenade.V0 + Grenade.HALF_GRAVITY * this.t);
        this.angle += Grenade.ANGULAR_VELOCITY;

        let x1 = this.x - Grenade.MARGIN;
        let y1 = this.y - Grenade.MARGIN;
        let x2 = this.x + Grenade.MARGIN;
        let y2 = this.y + Grenade.MARGIN;
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

        if (hit || ++this.t > Grenade.TRAVEL_TIME) {
            this.remove();
            if (!hit) {
                this.main.playExplodeSound2();
            }
            new Explosion(this.x, this.y).setGrenadeExplosion(true);
        }
    }

    public render(): void {
        this.main.draw(this.main.grenade, this.x, this.y, this.angle, this.scale);
    }
}
