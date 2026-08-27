import {
    AppGameContainer,
    ApplicationGameContainer,
    BasicGame,
    Color,
    Cursor,
    Display,
    GameContainer,
    GL11,
    Graphics,
    Image,
    Input,
    Log,
    Music,
    Mouse,
    ResourceLoader,
    ScalableGame,
    SlickException,
    Sound,
    SoundStore,
    Sys,
    XMLPackedSheet
} from "slick2d-ts";
import {
    ArrayList,
    Arrays,
    BufferedInputStream,
    Character,
    Class,
    Collections,
    DataInputStream,
    HashMap,
    Integer,
    JAVA_LONG_LOW_3_BITS,
    JAVA_LONG_PACKED_3BIT_SHIFTS,
    JavaString,
    Point2D,
    Random,
    System,
    java2DArray,
    java3DArray,
    java4DArray,
    javaArray,
    javaByte,
    javaChar,
    javaDouble,
    javaFloat,
    javaInt,
    javaIntDiv,
    javaLong,
    javaRoundFloat,
    javaShort,
    rotatePoint
} from "../java/JavaRuntime.js";
import { AttackSource } from "./AttackSource.js";
import { ElephantMissile } from "./ElephantMissile.js";
import { Enemy } from "./Enemy.js";
import { Explosion } from "./Explosion.js";
import type { Player } from "./Player.js";
export class ElephantGun extends Enemy {
    declare public destroyed: boolean;
    declare public state: number;
    declare public delay: number;
    declare public targetDirection: number;
    declare public fireballX: number;
    declare public fireballY: number;
    declare public fireballVx: number;
    declare public left: boolean;
    declare public hits: number;
    declare public player: Player | null;

