import { GameElement } from "./GameElement.js";
import { Player } from "./Player.js";
import type { Chinook } from "./Chinook.js";
export class IntroPlayer extends GameElement {
    declare public chinook: Chinook | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.angle = 0;
        this.state = 0;
        this.delay = 0;
        this.chinook = null;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: Chinook) {
        super();
        const argCount = arguments.length;
        this.__construct_IntroPlayer(argCount, arg0, arg1, arg2);
    }

    private __construct_IntroPlayer(argCount: number, arg0?: number, arg1?: number, arg2?: Chinook): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number") {
            let xLocal = arg0;
            let yLocal = arg1;
            let chinookLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.chinook = chinookLocal!;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_DIAGONAL: number = 0;
    public static readonly STATE_REVERSE: number = 1;
    public static readonly STATE_PAUSED: number = 2;

    public static readonly DIAGONAL_TIME: number = 75;
    public static readonly REVERSE_TIME: number = 11;

    public static readonly FINAL_X: number = 328.5;
    public static readonly FINAL_Y: number = 11074;

    public angle: number = -45;
    public state: number = IntroPlayer.STATE_DIAGONAL;
    public delay: number = IntroPlayer.DIAGONAL_TIME;

    public init(): void {
        this.layer = 3;
    }

    public update(): void {
        switch (this.state) {
            case IntroPlayer.STATE_DIAGONAL:
                this.x -= Player.SPEED;
                this.y += Player.SPEED;
                if (--this.delay == 0) {
                    this.state = IntroPlayer.STATE_REVERSE;
                    this.delay = IntroPlayer.REVERSE_TIME;
                }
                break;
            case IntroPlayer.STATE_REVERSE:
                if (this.angle > -90) {
                    this.angle -= Player.ANGLE_VELOCITY;
                } else {
                    this.angle = -90;
                }
                if (--this.delay == 0) {
                    this.state = IntroPlayer.STATE_PAUSED;
                    this.x = IntroPlayer.FINAL_X;
                    this.y = IntroPlayer.FINAL_Y;
                    this.chinook!.unloadCompleted();
                }
                break;
        }
    }

    public render(): void {
        this.main.drawVehicle(this.main.players[0], this.x, this.y + Player.RUMBLE[0], this.angle);
    }
}
