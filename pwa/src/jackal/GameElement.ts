import { MainRuntimeState } from "./MainRuntimeState.js";
import type { GameMode } from "./GameMode.js";
import type { Main } from "./Main.js";
export abstract class GameElement {
    /**
     * Java zero-initializes the complete derived object before a superclass constructor runs.
     * Subclasses use no-emit `declare` fields plus this hook to reproduce that ordering before
     * the virtual init() call below. Do not replace those declarations with field initializers.
     */
    protected __initializeJavaSubclassDefaults(): void {}
    public constructor() {
        const argCount = arguments.length;
        this.__construct_GameElement(argCount);
    }

    private __construct_GameElement(argCount: number): void {
        if (argCount === 0) {
            this.main = MainRuntimeState.mainInstance;
            this.gameMode = MainRuntimeState.gameMode;

            this.__initializeJavaSubclassDefaults();
            this.init();

            this.gameMode.add(this);
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    public main: Main = null;
    public gameMode: GameMode = null;

    public removeFlag: boolean = false;
    public enemy: boolean = false;
    public enemyBullet: boolean = false;
    public x: number = 0;
    public y: number = 0;
    public layer: number = 0;
    public changeLayerValue: number = -1;

    public changeLayer(layer: number): void {
        this.changeLayerValue = layer;
    }

    public remove(): void {
        this.removeFlag = true;
    }

    public checkBounds(maxY: number): void {}

    public abstract init(): void;
    public abstract update(): void;
    public abstract render(): void;
}
