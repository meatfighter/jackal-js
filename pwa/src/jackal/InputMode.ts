import { Color, Input, type GameContainer, type Graphics, type KeyListener } from "slick2d-ts";
import { javaArray, javaFloat } from "../java/JavaRuntime.js";
import { MainConstants } from "../java/MainConstants.js";
import { ButtonMapping } from "./ButtonMapping.js";
import type { IFadeListener } from "./IFadeListener.js";
import type { IMenuListener } from "./IMenuListener.js";
import type { IMode } from "./IMode.js";
import { Menu } from "./Menu.js";
import { Modes } from "./Modes.js";
import type { Main } from "./Main.js";
export class InputMode implements IMode, KeyListener, IFadeListener, IMenuListener {
    public static readonly STATE_FADE_IN: number = 0;
    public static readonly STATE_MENU: number = 1;
    public static readonly STATE_READING: number = 2;
    public static readonly STATE_READ_FADE: number = 3;
    public static readonly STATE_FADE_OUT: number = 4;
    public static readonly STATE_DONE: number = 5;
    public static readonly STATE_SAVED: number = 6;

    public static readonly OPTION_CHANGE: number = 0;
    public static readonly OPTION_RESET: number = 1;
    public static readonly OPTION_DONE: number = 2;

    public static readonly FADE_TIME: number = 11;

    public static readonly I_FADE_TIME: number = javaFloat(1 / InputMode.FADE_TIME);
    public static readonly DONE_DELAY: number = 30;
    public static readonly ARM_DELAY: number = 8;
    public static readonly GAMEPAD_BUTTON_INDEX_LIMIT: number = Input.BROWSER_CONTROLLER_BUTTON_LIMIT;

    public static readonly INPUT_TITLE: string = "INPUT";
    public static readonly INPUT_TITLE_X: number = javaFloat((MainConstants.DISPLAY_WIDTH - (InputMode.INPUT_TITLE.length << 5)) / 2);
    public static readonly INPUT_TITLE_Y: number = 96;
    public static readonly INPUT_MAPPING_Y: number = 192;
    public static readonly INPUT_MAPPING_ROW_HEIGHT: number = 64;
    public static readonly INPUT_MENU_X: number = 416;
    public static readonly INPUT_MENU_Y: number = 672;

    public static readonly ACTIONS: number[] = [
        ButtonMapping.ACTION_UP,
        ButtonMapping.ACTION_DOWN,
        ButtonMapping.ACTION_LEFT,
        ButtonMapping.ACTION_RIGHT,
        ButtonMapping.ACTION_GRENADE,
        ButtonMapping.ACTION_GUN,
        ButtonMapping.ACTION_START
    ];

    public static readonly LABELS: string[] = ["UP", "DOWN", "LEFT", "RIGHT", "GRENADE", "GUN", "START"];

    public static readonly NAMES: string[] = ["UP", "DOWN", "LEFT", "RIGHT", "GRENADE", "GUN", "START"];
    public static readonly NAME_XS: number[] = javaArray(InputMode.NAMES.length, 0);

    static {
        for (let i = 0; i < InputMode.NAMES.length; i++) {
            InputMode.NAME_XS[i] = javaFloat((MainConstants.DISPLAY_WIDTH - (InputMode.NAMES[i].length << 5)) / 2);
        }
    }

    public main: Main = null!;
    public gc: GameContainer = null!;
    public buttonMapping: ButtonMapping = null!;
    public state: number = InputMode.STATE_FADE_IN;
    public nameIndex: number = 0;
    public delay: number = 0;
    public menu: Menu = null!;
    public selectedIndex: number = 0;
    public listeningForInput: boolean = false;
    public draftButtonMapping: ButtonMapping = null!;
    public assignedKeys: Set<number> = new Set();
    public assignedControllerButtons: Set<number> = new Set();
    public message: string = "";
    public armDelay: number = 0;
    private controllerButtonDown: boolean[][] = [];
    private controllerDirectionDown: boolean[][] = [];
    private controllerConnectionGenerations: number[] = [];
    private lastControllerSampleSequence: number = -1;
    private blockedKeyboardKeys: Set<number> = new Set();
    public inputMappingLines: string[] = javaArray(InputMode.LABELS.length, "");
    public inputMappingX: number = 0;

