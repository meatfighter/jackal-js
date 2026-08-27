import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SwampMissile } from "./SwampMissile.js";
export class CliffMissileLauncher extends Enemy {
    declare public launchDelay: number;
    declare public ready: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.launchDelay = 0;
        this.ready = false;
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_CliffMissileLauncher(argCount, arg0, arg1);
    }

    private __construct_CliffMissileLauncher(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            this.x = xLocal;
            this.y = yLocal;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly LAUNCH_DELAY: number = 3 * 91;

    public override init(): void {
        super.init();

        this.layer = 3;

        this.bulletHits = 10;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = 88;
        this.hitY2 = 88;

        this.points = 2000;
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        if ((attackSource == AttackSource.PLAYER_WEAPON || attackSource == AttackSource.TRAVELING_EXPLOSION) && this.hit(x1, y1, x2, y2)) {
            this.remove();
            new Explosion(this.x + this.explosionX, this.y + this.explosionY);
            this.main.addPoints(this.points);
            return true;
        } else {
            return false;
        }
    }

    public update(): void {
        if (this.ready) {
            if (this.launchDelay > 0) {
                this.launchDelay--;
            } else if (!this.gameMode.isOutsideOfFrame(this.x + 48, this.y + 69)) {
                this.launchDelay = CliffMissileLauncher.LAUNCH_DELAY;
                new SwampMissile(this.x + 48, this.y + 69);
            }
        } else {
            if (!this.gameMode.isOutsideOfFrame(this.x + 48, this.y + 69)) {
                this.ready = true;
            }
        }
    }

    public render(): void {
        this.main.draw(this.main.cliffMissileLauncher, this.x, this.y);
    }
}
