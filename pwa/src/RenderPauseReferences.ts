// Verification-only pre-guard render references from 9719c8e; never imported by gameplay.
import { EnemySoldier } from "./jackal/EnemySoldier.js";
import { BossHelicopter } from "./jackal/BossHelicopter.js";

export function referenceEnemySoldier(this: EnemySoldier): void {
    if (--this.blink < 0) {
        this.blink = 4;
    }
    if (this.fire) {
        this.main.drawImage(
            (this.inSwamp ? this.main.swampSoldiers : this.main.enemySoldiers)[
                this.blink < 2 && this.state === EnemySoldier.STATE_AIMING && this.aiming <= EnemySoldier.AIM_BLINKING ? 0 : 1
            ][this.orientation + this.legIndex],
            this.x + this.wobbleX - 16,
            this.y + this.wobbleY - 54
        );
    } else {
        this.main.drawImage(
            (this.inSwamp ? this.main.swampSoldiers : this.main.enemySoldiers)[
                this.blink < 2 && this.state === EnemySoldier.STATE_AIMING && this.aiming <= EnemySoldier.AIM_BLINKING ? 1 : 0
            ][this.orientation + this.legIndex],
            this.x + this.wobbleX - 16,
            this.y + this.wobbleY - 54
        );
    }
}

export function referenceBossHelicopter(this: BossHelicopter): void {
    this.rotorAngle -= 30;
    if (this.rotorAngle === -90) {
        this.rotorAngle = 0;
    }
    this.tailIndexCounter = !this.tailIndexCounter;
    if (this.tailIndexCounter) {
        this.tailIndex = this.tailIndex === 3 ? 4 : 3;
    }

    let ang = this.angle - BossHelicopter.DRIFT_ANGLES[this.positionDriftTime] * this.positionDriftDx;

    this.main.drawRotatedAtCenter(this.main.bossHelicopters[5], this.x + 64, this.y + 64, -18, -65, ang);
    this.main.drawRotatedAtCenter(this.main.bossHelicopters[0], this.x, this.y, -64, -232, ang);
    this.main.drawRotatedAtCenter(this.main.bossHelicopters[1], this.x, this.y, 0, -232, ang);
    this.main.drawRotatedAtCenter(this.main.bossHelicopters[this.tailIndex], this.x, this.y, -16, -224, ang);
    for (let i = 0; i < 4; i++) {
        this.main.drawRotatedAtCenter(this.main.bossHelicopters[2], this.x, this.y, 0, -32, 90 * i + this.rotorAngle);
    }
}
