import { MainConstants } from "../java/MainConstants.js";
import { EnemySoldier } from "./EnemySoldier.js";
import { EnemySoldierType } from "./EnemySoldierType.js";
import { GameElement } from "./GameElement.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class AppearingSoldier extends GameElement {
    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
    }

    public constructor(x: number, y: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
    }

    public init(): void {
        this.layer = 0;
    }

    public update(): void {
        if (javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT) < javaFloat(this.y - 75)) {
            new EnemySoldier(this.x, this.y, EnemySoldierType.APPEARING);
            this.remove();
        }
    }

    public render(): void {}
}
