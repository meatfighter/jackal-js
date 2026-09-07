import type { GameContainer, Graphics, Input } from "slick2d-ts";
import type { IInput } from "./IInput.js";
import type { Main } from "./Main.js";

export class KonamiCode {
    private static readonly SEQUENCE = [38, 38, 40, 40, 37, 39, 37, 39, 90, 88];

    private readonly main: Main;
    private sequenceIndex = 0;
    private keyReleased = true;
    private enabled = false;

    public constructor(main: Main) {
        this.main = main;
    }

    public update(_gc: GameContainer, input: IInput): void {
        if (!this.keyReleased) {
            this.keyReleased = !input.isUp() && !input.isDown() && !input.isLeft() && !input.isRight() && !input.isFire() && !input.isShoot();
            return;
        }

        let key = 0;
        if (input.isUp()) {
            key = 38;
        } else if (input.isDown()) {
            key = 40;
        } else if (input.isLeft()) {
            key = 37;
        } else if (input.isRight()) {
            key = 39;
        } else if (input.isShoot()) {
            key = 90;
        } else if (input.isFire()) {
            key = 88;
        }

        if (key === 0) {
            return;
        }

        this.keyReleased = false;
        if (key === KonamiCode.SEQUENCE[this.sequenceIndex]) {
            this.sequenceIndex++;
            if (this.sequenceIndex === KonamiCode.SEQUENCE.length) {
                input.clearKeyPressedRecord();
                this.main.playSoundAlways(this.main.weaponUpgradeSound);
                this.enabled = true;
            }
        } else {
            this.sequenceIndex = key === KonamiCode.SEQUENCE[0] ? 1 : 0;
        }
    }

    public isEnabled(): boolean {
        return this.enabled;
    }
}
