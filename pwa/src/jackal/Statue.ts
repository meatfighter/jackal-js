import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { StatueMissile } from "./StatueMissile.js";
export class Statue extends Enemy {
    declare public type: number;
    declare public groupIndex: number;
    declare public eyesVisible: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = 0;
        this.groupIndex = 0;
        this.state = 0;
        this.delay = 0;
        this.eyesVisible = 0;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_Statue(argCount, arg0, arg1, arg2);
    }

    private __construct_Statue(argCount: number, arg0?: number, arg1?: number, arg2?: number): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let typeLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.type = typeLocal;

            let X = javaInt(xLocal) >> 5;
            let Y = javaInt(yLocal) >> 5;

            if (typeLocal == Statue.TYPE_LEFT) {
                this.delay += 108;
            }

            this.groupIndex = this.gameMode.groupsMap[Y + 1][X + 1];
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly PAUSE_TIME: number = 91;
    public static readonly EYES_FLASHING_TIME: number = 45;
    public static readonly MOUTH_OPEN_TIME: number = 45;
    public static readonly MISSILE_TIME: number = 35;

    public static readonly TYPE_NONE: number = 0;
    public static readonly TYPE_LEFT: number = 1;
    public static readonly TYPE_RIGHT: number = 2;

    public static readonly STATE_PAUSED: number = 0;
    public static readonly STATE_EYES_FLASHING: number = 1;
    public static readonly STATE_MOUTH_OPEN: number = 2;

    public state: number = Statue.STATE_PAUSED;
    public delay: number = Statue.PAUSE_TIME;

    public override init(): void {
        super.init();

        this.layer = 3;

        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 96;
        this.hitY2 = 128;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if ((attackSource == AttackSource.PLAYER_WEAPON || attackSource == AttackSource.TRAVELING_EXPLOSION) && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(javaFloat(this.x + 48), javaFloat(this.y + 64));
            this.gameMode.triggerGroup(this.groupIndex);
            this.main.addPoints(800);
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy
    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        if (this.hit(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public update(): void {
        if (this.type == Statue.TYPE_NONE) {
            return;
        }
        switch (this.state) {
            case Statue.STATE_PAUSED:
                if (--this.delay == 0) {
                    this.state = Statue.STATE_EYES_FLASHING;
                    this.delay = Statue.EYES_FLASHING_TIME;
                }
                break;
            case Statue.STATE_EYES_FLASHING:
                if (--this.delay == 0) {
                    this.state = Statue.STATE_MOUTH_OPEN;
                    this.delay = Statue.MOUTH_OPEN_TIME;
                }
                break;
            case Statue.STATE_MOUTH_OPEN:
                if (this.delay == Statue.MISSILE_TIME) {
                    new StatueMissile(this.x, this.y, this.type == Statue.TYPE_RIGHT);
                }
                if (--this.delay == 0) {
                    this.state = Statue.STATE_PAUSED;
                    this.delay = Statue.PAUSE_TIME;
                }
                break;
        }
    }

    public render(): void {
        switch (this.state) {
            case Statue.STATE_EYES_FLASHING:
                if (this.eyesVisible < 2) {
                    this.main.draw(this.main.statueBlueEyes, this.x + 32, this.y + 64);
                }
                if (++this.eyesVisible == 4) {
                    this.eyesVisible = 0;
                }
                break;
            case Statue.STATE_MOUTH_OPEN:
                this.main.draw(this.main.statueBlueMouth, this.x + 32, this.y + 96);
                break;
        }
    }
}
