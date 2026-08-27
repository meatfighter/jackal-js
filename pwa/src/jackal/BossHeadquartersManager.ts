import { MainConstants } from "../java/MainConstants.js";
import { BossHeadquarters } from "./BossHeadquarters.js";
import { BrownTank } from "./BrownTank.js";
import { ElephantGun } from "./ElephantGun.js";
import { EnemyHelicopter } from "./EnemyHelicopter.js";
import { GameElement } from "./GameElement.js";
import type { ICameraPanListener } from "./ICameraPanListener.js";
import type { ITankTracker } from "./ITankTracker.js";
export class BossHeadquartersManager extends GameElement implements ICameraPanListener, ITankTracker {
    declare public ready: boolean;
    declare public createdEnemyHelicopter: boolean;
    declare public tanks: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.ready = false;
        this.createdEnemyHelicopter = false;
        this.tanks = 0;
        this.tankSpawnDelay = 0;
    }

    public constructor() {
        super();
        const argCount = arguments.length;
        this.__construct_BossHeadquartersManager(argCount);
    }

    private __construct_BossHeadquartersManager(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly MAX_TANKS: number = 5;
    public static readonly TANK_SPAWN_DELAY: number = 5 * 91;

    public tankSpawnDelay: number = BossHeadquartersManager.TANK_SPAWN_DELAY;

    public init(): void {
        this.gameMode.startBossCameraPan(this);

        new BossHeadquarters(this);
        new ElephantGun(792, 140, true);
        new ElephantGun(1160, 140, false);
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

        if (!this.createdEnemyHelicopter) {
            this.createdEnemyHelicopter = true;
            new EnemyHelicopter(true);
        }

        if (--this.tankSpawnDelay == 0) {
            if (this.tanks == BossHeadquartersManager.MAX_TANKS) {
                this.tankSpawnDelay = 45;
            } else {
                this.tankSpawnDelay = BossHeadquartersManager.TANK_SPAWN_DELAY;
                let brownTank = new BrownTank(256 + this.main.random.nextInt(1536), this.gameMode.cameraY + MainConstants.DISPLAY_HEIGHT + 48, this);
                brownTank.displayAngle = brownTank.targetAngle = 270;
            }
        }
    }

    public render(): void {}
}