    private static readonly restoredCompletion = new WeakSet<InputMode>();

    public restorePersistencePresentation(): void {
        if (this.state === InputMode.STATE_SAVED) InputMode.restoredCompletion.add(this);
        else InputMode.restoredCompletion.delete(this);
    }

    public completionMessage(): string {
        return InputMode.restoredCompletion.has(this) ? "DONE" : this.message;
    }

    public init(main: Main, gc: GameContainer): void {
        this.main = main;
        this.gc = gc;
        this.buttonMapping = main.buttonMapping;
        this.refreshInputMappingLines();
        this.createMenu(0);

        main.startFade(false, this);
    }

    private createMenu(selectedIndex: number): void {
        this.menu = new Menu(InputMode.INPUT_MENU_X, InputMode.INPUT_MENU_Y, this.main, selectedIndex, Menu.ICON_BROWN_TANK, this, "CHANGE", "RESET", "DONE");
    }

    public fadeCompleted(): void {
        if (this.state === InputMode.STATE_FADE_IN) {
            this.state = InputMode.STATE_MENU;
        } else if (this.state === InputMode.STATE_FADE_OUT) {
            this.state = InputMode.STATE_DONE;
            this.removeInputListeners();
            this.main.requestMode(Modes.INTRO, this.gc);
        }
    }

    public selectionChanged(selectedIndex: number): void {}

    public optionSelected(selectedIndex: number): void {
        if (this.state !== InputMode.STATE_MENU) {
            return;
        }

        this.selectedIndex = selectedIndex;
        this.main.playSound(this.main.missileSound);

        switch (selectedIndex) {
            case InputMode.OPTION_CHANGE:
                this.startReading();
                break;
            case InputMode.OPTION_RESET:
                this.buttonMapping.resetToDefaults();
                this.refreshInputMappingLines();
                this.main.notifyInputMappingChanged();
                this.createMenu(InputMode.OPTION_RESET);
                break;
            case InputMode.OPTION_DONE:
                this.state = InputMode.STATE_FADE_OUT;
                this.main.startFade(true, this);
                break;
        }
    }

    private startReading(): void {
        InputMode.restoredCompletion.delete(this);
        this.state = InputMode.STATE_READING;
        this.nameIndex = 0;
        this.delay = 0;
        this.menu = null!;
        this.draftButtonMapping = this.copyButtonMapping(this.buttonMapping);
        this.assignedKeys.clear();
        this.assignedControllerButtons.clear();
        this.message = "";
        this.armDelay = InputMode.ARM_DELAY;
        const input = this.gc.getInput();
        input.resetAdditionalControllerDirectionAxisCalibration();
        this.addInputListeners();
        this.controllerButtonDown.length = 0;
        this.controllerDirectionDown.length = 0;
        this.controllerConnectionGenerations.length = 0;
        this.lastControllerSampleSequence = -1;
        this.blockedKeyboardKeys.clear();
        for (let key = 0; key < Input.BROWSER_KEY_CODE_LIMIT; key++) {
            if (ButtonMapping.isValidKeyBinding(key) && key !== ButtonMapping.NO_BINDING && input.isKeyDown(key)) {
                this.blockedKeyboardKeys.add(key);
            }
        }
        this.syncControllerInputState();
        input.clearKeyPressedRecord();
        input.clearControlPressedRecord();
    }

    /** Makes the browser listener registration match the restored mode state. */
    public syncInputListenerState(): void {
        this.listeningForInput = false;
        if (this.state === InputMode.STATE_READING || this.state === InputMode.STATE_READ_FADE) {
            this.addInputListeners();
        }
    }

    /** Drop obsolete editor release bookkeeping; Slick still quarantines physically held keys. */
    public resyncInputAfterBrowserResume(): void {
        this.blockedKeyboardKeys.clear();
        this.syncControllerInputState();
    }

