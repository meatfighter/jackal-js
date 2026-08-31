import type { IInput } from "./IInput.js";
import type { Main } from "./Main.js";
export enum KonamiCodeKeys {
    UP,
    DOWN,
    LEFT,
    RIGHT,
    GRENADE,
    GUN
}
export class KonamiCode {
    public constructor(main: Main) {
        this.main = main;
        this.input = main.input;
    }

    // Try the following sequence on the title screen :)

    private static readonly SEQUENCE: KonamiCodeKeys[] = [
        KonamiCodeKeys.UP,
        KonamiCodeKeys.UP,
        KonamiCodeKeys.DOWN,
        KonamiCodeKeys.DOWN,
        KonamiCodeKeys.LEFT,
        KonamiCodeKeys.RIGHT,
        KonamiCodeKeys.LEFT,
        KonamiCodeKeys.RIGHT,
        KonamiCodeKeys.GUN,
        KonamiCodeKeys.GRENADE
    ];

    public enabled: boolean = false;
    public keyReleased: boolean = false;
    public main: Main = null!;
    public input: IInput = null!;
    public sequenceIndex: number = 0;

    public gettingClose(): boolean {
        return (
            !this.enabled &&
            (KonamiCode.SEQUENCE[this.sequenceIndex] === KonamiCodeKeys.GRENADE || KonamiCode.SEQUENCE[this.sequenceIndex] === KonamiCodeKeys.GUN)
        );
    }

    public update(): void {
        if (!(this.input.isDown() || this.input.isUp() || this.input.isLeft() || this.input.isRight() || this.input.isShoot() || this.input.isFire())) {
            this.keyReleased = true;
        }

        if (this.enabled) {
            return;
        }

        if (this.keyReleased) {
            let key = null;
            if (this.input.isUp()) {
                this.keyReleased = false;
                key = KonamiCodeKeys.UP;
            } else if (this.input.isDown()) {
                this.keyReleased = false;
                key = KonamiCodeKeys.DOWN;
            } else if (this.input.isLeft()) {
                this.keyReleased = false;
                key = KonamiCodeKeys.LEFT;
            } else if (this.input.isRight()) {
                this.keyReleased = false;
                key = KonamiCodeKeys.RIGHT;
            } else if (this.input.isFire()) {
                this.keyReleased = false;
                key = KonamiCodeKeys.GRENADE;
            } else if (this.input.isShoot()) {
                this.keyReleased = false;
                key = KonamiCodeKeys.GUN;
            }

            if (key === KonamiCode.SEQUENCE[this.sequenceIndex]) {
                if (++this.sequenceIndex === KonamiCode.SEQUENCE.length) {
                    this.main.playSoundAlways(this.main.weaponUpgradeSound);
                    this.enabled = true;
                }
            } else if (key !== null) {
                this.sequenceIndex = 0;
            }
        }
    }
}
