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

    public constructor(x: number, y: number, tile: number, type: number) {
        super();
        this.X = x;
        this.Y = y;
        this.x = javaFloat((x << 5) + 16);
        this.y = javaFloat((y << 5) + 16);
        this.tile = tile;
        this.type = type;
        this.sprite = this.gameMode.tiles[this.gameMode.tileMap[y][x]];
        this.delay = javaInt(javaFloat(this.gameMode.player.x - this.x)) >> 3;
        if (this.delay < 0) {
            this.delay = -this.delay;
        }
        this.delay++;
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
            if (--this.delay === 0) {
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
            this.main.drawCenteredScaled(this.sprite!, this.x, this.y, this.scale);
        }
    }
}