    private addInputListeners(): void {
        if (this.listeningForInput) {
            return;
        }
        this.gc.getInput().addKeyListener(this);
        this.listeningForInput = true;
    }

    private removeInputListeners(): void {
        if (!this.listeningForInput) {
            return;
        }
        this.gc.getInput().removeKeyListener(this);
        this.listeningForInput = false;
    }

    public setInput(input: Input): void {}

    public isAcceptingInput(): boolean {
        return true;
    }

    public inputEnded(): void {}

    public inputStarted(): void {}

    public keyPressed(i: number, c: string): void {
        void c;
        if (!ButtonMapping.isValidKeyBinding(i) || i === ButtonMapping.NO_BINDING) {
            return;
        }
        if (this.state !== InputMode.STATE_READING || this.armDelay > 0) {
            this.blockedKeyboardKeys.add(i);
            return;
        }
        if (this.blockedKeyboardKeys.has(i)) {
            return;
        }

        if (!this.bindDraftKeyboardKey(i)) {
            this.message = "ALREADY USED";
            return;
        }

        this.blockedKeyboardKeys.add(i);
        this.advance();
    }

    public keyReleased(i: number, c: string): void {
        void c;
        this.blockedKeyboardKeys.delete(i);
    }

    private bindDraftKeyboardKey(i: number): boolean {
        if (this.assignedKeys.has(i)) {
            return false;
        }
        this.clearDraftKey(i);
        switch (this.getCurrentAction()) {
            case ButtonMapping.ACTION_UP:
                this.draftButtonMapping.keyUp = i;
                break;
            case ButtonMapping.ACTION_DOWN:
                this.draftButtonMapping.keyDown = i;
                break;
            case ButtonMapping.ACTION_LEFT:
                this.draftButtonMapping.keyLeft = i;
                break;
            case ButtonMapping.ACTION_RIGHT:
                this.draftButtonMapping.keyRight = i;
                break;
            case ButtonMapping.ACTION_GRENADE:
                this.draftButtonMapping.keyGrenade = i;
                break;
            case ButtonMapping.ACTION_GUN:
                this.draftButtonMapping.keyGun = i;
                break;
            case ButtonMapping.ACTION_START:
                this.draftButtonMapping.keyStart = i;
                break;
        }
        this.assignedKeys.add(i);
        return true;
    }

    private bindDraftControllerButton(buttonIndex: number): boolean {
        if (this.assignedControllerButtons.has(buttonIndex)) {
            return false;
        }
        this.clearDraftControllerButton(buttonIndex);
        switch (this.getCurrentAction()) {
            case ButtonMapping.ACTION_UP:
                this.draftButtonMapping.controllerUp = buttonIndex;
                break;
            case ButtonMapping.ACTION_DOWN:
                this.draftButtonMapping.controllerDown = buttonIndex;
                break;
            case ButtonMapping.ACTION_LEFT:
                this.draftButtonMapping.controllerLeft = buttonIndex;
                break;
            case ButtonMapping.ACTION_RIGHT:
                this.draftButtonMapping.controllerRight = buttonIndex;
                break;
            case ButtonMapping.ACTION_GRENADE:
                this.draftButtonMapping.controllerGrenade = buttonIndex;
                break;
            case ButtonMapping.ACTION_GUN:
                this.draftButtonMapping.controllerGun = buttonIndex;
                break;
            case ButtonMapping.ACTION_START:
                this.draftButtonMapping.controllerStart = buttonIndex;
                break;
        }
        this.assignedControllerButtons.add(buttonIndex);
        return true;
    }

    private copyButtonMapping(source: ButtonMapping): ButtonMapping {
        let copy = new ButtonMapping();
        copy.keyUp = source.keyUp;
        copy.keyDown = source.keyDown;
        copy.keyLeft = source.keyLeft;
        copy.keyRight = source.keyRight;
        copy.keyGrenade = source.keyGrenade;
        copy.keyGun = source.keyGun;
        copy.keyStart = source.keyStart;
        copy.controllerUp = source.controllerUp;
        copy.controllerDown = source.controllerDown;
        copy.controllerLeft = source.controllerLeft;
        copy.controllerRight = source.controllerRight;
        copy.controllerGrenade = source.controllerGrenade;
        copy.controllerGun = source.controllerGun;
        copy.controllerStart = source.controllerStart;
        return copy;
    }

