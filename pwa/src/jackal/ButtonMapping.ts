import * as NesInputProfile from "./NesInputProfile.js";
import { Input } from "slick2d-ts";
export type MappingWriteFailureReason = "unavailable" | "invalid" | "stale-session";
export type MappingWriteResult = { readonly saved: true } | { readonly saved: false; readonly reason: MappingWriteFailureReason };

export class ButtonMapping {
    private static readonly STANDARD_GAMEPAD_LABELS: readonly string[] = [
        "GP-BOT",
        "GP-RGT",
        "GP-LFT",
        "GP-TOP",
        "GP-LB",
        "GP-RB",
        "GP-LT",
        "GP-RT",
        "GP-BACK",
        "GP-START",
        "GP-LS",
        "GP-RS",
        "GP-UP",
        "GP-DOWN",
        "GP-LEFT",
        "GP-RIGHT",
        "GP-HOME"
    ];

    public static usesStandardGamepadLabels(input: Pick<Input, "getControllerSampleStatus" | "getControllerCount" | "getControllerMapping">): boolean {
        try {
            const status = input.getControllerSampleStatus();
            if (!status.available || !status.valid) return false;
            const sequence = status.sequence;
            const count = input.getControllerCount();
            if (!Number.isInteger(count) || count <= 0) return false;
            for (let controller = 0; controller < count; controller++) {
                if (input.getControllerMapping(controller) !== "standard") return false;
            }
            const after = input.getControllerSampleStatus();
            return after.available && after.valid && after.sequence === sequence;
        } catch {
            // Uncertain presentation metadata must not interrupt the input menu.
            return false;
        }
    }

    public static readonly NO_BINDING: number = NesInputProfile.NO_BINDING;
    public static readonly CONTROLLER_DIRECTION_UP: number = NesInputProfile.DIRECTION_UP;
    public static readonly CONTROLLER_DIRECTION_DOWN: number = NesInputProfile.DIRECTION_DOWN;
    public static readonly CONTROLLER_DIRECTION_LEFT: number = NesInputProfile.DIRECTION_LEFT;
    public static readonly CONTROLLER_DIRECTION_RIGHT: number = NesInputProfile.DIRECTION_RIGHT;
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

    public static readonly DEFAULT_CONTROLLER_UP: number = ButtonMapping.CONTROLLER_DIRECTION_UP;
    public static readonly DEFAULT_CONTROLLER_DOWN: number = ButtonMapping.CONTROLLER_DIRECTION_DOWN;
    public static readonly DEFAULT_CONTROLLER_LEFT: number = ButtonMapping.CONTROLLER_DIRECTION_LEFT;
    public static readonly DEFAULT_CONTROLLER_RIGHT: number = ButtonMapping.CONTROLLER_DIRECTION_RIGHT;
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
    public controllerUp: number = ButtonMapping.DEFAULT_CONTROLLER_UP;
    public controllerDown: number = ButtonMapping.DEFAULT_CONTROLLER_DOWN;
    public controllerLeft: number = ButtonMapping.DEFAULT_CONTROLLER_LEFT;
    public controllerRight: number = ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    public controllerGrenade: number = ButtonMapping.DEFAULT_CONTROLLER_GRENADE;
    public controllerGun: number = ButtonMapping.DEFAULT_CONTROLLER_GUN;
    public controllerStart: number = ButtonMapping.DEFAULT_CONTROLLER_START;
    public resetToDefaults(): void {
        this.keyUp = ButtonMapping.DEFAULT_KEY_UP;
        this.keyDown = ButtonMapping.DEFAULT_KEY_DOWN;
        this.keyLeft = ButtonMapping.DEFAULT_KEY_LEFT;
        this.keyRight = ButtonMapping.DEFAULT_KEY_RIGHT;
        this.keyGrenade = ButtonMapping.DEFAULT_KEY_GRENADE;
        this.keyGun = ButtonMapping.DEFAULT_KEY_GUN;
        this.keyStart = ButtonMapping.DEFAULT_KEY_START;
        this.controllerUp = ButtonMapping.DEFAULT_CONTROLLER_UP;
        this.controllerDown = ButtonMapping.DEFAULT_CONTROLLER_DOWN;
        this.controllerLeft = ButtonMapping.DEFAULT_CONTROLLER_LEFT;
        this.controllerRight = ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
        this.controllerGrenade = ButtonMapping.DEFAULT_CONTROLLER_GRENADE;
        this.controllerGun = ButtonMapping.DEFAULT_CONTROLLER_GUN;
        this.controllerStart = ButtonMapping.DEFAULT_CONTROLLER_START;
    }

    public static isReservedKey(key: number): boolean {
        return key === Input.KEY_ESCAPE;
    }

