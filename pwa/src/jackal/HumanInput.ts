import { Input, type GameContainer } from "slick2d-ts";
import { javaArray } from "../java/JavaRuntime.js";
import { ButtonMapping } from "./ButtonMapping.js";
import type { IInput } from "./IInput.js";
export class HumanInput implements IInput {
    public constructor(arg0?: ButtonMapping, arg1?: GameContainer) {
        const argCount = arguments.length;
        this.__construct_HumanInput(argCount, arg0, arg1);
    }

    private __construct_HumanInput(argCount: number, arg0?: ButtonMapping, arg1?: GameContainer): void {
        if (argCount === 2) {
            let buttonMappingLocal = arg0;
            let gc = arg1;
            this.buttonMapping = buttonMappingLocal;
            this.input = gc.getInput();
            return;
        }
        throw new Error(`No Java constructor overload matched arguments: ${argCount}`);
    }

    private static readonly CONTROLLER_INDEX_LIMIT: number = 16;
    private static readonly GAMEPAD_BUTTON_CONTROL_OFFSET: number = 4;
    private static readonly GAMEPAD_BUTTON_INDEX_LIMIT: number = 100;
    private static readonly GAMEPAD_AXIS_LIMIT: number = 16;
    private static readonly AXIS_THRESHOLD: number = 0.5;
    private static readonly AXIS_RECENTER_THRESHOLD: number = 0.05;
    private static readonly EXTRA_HORIZONTAL_AXES: number[] = [2, 6];
    private static readonly EXTRA_VERTICAL_AXES: number[] = [3, 7];

