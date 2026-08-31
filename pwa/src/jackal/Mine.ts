import { Enemy } from "./Enemy.js";
import type { Player } from "./Player.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Mine extends Enemy {
    declare public spriteIndex: number;
    declare public visible: boolean;
    declare public player: Player | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.spriteIndex = 0;
        this.visible = false;
        this.player = null;
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.player = this.gameMode.player;
        this.explosionX = 16;
        this.explosionY = 16;
    }

    public static readonly VISIBLE_DISTANCE: number = 300;

    public static readonly VISIBLE_DISTANCE2: number = javaFloat(Mine.VISIBLE_DISTANCE * Mine.VISIBLE_DISTANCE);

    public override init(): void {
        super.init();

        this.layer = 0;

        this.hitX1 = 0;
        this.hitY1 = 0;
        this.hitX2 = 32;
        this.hitY2 = 32;

        this.mine = true;
        this.mineX1 = 8;
        this.mineY1 = 8;
        this.mineX2 = 24;
        this.mineY2 = 24;

        this.solid = true;
        this.solidX1 = 0;
        this.solidY1 = 0;
        this.solidX2 = 32;
        this.solidY2 = 32;
    }

    public update(): void {
        let dx = javaFloat(this.player!.x - javaFloat(this.x + 16));
        let dy = javaFloat(this.player!.y - javaFloat(this.y + 16));
        this.visible = javaFloat(javaFloat(dx * dx) + javaFloat(dy * dy)) <= Mine.VISIBLE_DISTANCE2;
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public render(): void {
        if (this.visible) {
            if (++this.spriteIndex === 4) {
                this.spriteIndex = 0;
            }
            this.main.drawImage(this.main.mines[this.spriteIndex], this.x, this.y);
        }
    }
}
