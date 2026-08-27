import { BossHelicopter } from "./BossHelicopter.js";
import { GameElement } from "./GameElement.js";
import type { ICameraPanListener } from "./ICameraPanListener.js";
export class BossHelicopterManager extends GameElement implements ICameraPanListener {
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
        this.__construct_BossHelicopterManager(argCount);
    }

    private __construct_BossHelicopterManager(argCount: number): void {
        if (argCount === 0) {
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public spawnDelay: number = 91;

    public init(): void {
        this.gameMode.startBossCameraPan(this);
    }

    public panComplete(): void {
        this.ready = true;
        new BossHelicopter();
    }

    public update(): void {
        if (!this.ready) {
            return;
        }
    }

    public render(): void {}
}
