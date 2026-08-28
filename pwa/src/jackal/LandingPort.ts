import { javaArray, javaFloat } from "../java/JavaRuntime.js";
import { FriendlyHelicopter } from "./FriendlyHelicopter.js";
import { GameElement } from "./GameElement.js";
export class LandingPort extends GameElement {
    declare public type: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = 0;
        this.redIndex = 0;
        this.blueIndex = 0;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_LandingPort(argCount, arg0, arg1, arg2);
    }

    private __construct_LandingPort(argCount: number, arg0?: number, arg1?: number, arg2?: number): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number") {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let typeLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.type = typeLocal;

            switch (typeLocal) {
                case LandingPort.TYPE_LEFT:
                    new FriendlyHelicopter(javaFloat(xLocal + 320), javaFloat(yLocal + 192), false, true);
                    break;
                case LandingPort.TYPE_RIGHT:
                    new FriendlyHelicopter(javaFloat(xLocal + 192), javaFloat(yLocal + 192), false, false);
                    break;
                case LandingPort.TYPE_CIRCLE:
                    new FriendlyHelicopter(javaFloat(xLocal + 224), javaFloat(yLocal + 256), false, false);
                    break;
            }
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly TYPE_LEFT: number = 0;
    public static readonly TYPE_RIGHT: number = 1;
    public static readonly TYPE_CIRCLE: number = 2;

    public static readonly CIRCLE_LIGHTS: number[][] = [
        [392, 112],
        [328, 48],
        [264, 16],
        [168, 16],
        [104, 48],
        [40, 112],
        [8, 208],
        [8, 272],
        [40, 368],
        [104, 432],
        [168, 464],
        [264, 464],
        [328, 432],
        [392, 368]
    ];

    private static ALPHAS: number[] = javaArray(182, 0);

    static {
        for (let i = 0; i < 182; i++) {
            LandingPort.ALPHAS[i] = javaFloat(0.5 + javaFloat(javaFloat(Math.sin((Math.PI * i) / 91)) / 2));
        }
    }

    public redIndex: number = 0;
    public blueIndex: number = 91;

    public init(): void {
        this.layer = 0;
    }

    public update(): void {
        if (++this.redIndex == 182) {
            this.redIndex = 0;
        }
        if (++this.blueIndex == 182) {
            this.blueIndex = 0;
        }
    }

    public render(): void {
        switch (this.type) {
            case LandingPort.TYPE_LEFT:
                for (let i = 0; i < 6; i++) {
                    let X = this.x + 136 + (i << 6);
                    let Y = this.y + 16;
                    if ((i & 1) == 0) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                        this.main.draw(this.main.lamps[3], X, Y + 320);
                        this.main.draw(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                        this.main.draw(this.main.lamps[1], X, Y + 320);
                        this.main.draw(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                for (let i = 0; i < 3; i++) {
                    let X = this.x + 488;
                    let Y = this.y + 80 + i * 96;
                    if ((i & 1) == 0) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                break;
            case LandingPort.TYPE_RIGHT:
                for (let i = 0; i < 6; i++) {
                    let X = this.x + 40 + (i << 6);
                    let Y = this.y + 16;
                    if ((i & 1) == 0) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                        this.main.draw(this.main.lamps[3], X, Y + 320);
                        this.main.draw(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                        this.main.draw(this.main.lamps[1], X, Y + 320);
                        this.main.draw(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                for (let i = 0; i < 3; i++) {
                    let X = this.x + 8;
                    let Y = this.y + 80 + i * 96;
                    if ((i & 1) == 1) {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                break;
            case LandingPort.TYPE_CIRCLE:
                let blue = true;
                for (let i = LandingPort.CIRCLE_LIGHTS.length - 1; i >= 0; i--, blue = !blue) {
                    let X = this.x + LandingPort.CIRCLE_LIGHTS[i][0];
                    let Y = this.y + LandingPort.CIRCLE_LIGHTS[i][1];
                    if (blue) {
                        this.main.draw(this.main.lamps[1], X, Y);
                        this.main.draw(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    } else {
                        this.main.draw(this.main.lamps[3], X, Y);
                        this.main.draw(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    }
                }
                break;
        }
    }
}
