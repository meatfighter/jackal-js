import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { Explosion } from "./Explosion.js";
import { GameElement } from "./GameElement.js";
import type { Player } from "./Player.js";
export class ElephantMissile extends GameElement {
    declare public angle: number;
    declare public vx: number;
    declare public vy: number;
    declare public maxY: number;
    declare public explosionOffset: number;
    declare public tipX: number;
    declare public tipY: number;
    declare public player: Player | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.angle = 0;
        this.vx = 0;
        this.vy = 0;
        this.maxY = 0;
        this.explosionOffset = 0;
        this.tipX = 0;
        this.tipY = 0;
        this.player = null;
    }

    public constructor(x: number, y: number, angle: number, left: boolean) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.angle = javaFloat(angle);
        switch (angle) {
            case 45:
                this.vx = ElephantMissile.DIAGONAL_SPEED;
                this.vy = ElephantMissile.DIAGONAL_SPEED;
                this.explosionOffset = 32;
                this.tipX = 10;
                this.tipY = 10;
                break;
            case 90:
                this.vx = 0;
                this.vy = ElephantMissile.SPEED;
                if (!left) {
                    this.explosionOffset = 32;
                }
                this.tipX = 0;
                this.tipY = 16;
                break;
            case 135:
                this.vx = -ElephantMissile.DIAGONAL_SPEED;
                this.vy = ElephantMissile.DIAGONAL_SPEED;
                this.tipX = -10;
                this.tipY = 10;
                break;
        }
        if (angle === 90) {
            this.maxY = 908;
        } else {
            this.maxY = this.main.random.nextBoolean() ? 598 : 822;
        }
        this.main.playSound(this.main.laserSound);
    }

    public static readonly SPEED: number = 6;
    public static readonly DIAGONAL_SPEED: number = javaFloat(ElephantMissile.SPEED / Math.sqrt(2));

    public init(): void {
        this.layer = 4;

        this.player = this.gameMode.player;
    }

    public update(): void {
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);
        if (this.y >= this.maxY) {
            this.remove();
            let X = javaInt(this.x) >> 5;
            let Y = javaInt(this.y) >> 5;
            let groupIndex = this.gameMode.groupsMap[Y][X];
            this.gameMode.triggerGroup(groupIndex);
            Explosion.create(javaFloat((X << 5) + this.explosionOffset), javaFloat((Y << 5) + 32)).setDamagesEnemies(false);
        } else if (this.player!.attackAt(javaFloat(this.x + this.tipX), javaFloat(this.y + this.tipY))) {
            this.remove();
            Explosion.create(javaFloat(this.x + this.tipX), javaFloat(this.y + this.tipY));
        }
    }

    public render(): void {
        this.main.drawRotated(this.main.elephantGuns[8], this.x, this.y, this.angle);
    }
}