    private clearDraftKey(key: number): void {
        if (this.draftButtonMapping.keyUp === key) {
            this.draftButtonMapping.keyUp = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.keyDown === key) {
            this.draftButtonMapping.keyDown = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.keyLeft === key) {
            this.draftButtonMapping.keyLeft = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.keyRight === key) {
            this.draftButtonMapping.keyRight = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.keyGrenade === key) {
            this.draftButtonMapping.keyGrenade = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.keyGun === key) {
            this.draftButtonMapping.keyGun = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.keyStart === key) {
            this.draftButtonMapping.keyStart = ButtonMapping.NO_BINDING;
        }
    }

    private clearDraftControllerButton(buttonIndex: number): void {
        if (this.draftButtonMapping.controllerUp === buttonIndex) {
            this.draftButtonMapping.controllerUp = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.controllerDown === buttonIndex) {
            this.draftButtonMapping.controllerDown = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.controllerLeft === buttonIndex) {
            this.draftButtonMapping.controllerLeft = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.controllerRight === buttonIndex) {
            this.draftButtonMapping.controllerRight = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.controllerGrenade === buttonIndex) {
            this.draftButtonMapping.controllerGrenade = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.controllerGun === buttonIndex) {
            this.draftButtonMapping.controllerGun = ButtonMapping.NO_BINDING;
        }
        if (this.draftButtonMapping.controllerStart === buttonIndex) {
            this.draftButtonMapping.controllerStart = ButtonMapping.NO_BINDING;
        }
    }

    private commitDraftButtonMapping(): void {
        this.buttonMapping.keyUp = this.draftButtonMapping.keyUp;
        this.buttonMapping.keyDown = this.draftButtonMapping.keyDown;
        this.buttonMapping.keyLeft = this.draftButtonMapping.keyLeft;
        this.buttonMapping.keyRight = this.draftButtonMapping.keyRight;
        this.buttonMapping.keyGrenade = this.draftButtonMapping.keyGrenade;
        this.buttonMapping.keyGun = this.draftButtonMapping.keyGun;
        this.buttonMapping.keyStart = this.draftButtonMapping.keyStart;
        this.buttonMapping.controllerUp = this.draftButtonMapping.controllerUp;
        this.buttonMapping.controllerDown = this.draftButtonMapping.controllerDown;
        this.buttonMapping.controllerLeft = this.draftButtonMapping.controllerLeft;
        this.buttonMapping.controllerRight = this.draftButtonMapping.controllerRight;
        this.buttonMapping.controllerGrenade = this.draftButtonMapping.controllerGrenade;
        this.buttonMapping.controllerGun = this.draftButtonMapping.controllerGun;
        this.buttonMapping.controllerStart = this.draftButtonMapping.controllerStart;
        this.draftButtonMapping = null!;
        this.refreshInputMappingLines();
    }

    private isActionStep(): boolean {
        let action = this.getCurrentAction();
        return action === ButtonMapping.ACTION_GRENADE || action === ButtonMapping.ACTION_GUN || action === ButtonMapping.ACTION_START;
    }

    private bindControllerInputPressed(): void {
        const candidate = this.sampleControllerInput(true);
        if (candidate === ButtonMapping.NO_BINDING) {
            return;
        }

        if (!this.bindDraftControllerButton(candidate)) {
            this.message = "ALREADY USED";
            return;
        }
        this.advance();
    }

