import { javaFloat } from "./JavaRuntime.js";

/**
 * Cycle-safe access to the values that Java exposes as static fields on Main.
 * Main aliases these fields so the translated API remains recognizable while
 * every module reads the same underlying values.
 */
export class MainConstants {
    public static readonly DISPLAY_WIDTH: number = 1024;
    public static readonly DISPLAY_HEIGHT: number = 960;

    public static readonly FONT_WHITE: number = 0;
    public static readonly FONT_GRAY: number = 1;
    public static readonly FONT_ORANGE: number = 2;
    public static readonly FONT_ORANGE_GRAY: number = 3;

    public static readonly ISQRT2: number = javaFloat(1.0 / Math.sqrt(2));
    public static readonly I_QUARTER_WIDTH: number = javaFloat(4 / MainConstants.DISPLAY_WIDTH);
    public static readonly I_WIDTH: number = javaFloat(1 / MainConstants.DISPLAY_WIDTH);
    public static readonly MINIMUM_SOUND_TIME: number = 125;

    public static readonly CHARS: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ.,'-0123456789\u00a9!:()&`\" ";
    public static readonly TILES: readonly number[] = [218, 235, 273, 233, 328, 330];
}
