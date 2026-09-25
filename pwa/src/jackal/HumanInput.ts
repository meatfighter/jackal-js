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
    private controllerUp = false;
    private controllerDown = false;
    private controllerLeft = false;
    private controllerRight = false;
    private controllerFire = false;
    private controllerShoot = false;
    private readonly controllerConnectionGenerations: number[] = [];
    private readonly controllerBlockedControls: boolean[][] = [];
    private lastControllerSampleSequence = -1;
    private lastControllerMappingUp = Number.NaN;
    private lastControllerMappingDown = Number.NaN;
    private lastControllerMappingLeft = Number.NaN;
    private lastControllerMappingRight = Number.NaN;
    private lastControllerMappingGrenade = Number.NaN;
    private lastControllerMappingGun = Number.NaN;

    public constructor(buttonMapping: ButtonMapping, gc: GameContainer) {
        this.buttonMapping = buttonMapping;
        this.input = gc.getInput();
    }

    public snap(): void {
        this.refreshControllerLevels();
        this.up = this.input.isKeyDown(this.buttonMapping.keyUp) || this.controllerUp;
        this.down = this.input.isKeyDown(this.buttonMapping.keyDown) || this.controllerDown;
        this.left = this.input.isKeyDown(this.buttonMapping.keyLeft) || this.controllerLeft;
        this.right = this.input.isKeyDown(this.buttonMapping.keyRight) || this.controllerRight;
        this.fire = this.input.isKeyDown(this.buttonMapping.keyGrenade) || this.controllerFire;
        this.shoot = this.input.isKeyDown(this.buttonMapping.keyGun) || this.controllerShoot;
    }

    private refreshControllerLevels(): void {
        const status = this.input.getControllerSampleStatus();
        if (!status.valid) {
            return;
        }

        const mappingChanged =
            this.buttonMapping.controllerUp !== this.lastControllerMappingUp ||
            this.buttonMapping.controllerDown !== this.lastControllerMappingDown ||
            this.buttonMapping.controllerLeft !== this.lastControllerMappingLeft ||
            this.buttonMapping.controllerRight !== this.lastControllerMappingRight ||
            this.buttonMapping.controllerGrenade !== this.lastControllerMappingGrenade ||
            this.buttonMapping.controllerGun !== this.lastControllerMappingGun;
        const firstSample = this.lastControllerSampleSequence < 0;
        this.lastControllerMappingUp = this.buttonMapping.controllerUp;
        this.lastControllerMappingDown = this.buttonMapping.controllerDown;
        this.lastControllerMappingLeft = this.buttonMapping.controllerLeft;
        this.lastControllerMappingRight = this.buttonMapping.controllerRight;
        this.lastControllerMappingGrenade = this.buttonMapping.controllerGrenade;
        this.lastControllerMappingGun = this.buttonMapping.controllerGun;
        this.lastControllerSampleSequence = status.sequence;

        let up = false;
        let down = false;
        let left = false;
        let right = false;
        let fire = false;
        let shoot = false;
        const controllerCount = this.input.getControllerCount();
        this.controllerConnectionGenerations.length = controllerCount;
        this.controllerBlockedControls.length = controllerCount;

        for (let controller = 0; controller < controllerCount; controller++) {
            const generation = this.input.getControllerConnectionGeneration(controller);
            const previousGeneration = this.controllerConnectionGenerations[controller] ?? 0;
            const ownerChanged = generation === 0 || generation !== previousGeneration;
            this.controllerConnectionGenerations[controller] = generation;

            let blocked = this.controllerBlockedControls[controller];
            if (blocked === undefined) {
                blocked = [false, false, false, false, false, false];
                this.controllerBlockedControls[controller] = blocked;
            }

            const establishBaseline = firstSample || status.baselineOnly || ownerChanged || mappingChanged;
            up =
                this.sampleControllerControl(
                    controller,
                    0,
                    this.isControllerBindingDown(this.buttonMapping.controllerUp, controller),
                    establishBaseline,
                    blocked
                ) || up;
            down =
                this.sampleControllerControl(
                    controller,
                    1,
                    this.isControllerBindingDown(this.buttonMapping.controllerDown, controller),
                    establishBaseline,
                    blocked
                ) || down;
            left =
                this.sampleControllerControl(
                    controller,
                    2,
                    this.isControllerBindingDown(this.buttonMapping.controllerLeft, controller),
                    establishBaseline,
                    blocked
                ) || left;
            right =
                this.sampleControllerControl(
                    controller,
                    3,
                    this.isControllerBindingDown(this.buttonMapping.controllerRight, controller),
                    establishBaseline,
                    blocked
                ) || right;
            fire =
                this.sampleControllerControl(
                    controller,
                    4,
                    this.isControllerBindingDown(this.buttonMapping.controllerGrenade, controller),
                    establishBaseline,
                    blocked
                ) || fire;
            shoot =
                this.sampleControllerControl(
                    controller,
                    5,
                    this.isControllerBindingDown(this.buttonMapping.controllerGun, controller),
                    establishBaseline,
                    blocked
                ) || shoot;
        }

        this.controllerUp = up;
        this.controllerDown = down;
        this.controllerLeft = left;
        this.controllerRight = right;
        this.controllerFire = fire;
        this.controllerShoot = shoot;
    }

    private sampleControllerControl(controller: number, control: number, down: boolean, establishBaseline: boolean, blocked: boolean[]): boolean {
        void controller;
        if (establishBaseline && down) {
            blocked[control] = true;
        } else if (!down) {
            blocked[control] = false;
        }
        return down && !blocked[control];
    }

    private isControllerBindingDown(binding: number, controller: number): boolean {
        switch (binding) {
            case ButtonMapping.CONTROLLER_DIRECTION_UP:
                return this.input.isControllerUp(controller);
            case ButtonMapping.CONTROLLER_DIRECTION_DOWN:
                return this.input.isControllerDown(controller);
            case ButtonMapping.CONTROLLER_DIRECTION_LEFT:
                return this.input.isControllerLeft(controller);
            case ButtonMapping.CONTROLLER_DIRECTION_RIGHT:
                return this.input.isControllerRight(controller);
            default:
                return this.isControllerButtonDown(binding, controller);
        }
    }

    private isControllerButtonDown(button: number, controller: number): boolean {
        return button >= 0 && this.input.isButtonPressed(button, controller);
    }

    private isControllerBindingPressed(button: number): boolean {
        let control: number;
        switch (button) {
            case ButtonMapping.CONTROLLER_DIRECTION_LEFT:
                control = 0;
                break;
            case ButtonMapping.CONTROLLER_DIRECTION_RIGHT:
                control = 1;
                break;
            case ButtonMapping.CONTROLLER_DIRECTION_UP:
                control = 2;
                break;
            case ButtonMapping.CONTROLLER_DIRECTION_DOWN:
                control = 3;
                break;
            default:
                if (!ButtonMapping.isValidRawControllerButton(button)) return false;
                control = HumanInput.GAMEPAD_BUTTON_CONTROL_OFFSET + button;
        }
        let pressed = false;
        for (let controller = 0; controller < this.input.getControllerCount(); controller++) {
            const current = this.input.isControlPressed(control, controller);
            pressed = current || pressed;
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
                if (!this.input.isControllerButtonDirectional(button, controller) && !this.isMappedDirectionButton(button)) {
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
        const start = this.isMappedStartPressed();
        const a = this.isControllerBindingPressed(this.buttonMapping.controllerGrenade);
        const b = this.isControllerBindingPressed(this.buttonMapping.controllerGun);
        const other = this.isAnyNonDirectionalControllerButtonPressed();
        return start || a || b || other;
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
