import { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Laser extends Enemy {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(x: number, y: number) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.playSoundOnRemove = false;
        if (this.gameMode.cameraY <= javaFloat(y + 896)) {
            this.main.playSound(this.main.laserSound);
        }
    }

    public override init(): void {
        super.init();

        this.mine = true;
        this.mineX1 = -1;
        this.mineY1 = 0;
        this.mineX2 = 1;
        this.mineY2 = 832;

        this.solid = true;
        this.solidX1 = -16;
        this.solidY1 = 0;
        this.solidX2 = 16;
        this.solidY2 = 832;
    }

    public override explode(): void {}

    // returns true if player bumped into the enemy

    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (invincible) {
            return false;
        }
        if (this.isMineBounds(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public update(): void {}

    public render(): void {}
}