    public keyboardLabelFor(action: number): string {
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

    public controllerLabelFor(action: number, standardLayout: boolean = false): string {
        switch (action) {
            case ButtonMapping.ACTION_UP:
                return ButtonMapping.getGamepadButtonText(this.controllerUp, standardLayout);
            case ButtonMapping.ACTION_DOWN:
                return ButtonMapping.getGamepadButtonText(this.controllerDown, standardLayout);
            case ButtonMapping.ACTION_LEFT:
                return ButtonMapping.getGamepadButtonText(this.controllerLeft, standardLayout);
            case ButtonMapping.ACTION_RIGHT:
                return ButtonMapping.getGamepadButtonText(this.controllerRight, standardLayout);
            case ButtonMapping.ACTION_GRENADE:
                return ButtonMapping.getGamepadButtonText(this.controllerGrenade, standardLayout);
            case ButtonMapping.ACTION_GUN:
                return ButtonMapping.getGamepadButtonText(this.controllerGun, standardLayout);
            case ButtonMapping.ACTION_START:
                return ButtonMapping.getGamepadButtonText(this.controllerStart, standardLayout);
        }
        return "";
    }

    public inputMappingLine(label: string, action: number, standardLayout: boolean = false): string {
        return ButtonMapping.padLabel(label) + ": " + this.keyboardLabelFor(action) + ", " + this.controllerLabelFor(action, standardLayout);
    }

    public static getKeyText(key: number): string {
        if (key === ButtonMapping.NO_BINDING) return "NONE";
        switch (key) {
            case Input.KEY_ESCAPE:
                return "ESCAPE";
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
            case Input.KEY_0:
                return "0";
            case Input.KEY_MINUS:
                return "MINUS";
            case Input.KEY_EQUALS:
                return "EQUALS";
            case Input.KEY_BACK:
                return "BKSP";
            case Input.KEY_TAB:
                return "TAB";
            case Input.KEY_Q:
                return "Q";
            case Input.KEY_W:
                return "W";
            case Input.KEY_E:
                return "E";
            case Input.KEY_R:
                return "R";
            case Input.KEY_T:
                return "T";
            case Input.KEY_Y:
                return "Y";
            case Input.KEY_U:
                return "U";
            case Input.KEY_I:
                return "I";
            case Input.KEY_O:
                return "O";
            case Input.KEY_P:
                return "P";
            case Input.KEY_LBRACKET:
                return "L BRKT";
            case Input.KEY_RBRACKET:
                return "R BRKT";
            case Input.KEY_RETURN:
                return "ENTER";
            case Input.KEY_LCONTROL:
                return "L CTRL";
            case Input.KEY_A:
                return "A";
            case Input.KEY_S:
                return "S";
            case Input.KEY_D:
                return "D";
            case Input.KEY_F:
                return "F";
            case Input.KEY_G:
                return "G";
            case Input.KEY_H:
                return "H";
            case Input.KEY_J:
                return "J";
            case Input.KEY_K:
                return "K";
            case Input.KEY_L:
                return "L";
            case Input.KEY_SEMICOLON:
                return "SEMICOLON";
            case Input.KEY_APOSTROPHE:
                return "QUOTE";
            case Input.KEY_GRAVE:
                return "GRAVE";
            case Input.KEY_LSHIFT:
                return "L SHIFT";
            case Input.KEY_BACKSLASH:
                return "BSLASH";
            case Input.KEY_Z:
                return "Z";
            case Input.KEY_X:
                return "X";
            case Input.KEY_C:
                return "C";
            case Input.KEY_V:
                return "V";
            case Input.KEY_B:
                return "B";
            case Input.KEY_N:
                return "N";
            case Input.KEY_M:
                return "M";
            case Input.KEY_COMMA:
                return "COMMA";
            case Input.KEY_PERIOD:
                return "PERIOD";
            case Input.KEY_SLASH:
                return "SLASH";
            case Input.KEY_RSHIFT:
                return "R SHIFT";
            case Input.KEY_MULTIPLY:
                return "NUM MUL";
            case Input.KEY_LMENU:
                return "L ALT";
            case Input.KEY_SPACE:
                return "SPACE";
            case Input.KEY_CAPITAL:
                return "CAPS LOCK";
            case Input.KEY_F1:
                return "F1";
            case Input.KEY_F2:
                return "F2";
            case Input.KEY_F3:
                return "F3";
            case Input.KEY_F4:
                return "F4";
            case Input.KEY_F5:
                return "F5";
            case Input.KEY_F6:
                return "F6";
            case Input.KEY_F7:
                return "F7";
            case Input.KEY_F8:
                return "F8";
            case Input.KEY_F9:
                return "F9";
            case Input.KEY_F10:
                return "F10";
            case Input.KEY_NUMLOCK:
                return "NUM LOCK";
            case Input.KEY_SCROLL:
                return "SCR LOCK";
            case Input.KEY_NUMPAD7:
                return "NUM 7";
            case Input.KEY_NUMPAD8:
                return "NUM 8";
            case Input.KEY_NUMPAD9:
                return "NUM 9";
            case Input.KEY_SUBTRACT:
                return "NUM SUB";
            case Input.KEY_NUMPAD4:
                return "NUM 4";
            case Input.KEY_NUMPAD5:
                return "NUM 5";
            case Input.KEY_NUMPAD6:
                return "NUM 6";
            case Input.KEY_ADD:
                return "NUM ADD";
            case Input.KEY_NUMPAD1:
                return "NUM 1";
            case Input.KEY_NUMPAD2:
                return "NUM 2";
            case Input.KEY_NUMPAD3:
                return "NUM 3";
            case Input.KEY_NUMPAD0:
                return "NUM 0";
            case Input.KEY_DECIMAL:
                return "NUM DEC";
            case Input.KEY_F11:
                return "F11";
            case Input.KEY_F12:
                return "F12";
            case Input.KEY_F13:
                return "F13";
            case Input.KEY_F14:
                return "F14";
            case Input.KEY_F15:
                return "F15";
            case Input.KEY_KANA:
                return "KANA";
            case Input.KEY_CONVERT:
                return "CONVERT";
            case Input.KEY_NOCONVERT:
                return "NO CONV";
            case Input.KEY_YEN:
                return "YEN";
            case Input.KEY_NUMPADEQUALS:
                return "NUM EQ";
            case Input.KEY_CIRCUMFLEX:
                return "CARET";
            case Input.KEY_AT:
                return "AT";
            case Input.KEY_COLON:
                return "COLON";
            case Input.KEY_UNDERLINE:
                return "UNDERLINE";
            case Input.KEY_KANJI:
                return "KANJI";
            case Input.KEY_STOP:
                return "STOP";
            case Input.KEY_AX:
                return "AX";
            case Input.KEY_UNLABELED:
                return "NO LABEL";
            case Input.KEY_NUMPADENTER:
                return "NUM ENT";
            case Input.KEY_RCONTROL:
                return "R CTRL";
            case Input.KEY_NUMPADCOMMA:
                return "NUM COM";
            case Input.KEY_DIVIDE:
                return "NUM DIV";
            case Input.KEY_SYSRQ:
                return "PRT SCR";
            case Input.KEY_RMENU:
                return "R ALT";
            case Input.KEY_PAUSE:
                return "PAUSE";
            case Input.KEY_HOME:
                return "HOME";
            case Input.KEY_UP:
                return "UP";
            case Input.KEY_PRIOR:
                return "PG UP";
            case Input.KEY_LEFT:
                return "LEFT";
            case Input.KEY_RIGHT:
                return "RIGHT";
            case Input.KEY_END:
                return "END";
            case Input.KEY_DOWN:
                return "DOWN";
            case Input.KEY_NEXT:
                return "PG DOWN";
            case Input.KEY_INSERT:
                return "INSERT";
            case Input.KEY_DELETE:
                return "DELETE";
            case Input.KEY_LWIN:
                return "L WIN";
            case Input.KEY_RWIN:
                return "R WIN";
            case Input.KEY_APPS:
                return "APP MENU";
            case Input.KEY_POWER:
                return "POWER";
            case Input.KEY_SLEEP:
                return "SLEEP";
            default:
                return Number.isInteger(key) && key >= 0 && key < 256 ? "KEY " + key : "UNKNOWN";
        }
    }

    public static getGamepadButtonText(button: number, standardLayout: boolean = false): string {
        switch (button) {
            case ButtonMapping.NO_BINDING:
                return "GP-NONE";
            case ButtonMapping.CONTROLLER_DIRECTION_UP:
                return "GP-UP";
            case ButtonMapping.CONTROLLER_DIRECTION_DOWN:
                return "GP-DOWN";
            case ButtonMapping.CONTROLLER_DIRECTION_LEFT:
                return "GP-LEFT";
            case ButtonMapping.CONTROLLER_DIRECTION_RIGHT:
                return "GP-RIGHT";
        }
        if (!Number.isInteger(button) || button < 0 || button >= NesInputProfile.RAW_BUTTON_LIMIT) return "GP-UNK";
        if (standardLayout) {
            const label = ButtonMapping.STANDARD_GAMEPAD_LABELS[button];
            if (label !== undefined) return label;
        }
        return "GP-B" + (button + 1);
    }

    public static isLogicalControllerDirection(binding: number): boolean {
        return NesInputProfile.isLogicalDirection(binding);
    }

    public static isValidKeyBinding(value: unknown): value is number {
        return (
            typeof value === "number" &&
            Number.isInteger(value) &&
            (value === ButtonMapping.NO_BINDING || (Input.isBrowserKeyCodeSupported(value) && !ButtonMapping.isReservedKey(value)))
        );
    }

    public static isValidRawControllerButton(value: unknown): value is number {
        return NesInputProfile.isRawButton(value);
    }

    public static isValidControllerBinding(value: unknown): value is number {
        return NesInputProfile.isControllerBinding(value);
    }

    private static padLabel(label: string): string {
        return label.length >= 8 ? label : label + "        ".substring(label.length);
    }

    public copyFrom(source: ButtonMapping): void {
        NesInputProfile.copyInto(source, this);
    }

    public clone(): ButtonMapping {
        const mapping = new ButtonMapping();
        mapping.copyFrom(this);
        return mapping;
    }
}
