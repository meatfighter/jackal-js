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

    public constructor(x: number, y: number, type: number) {
        super();
        x = javaFloat(x);
        y = javaFloat(y);
        this.x = x;
        this.y = y;
        this.type = type;
        switch (type) {
            case LandingPort.TYPE_LEFT:
                new FriendlyHelicopter(javaFloat(x + 320), javaFloat(y + 192), false, true);
                break;
            case LandingPort.TYPE_RIGHT:
                new FriendlyHelicopter(javaFloat(x + 192), javaFloat(y + 192), false, false);
                break;
            case LandingPort.TYPE_CIRCLE:
                new FriendlyHelicopter(javaFloat(x + 224), javaFloat(y + 256), false, false);
                break;
        }
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
        if (++this.redIndex === 182) {
            this.redIndex = 0;
        }
        if (++this.blueIndex === 182) {
            this.blueIndex = 0;
        }
    }

    public render(): void {
        switch (this.type) {
            case LandingPort.TYPE_LEFT:
                for (let i = 0; i < 6; i++) {
                    let X = this.x + 136 + (i << 6);
                    let Y = this.y + 16;
                    if ((i & 1) === 0) {
                        this.main.drawImage(this.main.lamps[3], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                        this.main.drawImage(this.main.lamps[3], X, Y + 320);
                        this.main.drawImageAlpha(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.drawImage(this.main.lamps[1], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                        this.main.drawImage(this.main.lamps[1], X, Y + 320);
                        this.main.drawImageAlpha(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                for (let i = 0; i < 3; i++) {
                    let X = this.x + 488;
                    let Y = this.y + 80 + i * 96;
                    if ((i & 1) === 0) {
                        this.main.drawImage(this.main.lamps[3], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.drawImage(this.main.lamps[1], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                break;
            case LandingPort.TYPE_RIGHT:
                for (let i = 0; i < 6; i++) {
                    let X = this.x + 40 + (i << 6);
                    let Y = this.y + 16;
                    if ((i & 1) === 0) {
                        this.main.drawImage(this.main.lamps[3], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                        this.main.drawImage(this.main.lamps[3], X, Y + 320);
                        this.main.drawImageAlpha(this.main.lamps[2], X, Y + 320, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.drawImage(this.main.lamps[1], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                        this.main.drawImage(this.main.lamps[1], X, Y + 320);
                        this.main.drawImageAlpha(this.main.lamps[0], X, Y + 320, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                for (let i = 0; i < 3; i++) {
                    let X = this.x + 8;
                    let Y = this.y + 80 + i * 96;
                    if ((i & 1) === 1) {
                        this.main.drawImage(this.main.lamps[3], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    } else {
                        this.main.drawImage(this.main.lamps[1], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    }
                }
                break;
            case LandingPort.TYPE_CIRCLE:
                let blue = true;
                for (let i = LandingPort.CIRCLE_LIGHTS.length - 1; i >= 0; i--, blue = !blue) {
                    let X = this.x + LandingPort.CIRCLE_LIGHTS[i][0];
                    let Y = this.y + LandingPort.CIRCLE_LIGHTS[i][1];
                    if (blue) {
                        this.main.drawImage(this.main.lamps[1], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[0], X, Y, LandingPort.ALPHAS[this.blueIndex]);
                    } else {
                        this.main.drawImage(this.main.lamps[3], X, Y);
                        this.main.drawImageAlpha(this.main.lamps[2], X, Y, LandingPort.ALPHAS[this.redIndex]);
                    }
                }
                break;
        }
    }
}
