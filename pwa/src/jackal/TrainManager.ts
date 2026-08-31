import { MainConstants } from "../java/MainConstants.js";
import { GameElement } from "./GameElement.js";
import { Train } from "./Train.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class TrainManager extends GameElement {
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

    public static readonly CARS: number = 6;

    public init(): void {}

    public update(): void {
        if (this.y > javaFloat(this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT)) {
            this.remove();
            for (let i = 0; i < TrainManager.CARS; i++) {
                new Train(javaFloat(this.x + (i === 0 ? 0 : 4)), javaFloat(this.y + (i << 7)), i === 0);
            }
        }
    }

    public render(): void {}
}
