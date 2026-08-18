export class MainConstants {
    public static readonly DISPLAY_WIDTH: number = 1024;
    public static readonly DISPLAY_HEIGHT: number = 960;

    public static readonly FONT_WHITE: number = 0;
    public static readonly FONT_GRAY: number = 1;
    public static readonly FONT_ORANGE: number = 2;
    public static readonly FONT_ORANGE_GRAY: number = 3;

    public static readonly ISQRT2: number = 1.0 / Math.sqrt(2);
    public static readonly I_QUARTER_WIDTH: number = 4 / MainConstants.DISPLAY_WIDTH;
    public static readonly I_WIDTH: number = 1 / MainConstants.DISPLAY_WIDTH;
    public static readonly MINIMUM_SOUND_TIME: number = 125;

    public static readonly CHARS: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ.,'-0123456789\u00a9!:()&`\" ";
    public static readonly TILES: number[] = [218, 235, 273, 233, 328, 330];
}
