import type { Image } from "slick2d-ts";
import { javaFloat, javaInt } from "../java/JavaRuntime.js";
import { GameElement } from "./GameElement.js";
export class TileDebris extends GameElement {
    declare public sprite: Image | null;
    declare public X: number;
    declare public Y: number;
    declare public tile: number;
    declare public type: number;
    declare public delay: number;
    declare public moving: boolean;
    declare public vx: number;
    declare public vy: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.sprite = null;
        this.X = 0;
        this.Y = 0;
        this.tile = 0;
        this.type = 0;
        this.delay = 0;
        this.moving = false;
        this.vx = 0;
        this.vy = 0;
        this.scale = 0;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: number, arg3?: number) {
        super();
        const argCount = arguments.length;
        this.__construct_TileDebris(argCount, arg0, arg1, arg2, arg3);
    }

    private __construct_TileDebris(argCount: number, arg0?: number, arg1?: number, arg2?: number, arg3?: number): void {
        if (argCount === 4 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "number" && typeof arg3 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let tileLocal = arg2;
            let typeLocal = arg3;
            this.X = xLocal;
            this.Y = yLocal;
            this.x = javaFloat((xLocal << 5) + 16);
            this.y = javaFloat((yLocal << 5) + 16);
            this.tile = tileLocal;
            this.type = typeLocal;
            this.sprite = this.gameMode.tiles[this.gameMode.tileMap[yLocal][xLocal]];
            this.delay = javaInt(javaFloat(this.gameMode.player.x - this.x)) >> 3;

            if (this.delay < 0) {
                this.delay = -this.delay;
            }
            this.delay++;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly GRAVITY: number = javaFloat(0.2);
    public static readonly SCALER: number = javaFloat(0.015);

    public scale: number = 1;

    public init(): void {
        this.layer = 7;
    }

    public update(): void {
        if (this.moving) {
            this.vy = javaFloat(this.vy + TileDebris.GRAVITY);
            this.x = javaFloat(this.x + this.vx);
            this.y = javaFloat(this.y + this.vy);
            this.scale = javaFloat(this.scale - TileDebris.SCALER);
            if (this.scale <= 0) {
                this.scale = 0;
                this.remove();
            }
        } else {
            if (--this.delay == 0) {
                this.moving = true;
                this.gameMode.tileMap[this.Y][this.X] = this.tile;
                this.gameMode.typesMap[this.Y][this.X] = this.type;
                this.vx = javaFloat(1 + javaFloat(this.main.random.nextFloat() * 5));
                if (this.gameMode.player.x > this.x) {
                    this.vx = -this.vx;
                }
                this.vy = javaFloat(-2 - javaFloat(this.main.random.nextFloat() * 5));
            }
        }
    }

    public render(): void {
        if (this.moving) {
            this.main.drawCentered(this.sprite!, this.x, this.y, this.scale);
        }
    }
}
