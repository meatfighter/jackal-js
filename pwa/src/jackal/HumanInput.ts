import { Input, type GameContainer } from "slick2d-ts";
import { ButtonMapping } from "./ButtonMapping.js";
import type { IInput } from "./IInput.js";

export class HumanInput implements IInput {
    private static readonly GAMEPAD_BUTTON_CONTROL_OFFSET = 4;

    private buttonMapping: ButtonMapping;
    private input: Input;
    private up = false;
    private down = false;
    private left = false;
    private right = false;
    private fire = false;
    private shoot = false;

    public constructor(buttonMapping: ButtonMapping, gc: GameContainer) {
        this.buttonMapping = buttonMapping;
        this.input = gc.getInput();
    }

    public snap(): void {
        this.up = this.input.isKeyDown(this.buttonMapping.keyUp) || this.isControllerBindingDown(this.buttonMapping.controllerUp);
        this.down = this.input.isKeyDown(this.buttonMapping.keyDown) || this.isControllerBindingDown(this.buttonMapping.controllerDown);
        this.left = this.input.isKeyDown(this.buttonMapping.keyLeft) || this.isControllerBindingDown(this.buttonMapping.controllerLeft);
        this.right = this.input.isKeyDown(this.buttonMapping.keyRight) || this.isControllerBindingDown(this.buttonMapping.controllerRight);
        this.fire = this.input.isKeyDown(this.buttonMapping.keyGrenade) || this.isAnyControllerButtonDown(this.buttonMapping.controllerGrenade);
        this.shoot = this.input.isKeyDown(this.buttonMapping.keyGun) || this.isAnyControllerButtonDown(this.buttonMapping.controllerGun);
    }

    private isControllerBindingDown(button: number): boolean {
        switch (button) {
            case 12:
                return this.input.isControllerUp(Input.ANY_CONTROLLER) || this.isAnyControllerButtonDown(button);
            case 13:
                return this.input.isControllerDown(Input.ANY_CONTROLLER) || this.isAnyControllerButtonDown(button);
            case 14:
                return this.input.isControllerLeft(Input.ANY_CONTROLLER) || this.isAnyControllerButtonDown(button);
            case 15:
                return this.input.isControllerRight(Input.ANY_CONTROLLER) || this.isAnyControllerButtonDown(button);
            default:
                return this.isAnyControllerButtonDown(button);
        }
    }

    private isAnyControllerButtonDown(button: number): boolean {
        return button >= 0 && this.input.isButtonPressed(button, Input.ANY_CONTROLLER);
    }

    private isControllerBindingPressed(button: number): boolean {
        if (button < 0) {
            return false;
        }
        let pressed = false;
        const control = HumanInput.GAMEPAD_BUTTON_CONTROL_OFFSET + button;
        const controllerCount = this.input.getControllerCount();
        for (let controller = 0; controller < controllerCount; controller++) {
            pressed = this.input.isControlPressed(control, controller) || pressed;
        }
        return pressed;
    }

    private isMappedStartPressed(): boolean {
        let pressed = this.input.isKeyPressed(this.buttonMapping.keyStart);
        pressed = this.isControllerBindingPressed(this.buttonMapping.controllerStart) || pressed;
        return pressed;
    }

    private isAnyNonDirectionalControllerButtonPressed(): boolean {
        let pressed = false;
        const controllerCount = this.input.getControllerCount();
        for (let controller = 0; controller < controllerCount; controller++) {
            const buttonCount = this.input.getButtonCount(controller);
            for (let button = 0; button < buttonCount; button++) {
                if (!this.isDirectionalGamepadButton(button) && !this.isMappedDirectionButton(button)) {
                    pressed = this.input.isControlPressed(HumanInput.GAMEPAD_BUTTON_CONTROL_OFFSET + button, controller) || pressed;
                }
            }
        }
        return pressed;
    }

    private isMappedDirectionButton(button: number): boolean {
        return (
            this.buttonMapping.controllerUp === button ||
            this.buttonMapping.controllerDown === button ||
            this.buttonMapping.controllerLeft === button ||
            this.buttonMapping.controllerRight === button
        );
    }

    private isDirectionalGamepadButton(button: number): boolean {
        return button >= ButtonMapping.DEFAULT_CONTROLLER_UP && button <= ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    }

    public reset(): void {}

    public isUp(): boolean {
        return this.up;
    }

    public isDown(): boolean {
        return this.down;
    }

    public isLeft(): boolean {
        return this.left;
    }

    public isRight(): boolean {
        return this.right;
    }

    public isFire(): boolean {
        return this.fire;
    }

    public isShoot(): boolean {
        return this.shoot;
    }

    public isEnter(): boolean {
        return this.isMappedStartPressed() || this.isAnyNonDirectionalControllerButtonPressed();
    }

    public isPause(): boolean {
        return this.isMappedStartPressed();
    }

    public clearKeyPressedRecord(): void {
        this.input.clearKeyPressedRecord();
        this.input.clearControlPressedRecord();
    }

    public update(): boolean {
        return true;
    }
}
