import { javaFloat, ArrayList } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { BossShipGun } from "./BossShipGun.js";
import { BrownTank } from "./BrownTank.js";
import { GameElement } from "./GameElement.js";
import type { ICameraPanListener } from "./ICameraPanListener.js";
import type { ITankTracker } from "./ITankTracker.js";
export class BossShipManager extends GameElement implements ICameraPanListener, ITankTracker {
    declare public ready: boolean;
    declare public gunIndex: number;
    declare public tanks: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.ready = false;
        this.brownTankDelay = 0;
        this.shipGuns = null!;
        this.gunIndex = 0;
        this.triggerDelay = 0;
        this.tanks = 0;
    }

    public constructor() {
        super();

        this.shipGuns.add(new BossShipGun(javaFloat(36 << 5), javaFloat(8 << 5), this));
        this.shipGuns.add(new BossShipGun(javaFloat(28 << 5), javaFloat(10 << 5), this));
        this.shipGuns.add(new BossShipGun(javaFloat(28 << 5), javaFloat(6 << 5), this));
        this.shipGuns.add(new BossShipGun(javaFloat(22 << 5), javaFloat(10 << 5), this));
        this.shipGuns.add(new BossShipGun(javaFloat(22 << 5), javaFloat(6 << 5), this));
        this.shipGuns.add(new BossShipGun(javaFloat(13 << 5), javaFloat(8 << 5), this));
    }

    public static readonly MAX_TANKS: number = 5;
    public static readonly TRIGGER_DELAY: number = 4 * 91;

    public brownTankDelay: number = 45;
    public shipGuns: ArrayList<BossShipGun> = new ArrayList<BossShipGun>();

    public triggerDelay: number = 1;

    public init(): void {
        this.gameMode.startBossCameraPan(this);
    }

    public panComplete(): void {
        this.ready = true;
    }

    public tankCreated(): void {
        this.tanks++;
    }

    public tankDestroyed(): void {
        this.tanks--;
    }

    public update(): void {
        if (!this.ready) {
            return;
        }

        if (--this.triggerDelay === 0) {
            this.triggerGuns();
            this.triggerDelay = BossShipManager.TRIGGER_DELAY;
        }

        if (!this.shipGuns.isEmpty() && --this.brownTankDelay < 0) {
            if (this.tanks >= BossShipManager.MAX_TANKS) {
                this.brownTankDelay = 91;
            } else {
                this.brownTankDelay = 10 * 91;
                let xLocal = javaFloat(this.gameMode.cameraX + this.main.random.nextInt(MainConstants.DISPLAY_WIDTH));
                if (xLocal < 320) {
                    xLocal = 320;
                } else if (xLocal > 1472) {
                    xLocal = 1472;
                }
                BrownTank.withTracker(javaFloat(xLocal), javaFloat(MainConstants.DISPLAY_HEIGHT + 48), this);
            }
        }
    }

    private triggerGuns(): void {
        if (this.shipGuns.isEmpty()) {
            return;
        }
        let count = 0;
        for (let i = this.shipGuns.size() - 1; i >= 0 && count < 2; i--, this.gunIndex++) {
            if (this.gunIndex >= this.shipGuns.size()) {
                this.gunIndex = 0;
            }
            let shipGun = this.shipGuns.get(this.gunIndex);
            if (shipGun.isOpenable()) {
                shipGun.open(23 * count);
                count++;
            }
        }
    }

    public gunDestroyed(bossShipGun: BossShipGun): void {
        this.shipGuns.removeValue(bossShipGun);
        if (this.shipGuns.isEmpty()) {
            this.gameMode.destroyAll();
            this.gameMode.stageCompleted();
        }
    }

    public render(): void {}
}