    private sampleControllerInput(selectCandidate: boolean, forceBaseline: boolean = false): number {
        const input = this.gc.getInput();
        const status = input.getControllerSampleStatus();
        if (!status.valid) {
            return ButtonMapping.NO_BINDING;
        }

        const firstSample = this.lastControllerSampleSequence < 0;
        this.lastControllerSampleSequence = status.sequence;
        const controllerCount = input.getControllerCount();
        this.controllerButtonDown.length = controllerCount;
        this.controllerDirectionDown.length = controllerCount;
        this.controllerConnectionGenerations.length = controllerCount;

        const directionPressed = [false, false, false, false];
        let pressedButton = ButtonMapping.NO_BINDING;
        for (let controller = 0; controller < controllerCount; controller++) {
            const generation = input.getControllerConnectionGeneration(controller);
            const previousGeneration = this.controllerConnectionGenerations[controller] ?? 0;
            const ownerChanged = generation === 0 || generation !== previousGeneration;
            this.controllerConnectionGenerations[controller] = generation;
            const baseline = forceBaseline || firstSample || status.baselineOnly || ownerChanged;

            let directions = this.controllerDirectionDown[controller];
            if (directions === undefined) {
                directions = [false, false, false, false];
                this.controllerDirectionDown[controller] = directions;
            }
            const directionLevels = [
                input.isControllerUp(controller),
                input.isControllerDown(controller),
                input.isControllerLeft(controller),
                input.isControllerRight(controller)
            ];
            for (let direction = 0; direction < directionLevels.length; direction++) {
                const down = directionLevels[direction]!;
                if (selectCandidate && !baseline && down && !directions[direction]) {
                    directionPressed[direction] = true;
                }
                directions[direction] = down;
            }

            const buttonCount = Math.min(input.getButtonCount(controller), InputMode.GAMEPAD_BUTTON_INDEX_LIMIT);
            let buttons = this.controllerButtonDown[controller];
            if (buttons === undefined) {
                buttons = [];
                this.controllerButtonDown[controller] = buttons;
            }
            buttons.length = buttonCount;
            for (let button = 0; button < buttonCount; button++) {
                const down = input.isButtonPressed(button, controller);
                const wasDown = buttons[button] ?? false;
                const pressed = selectCandidate && !baseline && down && !wasDown;
                buttons[button] = down;
                if (
                    pressedButton === ButtonMapping.NO_BINDING &&
                    pressed &&
                    !input.isControllerButtonDirectional(button, controller) &&
                    !this.isDraftDirectionButton(button)
                ) {
                    pressedButton = button;
                }
            }
        }

        if (!selectCandidate) {
            return ButtonMapping.NO_BINDING;
        }
        if (!this.isActionStep()) {
            if (directionPressed[0]) return ButtonMapping.CONTROLLER_DIRECTION_UP;
            if (directionPressed[1]) return ButtonMapping.CONTROLLER_DIRECTION_DOWN;
            if (directionPressed[2]) return ButtonMapping.CONTROLLER_DIRECTION_LEFT;
            if (directionPressed[3]) return ButtonMapping.CONTROLLER_DIRECTION_RIGHT;
        }
        return pressedButton;
    }

    private isDraftDirectionButton(button: number): boolean {
        return (
            this.draftButtonMapping.controllerUp === button ||
            this.draftButtonMapping.controllerDown === button ||
            this.draftButtonMapping.controllerLeft === button ||
            this.draftButtonMapping.controllerRight === button
        );
    }

    private syncControllerInputState(): void {
        this.sampleControllerInput(false, true);
    }

    private getCurrentAction(): number {
        return InputMode.ACTIONS[this.nameIndex];
    }

    private advance(): void {
        this.main.playSoundAlways(this.main.bulletHitSound);
        this.message = "";
        this.state = InputMode.STATE_READ_FADE;
        this.delay = InputMode.FADE_TIME;
    }