    protected __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.spriteIndex = 0;
        this.destroyed = false;
        this.state = 0;
        this.delay = 0;
        this.targetDirection = 0;
        this.asters = null;
        this.fireballX = 0;
        this.fireballY = 0;
        this.fireballVx = 0;
        this.left = false;
        this.hits = 0;
        this.player = null;
    }

    public constructor(arg0?: any, arg1?: any, arg2?: any) {
        super();
        const argCount = arguments.length;
        this.__construct_ElephantGun(argCount, arg0, arg1, arg2);
    }

    private __construct_ElephantGun(argCount: number, arg0?: any, arg1?: any, arg2?: any): void {
        if (argCount === 3 && typeof arg0 === "number" && typeof arg1 === "number" && typeof arg2 === "boolean") {
            let xLocal = arg0;
            let yLocal = arg1;
            let leftLocal = arg2;
            this.x = xLocal;
            this.y = yLocal;
            this.left = leftLocal;

            this.startAiming();
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly SPRITE_LEFT: number = 0;
    public static readonly SPRITE_CENTER: number = 1;
    public static readonly SPRITE_RIGHT: number = 2;
    public static readonly SPRITE_DESTROYED: number = 3;

    public static readonly STATE_AIMING: number = 0;
    public static readonly STATE_ASTERING: number = 1;
    public static readonly STATE_NOSE: number = 2;
    public static readonly STATE_DESTROYED: number = 3;

    public static readonly AIM_DELAY: number = 45;
    public static readonly ASTER_DELAY: number = 23;
    public static readonly NOSE_DELAY: number = 8;

    public static readonly ASTER_SPINES: number = 5;
    public static readonly ASTER_RADIUS: number = 128;
    public static readonly ASTER_MAX_OFFSET_ANGLE: number = javaFloat((2 * Math.PI) / ElephantGun.ASTER_SPINES);
    public static readonly INVERSE_ASTER_DELAY: number = 1 / javaFloat(ElephantGun.ASTER_DELAY);
    public static readonly FIREBALL_SPEED: number = 6;

    public static readonly HITS: number = 3;

    public spriteIndex: number = ElephantGun.SPRITE_CENTER;

    public asters: number[][] = java2DArray(ElephantGun.ASTER_SPINES, 2, 0);

    public init(): void {
        super.init();

        this.player = this.gameMode.player;

        this.layer = 2;

        this.hitX1 = 8;
        this.hitY1 = 8;
        this.hitX2 = 88;
        this.hitY2 = 88;

        this.explosionX = 48;
        this.explosionY = 48;

        this.points = 3000;
    }

    private startAstering(): void {
        this.state = ElephantGun.STATE_ASTERING;
        this.delay = ElephantGun.ASTER_DELAY;
        let offsetAngle = ElephantGun.ASTER_MAX_OFFSET_ANGLE * this.main.random.nextFloat();
        for (let i = 0; i < ElephantGun.ASTER_SPINES; i++) {
            this.asters[i][0] = javaFloat(Math.cos(offsetAngle + ElephantGun.ASTER_MAX_OFFSET_ANGLE * i));
            this.asters[i][1] = javaFloat(Math.sin(offsetAngle + ElephantGun.ASTER_MAX_OFFSET_ANGLE * i));
        }
    }

    private startNosing(): void {
        this.state = ElephantGun.STATE_NOSE;
        this.delay = ElephantGun.NOSE_DELAY;
        this.fireballVx = ElephantGun.FIREBALL_SPEED * (this.spriteIndex - 1);
        this.fireballX = this.x + 48;
        this.fireballY = this.y + 36;
    }

    private startAiming(): void {
        this.state = ElephantGun.STATE_AIMING;
        this.delay = 8 + this.main.random.nextInt(2 * ElephantGun.AIM_DELAY);
        this.targetDirection = this.main.random.nextInt(3);
    }

    private fire(): void {
        switch (this.spriteIndex) {
            case 0:
                new ElephantMissile(this.x + 4, this.y + 81, 135, this.left);
                break;
            case 1:
                new ElephantMissile(this.x + 48, this.y + 86, 90, this.left);
                break;
            case 2:
                new ElephantMissile(this.x + 93, this.y + 81, 45, this.left);
                break;
        }
    }

    public update(): void {
        if (this.main.hasMissiles) {
            this.hitY2 = 88;
        } else {
            this.hitY2 = 128;
        }

        switch (this.state) {
            case ElephantGun.STATE_AIMING:
                if (--this.delay == 0) {
                    if (this.spriteIndex < this.targetDirection) {
                        this.spriteIndex++;
                        this.delay = ElephantGun.AIM_DELAY;
                    } else if (this.spriteIndex > this.targetDirection) {
                        this.spriteIndex--;
                        this.delay = ElephantGun.AIM_DELAY;
                    } else {
                        this.startAstering();
                    }
                }
                break;
            case ElephantGun.STATE_ASTERING:
                if (--this.delay == 0) {
                    this.startNosing();
                }
                break;
            case ElephantGun.STATE_NOSE:
                this.fireballX += this.fireballVx;
                if (this.spriteIndex == 1) {
                    this.fireballY += ElephantGun.FIREBALL_SPEED + 2;
                } else {
                    this.fireballY += ElephantGun.FIREBALL_SPEED;
                }
                if (--this.delay == 0) {
                    this.fire();
                    this.startAiming();
                }
                break;
        }
    }

    // returns true if attack successful
    public attack(x1: any, y1: any, x2: any, y2: any, attackSource: any): boolean {
        if (this.state != ElephantGun.STATE_DESTROYED && attackSource == AttackSource.PLAYER_WEAPON && this.hit(x1, y1, x2, y2)) {
            this.main.playHitExplodeSound();
            if (++this.hits == ElephantGun.HITS) {
                new Explosion(this.x + this.explosionX, this.y + this.explosionY);
                this.main.addPoints(this.points);
                this.state = ElephantGun.STATE_DESTROYED;
                this.spriteIndex = ElephantGun.SPRITE_DESTROYED;
            } else {
                for (let i = 0; i < 3; i++) {
                    let Y = this.y + 76 - (i << 5);
                    for (let j = 0; j < 3; j++) {
                        new Explosion(this.x + (j << 5) + 12 + this.main.random.nextInt(8), Y + this.main.random.nextInt(8), true, (i + 1) * 4, 0.5);
                    }
                }
            }
            return true;
        } else {
            return false;
        }
    }

    // returns true if player bullet was absorbed by enemy
    public bulletAttack(x1: any, y1: any, x2: any, y2: any): boolean {
        if (this.state != ElephantGun.STATE_DESTROYED && this.hit(x1, y1, x2, y2)) {
            return true;
        } else {
            return false;
        }
    }

    public render(): void {
        let yOffset = 0;
        if (this.spriteIndex == 0 || this.spriteIndex == 2) {
            yOffset = 4;
        }
        this.main.draw(this.main.elephantGuns[this.spriteIndex], this.x, this.y - yOffset);
        switch (this.state) {
            case ElephantGun.STATE_ASTERING: {
                let mag = this.delay * ElephantGun.INVERSE_ASTER_DELAY;
                let scale = 1 - mag;
                mag *= ElephantGun.ASTER_RADIUS;
                for (let i = 0; i < ElephantGun.ASTER_SPINES; i++) {
                    this.main.drawCentered(
                        this.main.elephantGuns[4],
                        this.x + 48 + mag * this.asters[i][0],
                        this.y + 36 + mag * this.asters[i][1] - yOffset,
                        scale,
                        scale
                    );
                }
                break;
            }
            case ElephantGun.STATE_NOSE:
                switch (this.spriteIndex) {
                    case 0:
                        this.main.draw(this.main.elephantGuns[7], this.x - 4, this.y + 48 - yOffset);
                        break;
                    case 1:
                        this.main.draw(this.main.elephantGuns[5], this.x + 36, this.y + 60 - yOffset);
                        break;
                    case 2:
                        this.main.draw(this.main.elephantGuns[6], this.x + 60, this.y + 48 - yOffset);
                        break;
                }
                this.main.drawCentered(this.main.elephantGuns[4], this.fireballX, this.fireballY - yOffset);
                break;
        }
    }
}
