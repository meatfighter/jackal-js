import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { GrayJeep } from "./GrayJeep.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class AppearingGrayJeep extends GameElement {
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
        if (javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT) < javaFloat(this.y - 48)) {
            let grayJeep = new GrayJeep(this.x, this.y);
            grayJeep.targetAngle = 270;
            grayJeep.displayAngle = 270;
            this.remove();
        }
    }

    public render(): void {}
}
