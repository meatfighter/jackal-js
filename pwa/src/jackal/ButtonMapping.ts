import {
    AppGameContainer,
    ApplicationGameContainer,
    BasicGame,
    Color,
    Cursor,
    Display,
    GameContainer,
    GL11,
    Graphics,
    Image,
    Input,
    Log,
    Music,
    Mouse,
    ResourceLoader,
    ScalableGame,
    SlickException,
    Sound,
    SoundStore,
    Sys,
    XMLPackedSheet
} from "slick2d-ts";
import {
    ArrayList,
    Arrays,
    BufferedInputStream,
    Character,
    Class,
    Collections,
    DataInputStream,
    HashMap,
    Integer,
    JAVA_LONG_LOW_3_BITS,
    JAVA_LONG_PACKED_3BIT_SHIFTS,
    JavaString,
    Point2D,
    Random,
    System,
    java2DArray,
    java3DArray,
    java4DArray,
    javaArray,
    javaByte,
    javaChar,
    javaDouble,
    javaFloat,
    javaInt,
    javaIntDiv,
    javaLong,
    javaRoundFloat,
    javaShort,
    rotatePoint
} from "../java/JavaRuntime.js";
export class ButtonMapping {
    public static readonly NO_BINDING: number = -1;
    public static readonly ACTION_UP: number = 0;
    public static readonly ACTION_DOWN: number = 1;
    public static readonly ACTION_LEFT: number = 2;
    public static readonly ACTION_RIGHT: number = 3;
    public static readonly ACTION_GRENADE: number = 4;
    public static readonly ACTION_GUN: number = 5;
    public static readonly ACTION_START: number = 6;

    public static readonly DEFAULT_KEY_UP: number = Input.KEY_UP;
    public static readonly DEFAULT_KEY_DOWN: number = Input.KEY_DOWN;
    public static readonly DEFAULT_KEY_LEFT: number = Input.KEY_LEFT;
    public static readonly DEFAULT_KEY_RIGHT: number = Input.KEY_RIGHT;
    public static readonly DEFAULT_KEY_GRENADE: number = Input.KEY_X;
    public static readonly DEFAULT_KEY_GUN: number = Input.KEY_Z;
    public static readonly DEFAULT_KEY_START: number = Input.KEY_ENTER;

    public static readonly DEFAULT_CONTROLLER_UP: number = 12;
    public static readonly DEFAULT_CONTROLLER_DOWN: number = 13;
    public static readonly DEFAULT_CONTROLLER_LEFT: number = 14;
    public static readonly DEFAULT_CONTROLLER_RIGHT: number = 15;
    public static readonly DEFAULT_CONTROLLER_GRENADE: number = 0;
    public static readonly DEFAULT_CONTROLLER_GUN: number = 2;
    public static readonly DEFAULT_CONTROLLER_START: number = 9;

    public keyUp: number = ButtonMapping.DEFAULT_KEY_UP;
    public keyDown: number = ButtonMapping.DEFAULT_KEY_DOWN;
    public keyLeft: number = ButtonMapping.DEFAULT_KEY_LEFT;
    public keyRight: number = ButtonMapping.DEFAULT_KEY_RIGHT;
    public keyGrenade: number = ButtonMapping.DEFAULT_KEY_GRENADE;
    public keyGun: number = ButtonMapping.DEFAULT_KEY_GUN;
    public keyStart: number = ButtonMapping.DEFAULT_KEY_START;

    public controller: boolean = true;
    public controllerIndex: number = 0;
    public controllerUp: number = ButtonMapping.DEFAULT_CONTROLLER_UP;
    public controllerDown: number = ButtonMapping.DEFAULT_CONTROLLER_DOWN;
    public controllerLeft: number = ButtonMapping.DEFAULT_CONTROLLER_LEFT;
    public controllerRight: number = ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    public controllerGrenade: number = ButtonMapping.DEFAULT_CONTROLLER_GRENADE;
    public controllerGun: number = ButtonMapping.DEFAULT_CONTROLLER_GUN;
    public controllerStart: number = ButtonMapping.DEFAULT_CONTROLLER_START;

    public gunKeyMapped: boolean = true;

    public resetToDefaults(): void {
        this.keyUp = ButtonMapping.DEFAULT_KEY_UP;
        this.keyDown = ButtonMapping.DEFAULT_KEY_DOWN;
        this.keyLeft = ButtonMapping.DEFAULT_KEY_LEFT;
        this.keyRight = ButtonMapping.DEFAULT_KEY_RIGHT;
        this.keyGrenade = ButtonMapping.DEFAULT_KEY_GRENADE;
        this.keyGun = ButtonMapping.DEFAULT_KEY_GUN;
        this.keyStart = ButtonMapping.DEFAULT_KEY_START;
        this.controller = true;
        this.controllerIndex = 0;
        this.controllerUp = ButtonMapping.DEFAULT_CONTROLLER_UP;
        this.controllerDown = ButtonMapping.DEFAULT_CONTROLLER_DOWN;
        this.controllerLeft = ButtonMapping.DEFAULT_CONTROLLER_LEFT;
        this.controllerRight = ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
        this.controllerGrenade = ButtonMapping.DEFAULT_CONTROLLER_GRENADE;
        this.controllerGun = ButtonMapping.DEFAULT_CONTROLLER_GUN;
        this.controllerStart = ButtonMapping.DEFAULT_CONTROLLER_START;
        this.gunKeyMapped = true;
    }

    public static isReservedKey(key: any): boolean {
        return key == Input.KEY_SPACE || key == Input.KEY_ESCAPE;
    }

