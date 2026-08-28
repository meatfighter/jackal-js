import { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Laser extends Enemy {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(arg0?: number, arg1?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_Laser(argCount, arg0, arg1);
    }

    private __construct_Laser(argCount: number, arg0?: number, arg1?: number): void {
        if (argCount === 2 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            this.x = xLocal;
            this.y = yLocal;
            this.playSoundOnRemove = false;

            if (this.gameMode.cameraY <= javaFloat(yLocal + 896)) {
                this.main.playSound(this.main.laserSound);
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
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
        if (this.isMine(x1, y1, x2, y2)) {
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
