import { Flame } from "./Flame.js";
import { GameElement } from "./GameElement.js";
import type { Enemy } from "./Enemy.js";
import type { Player } from "./Player.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Fire extends GameElement {
    declare public vx: number;
    declare public vy: number;
    declare public dx: number;
    declare public dy: number;
    declare public length: number;
    declare public angle: number;
    declare public delay: number;
    declare public flickerCounter: number;
    declare public flickerIndex: number;
    declare public player: Player | null;
    // Java declares an Enemy-valued `enemy` field here while GameElement already has
    // `enemy: boolean`. Java field hiding keeps both slots; JavaScript needs distinct keys.
    declare public sourceEnemy: Enemy | null;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.vx = 0;
        this.vy = 0;
        this.dx = 0;
        this.dy = 0;
        this.length = 0;
        this.angle = 0;
        this.state = 0;
        this.delay = 0;
        this.flickerCounter = 0;
        this.flickerIndex = 0;
        this.alpha = 0;
        this.player = null;
        this.sourceEnemy = null;
    }

    public constructor(arg0?: number, arg1?: number, arg2?: number, arg3?: number, arg4?: number, arg5?: Enemy) {
        super();
        const argCount = arguments.length;
        this.__construct_Fire(argCount, arg0, arg1, arg2, arg3, arg4, arg5);
    }

    private __construct_Fire(argCount: number, arg0?: number, arg1?: number, arg2?: number, arg3?: number, arg4?: number, arg5?: Enemy): void {
        if (
            argCount === 6 &&
            typeof arg0 === "number" &&
            typeof arg1 === "number" &&
            typeof arg2 === "number" &&
            typeof arg3 === "number" &&
            typeof arg4 === "number"
        ) {
            let xLocal = javaFloat(arg0);
            let yLocal = javaFloat(arg1);
            let vxLocal = javaFloat(arg2);
            let vyLocal = javaFloat(arg3);
            let angleLocal = javaFloat(arg4);
            let enemyLocal = arg5;
            this.x = xLocal;
            this.y = yLocal;
            this.dx = vxLocal;
            this.dy = vyLocal;
            this.vx = javaFloat(Fire.SPEED * vxLocal);
            this.vy = javaFloat(Fire.SPEED * vyLocal);
            this.angle = angleLocal;
            this.sourceEnemy = enemyLocal!;

            this.enemyBullet = true;
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly STATE_GROWING: number = 0;
    public static readonly STATE_TRAVELING: number = 1;
    public static readonly STATE_SHRINKING: number = 2;

    public static readonly SPEED: number = 3;
    public static readonly MAX_LENGTH: number = 128;
    public static readonly TRAVEL_TIME: number = 60;

    public state: number = Fire.STATE_GROWING;

    public alpha: number = 1;

    public init(): void {
        this.layer = 4;
        this.player = this.gameMode.player;
    }

    public update(): void {
        switch (this.state) {
            case Fire.STATE_GROWING: {
                this.length = javaFloat(this.length + Fire.SPEED);
                if (this.length >= Fire.MAX_LENGTH || this.sourceEnemy!.removeFlag) {
                    this.state = Fire.STATE_TRAVELING;
                    this.delay = Fire.TRAVEL_TIME;
                }
                for (let i = 0; i <= 5; i++) {
                    let mag = javaFloat(javaFloat(javaFloat(0.2) * i) * this.length);
                    this.player!.attack(javaFloat(this.x + javaFloat(mag * this.dx)), javaFloat(this.y + javaFloat(mag * this.dy)));
                }
                break;
            }
            case Fire.STATE_TRAVELING:
                this.x = javaFloat(this.x + this.vx);
                this.y = javaFloat(this.y + this.vy);
                if (--this.delay == 0) {
                    this.state = Fire.STATE_SHRINKING;
                    this.x = javaFloat(this.x + javaFloat(this.dx * this.length));
                    this.y = javaFloat(this.y + javaFloat(this.dy * this.length));
                    new Flame(this.x, this.y);
                } else {
                    for (let i = 0; i <= 5; i++) {
                        let mag = javaFloat(javaFloat(javaFloat(0.2) * i) * this.length);
                        this.player!.attack(javaFloat(this.x + javaFloat(mag * this.dx)), javaFloat(this.y + javaFloat(mag * this.dy)));
                    }
                }
                break;
            case Fire.STATE_SHRINKING:
                this.alpha = javaFloat(this.alpha * javaFloat(0.98));
                this.length = javaFloat(this.length - Fire.SPEED);
                if (this.length <= 0) {
                    this.remove();
                }
                for (let i = 0; i <= 5; i++) {
                    let mag = javaFloat(javaFloat(-javaFloat(0.2) * i) * this.length);
                    this.player!.attack(javaFloat(this.x + javaFloat(mag * this.dx)), javaFloat(this.y + javaFloat(mag * this.dy)));
                }
                break;
        }
    }

    public render(): void {
        if (++this.flickerCounter == 4) {
            this.flickerIndex ^= 1;
            this.flickerCounter = 0;
        }
        let index = 0;
        let scale = 1;
        if (this.length < 96) {
            scale = this.length * 0.015625;
        } else {
            index = 1;
            scale = this.length * 0.0078125;
        }
        if (this.state == Fire.STATE_SHRINKING) {
            scale = -scale;
        }
        this.main.drawRotatedScaled(this.main.fires[this.flickerIndex][index], this.x, this.y, 0, -8, this.angle, scale, 1, this.alpha);
    }
}
