import { MainConstants } from "../java/MainConstants.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { GameElement } from "./GameElement.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class AppearingEnemyHelicopter extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(y: number) {
        super();

        y = javaFloat(y);
        this.y = y;
    }

    public init(): void {
        this.layer = 0;
    }

    public update(): void {
        if (javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT) < javaFloat(this.y - 60)) {
            new EnemyHelicopter(false);
            this.remove();
        }
    }

    public render(): void {}
}
