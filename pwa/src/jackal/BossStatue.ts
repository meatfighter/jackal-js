import { javaInt } from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { StatueSeekerMissile } from "./StatueSeekerMissile.js";
import type { BossStatuesManager } from "./BossStatuesManager.js";
export class BossStatue extends Enemy {
    declare public type: number;
    declare public groupIndex: number;
    declare public eyesVisible: number;
    declare public hits: number;
    declare public bossStatuesManager: BossStatuesManager | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = 0;
        this.groupIndex = 0;
        this.state = 0;
        this.delay = 0;
        this.eyesVisible = 0;
        this.hits = 0;
        this.bossStatuesManager = null;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: number, arg3?: BossStatuesManager) {
        super();
        const argCount = arguments.length;
        this.__construct_BossStatue(argCount, arg0, arg1, arg2, arg3);
    }

    private __construct_BossStatue(argCount: number, arg0?: number, arg1?: number, arg2?: number, arg3?: BossStatuesManager): void {
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let startDelay = arg2;
            let bossStatuesManagerLocal = arg3;
            this.x = xLocal;
            this.y = yLocal;
            this.bossStatuesManager = bossStatuesManagerLocal!;

            let X = javaInt(xLocal) >> 5;
            let Y = javaInt(yLocal) >> 5;

            this.groupIndex = this.gameMode.groupsMap[Y + 1][X + 1];

            this.delay += startDelay;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly PAUSE_TIME: number = 4 * 91;
    public static readonly EYES_FLASHING_TIME: number = 45;
    public static readonly MOUTH_OPEN_TIME: number = 45;
    public static readonly MISSILE_TIME: number = 35;

    public static readonly STATE_PAUSED: number = 0;
    public static readonly STATE_EYES_FLASHING: number = 1;
    public static readonly STATE_MOUTH_OPEN: number = 2;

    public static readonly HITS: number = 3;

    public state: number = BossStatue.STATE_PAUSED;
    public delay: number = 91;

    public override init(): void {
        super.init();

        this.layer = 3;

        this.hitX1 = 8;
        this.hitY1 = 0;
        this.hitX2 = 88;
        this.hitY2 = 128;
    }

    // returns true if attack successful
    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if (attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
            if (++this.hits == BossStatue.HITS) {
                this.remove();
                this.bossStatuesManager!.statueDestroyed();
                new Explosion(this.x + 48, this.y + 64);
                this.gameMode.triggerGroup(this.groupIndex);
                this.main.addPoints(800);
            } else {
                this.main.playHitExplodeSound();
                let X = 0.5 * (x1 + x2);
                if (X < this.x + 32) {
                    X = this.x + 32;
                } else if (X > this.x + 64) {
                    X = this.x + 64;
                }
                for (let i = 0; i < 5; i++) {
                    new Explosion(X + this.main.random.nextInt(8) - 4, this.y + 156 + this.main.random.nextInt(8) - (i << 5), true, (i + 1) * 4, 0.5);
                }
            }
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
        switch (this.state) {
            case BossStatue.STATE_PAUSED:
                if (--this.delay == 0) {
                    this.state = BossStatue.STATE_EYES_FLASHING;
                    this.delay = BossStatue.EYES_FLASHING_TIME;
                }
                break;
            case BossStatue.STATE_EYES_FLASHING:
                if (--this.delay == 0) {
                    this.state = BossStatue.STATE_MOUTH_OPEN;
                    this.delay = BossStatue.MOUTH_OPEN_TIME;
                }
                break;
            case BossStatue.STATE_MOUTH_OPEN:
                if (this.delay == BossStatue.MISSILE_TIME) {
                    new StatueSeekerMissile(this.x, this.y);
                }
                if (--this.delay == 0) {
                    this.state = BossStatue.STATE_PAUSED;
                    this.delay = BossStatue.PAUSE_TIME;
                }
                break;
        }
    }

    public render(): void {
        switch (this.state) {
            case BossStatue.STATE_EYES_FLASHING:
                if (this.eyesVisible < 2) {
                    this.main.draw(this.main.statueWhiteEyes, this.x + 32, this.y + 64);
                }
                if (++this.eyesVisible == 4) {
                    this.eyesVisible = 0;
                }
                break;
            case BossStatue.STATE_MOUTH_OPEN:
                this.main.draw(this.main.statueWhiteMouth, this.x + 32, this.y + 96);
                break;
        }
    }
}
