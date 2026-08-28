import { MainConstants } from "../java/MainConstants.js";
import { BossStatue } from "./BossStatue.js";
import { BrownTank } from "./BrownTank.js";
import { GameElement } from "./GameElement.js";
import type { ICameraPanListener } from "./ICameraPanListener.js";
import type { ITankTracker } from "./ITankTracker.js";
import { javaFloat } from "../java/JavaRuntime.js";

export class BossStatuesManager extends GameElement implements ICameraPanListener, ITankTracker {
    declare public ready: boolean;
    declare public tanks: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.ready = false;
        this.brownTankDelay = 0;
        this.statues = 0;
        this.tanks = 0;
    }

    public constructor() {
        super();
        const argCount = arguments.length;
        this.__construct_BossStatuesManager(argCount);
    }

    private __construct_BossStatuesManager(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly MAX_TANKS: number = 5;

    public brownTankDelay: number = 3 * 91;
    public statues: number = 4;

    public init(): void {
        this.gameMode.startBossCameraPan(this);
    }

    public statueDestroyed(): void {
        if (--this.statues == 0) {
            this.gameMode.destroyAll();
            this.gameMode.stageCompleted();
        }
    }

    public panComplete(): void {
        this.ready = true;
        new BossStatue(704, 64, 136, this);
        new BossStatue(864, 64, 45, this);
        new BossStatue(1024, 64, 91, this);
        new BossStatue(1184, 64, 0, this);
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

        if (this.statues > 0 && --this.brownTankDelay < 0) {
            if (this.tanks >= BossStatuesManager.MAX_TANKS) {
                this.brownTankDelay = 91;
            } else {
                this.brownTankDelay = 10 * 91;
                let xLocal = javaFloat(this.gameMode.cameraX + this.main.random.nextInt(MainConstants.DISPLAY_WIDTH));
                if (xLocal < 352) {
                    xLocal = 352;
                } else if (xLocal > 1760) {
                    xLocal = 1760;
                }
                new BrownTank(javaFloat(xLocal), javaFloat(MainConstants.DISPLAY_HEIGHT + 48), this);
            }
        }
    }

    public render(): void {}
}
