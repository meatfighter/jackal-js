import { Enemy } from "./Enemy.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class Star extends Enemy {
    declare public type: number;
    declare public flashingIndex: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.type = 0;
        this.flashingIndex = 0;
    }

    public constructor(x: number, y: number, type: number) {
        super();

        x = javaFloat(x);
        y = javaFloat(y);

        this.x = x;
        this.y = y;
        this.type = type;
    }

    public static readonly SPRITE_BROWN: number = 0;
    public static readonly SPRITE_GRAY: number = 1;
    public static readonly SPRITE_GREEN: number = 2;
    public static readonly SPRITE_YELLOW: number = 3;

    public static readonly TYPE_BROWN: number = 0;
    public static readonly TYPE_FLASHING: number = 1;
    public static readonly TYPE_GREEN: number = 2;

    public override init(): void {
        super.init();

        this.layer = 0;

        this.hitX1 = -32;
        this.hitY1 = -32;
        this.hitX2 = 32;
        this.hitY2 = 32;

        this.mine = true;
        this.mineX1 = -8;
        this.mineY1 = -8;
        this.mineX2 = 8;
        this.mineY2 = 8;

        this.solid = true;
        this.solidX1 = -32;
        this.solidY1 = -32;
        this.solidX2 = 32;
        this.solidY2 = 32;
    }

    // returns true if player bumped into the enemy

    public override bump(x1: number, y1: number, x2: number, y2: number, invincible: boolean): boolean {
        if (this.isMineBounds(x1, y1, x2, y2)) {
            this.playSoundOnRemove = false;
            this.remove();
            switch (this.type) {
                case Star.TYPE_BROWN:
                    this.main.playHitExplodeSound();
                    this.gameMode.destroyAllWithinFrame();
                    break;
                case Star.TYPE_FLASHING:
                    this.gameMode.player.collectFlashingStar();
                    break;
                case Star.TYPE_GREEN:
                    this.main.gainExtraLife();
                    break;
            }
        }
        return false;
    }

    // returns true if attack successful

    public override attack(x1: number, y1: number, x2: number, y2: number, attackSource: number): boolean {
        return false;
    }

    // returns true if player bullet was absorbed by enemy

    public override bulletAttack(x1: number, y1: number, x2: number, y2: number): boolean {
        return false;
    }

    public update(): void {}

    public render(): void {
        switch (this.type) {
            case Star.TYPE_BROWN:
                this.main.drawImage(this.main.stars[Star.SPRITE_BROWN], this.x - 32, this.y - 32);
                break;
            case Star.TYPE_GREEN:
                this.main.drawImage(this.main.stars[Star.SPRITE_GREEN], this.x - 32, this.y - 32);
                break;
            case Star.TYPE_FLASHING:
                this.main.drawImage(this.main.stars[this.flashingIndex], this.x - 32, this.y - 32);
                if (--this.flashingIndex < 0) {
                    this.flashingIndex = 3;
                }
                break;
        }
    }
}