    private buttonMapping: ButtonMapping = null;
    private input: Input = null;
    private extraAxisBaselines: number[] = javaArray(HumanInput.CONTROLLER_INDEX_LIMIT * HumanInput.GAMEPAD_AXIS_LIMIT, Number.NaN);
    private up: boolean = false;
    private down: boolean = false;
    private left: boolean = false;
    private right: boolean = false;
    private fire: boolean = false;
    private shoot: boolean = false;

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
                return this.isControllerUpDown() || this.isAnyControllerButtonDown(button);
            case 13:
                return this.isControllerDownDown() || this.isAnyControllerButtonDown(button);
            case 14:
                return this.isControllerLeftDown() || this.isAnyControllerButtonDown(button);
            case 15:
                return this.isControllerRightDown() || this.isAnyControllerButtonDown(button);
            default:
                return this.isAnyControllerButtonDown(button);
        }
    }

    private isAnyControllerButtonDown(button: number): boolean {
        if (button < 0) {
            return false;
        }
        try {
            return this.input.isButtonPressed(button, Input.ANY_CONTROLLER);
        } catch (e) {
            return false;
        }
    }

    private isControllerBindingPressed(button: number): boolean {
        if (button < 0) {
            return false;
        }
        let pressed = false;
        let control = HumanInput.GAMEPAD_BUTTON_CONTROL_OFFSET + button;
        for (let controller = 0; controller < HumanInput.CONTROLLER_INDEX_LIMIT; controller++) {
            pressed = this.isControlPressed(control, controller) || pressed;
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
        for (let controller = 0; controller < HumanInput.CONTROLLER_INDEX_LIMIT; controller++) {
            for (let button = 0; button < HumanInput.GAMEPAD_BUTTON_INDEX_LIMIT; button++) {
                if (!this.isDirectionalGamepadButton(button) && !this.isMappedDirectionButton(button)) {
                    pressed = this.isControlPressed(HumanInput.GAMEPAD_BUTTON_CONTROL_OFFSET + button, controller) || pressed;
                }
            }
        }
        return pressed;
    }

    private isMappedDirectionButton(button: number): boolean {
        return (
            this.buttonMapping.controllerUp == button ||
            this.buttonMapping.controllerDown == button ||
            this.buttonMapping.controllerLeft == button ||
            this.buttonMapping.controllerRight == button
        );
    }

    private isDirectionalGamepadButton(button: number): boolean {
        return button >= ButtonMapping.DEFAULT_CONTROLLER_UP && button <= ButtonMapping.DEFAULT_CONTROLLER_RIGHT;
    }

    private isControlPressed(control: number, controller: number): boolean {
        try {
            return this.input.isControlPressed(control, controller);
        } catch (e) {
            return false;
        }
    }

    private isControllerUpDown(): boolean {
        try {
            return this.input.isControllerUp(Input.ANY_CONTROLLER) || this.isExtraAxisUpDown();
        } catch (e) {
            return this.isExtraAxisUpDown();
        }
    }

    private isControllerDownDown(): boolean {
        try {
            return this.input.isControllerDown(Input.ANY_CONTROLLER) || this.isExtraAxisDownDown();
        } catch (e) {
            return this.isExtraAxisDownDown();
        }
    }

    private isControllerLeftDown(): boolean {
        try {
            return this.input.isControllerLeft(Input.ANY_CONTROLLER) || this.isExtraAxisLeftDown();
        } catch (e) {
            return this.isExtraAxisLeftDown();
        }
    }

    private isControllerRightDown(): boolean {
        try {
            return this.input.isControllerRight(Input.ANY_CONTROLLER) || this.isExtraAxisRightDown();
        } catch (e) {
            return this.isExtraAxisRightDown();
        }
    }

    private isExtraAxisUpDown(): boolean {
        return this.isAnyAxisLessThan(HumanInput.EXTRA_VERTICAL_AXES, -HumanInput.AXIS_THRESHOLD);
    }

    private isExtraAxisDownDown(): boolean {
        return this.isAnyAxisGreaterThan(HumanInput.EXTRA_VERTICAL_AXES, HumanInput.AXIS_THRESHOLD);
    }

    private isExtraAxisLeftDown(): boolean {
        return this.isAnyAxisLessThan(HumanInput.EXTRA_HORIZONTAL_AXES, -HumanInput.AXIS_THRESHOLD);
    }

    private isExtraAxisRightDown(): boolean {
        return this.isAnyAxisGreaterThan(HumanInput.EXTRA_HORIZONTAL_AXES, HumanInput.AXIS_THRESHOLD);
    }

    private isAnyAxisLessThan(axes: readonly number[], threshold: number): boolean {
        for (let controller = 0; controller < HumanInput.CONTROLLER_INDEX_LIMIT; controller++) {
            for (let i = 0; i < axes.length; i++) {
                if (this.readExtraAxisValue(controller, axes[i]) < threshold) {
                    return true;
                }
            }
        }
        return false;
    }

    private isAnyAxisGreaterThan(axes: readonly number[], threshold: number): boolean {
        for (let controller = 0; controller < HumanInput.CONTROLLER_INDEX_LIMIT; controller++) {
            for (let i = 0; i < axes.length; i++) {
                if (this.readExtraAxisValue(controller, axes[i]) > threshold) {
                    return true;
                }
            }
        }
        return false;
    }

    private readExtraAxisValue(controller: number, axis: number): number {
        try {
            if (this.input.getAxisCount(controller) <= axis) {
                return 0;
            }
            let value = this.input.getAxisValue(controller, axis);
            let baselineIndex = controller * HumanInput.GAMEPAD_AXIS_LIMIT + axis;
            let baseline = this.extraAxisBaselines[baselineIndex];
            if (Number.isNaN(baseline)) {
                baseline = value;
                this.extraAxisBaselines[baselineIndex] = baseline;
            }
            if (Math.abs(value) <= HumanInput.AXIS_RECENTER_THRESHOLD) {
                baseline = 0;
                this.extraAxisBaselines[baselineIndex] = baseline;
            }
            return value - baseline;
        } catch (e) {
            return 0;
        }
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

    public isFullscreenTogglePressed(): boolean {
        return this.input.isKeyPressed(Input.KEY_SPACE);
    }

    public isEscape(): boolean {
        return this.input.isKeyPressed(Input.KEY_ESCAPE);
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
