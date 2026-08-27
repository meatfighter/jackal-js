import { BossBlueTank } from "./BossBlueTank.js";
import { GameElement } from "./GameElement.js";
import type { ICameraPanListener } from "./ICameraPanListener.js";
export class BossBlueTanksManager extends GameElement implements ICameraPanListener {
    declare public ready: boolean;
    declare public spawned: number;
    declare public destroyed: number;

    protected override __initializeJavaSubclassDefaults(): void {
        super.__initializeJavaSubclassDefaults();
        this.ready = false;
        this.spawnDelay = 0;
        this.spawned = 0;
        this.destroyed = 0;
    }

    public constructor() {
        super();
        const argCount = arguments.length;
        this.__construct_BossBlueTanksManager(argCount);
    }

    private __construct_BossBlueTanksManager(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public static readonly SPAWN_DELAY: number = 3 * 91;
    public static readonly TANKS: number = 4;

    public spawnDelay: number = 91;

    public init(): void {
        this.gameMode.startBossCameraPan(this);
    }

    public panComplete(): void {
        this.ready = true;
    }

    public update(): void {
        if (!this.ready) {
            return;
        }

        if (this.spawned < BossBlueTanksManager.TANKS && --this.spawnDelay == 0) {
            this.spawned++;
            this.spawnDelay = BossBlueTanksManager.SPAWN_DELAY;
            let xLocal = this.main.random.nextBoolean() ? 640 : 1408;
            let yLocal = this.main.random.nextBoolean() ? -52 : 1012;
            new BossBlueTank(xLocal, yLocal, this);
        }
    }

    public blueTankDestroyed(): void {
        this.destroyed++;
        if (this.destroyed == BossBlueTanksManager.TANKS) {
            this.gameMode.destroyAll();
            this.gameMode.stageCompleted();
        }
    }

    public render(): void {}
}