    public update(gc: GameContainer): void {
        switch (this.state) {
            case InputMode.STATE_MENU:
                this.menu.update();
                break;
            case InputMode.STATE_READING:
                if (this.armDelay > 0) {
                    this.syncControllerInputState();
                    this.armDelay--;
                } else {
                    this.bindControllerInputPressed();
                }
                break;
            case InputMode.STATE_READ_FADE:
                if (--this.delay === 0) {
                    if (++this.nameIndex === InputMode.NAMES.length) {
                        this.removeInputListeners();
                        this.commitDraftButtonMapping();
                        const writeResult = this.main.notifyInputMappingChanged();
                        this.main.clearInputPressedRecords();
                        this.message = writeResult.saved ? "SAVED" : "NOT SAVED";
                        this.delay = InputMode.DONE_DELAY;
                        this.state = InputMode.STATE_SAVED;
                    } else {
                        this.state = InputMode.STATE_READING;
                        this.armDelay = InputMode.ARM_DELAY;
                        this.syncControllerInputState();
                    }
                }
                break;
            case InputMode.STATE_SAVED:
                if (--this.delay === 0) {
                    this.message = "";
                    this.state = InputMode.STATE_MENU;
                    this.createMenu(InputMode.OPTION_DONE);
                }
                break;
        }
    }

    private renderInputMenu(gc: GameContainer, g: Graphics): void {
        this.main.drawString(InputMode.INPUT_TITLE, InputMode.INPUT_TITLE_X, InputMode.INPUT_TITLE_Y, MainConstants.FONT_GRAY);

        let mappingX = this.getInputMappingX();
        for (let i = 0; i < InputMode.LABELS.length; i++) {
            this.main.drawString(
                this.inputMappingLines[i],
                mappingX,
                InputMode.INPUT_MAPPING_Y + i * InputMode.INPUT_MAPPING_ROW_HEIGHT,
                MainConstants.FONT_GRAY
            );
        }

        if (this.menu !== null) {
            this.menu.render();
        }
    }

    private getInputMappingX(): number {
        return javaFloat(this.inputMappingX);
    }

    private refreshInputMappingLines(): void {
        let maxLength = 0;
        for (let i = 0; i < InputMode.LABELS.length; i++) {
            let line = this.buttonMapping.inputMappingLine(InputMode.LABELS[i], InputMode.ACTIONS[i]);
            this.inputMappingLines[i] = line;
            if (line.length > maxLength) {
                maxLength = line.length;
            }
        }
        this.inputMappingX = (MainConstants.DISPLAY_WIDTH - (maxLength << 5)) / 2;
    }

    private renderReading(gc: GameContainer, g: Graphics): void {
        if (this.state === InputMode.STATE_SAVED) {
            const message = this.completionMessage();
            this.main.drawString(message, this.centerStringX(message), 464, MainConstants.FONT_GRAY);

            return;
        }

        this.main.drawString("ON EITHER YOUR KEYBOARD", 144, 304, MainConstants.FONT_GRAY);
        this.main.drawString("OR GAMEPAD, PRESS:", 224, 368, MainConstants.FONT_GRAY);

        if (this.state === InputMode.STATE_READ_FADE) {
            this.main.drawStringAlpha(
                InputMode.NAMES[this.nameIndex],
                InputMode.NAME_XS[this.nameIndex],
                464,
                MainConstants.FONT_ORANGE_GRAY,
                this.delay * InputMode.I_FADE_TIME
            );
        } else {
            this.main.drawString(InputMode.NAMES[this.nameIndex], InputMode.NAME_XS[this.nameIndex], 464, MainConstants.FONT_ORANGE_GRAY);
        }
        if (this.state === InputMode.STATE_READING && this.message.length > 0) {
            this.main.drawString(this.message, this.centerStringX(this.message), 560, MainConstants.FONT_GRAY);
        }
    }

    private centerStringX(text: string): number {
        return javaFloat((MainConstants.DISPLAY_WIDTH - (text.length << 5)) / 2);
    }

    public render(gc: GameContainer, g: Graphics): void {
        g.setColor(Color.black);
        g.fillRect(0, 0, MainConstants.DISPLAY_WIDTH, MainConstants.DISPLAY_HEIGHT);

        switch (this.state) {
            case InputMode.STATE_READING:
            case InputMode.STATE_READ_FADE:
            case InputMode.STATE_SAVED:
                this.renderReading(gc, g);
                break;
            case InputMode.STATE_DONE:
                break;
            default:
                this.renderInputMenu(gc, g);
                break;
        }
    }
}