    public keyboardLabelFor(action: any): string {
        switch (action) {
            case ButtonMapping.ACTION_UP:
                return ButtonMapping.getKeyText(this.keyUp);
            case ButtonMapping.ACTION_DOWN:
                return ButtonMapping.getKeyText(this.keyDown);
            case ButtonMapping.ACTION_LEFT:
                return ButtonMapping.getKeyText(this.keyLeft);
            case ButtonMapping.ACTION_RIGHT:
                return ButtonMapping.getKeyText(this.keyRight);
            case ButtonMapping.ACTION_GRENADE:
                return ButtonMapping.getKeyText(this.keyGrenade);
            case ButtonMapping.ACTION_GUN:
                return ButtonMapping.getKeyText(this.keyGun);
            case ButtonMapping.ACTION_START:
                return ButtonMapping.getKeyText(this.keyStart);
        }
        return "";
    }

    public controllerLabelFor(action: any): string {
        switch (action) {
            case ButtonMapping.ACTION_UP:
                return ButtonMapping.getGamepadButtonText(this.controllerUp);
            case ButtonMapping.ACTION_DOWN:
                return ButtonMapping.getGamepadButtonText(this.controllerDown);
            case ButtonMapping.ACTION_LEFT:
                return ButtonMapping.getGamepadButtonText(this.controllerLeft);
            case ButtonMapping.ACTION_RIGHT:
                return ButtonMapping.getGamepadButtonText(this.controllerRight);
            case ButtonMapping.ACTION_GRENADE:
                return ButtonMapping.getGamepadButtonText(this.controllerGrenade);
            case ButtonMapping.ACTION_GUN:
                return ButtonMapping.getGamepadButtonText(this.controllerGun);
            case ButtonMapping.ACTION_START:
                return ButtonMapping.getGamepadButtonText(this.controllerStart);
        }
        return "";
    }

    public inputMappingLine(label: any, action: any): string {
        return ButtonMapping.padLabel(label) + ": " + this.keyboardLabelFor(action) + ", " + this.controllerLabelFor(action);
    }

    public static getKeyText(key: any): string {
        if (key == ButtonMapping.NO_BINDING) {
            return "NONE";
        }
        switch (key) {
            case Input.KEY_UP:
                return "UP";
            case Input.KEY_DOWN:
                return "DOWN";
            case Input.KEY_LEFT:
                return "LEFT";
            case Input.KEY_RIGHT:
                return "RIGHT";
            case Input.KEY_ENTER:
                return "ENTER";
            case Input.KEY_SPACE:
                return "SPACE";
            case Input.KEY_ESCAPE:
                return "ESCAPE";
            case Input.KEY_PAUSE:
                return "PAUSE";
            case Input.KEY_0:
                return "0";
            case Input.KEY_1:
                return "1";
            case Input.KEY_2:
                return "2";
            case Input.KEY_3:
                return "3";
            case Input.KEY_4:
                return "4";
            case Input.KEY_5:
                return "5";
            case Input.KEY_6:
                return "6";
            case Input.KEY_7:
                return "7";
            case Input.KEY_8:
                return "8";
            case Input.KEY_9:
                return "9";
            default:
                return ButtonMapping.getLetterKeyText(key);
        }
    }

    public static getGamepadButtonText(button: any): string {
        if (button == ButtonMapping.NO_BINDING) {
            return "GP-NONE";
        }
        switch (button) {
            case 0:
                return "GP-A";
            case 1:
                return "GP-B";
            case 2:
                return "GP-X";
            case 3:
                return "GP-Y";
            case 4:
                return "GP-LB";
            case 5:
                return "GP-RB";
            case 6:
                return "GP-LT";
            case 7:
                return "GP-RT";
            case 8:
                return "GP-VIEW";
            case 9:
                return "GP-MENU";
            case 10:
                return "GP-LS";
            case 11:
                return "GP-RS";
            case 12:
                return "GP-UP";
            case 13:
                return "GP-DOWN";
            case 14:
                return "GP-LEFT";
            case 15:
                return "GP-RIGHT";
            case 16:
                return "GP-HOME";
            default:
                return "GP-" + button;
        }
    }

    private static padLabel(label: any): string {
        return label.length >= 8 ? label : label + "        ".substring(label.length);
    }

    private static getLetterKeyText(key: any): string {
        switch (key) {
            case Input.KEY_A:
                return "A";
            case Input.KEY_B:
                return "B";
            case Input.KEY_C:
                return "C";
            case Input.KEY_D:
                return "D";
            case Input.KEY_E:
                return "E";
            case Input.KEY_F:
                return "F";
            case Input.KEY_G:
                return "G";
            case Input.KEY_H:
                return "H";
            case Input.KEY_I:
                return "I";
            case Input.KEY_J:
                return "J";
            case Input.KEY_K:
                return "K";
            case Input.KEY_L:
                return "L";
            case Input.KEY_M:
                return "M";
            case Input.KEY_N:
                return "N";
            case Input.KEY_O:
                return "O";
            case Input.KEY_P:
                return "P";
            case Input.KEY_Q:
                return "Q";
            case Input.KEY_R:
                return "R";
            case Input.KEY_S:
                return "S";
            case Input.KEY_T:
                return "T";
            case Input.KEY_U:
                return "U";
            case Input.KEY_V:
                return "V";
            case Input.KEY_W:
                return "W";
            case Input.KEY_X:
                return "X";
            case Input.KEY_Y:
                return "Y";
            case Input.KEY_Z:
                return "Z";
        }
        return Integer.toString(key);
    }
}
