import { AttackSource } from "./AttackSource.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import { SwampMissile } from "./SwampMissile.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class CliffMissileLauncher extends Enemy {
    declare public launchDelay: number;
    declare public ready: boolean;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.launchDelay = 0;
        this.ready = false;
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
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
        if ((attackSource === AttackSource.PLAYER_WEAPON || attackSource === AttackSource.TRAVELING_EXPLOSION) && this.hitBounds(x1, y1, x2, y2)) {
            this.remove();
            Explosion.create(javaFloat(this.x + this.explosionX), javaFloat(this.y + this.explosionY));
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
            } else if (!this.gameMode.isOutsideOfFrame(javaFloat(this.x + 48), javaFloat(this.y + 69))) {
                this.launchDelay = CliffMissileLauncher.LAUNCH_DELAY;
                new SwampMissile(javaFloat(this.x + 48), javaFloat(this.y + 69));
            }
        } else {
            if (!this.gameMode.isOutsideOfFrame(javaFloat(this.x + 48), javaFloat(this.y + 69))) {
                this.ready = true;
            }
        }
    }

    public render(): void {
        this.main.drawImage(this.main.cliffMissileLauncher, this.x, this.y);
    }
}
