import type { Image } from "slick2d-ts";

import { BulletHit } from "./BulletHit.js";
import { GameElement } from "./GameElement.js";
import type { Player } from "./Player.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class EnemyBullet extends GameElement {
    declare public travelTime: number;
    declare public vx: number;
    declare public vy: number;
    declare public sprite: Image | null;
    declare public player: Player | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.travelTime = 0;
        this.vx = 0;
        this.vy = 0;
        this.sprite = null;
        this.player = null;
    }

    public constructor(x: number, y: number, dx: number, dy: number, travelTime: number);
    public constructor(x: number, y: number, dx: number, dy: number, travelTime: number, white: boolean);
    public constructor(x: number, y: number, dx: number, dy: number, travelTime: number, white: boolean, multiplySpeed: boolean);
    public constructor(arg0?: number, arg1?: number, arg2?: number, arg3?: number, arg4?: number, arg5?: boolean, arg6?: boolean) {
        super();
        const argCount = arguments.length;
        this.__construct_EnemyBullet(argCount, arg0, arg1, arg2, arg3, arg4, arg5, arg6);
    }

    private __construct_EnemyBullet(
        argCount: number,
        arg0?: number,
        arg1?: number,
        arg2?: number,
        arg3?: number,
        arg4?: number,
        arg5?: boolean,
        arg6?: boolean
    ): void {
        if (
            argCount === 5 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "number" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number"
        ) {
            let xLocal3 = javaFloat(arg0);
            let yLocal3 = javaFloat(arg1);
            let dx = arg2;
            let dy = arg3;
            let travelTimeLocal3 = arg4;
            this.x = xLocal3;
            this.y = yLocal3;
            this.vx = javaFloat(EnemyBullet.SPEED * dx);
            this.vy = javaFloat(EnemyBullet.SPEED * dy);
            this.travelTime = travelTimeLocal3;
            this.sprite = this.main.cannonball;

            this.enemyBullet = true;
            return;
        } else if (
            argCount === 6 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "number" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number" &&
            typeof arg5 === "boolean"
        ) {
            let xLocal2 = javaFloat(arg0);
            let yLocal2 = javaFloat(arg1);
            let dx = arg2;
            let dy = arg3;
            let travelTimeLocal2 = arg4;
            let white = arg5;
            this.x = xLocal2;
            this.y = yLocal2;
            this.vx = javaFloat(EnemyBullet.SPEED * dx);
            this.vy = javaFloat(EnemyBullet.SPEED * dy);
            this.travelTime = travelTimeLocal2;
            this.sprite = white ? this.main.whiteBullet : this.main.yellowBullet;

            this.enemyBullet = true;
            return;
        } else if (
            argCount === 7 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "number" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number" &&
            typeof arg5 === "boolean" &&
            typeof arg6 === "boolean"
        ) {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let dx = arg2;
            let dy = arg3;
            let travelTimeLocal = arg4;
            let white = arg5;
            let multiplySpeed = arg6;
            this.x = xLocal;
            this.y = yLocal;
            if (multiplySpeed) {
                this.vx = javaFloat(EnemyBullet.SPEED * dx);
                this.vy = javaFloat(EnemyBullet.SPEED * dy);
            } else {
                this.vx = javaFloat(dx);
                this.vy = javaFloat(dy);
            }
            this.travelTime = travelTimeLocal;
            this.sprite = white ? this.main.whiteBullet : this.main.yellowBullet;

            this.enemyBullet = true;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly SPEED: number = 2.5;

    public static readonly MARGIN: number = 16;

    public init(): void {
        this.layer = 4;

        this.player = this.gameMode.player;
    }

    public update(): void {
        this.x = javaFloat(this.x + this.vx);
        this.y = javaFloat(this.y + this.vy);

        if (
            this.gameMode.isOutsideOfFrame(
                javaFloat(this.x - EnemyBullet.MARGIN),
                javaFloat(this.y - EnemyBullet.MARGIN),
                javaFloat(this.x + EnemyBullet.MARGIN),
                javaFloat(this.y + EnemyBullet.MARGIN)
            )
        ) {
            this.remove();
        } else if (--this.travelTime < 0 || this.gameMode.isSolid(this.x, this.y) || this.player!.attack(this.x, this.y)) {
            this.remove();
            new BulletHit(this.x, this.y);
        }
    }

    public render(): void {
        this.main.drawCentered(this.sprite!, this.x, this.y);
    }
}
