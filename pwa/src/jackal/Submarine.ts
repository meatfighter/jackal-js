import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SubmarineMissile } from "./SubmarineMissile.js";
import type { Player } from "./Player.js";
export class Submarine extends Enemy {
    declare public player: Player | null;
    declare public moveable: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.player = null;
        this.state = 0;
        this.delay = 0;
        this.height = 0;
        this.alpha = 0;
        this.moveable = false;
        this.moves = 0;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_Submarine(argCount, arg0, arg1);
    }

    private __construct_Submarine(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_SUBMERGED: number = 0;
    public static readonly STATE_RISING: number = 1;
    public static readonly STATE_SHOOTING: number = 2;
    public static readonly STATE_LOWERING: number = 3;

    public static readonly MINIMUM_ALPHA: number = 0.3;
    public static readonly MAXIMUM_ALPHA: number = 0.6;

    public static readonly SUBMERGED_DELAY: number = 2 * 91;
    public static readonly ELEVATION_DELAY: number = 69;
    public static readonly SHOOT_DELAY: number = 91 + 68;
    public static readonly MOVE_SPEED: number = 0.775;
    public static readonly MOVES: number = 3;

    public state: number = Submarine.STATE_SUBMERGED;
    public delay: number = 91;
    public height: number = 0;
    public alpha: number = Submarine.MINIMUM_ALPHA;

    public moves: number = Submarine.MOVES;

    public override init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 3;

        this.bulletHits = 8;

        this.hitX1 = -20;
        this.hitY1 = -60;
        this.hitX2 = 20;
        this.hitY2 = 60;

        this.points = 1000;
    }

    private startRising(): void {
        this.state = Submarine.STATE_RISING;
        this.delay = Submarine.ELEVATION_DELAY;
        this.moves--;
    }

    private startShooting(): void {
        this.state = Submarine.STATE_SHOOTING;
        this.delay = Submarine.SHOOT_DELAY;
        this.alpha = Submarine.MAXIMUM_ALPHA;
        this.height = 3;
    }

    private startLowering(): void {
        this.state = Submarine.STATE_LOWERING;
        this.delay = Submarine.ELEVATION_DELAY;
    }

    private startSubmerging(): void {
        this.state = Submarine.STATE_SUBMERGED;
        this.delay = Submarine.SUBMERGED_DELAY;
        if (this.moves >= 0) {
            this.delay += Submarine.SUBMERGED_DELAY;
        }
        this.height = 0;
        this.alpha = Submarine.MINIMUM_ALPHA;
        this.moveable = true;
    }

    public update(): void {
        switch (this.state) {
            case Submarine.STATE_SUBMERGED:
                if (--this.delay <= 0) {
                    if (this.gameMode.cameraY < this.y - 64) {
                        this.startRising();
                    }
                } else if (this.moveable && this.moves >= 0) {
                    this.y -= Submarine.MOVE_SPEED;
                }
                break;
            case Submarine.STATE_RISING:
                if (--this.delay <= 0) {
                    this.startShooting();
                } else {
                    let percent = 1 - this.delay / javaFloat(Submarine.ELEVATION_DELAY);
                    this.height = javaInt(3 * percent);
                    this.alpha = Submarine.MINIMUM_ALPHA + (Submarine.MAXIMUM_ALPHA - Submarine.MINIMUM_ALPHA) * percent;
                }
                break;
            case Submarine.STATE_SHOOTING:
                this.delay--;
                if (this.delay == Submarine.SHOOT_DELAY - 68) {
                    new SubmarineMissile(this.x, this.y);
                } else if (this.delay <= 0) {
                    this.startLowering();
                }
                break;
            case Submarine.STATE_LOWERING:
                if (--this.delay <= 0) {
                    this.startSubmerging();
                } else {
                    let percent = this.delay / javaFloat(Submarine.ELEVATION_DELAY);
                    this.height = javaInt(3 * percent);
                    this.alpha = Submarine.MINIMUM_ALPHA + (Submarine.MAXIMUM_ALPHA - Submarine.MINIMUM_ALPHA) * percent;
                }
                break;
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (this.height > 1 && attackSource < AttackSource.PLAYER_EXPLOSION && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(this.x, this.y);
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.height > 1 && this.hit(x1, y1, x2, y2)) {
            if (--this.bulletHits <= 0) {
                this.remove();
                new Explosion(this.x, this.y);
                this.main.addPoints(this.points);
            }
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        this.main.draw(this.main.submarines[0], this.x - 20, this.y - 128, this.alpha);
        if (this.height > 0) {
            this.main.drawCentered(this.main.submarines[this.height], this.x, this.y);
        }
    }
}
