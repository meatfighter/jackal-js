import { Input } from "slick2d-ts";
import { ButtonMapping } from "./ButtonMapping.js";

/** Browser counterpart to the desktop ControllerSupport boundary used by InputMode. */
export class ControllerSupport {
    public static readonly GAMEPAD_BUTTON_INDEX_LIMIT = 64;

    private constructor() {}

    public static isUpDown(input: Input): boolean {
        return input.isControllerUp(Input.ANY_CONTROLLER);
    }

    public static isDownDown(input: Input): boolean {
        return input.isControllerDown(Input.ANY_CONTROLLER);
    }

    public static isLeftDown(input: Input): boolean {
        return input.isControllerLeft(Input.ANY_CONTROLLER);
    }

    public static isRightDown(input: Input): boolean {
        return input.isControllerRight(Input.ANY_CONTROLLER);
    }

    public static isButtonDown(input: Input, button: number): boolean {
        return button >= 0 && button < ControllerSupport.getButtonScanLimit(input) && input.isButtonPressed(button, Input.ANY_CONTROLLER);
    }

    public static getButtonScanLimit(input: Input): number {
        let count = 0;
        const controllerCount = input.getControllerCount();
        for (let controller = 0; controller < controllerCount; controller++) {
            count = Math.max(count, input.getButtonCount(controller));
        }
        return Math.min(count, ControllerSupport.GAMEPAD_BUTTON_INDEX_LIMIT);
    }

    public static isDirectionalButton(button: number): boolean {
        return button >= ButtonMapping.DEFAULT_CONTROLLER_UP && button <= ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    }
}
